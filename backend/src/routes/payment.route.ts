import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.middleware'
import { createSupabase } from '../lib/supabase'
import { createTransaction, getInvoice, handleNotification } from '../services/payment.service'
import { errorStatus } from '../utils/http'

type Env = {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  JWT_SECRET: string
  MIDTRANS_SERVER_KEY: string
  MIDTRANS_IS_PRODUCTION: string
}

type Variables = {
  user: { user_id: number; role?: string }
}

export const paymentRoute = new Hono<{ Bindings: Env; Variables: Variables }>()

// GET /payment/all — ambil semua transaksi (admin)
paymentRoute.get('/all', authMiddleware, async (c) => {
  try {
    const user = c.get('user')
    if (user.role !== 'admin') {
      return c.json({ status: 'error', message: 'Akses hanya untuk admin' }, 403)
    }
    const supabase = createSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return c.json({ status: 'success', data })
  } catch (err: any) {
    return c.json({ status: 'error', message: err?.message }, 500)
  }
})

// GET /payment/status/:orderId — cek status transaksi
paymentRoute.get('/status/:orderId', authMiddleware, async (c) => {
  try {
    const orderId = c.req.param('orderId')
    const user = c.get('user')
    const supabase = createSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .single()

    if (error) throw new Error('Transaksi tidak ditemukan')

    // Cegah user lain mengintip transaksi orang lain lewat order_id
    if (data.user_id !== user.user_id && user.role !== 'admin' && user.role !== 'developer') {
      return c.json({ status: 'error', message: 'Forbidden' }, 403)
    }

    return c.json({ status: 'success', data })
  } catch (err: any) {
    return c.json({ status: 'error', message: err?.message }, 404)
  }
})

// POST /payment/create/:projectId — buat transaksi midtrans
paymentRoute.post('/create/:projectId', authMiddleware, async (c) => {
  try {
    const projectId = Number(c.req.param('projectId'))
    const user = c.get('user')
    const body = await c.req.json()

    const supabase = createSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

    const result = await createTransaction(supabase, {
      projectId,
      userId: user.user_id,
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      customerPhone: body.customerPhone,
      serverKey: c.env.MIDTRANS_SERVER_KEY,
      isProduction: c.env.MIDTRANS_IS_PRODUCTION === 'true',
    })

    return c.json({ status: 'success', data: result }, 201)
  } catch (err: any) {
    return c.json({ status: 'error', message: err?.message || 'Gagal membuat transaksi' }, errorStatus(err))
  }
})

// POST /payment/notification — webhook dari midtrans
paymentRoute.post('/notification', async (c) => {
  try {
    const body = await c.req.json()
    const supabase = createSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

    await handleNotification(supabase, body, c.env.MIDTRANS_SERVER_KEY)

    return c.json({ status: 'success' })
  } catch (err: any) {
    return c.json({ status: 'error', message: err?.message }, errorStatus(err))
  }
})

// GET /payment/project/:projectId — cek status pembayaran berdasarkan project_id
paymentRoute.get('/project/:projectId', authMiddleware, async (c) => {
  try {
    const projectId = Number(c.req.param('projectId'))
    const user = c.get('user')
    const supabase = createSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

    if (user.role !== 'admin' && user.role !== 'developer') {
      const { data: project } = await supabase
        .from('projects')
        .select('user_id')
        .eq('id', projectId)
        .single()
      if (!project || project.user_id !== user.user_id) {
        return c.json({ status: 'error', message: 'Forbidden' }, 403)
      }
    }

    const { data, error } = await supabase
      .from('payments')
      .select('status')
      .eq('project_id', projectId)
      .eq('status', 'paid')
      .maybeSingle()

    if (error) throw new Error(error.message)

    return c.json({ status: 'success', isPaid: !!data })
  } catch (err: any) {
    return c.json({ status: 'error', message: err?.message }, 500)
  }
})

// GET /payment/invoice/:projectId — data invoice (pemilik proyek atau admin/developer)
paymentRoute.get('/invoice/:projectId', authMiddleware, async (c) => {
  try {
    const projectId = Number(c.req.param('projectId'))
    const user = c.get('user')
    const supabase = createSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)
    const data = await getInvoice(supabase, projectId, user)
    return c.json({ status: 'success', data })
  } catch (err: any) {
    return c.json({ status: 'error', message: err?.message || 'Gagal mengambil invoice' }, errorStatus(err))
  }
})
