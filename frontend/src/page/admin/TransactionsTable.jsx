import React, { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, CircleX, Clock3, Copy, ReceiptText, RefreshCw, RotateCcw, Search, ShieldAlert, Wallet } from "lucide-react";
import Pager from "./Pager";
import { TrxStatusChip } from "../../components/ui/StatusChip";
import { formatDate, rp } from "../../utils/format";
import { TRX_KEYS, TRX_STATUS } from "../../utils/status";
import { A_CARD_BTN, A_INPUT, A_SELECT, filterChip } from "../../utils/ui";

const PER = 10;

const TransactionsTable = ({ ctx }) => {
  const navigate = useNavigate();
  const { trx, loading, refresh, notify } = ctx;
  const [filter, setFilter] = useState("semua");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("baru");
  const [page, setPage] = useState(1);
  const [anim, setAnim] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const tableRef = useRef(null);

  const cnt = (k) => (k === "semua" ? trx.length : trx.filter((t) => t.status === k).length);
  const sum = (k) => trx.filter((t) => t.status === k).reduce((s, t) => s + t.amount, 0);
  const setF = (k) => { setFilter(k); setPage(1); setAnim((n) => n + 1); };

  const list = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^#/, "");
    const tm = (t) => new Date(t.createdAt).getTime() || 0;
    return trx
      .filter((t) => (filter === "semua" || t.status === filter) && (!q || t.orderId.toLowerCase().includes(q) || String(t.projectId) === q))
      .sort((a, b) => {
        if (sortBy === "lama") return tm(a) - tm(b);
        if (sortBy === "jumlah") return b.amount - a.amount;
        return tm(b) - tm(a);
      });
  }, [trx, filter, query, sortBy]);

  const pages = Math.max(1, Math.ceil(list.length / PER));
  const cur = Math.min(page, pages);
  const base = (cur - 1) * PER;
  const rows = list.slice(base, base + PER);

  const copy = async (id) => {
    try { await navigator.clipboard.writeText(id); notify(`Order ID ${id} disalin.`); }
    catch { notify("Gagal menyalin Order ID.", "err"); }
  };

  const cards = [
    ["paid", "Total Lunas", rp(sum("paid")), `${cnt("paid")} transaksi diterima`, Wallet],
    ["pending", "Menunggu Bayar", rp(sum("pending")), `${cnt("pending")} transaksi pending`, Clock3],
    ["challenge", "Perlu Ditinjau", String(cnt("challenge")), "status Challenge", ShieldAlert],
    ["failed", "Gagal", String(cnt("failed")), "tidak berhasil dibayar", CircleX],
  ];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">Transaksi</h1>
          <p className="mt-1 text-ink-600">{trx.length} transaksi tercatat</p>
        </div>
        <button type="button" onClick={async () => { setSpinning(true); await refresh(); setSpinning(false); }} disabled={spinning || loading} className={A_CARD_BTN}>
          <RefreshCw className={`h-4 w-4 ${spinning || loading ? "animate-spin" : ""}`} aria-hidden="true" /> Refresh
        </button>
      </div>

      <section aria-label="Ringkasan transaksi" className="admin-grid mt-6 grid grid-cols-1 gap-4 min-[560px]:grid-cols-2 xl:grid-cols-4">
        {cards.map(([k, label, val, sub, Icon]) => {
          const on = filter === k;
          return (
            <button key={k} type="button" aria-pressed={on} onClick={() => setF(on ? "semua" : k)} className={`card flex w-full items-center gap-4 rounded-3xl p-5 text-left transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400 ${on ? "ring-2 ring-brand-500" : ""}`}>
              <span className="tile grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-brand-700"><Icon className="h-5 w-5" aria-hidden="true" /></span>
              <span className="min-w-0">
                <span className="block truncate text-xl font-extrabold tabular-nums text-ink-900">{val}</span>
                <span className="block text-sm font-semibold text-ink-700">{label}</span>
                <span className="block text-xs text-ink-600">{sub}</span>
              </span>
            </button>
          );
        })}
      </section>

      {cnt("challenge") > 0 && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[#C7D2FE] bg-[#EEF2FF] p-4 text-[#312E81]" role="status">
          <ShieldAlert className="h-5 w-5 shrink-0" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-sm"><b>{cnt("challenge")} transaksi berstatus Challenge</b> ditahan untuk tinjauan risiko penipuan. Putuskan terima atau tolak di dashboard Midtrans, lalu status di sini ikut berubah otomatis.</p>
          <button type="button" onClick={() => { setF("challenge"); tableRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }); }} className="shrink-0 rounded-lg border border-[#A5B4FC] bg-white px-3 py-1.5 text-sm font-bold text-[#3730A3] hover:bg-[#E0E7FF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4F46E5]">Tampilkan</button>
        </div>
      )}

      <section aria-label="Daftar transaksi" className="mt-5">
        <div className="card rounded-3xl">
          <div className="space-y-4 p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative w-full sm:max-w-sm">
                <label htmlFor="search" className="sr-only">Cari transaksi</label>
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-500" aria-hidden="true" />
                <input id="search" type="search" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Cari order ID atau project…" autoComplete="off" className={`${A_INPUT} pl-10 pr-4`} />
              </div>
              <div className="sm:w-64">
                <label htmlFor="f-sort" className="sr-only">Urutkan</label>
                <select id="f-sort" value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); setAnim((n) => n + 1); }} className={A_SELECT}>
                  <option value="baru">Urutkan: Terbaru</option>
                  <option value="lama">Urutkan: Terlama</option>
                  <option value="jumlah">Urutkan: Jumlah tertinggi</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="-mx-5 min-w-0 flex-1 overflow-x-auto px-5 sm:mx-0 sm:px-0">
                <div className="flex w-max gap-2" role="group" aria-label="Filter status">
                  {["semua", ...TRX_KEYS].map((k) => (
                    <button key={k} type="button" aria-pressed={k === filter} onClick={() => setF(k)} className={filterChip(k === filter)}>
                      {k === "semua" ? "Semua" : TRX_STATUS[k].label}
                      <span className={`text-xs font-bold ${k === filter ? "text-brand-700" : "text-ink-600"}`}>{cnt(k)}</span>
                    </button>
                  ))}
                </div>
              </div>
              {(filter !== "semua" || query) && (
                <button type="button" onClick={() => { setF("semua"); setQuery(""); }} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold text-brand-700 hover:bg-brand-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400">
                  <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reset
                </button>
              )}
            </div>
          </div>

          <div ref={tableRef}>
            {loading && !trx.length ? (
              <p className="px-6 pb-10 text-center text-sm text-ink-600">Memuat transaksi…</p>
            ) : !rows.length ? (
              <div className="px-6 py-14 text-center">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600"><ReceiptText className="h-7 w-7" aria-hidden="true" /></span>
                <p className="mt-4 font-extrabold text-ink-900">Transaksi tidak ditemukan</p>
                <p className="mt-1 text-ink-600">{trx.length ? "Coba ubah kata kunci atau filter status." : "Belum ada transaksi yang tercatat."}</p>
              </div>
            ) : (
              <div className="scroll-thin overflow-x-auto">
                <table className="w-full min-w-[780px] text-left text-sm">
                  <caption className="sr-only">Daftar transaksi</caption>
                  <thead className="bg-brand-50/70 text-xs font-bold uppercase tracking-wide text-ink-600">
                    <tr>
                      <th scope="col" className="px-6 py-3.5">#</th>
                      <th scope="col" className="px-3 py-3.5">Order ID</th>
                      <th scope="col" className="px-3 py-3.5">Project ID</th>
                      <th scope="col" className="px-3 py-3.5 text-right">Jumlah</th>
                      <th scope="col" className="px-3 py-3.5 pl-8">Status</th>
                      <th scope="col" className="px-6 py-3.5">Tanggal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {rows.map((t, i) => (
                      <tr key={`${anim}-${cur}-${t.id}`} className="row-in align-middle transition hover:bg-brand-50/50" style={{ "--d": `${i * 35}ms` }}>
                        <td className="px-6 py-4 text-ink-600">{base + i + 1}</td>
                        <td className="px-3 py-4">
                          <span className="inline-flex items-center gap-2">
                            <code className="rounded-md bg-ink-100 px-2 py-1 font-mono text-[13px] font-bold text-ink-900">{t.orderId}</code>
                            <button type="button" onClick={() => copy(t.orderId)} className="grid h-8 w-8 place-items-center rounded-lg text-ink-500 transition hover:bg-brand-50 hover:text-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400" aria-label={`Salin Order ID ${t.orderId}`}>
                              <Copy className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </span>
                        </td>
                        <td className="px-3 py-4">
                          <button type="button" onClick={() => navigate(`/admin/orderan?id=${t.projectId}`)} className="inline-flex items-center gap-1 rounded font-bold text-brand-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400" aria-label={`Lihat orderan #${t.projectId}`}>
                            #{t.projectId}<ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-right font-extrabold tabular-nums text-ink-900">{rp(t.amount)}</td>
                        <td className="px-3 py-4 pl-8"><TrxStatusChip status={t.status} /></td>
                        <td className="whitespace-nowrap px-6 py-4 text-ink-700">{formatDate(t.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <Pager
            page={cur}
            pages={pages}
            hideWhenSingle
            info={list.length ? `Menampilkan ${base + 1}–${Math.min(list.length, base + PER)} dari ${list.length} transaksi` : ""}
            onPage={(p) => { setPage(p); setAnim((n) => n + 1); }}
          />
        </div>
        <p className="sr-only" role="status" aria-live="polite">{list.length} transaksi ditemukan</p>
      </section>
    </>
  );
};

export default TransactionsTable;
