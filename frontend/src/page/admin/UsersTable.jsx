import React, { useMemo, useState } from "react";
import { Code2, RefreshCw, RotateCcw, Search, ShieldCheck, User as UserIcon, UserSearch } from "lucide-react";
import Pager from "./Pager";
import { formatDate, initials } from "../../utils/format";
import { A_CARD_BTN, A_INPUT, A_SELECT, filterChip } from "../../utils/ui";

const PER = 10;
const TINT = ["bg-brand-100 text-brand-800", "bg-[#CFFAFE] text-[#0E7490]", "bg-[#CCFBF1] text-[#0F766E]", "bg-[#E0E7FF] text-[#3730A3]"];
const ROLE = {
  admin: { label: "Admin", icon: ShieldCheck, cls: "bg-brand-600 text-white" },
  developer: { label: "Developer", icon: Code2, cls: "bg-[#E0E7FF] text-[#3730A3]" },
  user: { label: "User", icon: UserIcon, cls: "bg-ink-100 text-ink-700" },
};
const roleOf = (r) => (ROLE[r] ? r : "user");

const UsersTable = ({ ctx }) => {
  const { users, orders, loading, refresh, meId } = ctx;
  const [role, setRole] = useState("semua");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("baru");
  const [page, setPage] = useState(1);
  const [anim, setAnim] = useState(0);
  const [spinning, setSpinning] = useState(false);

  const orderCount = useMemo(() => {
    const m = {};
    orders.forEach((o) => { m[o.userId] = (m[o.userId] || 0) + 1; });
    return m;
  }, [orders]);

  const roles = ["semua", "admin", ...(users.some((u) => u.role === "developer") ? ["developer"] : []), "user"];
  const cnt = (r) => (r === "semua" ? users.length : users.filter((u) => roleOf(u.role) === r).length);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const t = (u) => new Date(u.createdAt).getTime() || 0;
    return users
      .filter((u) => (role === "semua" || roleOf(u.role) === role) && (!q || `${u.name} ${u.email} ${u.username}`.toLowerCase().includes(q)))
      .sort((a, b) => {
        if (sortBy === "nama") return a.name.localeCompare(b.name, "id");
        if (sortBy === "lama") return t(a) - t(b) || a.id - b.id;
        return t(b) - t(a) || b.id - a.id;
      });
  }, [users, role, query, sortBy]);

  const pages = Math.max(1, Math.ceil(list.length / PER));
  const cur = Math.min(page, pages);
  const rows = list.slice((cur - 1) * PER, cur * PER);
  const resetAll = () => { setRole("semua"); setQuery(""); setPage(1); setAnim((n) => n + 1); };

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">Manajemen Pengguna</h1>
          <p className="mt-1 text-ink-600">{users.length} pengguna terdaftar</p>
        </div>
        <button type="button" onClick={async () => { setSpinning(true); await refresh(); setSpinning(false); }} disabled={spinning || loading} className={A_CARD_BTN}>
          <RefreshCw className={`h-4 w-4 ${spinning || loading ? "animate-spin" : ""}`} aria-hidden="true" /> Refresh
        </button>
      </div>

      <section aria-label="Daftar pengguna" className="mt-6">
        <div className="card rounded-3xl">
          <div className="space-y-4 p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative w-full sm:max-w-sm">
                <label htmlFor="search" className="sr-only">Cari pengguna</label>
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-500" aria-hidden="true" />
                <input id="search" type="search" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Cari nama atau email…" autoComplete="off" className={`${A_INPUT} pl-10 pr-4`} />
              </div>
              <div className="sm:w-72">
                <label htmlFor="f-sort" className="sr-only">Urutkan</label>
                <select id="f-sort" value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); setAnim((n) => n + 1); }} className={A_SELECT}>
                  <option value="baru">Urutkan: Bergabung terbaru</option>
                  <option value="lama">Urutkan: Bergabung terlama</option>
                  <option value="nama">Urutkan: Nama A–Z</option>
                </select>
              </div>
              <p className="text-sm text-ink-600 sm:ml-auto">{list.length} user</p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="-mx-5 min-w-0 flex-1 overflow-x-auto px-5 sm:mx-0 sm:px-0">
                <div className="flex w-max gap-2" role="group" aria-label="Filter role">
                  {roles.map((k) => (
                    <button key={k} type="button" aria-pressed={k === role} onClick={() => { setRole(k); setPage(1); setAnim((n) => n + 1); }} className={filterChip(k === role)}>
                      {k === "semua" ? "Semua" : ROLE[k].label}
                      <span className={`text-xs font-bold ${k === role ? "text-brand-700" : "text-ink-600"}`}>{cnt(k)}</span>
                    </button>
                  ))}
                </div>
              </div>
              {(role !== "semua" || query) && (
                <button type="button" onClick={resetAll} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold text-brand-700 hover:bg-brand-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400">
                  <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reset
                </button>
              )}
            </div>
          </div>

          {loading && !users.length ? (
            <p className="px-6 pb-10 text-center text-sm text-ink-600">Memuat pengguna…</p>
          ) : !rows.length ? (
            <div className="px-6 py-14 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600"><UserSearch className="h-7 w-7" aria-hidden="true" /></span>
              <p className="mt-4 font-extrabold text-ink-900">Pengguna tidak ditemukan</p>
              <p className="mt-1 text-ink-600">Coba ubah kata kunci atau filter role.</p>
              <button type="button" onClick={resetAll} className="mt-4 inline-flex items-center gap-2 rounded-xl border-2 border-ink-200 px-4 py-2 text-sm font-bold text-ink-800 hover:bg-ink-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400"><RotateCcw className="h-4 w-4" aria-hidden="true" /> Reset filter</button>
            </div>
          ) : (
            <div className="scroll-thin overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <caption className="sr-only">Daftar pengguna terdaftar</caption>
                <thead className="bg-brand-50/70 text-xs font-bold uppercase tracking-wide text-ink-600">
                  <tr>
                    <th scope="col" className="px-6 py-3.5">#</th>
                    <th scope="col" className="px-3 py-3.5">Pengguna</th>
                    <th scope="col" className="px-3 py-3.5">Email</th>
                    <th scope="col" className="px-3 py-3.5">Role</th>
                    <th scope="col" className="px-3 py-3.5">Orderan</th>
                    <th scope="col" className="px-6 py-3.5">Bergabung</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {rows.map((u, i) => {
                    const r = ROLE[roleOf(u.role)];
                    const Icon = r.icon;
                    return (
                      <tr key={`${anim}-${cur}-${u.id}`} className="row-in align-middle transition hover:bg-brand-50/50" style={{ "--d": `${i * 35}ms` }}>
                        <td className="px-6 py-4 text-ink-600">{u.id}</td>
                        <td className="px-3 py-4">
                          <span className="flex items-center gap-3">
                            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-extrabold ${TINT[Number(u.id) % TINT.length] || TINT[0]}`} aria-hidden="true">{initials(u.name)}</span>
                            <span className="font-bold text-ink-900">
                              {u.name}
                              {u.id === meId && <span className="ml-1.5 rounded-md bg-brand-50 px-1.5 py-0.5 text-xs font-bold text-brand-700">Kamu</span>}
                              <span className="block text-xs font-medium text-ink-600">@{u.username}</span>
                            </span>
                          </span>
                        </td>
                        <td className="px-3 py-4 text-ink-700"><span className="block max-w-[18rem] truncate" title={u.email}>{u.email}</span></td>
                        <td className="px-3 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${r.cls}`}><Icon className="h-3.5 w-3.5" aria-hidden="true" />{r.label}</span></td>
                        <td className="px-3 py-4 tabular-nums text-ink-700">{orderCount[u.id] || 0}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-ink-700">{formatDate(u.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <Pager
            page={cur}
            pages={pages}
            hideWhenSingle
            info={list.length ? `Menampilkan ${(cur - 1) * PER + 1}–${Math.min(list.length, cur * PER)} dari ${list.length} pengguna` : ""}
            onPage={(p) => { setPage(p); setAnim((n) => n + 1); }}
          />
        </div>
        <p className="sr-only" role="status" aria-live="polite">{list.length} pengguna ditemukan</p>
      </section>
    </>
  );
};

export default UsersTable;
