import { Hono } from 'hono'
import { createSupabase } from '../lib/supabase'
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware'
import { validateUsername } from '../utils/validation'

type Env = {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  JWT_SECRET: string
}

type Variables = {
  user: { user_id: number; role?: string }
}

export const userRoute = new Hono<{ Bindings: Env; Variables: Variables }>()

// PUT /users/me — update profil sendiri (bukan admin CRUD)
userRoute.put('/me', authMiddleware, async (c) => {
  try {
    const jwtUser = c.get('user')
    const body = await c.req.json()
    const supabase = createSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

    const allowedFields = ['username', 'first_name', 'last_name', 'phone', 'subscribe_newsletter']
    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) updates[field] = body[field]
    }

    if (typeof updates.username === 'string') {
      updates.username = updates.username.trim()
      const usernameError = validateUsername(updates.username)
      if (usernameError) {
        return c.json({ status: 'error', message: usernameError }, 400)
      }
      const { count } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('username', updates.username)
        .neq('id', jwtUser.user_id)
      if ((count || 0) > 0) {
        return c.json({ status: 'error', message: 'Username sudah digunakan' }, 409)
      }
    }

    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', jwtUser.user_id)
      .select('id, username, first_name, last_name, email, phone, group_id, role, is_aktif, subscribe_newsletter, email_verified_at, created_at, updated_at')
      .single()

    if (error) {
      return c.json({ status: 'error', message: error.message }, 500)
    }

    return c.json({ status: 'success', message: 'Profil berhasil diperbarui', ...data })
  } catch (err: any) {
    return c.json({ status: 'error', message: err?.message || 'Gagal update profil' }, 500)
  }
})


// Daftar & hapus user berisi data pribadi (email, telepon) & aksi destruktif —
// dulu cuma butuh login (role apa saja), sekarang wajib admin/developer.
userRoute.get('/', authMiddleware, roleMiddleware('admin', 'developer'), async (c) => {
  try {
    const supabase = createSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

    const { data, error } = await supabase
      .from('users')
      .select('id, username, first_name, last_name, email, phone, group_id, role, is_aktif, subscribe_newsletter, email_verified_at, created_at, updated_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      return c.json({ status: 'error', message: error.message }, 500)
    }

    return c.json({
      status: 'success',
      data: data ?? [],
    })
  } catch (err: any) {
    return c.json({ status: 'error', message: err?.message || 'Gagal mengambil data user' }, 500)
  }
})


userRoute.delete('/:username', authMiddleware, roleMiddleware('admin'), async (c) => {
  try {
    const username = c.req.param('username')
    const supabase = createSupabase(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

    const { error } = await supabase
      .from('users')
      .update({ deleted_at: new Date().toISOString() })
      .eq('username', username)

    if (error) {
      return c.json({ status: 'error', message: error.message }, 500)
    }

    return c.json({ status: 'success', message: 'User berhasil dihapus' })
  } catch (err: any) {
    return c.json({ status: 'error', message: err?.message || 'Gagal menghapus user' }, 500)
  }
})