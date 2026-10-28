import type { SupabaseClient } from '@supabase/supabase-js'
import { parsePrice } from '../utils/validation'

function appError(message: string, code = 400) {
  const error = new Error(message) as Error & { code?: number }
  error.code = code
  return error
}

interface CreateTransactionParams {
  projectId: number
  userId: number
  customerName: string
  customerEmail: string
  customerPhone: string
  serverKey: string
  isProduction: boolean
}

export async function createTransaction(
  supabase: SupabaseClient,
  params: CreateTransactionParams
) {
  const {
    projectId, userId,
    customerName, customerEmail, customerPhone,
    serverKey, isProduction,
  } = params

  // Nominal TIDAK diambil dari browser: selalu dari harga final yang ditetapkan admin di database.
  // (Dulu body.amount dipercaya begitu saja, sehingga klien bisa membayar berapa pun.)
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, user_id, status, plan_price_range, contact_name, contact_phone')
    .eq('id', projectId)
    .is('deleted_at', null)
    .maybeSingle()

  if (projectError) throw appError(projectError.message, 500)
  if (!project) throw appError('Project tidak ditemukan', 404)
  if (project.user_id !== userId) throw appError('Forbidden', 403)
  if (!['approved', 'process'].includes(project.status)) {
    throw appError('Pembayaran hanya dapat dilakukan setelah orderan disetujui', 409)
  }

  const amount = parsePrice(project.plan_price_range)
  if (!amount) throw appError('Harga final belum ditetapkan oleh admin', 409)

  const { data: alreadyPaid, error: paidError } = await supabase
    .from('payments')
    .select('id')
    .eq('project_id', projectId)
    .eq('status', 'paid')
    .limit(1)
    .maybeSingle()
  if (paidError) throw appError(paidError.message, 500)
  if (alreadyPaid) throw appError('Orderan ini sudah dibayar', 409)

  const orderId = `WEBKITA-${projectId}-${Date.now()}`

  const midtransUrl = isProduction
    ? 'https://app.midtrans.com/snap/v1/transactions'
    : 'https://app.sandbox.midtrans.com/snap/v1/transactions'

  const authKey = btoa(`${serverKey}:`)

  const payload = {
    transaction_details: {
      order_id: orderId,
      gross_amount: amount,
    },
    customer_details: {
      first_name: customerName || project.contact_name,
      email: customerEmail,
      phone: customerPhone || project.contact_phone,
    },
    item_details: [
      {
        id: `project-${projectId}`,
        price: amount,
        quantity: 1,
        name: `Pembayaran Project #${projectId}`,
      },
    ],
  }

  const response = await fetch(midtransUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${authKey}`,
    },
    body: JSON.stringify(payload),
  })

  const midtransData = await response.json() as any

  if (!response.ok) {
    throw appError(midtransData?.error_messages?.[0] || 'Gagal membuat transaksi Midtrans', 500)
  }

  // Simpan ke tabel payments
  const { data, error } = await supabase
    .from('payments')
    .insert({
      project_id: projectId,
      user_id: userId,
      order_id: orderId,
      amount,
      status: 'pending',
      snap_token: midtransData.token,
      snap_url: midtransData.redirect_url,
    })
    .select('*')
    .single()

  if (error) throw appError(error.message, 500)

  return {
    ...data,
    snap_token: midtransData.token,
    snap_url: midtransData.redirect_url,
  }
}

async function sha512Hex(input: string) {
  const data = new TextEncoder().encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-512', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function handleNotification(
  supabase: SupabaseClient,
  notification: any,
  serverKey: string
) {
  const { order_id, status_code, gross_amount, signature_key, transaction_status, fraud_status } =
    notification

  if (!order_id) throw appError('Order ID tidak ditemukan', 400)

  // Verifikasi signature Midtrans supaya notifikasi tidak bisa dipalsukan
  // (tanpa ini, siapa pun bisa POST body palsu dan menandai transaksi apa
  // pun sebagai "paid" tanpa benar-benar membayar).
  const expectedSignature = await sha512Hex(
    `${order_id}${status_code}${gross_amount}${serverKey}`
  )
  if (!signature_key || signature_key !== expectedSignature) {
    throw appError('Signature tidak valid', 403)
  }

  let status = 'pending'

  if (transaction_status === 'capture') {
    status = fraud_status === 'challenge' ? 'challenge' : 'paid'
  } else if (transaction_status === 'settlement') {
    status = 'paid'
  } else if (['cancel', 'deny', 'expire'].includes(transaction_status)) {
    status = 'failed'
  } else if (transaction_status === 'pending') {
    status = 'pending'
  }

  const { data: existing, error: findError } = await supabase
    .from('payments')
    .select('status, paid_at')
    .eq('order_id', order_id)
    .maybeSingle()

  if (findError) throw appError(findError.message, 500)
  if (!existing) return // order tidak dikenal (mis. tes notifikasi dari dashboard Midtrans): abaikan, balas 200

  // Notifikasi Midtrans bisa datang tidak berurutan; transaksi yang sudah lunas tidak diturunkan lagi
  if (existing.status === 'paid' && status !== 'paid') return

  const now = new Date().toISOString()
  const update: Record<string, unknown> = { status, updated_at: now }
  if (notification.transaction_id) update.transaction_id = String(notification.transaction_id)
  if (notification.payment_type) update.payment_type = String(notification.payment_type)
  if (status === 'paid' && !existing.paid_at) update.paid_at = now

  const { error } = await supabase
    .from('payments')
    .update(update)
    .eq('order_id', order_id)

  if (error) throw appError(error.message, 500)
}

export interface InvoiceActor {
  user_id: number
  role?: string
}

/** Data invoice satu proyek: dipakai halaman Invoice (tanggal terbit, status & referensi pembayaran). */
export async function getInvoice(supabase: SupabaseClient, projectId: number, actor: InvoiceActor) {
  if (!projectId) throw appError('Project ID tidak valid', 400)

  const { data: project, error } = await supabase
    .from('projects')
    .select('id, user_id, project_title, category, plan_title, status, plan_price_range, contact_name, contact_phone, invoice_number, invoice_issued_at, created_at')
    .eq('id', projectId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw appError(error.message, 500)
  if (!project) throw appError('Invoice tidak ditemukan', 404)

  const isStaff = actor.role === 'admin' || actor.role === 'developer'
  if (!isStaff && project.user_id !== actor.user_id) throw appError('Forbidden', 403)

  const { data: paid, error: payError } = await supabase
    .from('payments')
    .select('order_id, transaction_id, payment_type, paid_at, amount')
    .eq('project_id', projectId)
    .eq('status', 'paid')
    .order('paid_at', { ascending: true, nullsFirst: false })
    .limit(1)
    .maybeSingle()

  if (payError) throw appError(payError.message, 500)

  const { user_id: _owner, plan_price_range, ...publicProject } = project
  return {
    ...publicProject,
    amount: parsePrice(plan_price_range),
    is_paid: !!paid,
    paid_at: paid?.paid_at ?? null,
    payment_reference: paid?.order_id ?? null,
    payment_type: paid?.payment_type ?? null,
  }
}
