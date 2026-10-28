import assert from 'node:assert/strict'
import bcrypt from 'bcryptjs'
import { FakeDb } from './fake_supabase'
import { setProjectPrice, updateProjectStatus } from '../src/services/project.service'
import { createTransaction, getInvoice, handleNotification } from '../src/services/payment.service'
import { forgotPassword, registerUser, resetPassword, verifyOtp } from '../src/services/auth.service'
import { generateOtp, parsePrice, validatePassword, validateUsername } from '../src/utils/validation'
import { assertPriceRange } from '../src/services/pricing.service'

let passed = 0
const t = async (name: string, fn: () => any) => { try { await fn(); passed++; console.log('  ok  ', name) } catch (e: any) { console.log('  FAIL', name, '\n      ', e.message); process.exitCode = 1 } }
const rejects = async (p: Promise<any>, code: number, msg?: RegExp) => {
  try { await p } catch (e: any) { assert.equal(e.code, code, `code ${e.code} (${e.message})`); if (msg) assert.match(e.message, msg); return }
  assert.fail('seharusnya error')
}
const P = (o: any) => ({ user_id: 2, plan_title: 'Business', price_range: 'Rp 5.000.000 – Rp 15.000.000', plan_price_range: null, project_title: 'X', category: 'website', contact_name: 'Rina', contact_phone: '0812', status: 'pending', reject_reason: null, invoice_number: null, invoice_issued_at: null, created_at: '2026-10-20T09:00:00Z', deleted_at: null, ...o })

;(async () => {
  console.log('validasi')
  await t('password: aturan', () => {
    assert.equal(validatePassword('abc12345'), '')
    assert.match(validatePassword('abc1234'), /minimal 8/)
    assert.match(validatePassword('abcdefgh'), /huruf dan angka/)
    assert.match(validatePassword('12345678'), /huruf dan angka/)
    assert.match(validatePassword('a1' + 'x'.repeat(71)), /maksimal 72/)
    assert.match(validatePassword(''), /wajib/)
    assert.match(validatePassword(undefined), /wajib/)
    assert.equal(validatePassword('Demo1234!'), '') // akun demo seed tetap lolos
  })
  await t('username: aturan', () => {
    assert.equal(validateUsername('admin-demo'), '')
    assert.notEqual(validateUsername('ab'), '')
    assert.notEqual(validateUsername('a b c'), '')
    assert.notEqual(validateUsername('x'.repeat(31)), '')
  })
  await t('parsePrice', () => {
    assert.equal(parsePrice('9000000'), 9000000)
    assert.equal(parsePrice('Rp 9.000.000'), 9000000)
    assert.equal(parsePrice(9000000), 9000000)
    assert.equal(parsePrice('abc'), 0); assert.equal(parsePrice(-5), 0); assert.equal(parsePrice(null), 0)
  })
  await t('OTP 6 digit, acak', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 200; i++) { const o = generateOtp(); assert.match(o, /^\d{6}$/); seen.add(o) }
    assert.ok(seen.size > 150)
  })
  await t('rentang harga paket', () => {
    assertPriceRange(500000, 1500000); assertPriceRange(15000000, null); assertPriceRange(0, undefined)
    assert.throws(() => assertPriceRange(5, 5), /lebih besar/)
    assert.throws(() => assertPriceRange(-1, 5), /min_price/)
    assert.throws(() => assertPriceRange('1', 5), /min_price/)
    assert.throws(() => assertPriceRange(1, 'x'), /max_price/)
  })

  console.log('status orderan')
  const flow = new FakeDb({ projects: ['pending', 'approved', 'process', 'done', 'rejected'].map((s, i) => P({ id: i + 1, status: s })) }) as any
  await t('pending → approved ok', async () => assert.equal((await updateProjectStatus(flow, 1, 'approved')).status, 'approved'))
  await t('pending → process/done ditolak (409)', async () => {
    flow.tables.projects[0].status = 'pending'
    await rejects(updateProjectStatus(flow, 1, 'process'), 409)
    await rejects(updateProjectStatus(flow, 1, 'done'), 409)
  })
  await t('approved → process → done ok; mundur ditolak', async () => {
    assert.equal((await updateProjectStatus(flow, 2, 'process')).status, 'process')
    assert.equal((await updateProjectStatus(flow, 2, 'done')).status, 'done')
    await rejects(updateProjectStatus(flow, 2, 'approved'), 409)
    await rejects(updateProjectStatus(flow, 3, 'approved'), 409)
  })
  await t('done & rejected final', async () => {
    await rejects(updateProjectStatus(flow, 4, 'process'), 409)
    await rejects(updateProjectStatus(flow, 5, 'pending'), 409, /ditolak/)
  })
  await t('tolak menyimpan alasan (trim) & status tak dikenal ditolak', async () => {
    const db = new FakeDb({ projects: [P({ id: 1 })] }) as any
    const r = await updateProjectStatus(db, 1, 'rejected', '  Di luar cakupan layanan  ')
    assert.equal(r.status, 'rejected'); assert.equal(r.reject_reason, 'Di luar cakupan layanan')
    await rejects(updateProjectStatus(db, 1, 'foo' as any), 400)
  })
  await t('tolak tanpa alasan → reject_reason null; alasan > 500 ditolak', async () => {
    const db = new FakeDb({ projects: [P({ id: 1 }), P({ id: 2 })] }) as any
    assert.equal((await updateProjectStatus(db, 1, 'rejected')).reject_reason, null)
    await rejects(updateProjectStatus(db, 2, 'rejected', 'x'.repeat(501)), 400)
  })
  await t('alasan diabaikan bila bukan penolakan', async () => {
    const db = new FakeDb({ projects: [P({ id: 1 })] }) as any
    assert.equal((await updateProjectStatus(db, 1, 'approved', 'abaikan')).reject_reason, null)
  })
  await t('proyek tak ada → 404', async () => rejects(updateProjectStatus(new FakeDb({ projects: [] }) as any, 99, 'approved'), 404))

  console.log('harga & invoice')
  await t('harga: sekali saja, invoice terbit', async () => {
    const db = new FakeDb({ projects: [P({ id: 4, status: 'approved' })] }) as any
    const r = await setProjectPrice(db, 4, '9000000')
    assert.equal(r.plan_price_range, '9000000'); assert.match(r.invoice_number!, /^INV-0004-\d{4}$/); assert.ok(r.invoice_issued_at)
    await rejects(setProjectPrice(db, 4, '1000000'), 403, /tidak dapat diubah/)
    assert.equal(db.tables.projects[0].plan_price_range, '9000000')
  })
  await t('harga: teks "Rp 9.000.000" dinormalkan jadi angka', async () => {
    const db = new FakeDb({ projects: [P({ id: 1 })] }) as any
    assert.equal((await setProjectPrice(db, 1, 'Rp 9.000.000')).plan_price_range, '9000000')
  })
  await t('harga: tidak valid / di luar batas / ditolak / balapan', async () => {
    const db = new FakeDb({ projects: [P({ id: 1 }), P({ id: 2, status: 'rejected' }), P({ id: 3, plan_price_range: '' })] }) as any
    await rejects(setProjectPrice(db, 1, 'abc'), 400)
    await rejects(setProjectPrice(db, 1, 5), 400, /batas/)
    await rejects(setProjectPrice(db, 1, 99_999_999_999), 400, /batas/)
    await rejects(setProjectPrice(db, 2, 500000), 409, /ditolak/)
    assert.equal((await setProjectPrice(db, 3, 500000)).plan_price_range, '500000') // string kosong dianggap belum diisi
  })

  console.log('pembayaran')
  const mkPay = (over: any = {}, pays: any[] = []) => new FakeDb({ projects: [P({ id: 4, status: 'approved', plan_price_range: '9000000', ...over })], payments: pays }) as any
  const base = { projectId: 4, userId: 2, customerName: 'Rina', customerEmail: 'r@x.id', customerPhone: '0812', serverKey: 'SB-key', isProduction: false }
  let midtransBody: any = null
  const realFetch = globalThis.fetch
  globalThis.fetch = (async (_u: any, init: any) => { midtransBody = JSON.parse(init.body); return new Response(JSON.stringify({ token: 'snap-tok', redirect_url: 'https://pay' }), { status: 201 }) }) as any
  await t('nominal selalu dari database (body.amount tak berpengaruh)', async () => {
    const db = mkPay()
    const r = await createTransaction(db, { ...base, amount: 1 } as any)
    assert.equal(midtransBody.transaction_details.gross_amount, 9000000)
    assert.equal(r.amount, 9000000); assert.equal(db.tables.payments[0].amount, 9000000); assert.equal(r.snap_token, 'snap-tok')
  })
  await t('bukan pemilik → 403', async () => rejects(createTransaction(mkPay(), { ...base, userId: 99 }), 403))
  await t('belum disetujui / ditolak / selesai → 409', async () => {
    for (const s of ['pending', 'rejected', 'done']) await rejects(createTransaction(mkPay({ status: s }), base), 409, /disetujui/)
  })
  await t('status process boleh dibayar', async () => assert.ok((await createTransaction(mkPay({ status: 'process' }), base)).snap_token))
  await t('harga belum ditetapkan → 409', async () => rejects(createTransaction(mkPay({ plan_price_range: null }), base), 409, /Harga final/))
  await t('sudah dibayar → 409; pending/failed lama tidak menghalangi', async () => {
    await rejects(createTransaction(mkPay({}, [{ id: 1, project_id: 4, status: 'paid' }]), base), 409, /sudah dibayar/)
    assert.ok((await createTransaction(mkPay({}, [{ id: 1, project_id: 4, status: 'failed' }]), base)).snap_token)
  })
  await t('proyek dihapus/tak ada → 404', async () => rejects(createTransaction(mkPay({ deleted_at: 'x' }), base), 404))
  globalThis.fetch = realFetch

  const sha = async (s: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-512', new TextEncoder().encode(s)))).map((b) => b.toString(16).padStart(2, '0')).join('')
  const notif = async (o: any, key = 'SB-key') => ({ order_id: 'WEBKITA-4-1', status_code: '200', gross_amount: '9000000.00', ...o, signature_key: o.signature_key ?? await sha(`WEBKITA-4-1200${'9000000.00'}${key}`) })
  const payDb = () => new FakeDb({ payments: [{ id: 1, project_id: 4, order_id: 'WEBKITA-4-1', status: 'pending', paid_at: null }] }) as any
  console.log('webhook')
  await t('signature palsu → 403', async () => rejects(handleNotification(payDb(), await notif({ transaction_status: 'settlement', signature_key: 'x' }), 'SB-key'), 403))
  await t('settlement → paid + paid_at + referensi', async () => {
    const db = payDb()
    await handleNotification(db, await notif({ transaction_status: 'settlement', transaction_id: 'tx-1', payment_type: 'qris' }), 'SB-key')
    const r = db.tables.payments[0]
    assert.equal(r.status, 'paid'); assert.ok(r.paid_at); assert.equal(r.transaction_id, 'tx-1'); assert.equal(r.payment_type, 'qris')
  })
  await t('notifikasi telat tidak menurunkan status lunas; paid_at tidak berubah', async () => {
    const db = payDb()
    await handleNotification(db, await notif({ transaction_status: 'settlement' }), 'SB-key')
    const first = db.tables.payments[0].paid_at
    await handleNotification(db, await notif({ transaction_status: 'pending' }), 'SB-key')
    await handleNotification(db, await notif({ transaction_status: 'expire' }), 'SB-key')
    await handleNotification(db, await notif({ transaction_status: 'settlement' }), 'SB-key')
    assert.equal(db.tables.payments[0].status, 'paid'); assert.equal(db.tables.payments[0].paid_at, first)
  })
  await t('capture+challenge, expire, order tak dikenal', async () => {
    let db = payDb(); await handleNotification(db, await notif({ transaction_status: 'capture', fraud_status: 'challenge' }), 'SB-key'); assert.equal(db.tables.payments[0].status, 'challenge')
    db = payDb(); await handleNotification(db, await notif({ transaction_status: 'expire' }), 'SB-key'); assert.equal(db.tables.payments[0].status, 'failed')
    const n = { order_id: 'TEST-123', status_code: '200', gross_amount: '1.00', transaction_status: 'settlement', signature_key: await sha('TEST-1232001.00SB-key') }
    await handleNotification(db, n, 'SB-key') // tidak melempar
  })

  console.log('invoice')
  const invDb = () => new FakeDb({
    projects: [P({ id: 4, status: 'approved', plan_price_range: '9000000', invoice_number: 'INV-0004-2026', invoice_issued_at: '2026-10-21T09:00:00Z' })],
    payments: [{ id: 1, project_id: 4, order_id: 'WEBKITA-4-1', status: 'paid', paid_at: '2026-10-22T14:30:00Z', payment_type: 'qris', amount: 9000000 }, { id: 2, project_id: 4, order_id: 'WEBKITA-4-0', status: 'failed' }],
  }) as any
  await t('pemilik: data lengkap, tanpa user_id & harga mentah', async () => {
    const r: any = await getInvoice(invDb(), 4, { user_id: 2, role: 'user' })
    assert.equal(r.invoice_number, 'INV-0004-2026'); assert.equal(r.amount, 9000000); assert.equal(r.is_paid, true)
    assert.equal(r.paid_at, '2026-10-22T14:30:00Z'); assert.equal(r.payment_reference, 'WEBKITA-4-1')
    assert.equal('user_id' in r, false); assert.equal('plan_price_range' in r, false)
  })
  await t('orang lain 403, admin/developer boleh, tak ada 404', async () => {
    await rejects(getInvoice(invDb(), 4, { user_id: 3, role: 'user' }), 403)
    assert.equal((await getInvoice(invDb(), 4, { user_id: 1, role: 'admin' })).is_paid, true)
    assert.equal((await getInvoice(invDb(), 4, { user_id: 5, role: 'developer' })).amount, 9000000)
    await rejects(getInvoice(invDb(), 99, { user_id: 2 }), 404)
  })
  await t('belum dibayar & belum ada harga', async () => {
    const db = new FakeDb({ projects: [P({ id: 4 })], payments: [] }) as any
    const r: any = await getInvoice(db, 4, { user_id: 2 })
    assert.equal(r.is_paid, false); assert.equal(r.amount, 0); assert.equal(r.invoice_number, null); assert.equal(r.paid_at, null)
  })

  console.log('auth')
  const cfg = { resendApiKey: 'k', mailFromEmail: 'a@b', mailFromName: 'W', appUrl: 'http://x' }
  await t('register menolak password/username lemah (sebelum menyentuh DB)', async () => {
    const db = new FakeDb({ users: [] }) as any
    const base = { username: 'nabil', email: 'n@x.id', password: 'abc12345' }
    await rejects(registerUser(db, { ...base, password: 'abcdefgh' }, cfg), 400, /huruf dan angka/)
    await rejects(registerUser(db, { ...base, password: 'abc123' }, cfg), 400, /minimal 8/)
    await rejects(registerUser(db, { ...base, username: 'a b' }, cfg), 400, /Username/)
    assert.equal(db.tables.users.length, 0)
  })
  const sendOk = async (fn: () => Promise<any>) => {
    const f = globalThis.fetch; globalThis.fetch = (async () => new Response('{}', { status: 200 })) as any
    try { return await fn() } finally { globalThis.fetch = f }
  }
  const userDb = () => new FakeDb({ users: [{ id: 7, email: 'n@x.id', username: 'nabil', first_name: 'N', last_name: '', token_version: 3, reset_otp: null, reset_otp_expires_at: null, reset_otp_attempts: 0, verification_token: null, deleted_at: null }] }) as any
  await t('OTP berlaku 5 menit, 6 digit', async () => {
    const db = userDb(); await sendOk(() => forgotPassword(db, 'n@x.id', cfg))
    const u = db.tables.users[0]; assert.match(u.reset_otp, /^\d{6}$/)
    const mins = (new Date(u.reset_otp_expires_at).getTime() - Date.now()) / 60000
    assert.ok(mins > 4.9 && mins <= 5.01, `ttl ${mins}`)
  })
  await t('OTP: 5x salah menghanguskan kode, benar setelahnya pun ditolak', async () => {
    const db = userDb(); await sendOk(() => forgotPassword(db, 'n@x.id', cfg))
    const real = db.tables.users[0].reset_otp
    const wrong = real === '000000' ? '111111' : '000000'
    await rejects(verifyOtp(db, 'n@x.id', wrong), 400, /Sisa percobaan: 4/)
    for (let i = 0; i < 3; i++) await rejects(verifyOtp(db, 'n@x.id', wrong), 400)
    await rejects(verifyOtp(db, 'n@x.id', wrong), 400, /Terlalu banyak/)
    assert.equal(db.tables.users[0].reset_otp, null)
    await rejects(verifyOtp(db, 'n@x.id', real), 400, /Minta kode baru/)
  })
  await t('OTP benar → resetToken; tak bisa dipakai dua kali; kedaluwarsa ditolak', async () => {
    const db = userDb(); await sendOk(() => forgotPassword(db, 'n@x.id', cfg))
    const otp = db.tables.users[0].reset_otp
    const { resetToken } = await verifyOtp(db, 'n@x.id', otp)
    assert.match(resetToken, /^[0-9a-f]{64}$/)
    await rejects(verifyOtp(db, 'n@x.id', otp), 400)
    const db2 = userDb(); await sendOk(() => forgotPassword(db2, 'n@x.id', cfg))
    db2.tables.users[0].reset_otp_expires_at = new Date(Date.now() - 1000).toISOString()
    await rejects(verifyOtp(db2, 'n@x.id', db2.tables.users[0].reset_otp), 400, /kadaluarsa/)
  })
  await t('kirim ulang OTP mereset hitungan percobaan', async () => {
    const db = userDb(); await sendOk(() => forgotPassword(db, 'n@x.id', cfg))
    const wrong = db.tables.users[0].reset_otp === '000000' ? '111111' : '000000'
    await rejects(verifyOtp(db, 'n@x.id', wrong), 400); assert.equal(db.tables.users[0].reset_otp_attempts, 1)
    await sendOk(() => forgotPassword(db, 'n@x.id', cfg)); assert.equal(db.tables.users[0].reset_otp_attempts, 0)
  })
  await t('reset password: aturan sama, hash bcrypt, token_version naik, token sekali pakai', async () => {
    const db = userDb(); await sendOk(() => forgotPassword(db, 'n@x.id', cfg))
    const { resetToken } = await verifyOtp(db, 'n@x.id', db.tables.users[0].reset_otp)
    await rejects(resetPassword(db, resetToken, 'abcdefgh'), 400, /huruf dan angka/)
    await rejects(resetPassword(db, resetToken, 'a1'), 400, /minimal 8/)
    assert.equal(db.tables.users[0].token_version, 3)
    await resetPassword(db, resetToken, 'Baru12345')
    const u = db.tables.users[0]
    assert.ok(await bcrypt.compare('Baru12345', u.password)); assert.equal(u.token_version, 4); assert.equal(u.verification_token, null)
    await rejects(resetPassword(db, resetToken, 'Lain12345'), 400, /Token tidak valid/)
  })

  console.log(`\n${passed} tes lolos${process.exitCode ? ', ADA YANG GAGAL' : ''}`)
})()
