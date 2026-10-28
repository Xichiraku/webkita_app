import bcrypt from 'bcryptjs'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  LoginEmailRequest,
  LoginUsernameRequest,
  RegisterRequest,
  User,
  UserResponse,
} from '../types/user'
import { generateAccessToken } from '../utils/jwt'
import { generateOtp, validatePassword, validateUsername } from '../utils/validation'

// Kode OTP reset password: berlaku 5 menit, maksimal 5 percobaan salah (sama dengan tampilan frontend)
const OTP_TTL_MINUTES = 5
const OTP_MAX_ATTEMPTS = 5

type EmailConfig = {
  resendApiKey: string
  mailFromEmail: string
  mailFromName: string
  appUrl: string
}

function toUserResponse(user: User): UserResponse & { is_email_verified: boolean } {
  const {
    password,
    verification_token,
    token_expires_at,
    deleted_at,
    token_version,
    ...safeUser
  } = user

  return {
    ...safeUser,
    is_email_verified: user.email_verified_at !== null,
  }
}

function appError(message: string, code = 400, field = '') {
  const error = new Error(message) as Error & {
    code?: number
    field?: string
  }
  error.code = code
  error.field = field
  return error
}

function generateSecureToken(length = 32) {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function sendVerificationEmail(
  config: EmailConfig,
  toEmail: string,
  toName: string,
  token: string
) {
  const verifyUrl = `${config.appUrl}/auth/verify-email?token=${token}&email=${encodeURIComponent(toEmail)}`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.resendApiKey}`,
    },
    body: JSON.stringify({
      from: `${config.mailFromName} <${config.mailFromEmail}>`,
      to: [toEmail],
      subject: 'Verifikasi Email Anda - WebKita',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Halo, ${toName}!</h2>
          <p>Terima kasih telah mendaftar di <strong>WebKita</strong>.</p>
          <p>Klik tombol di bawah untuk memverifikasi email Anda:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyUrl}"
               style="background-color: #4F46E5; color: white; padding: 12px 24px;
                      text-decoration: none; border-radius: 6px; font-size: 16px;">
              Verifikasi Email
            </a>
          </div>
          <p>Atau copy link berikut ke browser Anda:</p>
          <p style="color: #6B7280; word-break: break-all;">${verifyUrl}</p>
          <p>Link ini berlaku selama <strong>24 jam</strong>.</p>
          <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;" />
          <p style="color: #9CA3AF; font-size: 12px;">
            Jika Anda tidak mendaftar di WebKita, abaikan email ini.
          </p>
        </div>
      `,
      text: `Halo ${toName}! Verifikasi email Anda di: ${verifyUrl} (berlaku 24 jam)`,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('Resend error (verification):', err)
    throw appError('Gagal mengirim email verifikasi', 500)
  }
}

async function sendOtpEmail(
  config: EmailConfig,
  toEmail: string,
  toName: string,
  otp: string
) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.resendApiKey}`,
    },
    body: JSON.stringify({
      from: `${config.mailFromName} <${config.mailFromEmail}>`,
      to: [toEmail],
      subject: 'Kode OTP Reset Password - WebKita',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Halo, ${toName}!</h2>
          <p>Kami menerima permintaan reset password untuk akun Anda.</p>
          <p>Gunakan kode OTP berikut untuk melanjutkan:</p>
          <div style="text-align: center; margin: 30px 0;">
            <div style="background-color: #F3F4F6; border-radius: 8px; padding: 20px; display: inline-block;">
              <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #4F46E5;">
                ${otp}
              </span>
            </div>
          </div>
          <p>Kode ini berlaku selama <strong>5 menit</strong>.</p>
          <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;" />
          <p style="color: #9CA3AF; font-size: 12px;">
            Jika Anda tidak meminta reset password, abaikan email ini.
          </p>
        </div>
      `,
      text: `Halo ${toName}! Kode OTP reset password Anda: ${otp} (berlaku 5 menit)`,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('Resend error (OTP):', err)
    throw appError('Gagal mengirim email OTP', 500)
  }
}

export async function loginWithEmail(
  supabase: SupabaseClient,
  req: LoginEmailRequest,
  jwtSecret: string
) {
  if (!req.email || !req.password) {
    throw appError('Format data tidak valid', 400)
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', req.email)
    .is('deleted_at', null)
    .single<User>()

  if (error || !user) {
    throw appError('Email/username atau password salah', 401, 'credentials')
  }

  const validPassword = await bcrypt.compare(req.password, user.password)

  if (!validPassword) {
    throw appError('Email/username atau password salah', 401, 'credentials')
  }

  if (!user.email_verified_at) {
    throw appError('Email belum diverifikasi, silakan cek inbox Anda', 403, 'email')
  }

  if (user.is_aktif !== 'Y') {
    throw appError('Akun tidak aktif', 403, 'user')
  }

  const token = await generateAccessToken(user.id, user.role, user.token_version ?? 0, jwtSecret)
  const responseUser = toUserResponse(user)

  return {
    user: responseUser,
    accessToken: token,
  }
}

export async function loginWithUsername(
  supabase: SupabaseClient,
  req: LoginUsernameRequest,
  jwtSecret: string
) {
  if (!req.username || !req.password) {
    throw appError('Format data tidak valid', 400)
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', req.username)
    .is('deleted_at', null)
    .single<User>()

  if (error || !user) {
    throw appError('Email/username atau password salah', 401, 'credentials')
  }

  const validPassword = await bcrypt.compare(req.password, user.password)

  if (!validPassword) {
    throw appError('Email/username atau password salah', 401, 'credentials')
  }

  if (!user.email_verified_at) {
    throw appError('Email belum diverifikasi, silakan cek inbox Anda', 403, 'email')
  }

  if (user.is_aktif !== 'Y') {
    throw appError('Akun tidak aktif', 403, 'user')
  }

  const token = await generateAccessToken(user.id, user.role, user.token_version ?? 0, jwtSecret)
  const responseUser = toUserResponse(user)

  return {
    user: responseUser,
    accessToken: token,
  }
}

export async function logoutUser(supabase: SupabaseClient, userId: number) {
  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('token_version')
    .eq('id', userId)
    .single()

  if (fetchError || !user) {
    throw appError('User tidak ditemukan', 404)
  }

  const { error } = await supabase
    .from('users')
    .update({ token_version: (user.token_version ?? 0) + 1 })
    .eq('id', userId)

  if (error) {
    throw appError('Gagal logout', 500)
  }
}

export async function registerUser(
  supabase: SupabaseClient,
  req: RegisterRequest,
  emailConfig: EmailConfig
) {
  if (!req.username || !req.email || !req.password) {
    throw appError('Format data tidak valid', 400)
  }

  const usernameInvalid = validateUsername(req.username)
  if (usernameInvalid) throw appError(usernameInvalid, 400, 'username')

  const passwordError = validatePassword(req.password)
  if (passwordError) throw appError(passwordError, 400, 'password')

  const { count: emailCount, error: emailError } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('email', req.email)

  if (emailError) {
    throw appError(
      emailError.message?.trim() || emailError.details || emailError.hint || 'Gagal cek email',
      500
    )
  }

  if ((emailCount || 0) > 0) {
    throw appError('Email sudah terdaftar', 409, 'email')
  }

  const { count: usernameCount, error: usernameError } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('username', req.username)

  if (usernameError) {
    throw appError(
      usernameError.message?.trim() || usernameError.details || usernameError.hint || 'Gagal cek username',
      500
    )
  }

  if ((usernameCount || 0) > 0) {
    throw appError('Username sudah digunakan', 409, 'username')
  }

  const hashedPassword = await bcrypt.hash(req.password, 12)
  const verificationToken = generateSecureToken(32)

  const tokenExpiresAt = new Date()
  tokenExpiresAt.setHours(tokenExpiresAt.getHours() + 24)

  const { data: user, error } = await supabase
    .from('users')
    .insert({
      username: req.username,
      first_name: req.first_name || '',
      last_name: req.last_name || '',
      email: req.email,
      phone: req.phone || '',
      password: hashedPassword,
      group_id: req.group_id || 2,
      role: 'user',
      is_aktif: 'N',
      subscribe_newsletter: req.subscribe_newsletter || false,
      verification_token: verificationToken,
      token_expires_at: tokenExpiresAt.toISOString(),
    })
    .select('*')
    .single<User>()

  if (error || !user) {
    throw appError(
      error?.message?.trim() || error?.details || error?.hint || 'Gagal simpan user',
      500
    )
  }

  const fullName = `${req.first_name || ''} ${req.last_name || ''}`.trim() || req.username

  try {
    await sendVerificationEmail(emailConfig, req.email, fullName, verificationToken)
  } catch (sendError) {
    // Rollback: jangan sisakan akun tanpa verifikasi kalau emailnya gagal terkirim,
    // supaya user bisa coba daftar ulang dan tabel users tidak terisi data yatim.
    await supabase.from('users').delete().eq('id', user.id)
    throw sendError
  }

  return toUserResponse(user)
}

export async function resendVerification(
  supabase: SupabaseClient,
  email: string,
  emailConfig: EmailConfig
) {
  if (!email) {
    throw appError('Email tidak boleh kosong', 400, 'email')
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, first_name, last_name, username, email_verified_at')
    .eq('email', email)
    .is('deleted_at', null)
    .single<User>()

  if (error || !user) {
    throw appError('Email tidak ditemukan', 404, 'email')
  }

  if (user.email_verified_at) {
    throw appError('Email sudah diverifikasi', 400, 'email')
  }

  const verificationToken = generateSecureToken(32)
  const tokenExpiresAt = new Date()
  tokenExpiresAt.setHours(tokenExpiresAt.getHours() + 24)

  const { error: updateError } = await supabase
    .from('users')
    .update({
      verification_token: verificationToken,
      token_expires_at: tokenExpiresAt.toISOString(),
    })
    .eq('id', user.id)

  if (updateError) {
    throw appError('Gagal membuat token verifikasi', 500)
  }

  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username
  await sendVerificationEmail(emailConfig, user.email, fullName, verificationToken)
}

export async function forgotPassword(
  supabase: SupabaseClient,
  email: string,
  emailConfig: EmailConfig
) {
  if (!email) {
    throw appError('Email tidak boleh kosong', 400, 'email')
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, first_name, last_name, username')
    .eq('email', email)
    .is('deleted_at', null)
    .single()

  if (error || !user) {
    throw appError('Email tidak ditemukan', 404, 'email')
  }

  const otp = generateOtp()
  const otpExpiresAt = new Date()
  otpExpiresAt.setMinutes(otpExpiresAt.getMinutes() + OTP_TTL_MINUTES)

  const { error: updateError } = await supabase
    .from('users')
    .update({
      reset_otp: otp,
      reset_otp_expires_at: otpExpiresAt.toISOString(),
      reset_otp_attempts: 0,
    })
    .eq('id', user.id)

  if (updateError) {
    throw appError('Gagal membuat OTP', 500)
  }

  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username
  await sendOtpEmail(emailConfig, email, fullName, otp)
}

export async function verifyOtp(
  supabase: SupabaseClient,
  email: string,
  otp: string
) {
  if (!email || !otp) {
    throw appError('Email dan OTP tidak boleh kosong', 400)
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('id, reset_otp, reset_otp_expires_at, reset_otp_attempts')
    .eq('email', email)
    .is('deleted_at', null)
    .single()

  if (error || !user) {
    throw appError('Email tidak ditemukan', 404, 'email')
  }

  if (!user.reset_otp) {
    throw appError('Kode OTP tidak ditemukan atau sudah dipakai. Minta kode baru.', 400, 'otp')
  }

  if ((user.reset_otp_attempts ?? 0) >= OTP_MAX_ATTEMPTS) {
    throw appError('Terlalu banyak percobaan salah. Minta kode OTP baru.', 400, 'otp')
  }

  if (!user.reset_otp_expires_at || new Date(user.reset_otp_expires_at) < new Date()) {
    throw appError('OTP sudah kadaluarsa', 400, 'otp')
  }

  if (user.reset_otp !== String(otp)) {
    const attempts = (user.reset_otp_attempts ?? 0) + 1
    // OTP dihanguskan setelah batas percobaan tercapai
    await supabase
      .from('users')
      .update(attempts >= OTP_MAX_ATTEMPTS
        ? { reset_otp: null, reset_otp_expires_at: null, reset_otp_attempts: 0 }
        : { reset_otp_attempts: attempts })
      .eq('id', user.id)
    const left = OTP_MAX_ATTEMPTS - attempts
    throw appError(
      left > 0 ? `OTP tidak valid. Sisa percobaan: ${left}` : 'Terlalu banyak percobaan salah. Minta kode OTP baru.',
      400,
      'otp'
    )
  }

  const resetToken = generateSecureToken(32)
  const resetTokenExpiresAt = new Date()
  resetTokenExpiresAt.setMinutes(resetTokenExpiresAt.getMinutes() + 15)

  const { error: updateError } = await supabase
    .from('users')
    .update({
      reset_otp: null,
      reset_otp_expires_at: null,
      reset_otp_attempts: 0,
      verification_token: resetToken,
      token_expires_at: resetTokenExpiresAt.toISOString(),
    })
    .eq('id', user.id)

  if (updateError) {
    throw appError('Gagal memproses OTP', 500)
  }

  return { resetToken }
}

export async function resetPassword(
  supabase: SupabaseClient,
  resetToken: string,
  newPassword: string
) {
  if (!resetToken || !newPassword) {
    throw appError('Token dan password tidak boleh kosong', 400)
  }

  const passwordError = validatePassword(newPassword)
  if (passwordError) throw appError(passwordError, 400, 'password')

  const { data: user, error } = await supabase
    .from('users')
    .select('id, token_expires_at, token_version')
    .eq('verification_token', resetToken)
    .is('deleted_at', null)
    .single()

  if (error || !user) {
    throw appError('Token tidak valid', 400, 'token')
  }

  if (new Date(user.token_expires_at) < new Date()) {
    throw appError('Token sudah kadaluarsa', 400, 'token')
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12)

  const { error: updateError } = await supabase
    .from('users')
    .update({
      password: hashedPassword,
      verification_token: null,
      token_expires_at: null,
      // naikkan token_version: semua sesi login lama otomatis ditolak setelah password diganti
      token_version: (user.token_version ?? 0) + 1,
    })
    .eq('id', user.id)

  if (updateError) {
    throw appError('Gagal mengubah password', 500)
  }
}