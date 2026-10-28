// Supabase palsu di memori (cukup untuk query yang dipakai service) — hanya untuk tes.
type Row = Record<string, any>
type Filter = (r: Row) => boolean

export class FakeDb {
  tables: Record<string, Row[]> = {}
  seq: Record<string, number> = {}
  constructor(init: Record<string, Row[]>) {
    for (const [t, rows] of Object.entries(init)) {
      this.tables[t] = rows.map((r) => ({ ...r }))
      this.seq[t] = Math.max(0, ...rows.map((r) => Number(r.id) || 0))
    }
  }
  from(table: string) { return new Query(this, table) }
}

class Query {
  filters: Filter[] = []
  mode: 'select' | 'update' | 'insert' | 'delete' = 'select'
  patch: Row = {}
  rowsToInsert: Row[] = []
  orderBy?: { col: string; asc: boolean }
  max?: number
  constructor(private db: FakeDb, private table: string) {}
  select() { return this }
  update(p: Row) { this.mode = 'update'; this.patch = p; return this }
  insert(r: Row | Row[]) { this.mode = 'insert'; this.rowsToInsert = Array.isArray(r) ? r : [r]; return this }
  delete() { this.mode = 'delete'; return this }
  eq(c: string, v: any) { this.filters.push((r) => r[c] === v); return this }
  neq(c: string, v: any) { this.filters.push((r) => r[c] !== v); return this }
  is(c: string, v: any) { this.filters.push((r) => (v === null ? r[c] == null : r[c] === v)); return this }
  or(expr: string) {
    const parts = expr.split(',').map((p) => {
      const [col, op, ...rest] = p.split('.'); const val = rest.join('.')
      return (r: Row) => (op === 'is' && val === 'null' ? r[col] == null : op === 'eq' ? String(r[col] ?? '') === val && r[col] != null : false)
    })
    this.filters.push((r) => parts.some((f) => f(r)))
    return this
  }
  order(col: string, o: { ascending?: boolean } = {}) { this.orderBy = { col, asc: o.ascending !== false }; return this }
  limit(n: number) { this.max = n; return this }
  private run() {
    const rows = this.db.tables[this.table] ||= []
    if (this.mode === 'insert') {
      const out = this.rowsToInsert.map((r) => ({ id: ++this.db.seq[this.table], ...r }))
      rows.push(...out); return { data: out, error: null }
    }
    let hit = rows.filter((r) => this.filters.every((f) => f(r)))
    if (this.mode === 'update') { hit.forEach((r) => Object.assign(r, this.patch)) }
    if (this.mode === 'delete') { this.db.tables[this.table] = rows.filter((r) => !hit.includes(r)); return { data: null, error: null } }
    if (this.orderBy) { const { col, asc } = this.orderBy; hit = [...hit].sort((a, b) => (a[col] > b[col] ? 1 : -1) * (asc ? 1 : -1)) }
    if (this.max !== undefined) hit = hit.slice(0, this.max)
    return { data: hit.map((r) => ({ ...r })), error: null }
  }
  maybeSingle() {
    const { data, error } = this.run() as any
    return Promise.resolve({ data: data?.[0] ?? null, error })
  }
  single() {
    const { data, error } = this.run() as any
    return Promise.resolve(data?.length ? { data: data[0], error } : { data: null, error: { message: 'JSON object requested, multiple (or no) rows returned' } })
  }
  then(res: any, rej: any) { return Promise.resolve(this.run()).then(res, rej) }
}
