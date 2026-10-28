// Validasi bersama (register, reset password, profil, harga)

export const USERNAME_RE = /^[a-zA-Z0-9._-]{3,30}$/

/**
 * Aturan password: minimal 8 karakter, mengandung huruf dan angka.
 * Maksimal 72 byte karena bcrypt hanya membaca 72 byte pertama (sisanya diabaikan diam-diam).
 * Mengembalikan pesan error, atau '' bila valid.
 */
export function validatePassword(password: unknown): string {
  if (typeof password !== 'string' || password.length === 0) return 'Password wajib diisi'
  if (password.length < 8) return 'Password minimal 8 karakter'
  if (new TextEncoder().encode(password).length > 72) return 'Password maksimal 72 karakter'
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Password harus mengandung huruf dan angka'
  return ''
}

export function validateUsername(username: unknown): string {
  if (typeof username !== 'string' || !username.trim()) return 'Username wajib diisi'
  if (!USERNAME_RE.test(username)) {
    return 'Username 3-30 karakter: huruf, angka, titik, garis bawah, atau tanda hubung'
  }
  return ''
}

/**
 * Ubah teks harga ("9000000", "Rp 9.000.000") menjadi bilangan bulat rupiah.
 * Mengembalikan 0 bila tidak ada angka yang masuk akal.
 */
export function parsePrice(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? Math.round(value) : 0
  if (typeof value !== 'string') return 0
  const digits = value.replace(/[.,\s]/g, '').match(/\d+/)
  if (!digits) return 0
  const n = parseInt(digits[0], 10)
  return Number.isSafeInteger(n) && n > 0 ? n : 0
}

// Batas harga final proyek yang masuk akal (Rp 10.000 – Rp 10 miliar)
export const MIN_PROJECT_PRICE = 10_000
export const MAX_PROJECT_PRICE = 10_000_000_000

/** OTP 6 digit dari sumber acak kriptografis (bukan Math.random) */
export function generateOtp(): string {
  const buf = new Uint32Array(1)
  // buang nilai di atas kelipatan 1.000.000 terbesar agar distribusi merata
  const limit = Math.floor(0x100000000 / 1_000_000) * 1_000_000
  let n: number
  do {
    crypto.getRandomValues(buf)
    n = buf[0]
  } while (n >= limit)
  return String(n % 1_000_000).padStart(6, '0')
}
