import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Download, RefreshCw, RotateCcw, Search } from "lucide-react";
import OrdersTable from "./OrdersTable";
import Pager from "./Pager";
import { categoryLabel, ORDER_KEYS, ORDER_STATUS } from "../../utils/status";
import { A_CARD_BTN, A_INPUT, A_SELECT, filterChip } from "../../utils/ui";

const PER = 8;

// cegah CSV/formula injection
const cell = (v) => {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
};

export default function AdminOrders({ ctx }) {
  const { orders, plans, loading, refresh, pickStatus, setPrice, openOrder, busyId, notify } = ctx;
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("");
  const [pkg, setPkg] = useState("");
  const [sortBy, setSortBy] = useState("baru");
  const [page, setPage] = useState(1);
  const [spinning, setSpinning] = useState(false);
  const [anim, setAnim] = useState(0);
  const wrapRef = useRef(null);

  // tautan dari halaman Transaksi: /admin/orderan?id=12
  const deepId = params.get("id");
  useEffect(() => {
    if (!deepId || !orders.length) return;
    if (openOrder(deepId)) { params.delete("id"); setParams(params, { replace: true }); }
  }, [deepId, orders, openOrder, params, setParams]);

  const cats = useMemo(() => [...new Set(orders.map((o) => o.category).filter(Boolean))].sort((a, b) => categoryLabel(a).localeCompare(categoryLabel(b), "id")), [orders]);
  const pkgs = useMemo(() => {
    const s = new Set(plans.map((p) => p.title));
    orders.forEach((o) => o.planTitle && s.add(o.planTitle));
    return [...s];
  }, [plans, orders]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = orders.filter((o) => {
      if (filter !== "all" && o.status !== filter) return false;
      if (cat && o.category !== cat) return false;
      if (pkg && o.planTitle !== pkg) return false;
      return !q || `${o.projectTitle} ${o.contactName} ${categoryLabel(o.category)} ${o.planTitle} ${o.contactPhone}`.toLowerCase().includes(q);
    });
    const t = (o) => new Date(o.createdAt).getTime() || 0;
    rows.sort((a, b) => {
      if (sortBy === "lama") return t(a) - t(b) || a.id - b.id;
      if (sortBy === "harga") return (b.price || -1) - (a.price || -1);
      if (sortBy === "nama") return String(a.contactName).localeCompare(String(b.contactName), "id");
      return t(b) - t(a) || b.id - a.id;
    });
    return rows;
  }, [orders, filter, cat, pkg, query, sortBy]);

  const pages = Math.max(1, Math.ceil(list.length / PER));
  const cur = Math.min(page, pages);
  const rows = list.slice((cur - 1) * PER, cur * PER);
  const anyFilter = filter !== "all" || cat || pkg || query;
  const cnt = (k) => (k === "all" ? orders.length : orders.filter((o) => o.status === k).length);
  const touch = (fn) => (...a) => { fn(...a); setPage(1); setAnim((n) => n + 1); };

  const resetAll = () => { setFilter("all"); setCat(""); setPkg(""); setQuery(""); setPage(1); setAnim((n) => n + 1); };

  const exportCsv = () => {
    const head = ["ID", "Proyek", "Kategori", "Paket", "Nama", "Telepon", "Tanggal", "Harga", "Status"];
    const csv = "﻿" + [head.map(cell).join(",")]
      .concat(list.map((o) => [o.id, o.projectTitle, categoryLabel(o.category), o.planTitle, o.contactName, o.contactPhone, (o.createdAt || "").slice(0, 10), o.price || "", ORDER_STATUS[o.status]?.adminLabel || o.status].map(cell).join(",")))
      .join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = "orderan-webkita.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    notify(`${list.length} orderan diekspor ke CSV.`);
  };

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">Manajemen Orderan</h1>
          <p className="mt-1 text-ink-600">{orders.length} orderan terdaftar</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={exportCsv} disabled={!list.length} className={A_CARD_BTN}><Download className="h-4 w-4" aria-hidden="true" /> Ekspor CSV</button>
          <button type="button" onClick={async () => { setSpinning(true); await refresh(); setSpinning(false); }} disabled={spinning || loading} className={A_CARD_BTN}>
            <RefreshCw className={`h-4 w-4 ${spinning || loading ? "animate-spin" : ""}`} aria-hidden="true" /> Refresh
          </button>
        </div>
      </div>

      <section aria-label="Daftar orderan" className="mt-6">
        <div className="card rounded-3xl">
          <div className="space-y-4 p-5 sm:p-6">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
              <div className="relative">
                <label htmlFor="search" className="sr-only">Cari orderan</label>
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-500" aria-hidden="true" />
                <input id="search" type="search" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Cari proyek, nama, atau telepon…" autoComplete="off" className={`${A_INPUT} pl-10 pr-4`} />
              </div>
              <div>
                <label htmlFor="f-cat" className="sr-only">Kategori</label>
                <select id="f-cat" value={cat} onChange={(e) => touch(setCat)(e.target.value)} className={A_SELECT}>
                  <option value="">Semua kategori</option>
                  {cats.map((c) => <option key={c} value={c}>{categoryLabel(c)}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="f-pkg" className="sr-only">Paket</label>
                <select id="f-pkg" value={pkg} onChange={(e) => touch(setPkg)(e.target.value)} className={A_SELECT}>
                  <option value="">Semua paket</option>
                  {pkgs.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="f-sort" className="sr-only">Urutkan</label>
                <select id="f-sort" value={sortBy} onChange={(e) => touch(setSortBy)(e.target.value)} className={A_SELECT}>
                  <option value="baru">Urutkan: Terbaru</option>
                  <option value="lama">Urutkan: Terlama</option>
                  <option value="harga">Urutkan: Harga tertinggi</option>
                  <option value="nama">Urutkan: Nama klien A–Z</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="scroll-thin -mx-5 min-w-0 flex-1 overflow-x-auto px-5 sm:mx-0 sm:px-0">
                <div className="flex w-max gap-2" role="group" aria-label="Filter status">
                  {["all", ...ORDER_KEYS].map((k) => (
                    <button key={k} type="button" aria-pressed={k === filter} onClick={() => touch(setFilter)(k)} className={filterChip(k === filter)}>
                      {k === "all" ? "Semua" : ORDER_STATUS[k].adminLabel}
                      <span className={`text-xs font-bold ${k === filter ? "text-brand-700" : "text-ink-600"}`}>{cnt(k)}</span>
                    </button>
                  ))}
                </div>
              </div>
              {anyFilter && (
                <button type="button" onClick={resetAll} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold text-brand-700 hover:bg-brand-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400">
                  <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reset
                </button>
              )}
            </div>
          </div>

          <div ref={wrapRef}>
            {loading && !orders.length ? (
              <p className="px-6 pb-10 text-center text-sm text-ink-600">Memuat orderan…</p>
            ) : (
              <OrdersTable rows={rows} animKey={`${anim}-${cur}`} minWidth="min-w-[1100px]" onView={openOrder} onPick={pickStatus} onSetPrice={setPrice} busyId={busyId} notify={notify} emptyText="Coba ubah kata kunci atau filter." onReset={resetAll} />
            )}
          </div>

          <Pager
            page={cur}
            pages={pages}
            info={list.length ? `Menampilkan ${(cur - 1) * PER + 1}–${Math.min(list.length, cur * PER)} dari ${list.length} orderan` : ""}
            onPage={(p) => { setPage(p); setAnim((n) => n + 1); wrapRef.current?.scrollIntoView({ block: "nearest" }); }}
          />
        </div>
        <p className="sr-only" role="status" aria-live="polite">{list.length} orderan ditemukan</p>
      </section>
    </>
  );
}
