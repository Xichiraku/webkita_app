import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Project,
  ProjectStatus,
  ProjectCategory,
  CreateProjectRequest,
} from '../types/project'
import { MAX_PROJECT_PRICE, MIN_PROJECT_PRICE, parsePrice } from '../utils/validation'

function appError(message: string, code = 400) {
  const error = new Error(message) as Error & { code?: number }
  error.code = code
  return error
}

const validCategories: ProjectCategory[] = [
  'website',
  'mobile',
  'desktop',
  'design',
  'marketing',
  'other',
]

const validStatuses: ProjectStatus[] = [
  'pending',
  'process',
  'approved',
  'rejected',
  'done',
]

export async function createProject(
  supabase: SupabaseClient,
  userId: number,
  body: CreateProjectRequest
): Promise<Project> {
  if (!userId) throw appError('User ID tidak valid', 400)
  if (!body.project_title) throw appError('Project title wajib diisi', 400)
  if (!body.category) throw appError('Category wajib diisi', 400)
  if (!body.description || body.description.length < 100) {
    throw appError('Description minimal 100 karakter', 400)
  }
  if (!body.skills) throw appError('Skills wajib diisi', 400)
  if (!body.contact_name) throw appError('Contact name wajib diisi', 400)
  if (!body.contact_phone) throw appError('Contact phone wajib diisi', 400)
  if (!validCategories.includes(body.category)) {
    throw appError('Category tidak valid', 400)
  }

  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: userId,
      plan_title: body.plan_title || '',
      price_range: body.price_range || '',
      project_title: body.project_title,
      category: body.category,
      description: body.description,
      skills: body.skills,
      contact_name: body.contact_name,
      contact_phone: body.contact_phone,
      additional_notes: body.additional_notes || '',
      status: 'pending' as ProjectStatus,
    })
    .select('*')
    .single()

  if (error) throw appError(error.message, 500)
  return data as Project
}

export async function getMyProjects(
  supabase: SupabaseClient,
  userId: number
): Promise<Project[]> {
  if (!userId) throw appError('User ID tidak valid', 400)

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw appError(error.message, 500)
  return data as Project[]
}

export async function getProjectById(
  supabase: SupabaseClient,
  id: number
): Promise<Project> {
  if (!id) throw appError('Project ID tidak valid', 400)

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error) throw appError(error.message, 404)
  return data as Project
}

export async function getAllProjects(
  supabase: SupabaseClient
): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw appError(error.message, 500)
  return data as Project[]
}

export async function getProjectsByUser(
  supabase: SupabaseClient,
  userId: number
): Promise<Project[]> {
  if (!userId) throw appError('User ID tidak valid', 400)

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw appError(error.message, 500)
  return data as Project[]
}

/**
 * Alur status satu arah: Menunggu → Disetujui → Diproses → Selesai.
 * "Ditolak" bisa dipilih dari Menunggu/Disetujui dan bersifat final.
 * (Sama dengan NEXT_STATUS di frontend — ubah keduanya bersamaan.)
 */
export const STATUS_FLOW: Record<ProjectStatus, ProjectStatus[]> = {
  pending: ['approved', 'rejected'],
  approved: ['process', 'rejected'],
  process: ['done'],
  done: [],
  rejected: [],
}

export const MAX_REJECT_REASON = 500

export async function updateProjectStatus(
  supabase: SupabaseClient,
  id: number,
  status: ProjectStatus,
  reason?: string
): Promise<Project> {
  if (!id) throw appError('Project ID tidak valid', 400)
  if (!validStatuses.includes(status)) {
    throw appError('Status project tidak valid', 400)
  }

  const cleanReason = typeof reason === 'string' ? reason.trim() : ''
  if (cleanReason.length > MAX_REJECT_REASON) {
    throw appError(`Alasan penolakan maksimal ${MAX_REJECT_REASON} karakter`, 400)
  }

  const current = await getProjectById(supabase, id)
  if (current.status === status) return current // sudah di status itu, tidak ada yang berubah

  if (!STATUS_FLOW[current.status]?.includes(status)) {
    throw appError(
      current.status === 'rejected'
        ? 'Orderan yang ditolak tidak dapat diubah lagi'
        : `Status tidak dapat diubah dari "${current.status}" ke "${status}"`,
      409
    )
  }

  const update: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }
  if (status === 'rejected') update.reject_reason = cleanReason || null

  // Syarat `status = current.status` mencegah dua admin saling menimpa status yang sama
  const { data, error } = await supabase
    .from('projects')
    .update(update)
    .eq('id', id)
    .eq('status', current.status)
    .is('deleted_at', null)
    .select('*')
    .maybeSingle()

  if (error) throw appError(error.message, 500)
  if (!data) throw appError('Status orderan baru saja diubah oleh pengguna lain, muat ulang data', 409)
  return data as Project
}

export async function deleteProject(
  supabase: SupabaseClient,
  id: number
): Promise<true> {
  if (!id) throw appError('Project ID tidak valid', 400)

  const { error } = await supabase
    .from('projects')
    .update({
      deleted_at: new Date().toISOString(),
    })
    .eq('id', id)
    .is('deleted_at', null)

  if (error) throw appError(error.message, 500)
  return true
}

/**
 * Admin menetapkan harga final. Hanya boleh sekali (harga yang sudah ditagihkan tidak boleh berubah).
 * Menerbitkan invoice (nomor + tanggal terbit) pada saat harga ditetapkan.
 */
export async function setProjectPrice(
  supabase: SupabaseClient,
  id: number,
  rawPrice: unknown
): Promise<Project> {
  if (!id) throw appError('Project ID tidak valid', 400)

  const price = parsePrice(rawPrice)
  if (!price) throw appError('Harga tidak valid', 400)
  if (price < MIN_PROJECT_PRICE || price > MAX_PROJECT_PRICE) {
    throw appError('Harga di luar batas yang diizinkan', 400)
  }

  const project = await getProjectById(supabase, id)
  if (project.status === 'rejected') {
    throw appError('Harga tidak dapat ditetapkan untuk orderan yang ditolak', 409)
  }
  if (project.plan_price_range) {
    throw appError('Harga sudah ditetapkan dan tidak dapat diubah', 403)
  }

  const now = new Date()
  const { data, error } = await supabase
    .from('projects')
    .update({
      plan_price_range: String(price),
      invoice_number: `INV-${String(id).padStart(4, '0')}-${now.getFullYear()}`,
      invoice_issued_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq('id', id)
    .is('deleted_at', null)
    .or('plan_price_range.is.null,plan_price_range.eq.') // atomik: gagal bila admin lain sudah mengisi
    .select('*')
    .maybeSingle()

  if (error) throw appError(error.message, 500)
  if (!data) throw appError('Harga sudah ditetapkan dan tidak dapat diubah', 403)
  return data as Project
}
