import { Hono } from 'hono'
import { createSupabase } from '../lib/supabase'
import {
    loginWithEmail,
    loginWithUsername,
    registerUser,
    forgotPassword,
    verifyOtp,
    resetPassword,
    resendVerification,
    logoutUser,
} from '../services/auth.service'
import { authMiddleware } from '../middleware/auth.middleware'

type Env = {
    SUPABASE_URL: string
    SUPABASE_SERVICE_ROLE_KEY: string
    JWT_SECRET: string
    RESEND_API_KEY: string
    MAIL_FROM_EMAIL: string
    MAIL_FROM_NAME: string
    APP_URL: string
}

export const authRoute = new Hono<{ Bindings: Env }>()

function handleError(err: any) {
    // Detail teknis (stack trace, raw error) hanya dicatat di log server,
    // TIDAK dikirim ke client — supaya implementasi internal tidak bocor ke publik.
    console.error('[auth]', err)

    return {
        body: {
            status: 'error',
            field: err?.field || '',
            message: err?.message || 'Terjadi kesalahan internal server',
        },
        code: typeof err?.code === 'number' ? err.code : 500,
    }
}

authRoute.get('/test', async (c) => {
    return c.json({ message: 'Auth route works' })
})

authRoute.post('/login-email', async (c) => {
    try {
        const body = await c.req.json()
        const supabase = createSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)
        const result = await loginWithEmail(supabase, body, c.env.JWT_SECRET)
        return c.json({
            status: 'success',
            message: 'Login berhasil',
            user: result.user,
            accessToken: result.accessToken,
        })
    } catch (err: any) {
        const error = handleError(err)
        return c.json(error.body, error.code as any)
    }
})

authRoute.post('/login-username', async (c) => {
    try {
        const body = await c.req.json()
        const supabase = createSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)
        const result = await loginWithUsername(supabase, body, c.env.JWT_SECRET)
        return c.json({
            status: 'success',
            message: 'Login berhasil',
            user: result.user,
            accessToken: result.accessToken,
        })
    } catch (err: any) {
        const error = handleError(err)
        return c.json(error.body, error.code as any)
    }
})

authRoute.post('/register', async (c) => {
    try {
        const body = await c.req.json()
        const supabase = createSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)
        const user = await registerUser(supabase, body, {
            resendApiKey: c.env.RESEND_API_KEY,
            mailFromEmail: c.env.MAIL_FROM_EMAIL,
            mailFromName: c.env.MAIL_FROM_NAME,
            appUrl: c.env.APP_URL,
        })
        return c.json(
            {
                status: 'success',
                message: 'Registrasi berhasil! Silakan cek email Anda untuk verifikasi akun.',
                data: user,
            },
            201
        )
    } catch (err: any) {
        const error = handleError(err)
        return c.json(error.body, error.code as any)
    }
})

authRoute.get('/verify-email', async (c) => {
    try {
        const token = c.req.query('token')
        if (!token) {
            return c.json({ status: 'error', message: 'Token tidak ditemukan' }, 400)
        }
        const supabase = createSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

        const { data: user, error: findError } = await supabase
            .from('users')
            .select('id, email_verified_at, token_expires_at')
            .eq('verification_token', token)
            .is('deleted_at', null)
            .single()

        if (findError || !user) {
            // Token sudah dipakai (dikosongkan setelah verifikasi): bedakan "sudah terverifikasi" dari "tidak valid"
            const email = c.req.query('email')
            if (email) {
                const { data: byEmail } = await supabase
                    .from('users')
                    .select('email_verified_at')
                    .eq('email', email)
                    .is('deleted_at', null)
                    .maybeSingle()
                if (byEmail?.email_verified_at) {
                    return c.json({ status: 'error', message: 'Email sudah diverifikasi' }, 400)
                }
            }
            return c.json({ status: 'error', message: 'Token tidak valid' }, 400)
        }

        if (user.email_verified_at) {
            return c.json({ status: 'error', message: 'Email sudah diverifikasi' }, 400)
        }

        if (new Date(user.token_expires_at) < new Date()) {
            return c.json({ status: 'error', message: 'Token sudah kadaluarsa' }, 400)
        }

        const { error: updateError } = await supabase
            .from('users')
            .update({
                email_verified_at: new Date().toISOString(),
                is_aktif: 'Y',
                verification_token: null,
                token_expires_at: null,
            })
            .eq('id', user.id)

        if (updateError) {
            return c.json({ status: 'error', message: 'Gagal verifikasi email' }, 500)
        }

        return c.json({
            status: 'success',
            message: 'Email berhasil diverifikasi! Akun Anda sudah aktif.',
        })
    } catch (err: any) {
        const error = handleError(err)
        return c.json(error.body, error.code as any)
    }
})

authRoute.post('/forgot-password', async (c) => {
    try {
        const body = await c.req.json()
        const supabase = createSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)
        await forgotPassword(supabase, body.email, {
            resendApiKey: c.env.RESEND_API_KEY,
            mailFromEmail: c.env.MAIL_FROM_EMAIL,
            mailFromName: c.env.MAIL_FROM_NAME,
            appUrl: c.env.APP_URL,
        })
        return c.json({
            status: 'success',
            message: 'Kode OTP telah dikirim ke email Anda',
        })
    } catch (err: any) {
        const error = handleError(err)
        return c.json(error.body, error.code as any)
    }
})

authRoute.post('/verify-otp', async (c) => {
    try {
        const body = await c.req.json()
        const supabase = createSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)
        const result = await verifyOtp(supabase, body.email, body.otp)
        return c.json({
            status: 'success',
            message: 'OTP valid',
            resetToken: result.resetToken,
        })
    } catch (err: any) {
        const error = handleError(err)
        return c.json(error.body, error.code as any)
    }
})

authRoute.post('/reset-password', async (c) => {
    try {
        const body = await c.req.json()
        const supabase = createSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)
        await resetPassword(supabase, body.reset_token, body.new_password)
        return c.json({
            status: 'success',
            message: 'Password berhasil diubah',
        })
    } catch (err: any) {
        const error = handleError(err)
        return c.json(error.body, error.code as any)
    }
})

authRoute.post('/resend-verification', async (c) => {
    try {
        const body = await c.req.json()
        const supabase = createSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)
        await resendVerification(supabase, body.email, {
            resendApiKey: c.env.RESEND_API_KEY,
            mailFromEmail: c.env.MAIL_FROM_EMAIL,
            mailFromName: c.env.MAIL_FROM_NAME,
            appUrl: c.env.APP_URL,
        })
        return c.json({
            status: 'success',
            message: 'Email verifikasi baru telah dikirim. Cek inbox Anda.',
        })
    } catch (err: any) {
        const error = handleError(err)
        return c.json(error.body, error.code as any)
    }
})

authRoute.post('/logout', authMiddleware, async (c) => {
    try {
        const jwtUser = c.get('user')
        const supabase = createSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)
        await logoutUser(supabase, jwtUser.user_id)
        return c.json({ status: 'success', message: 'Logout berhasil' })
    } catch (err: any) {
        const error = handleError(err)
        return c.json(error.body, error.code as any)
    }
})

authRoute.get('/profile', authMiddleware, async (c) => {
    try {
        const jwtUser = c.get('user')
        const supabase = createSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', jwtUser.user_id)
            .is('deleted_at', null)
            .single()

        if (error || !data) {
            return c.json({ status: 'error', message: 'User tidak ditemukan' }, 404)
        }

        const { password, verification_token, token_expires_at, deleted_at, token_version, ...safeUser } = data

        return c.json({
            status: 'success',
            ...safeUser,
            is_email_verified: safeUser.email_verified_at !== null,
        })
    } catch (err: any) {
        const error = handleError(err)
        return c.json(error.body, error.code as any)
    }
})