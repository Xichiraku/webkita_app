/** Ambil status HTTP dari error layanan (appError menyimpan `code`), selain itu pakai fallback. */
export function errorStatus(err: any, fallback = 500): 400 | 401 | 403 | 404 | 409 | 500 {
  const code = typeof err?.code === 'number' ? err.code : fallback
  return ([400, 401, 403, 404, 409].includes(code) ? code : 500) as 400 | 401 | 403 | 404 | 409 | 500
}
