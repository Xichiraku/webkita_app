import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowDown, ArrowRight, ArrowUp, Banknote, ChartColumn, CircleCheck, CircleX, ClipboardCheck, Hammer,
  PackagePlus, RefreshCw, Repeat, Rocket, Search, UsersRound, Wallet,
} from "lucide-react";
import OrdersTable from "./OrdersTable";
import { categoryLabel, ORDER_KEYS, ORDER_STATUS } from "../../utils/status";
import { fmtJt, formatDate } from "../../utils/format";
import { A_CARD_BTN, A_INPUT, A_SELECT, filterChip } from "../../utils/ui";

const MON = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const DONUT_COLORS = ["#1A3068", "#2559CC", "#5F94F0", "#A9C6F9", "#D6E4FC"];
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const niceTop = (max) => { const step = Math.max(1, Math.ceil(Math.max(max, 1) / 4)); return { step, top: step * 4 }; };
const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const isoMonth = (s) => { const d = new Date(s); return Number.isNaN(d.getTime()) ? "" : monthKey(d); };
const monthsBack = (n) => {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ key: monthKey(d), label: MON[d.getMonth()], y: d.getFullYear() });
  }
  return out;
};
const PRICED = ["approved", "process", "done"];

/* ───────── KPI ───────── */
function Kpis({ orders }) {
  const n = Object.fromEntries(ORDER_KEYS.map((k) => [k, orders.filter((o) => o.status === k).length]));
  const total = orders.length;
  const priced = orders.filter((o) => o.price && PRICED.includes(o.status));
  const value = priced.reduce((s, o) => s + o.price, 0);
  const [prev, cur] = monthsBack(2);
  const curN = orders.filter((o) => isoMonth(o.createdAt) === cur.key).length;
  const prevN = orders.filter((o) => isoMonth(o.createdAt) === prev.key).length;
  const trend = prevN ? Math.round(((curN - prevN) / prevN) * 100) : null;
  const notRejected = total - n.rejected;

  const cards = [
    [UsersRound, "Total Orderan", String(total),
      trend === null ? <span className="text-xs text-ink-600">bulan ini {curN} orderan</span> : (
        <>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${trend >= 0 ? "bg-[#DCFCE7] text-[#15803D]" : "bg-[#FEE2E2] text-[#B91C1C]"}`}>
            {trend >= 0 ? <ArrowUp className="h-3 w-3" aria-hidden="true" /> : <ArrowDown className="h-3 w-3" aria-hidden="true" />}{Math.abs(trend)}%
          </span>
          <span className="text-xs text-ink-600">vs bulan lalu</span>
        </>
      )],
    [Wallet, "Nilai Proyek", fmtJt(value), <span className="text-xs text-ink-600">dari {priced.length} proyek berharga</span>],
    [Hammer, "Proyek Berjalan", String(n.process), <span className="text-xs text-ink-600">{n.approved} menunggu dimulai</span>],
    [ChartColumn, "Tingkat Selesai", `${pct(n.done, notRejected)}%`, <span className="text-xs text-ink-600">{n.done} dari {notRejected} orderan aktif</span>],
  ];

  return (
    <section aria-label="Ringkasan" className="admin-grid mt-6 grid grid-cols-1 gap-4 min-[560px]:grid-cols-2 xl:grid-cols-4">
      {cards.map(([Icon, label, val, sub], i) => (
        <div key={label} className="row-in card flex items-center gap-4 rounded-3xl p-5" style={{ "--d": `${i * 60}ms` }}>
          <span className="tile grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-brand-700"><Icon className="h-6 w-6" aria-hidden="true" /></span>
          <div className="min-w-0">
            <p className="truncate text-2xl font-extrabold tabular-nums text-ink-900 sm:text-[1.7rem]">{val}</p>
            <p className="text-sm font-semibold text-ink-700">{label}</p>
            <p className="mt-1.5 flex flex-wrap items-center gap-1.5">{sub}</p>
          </div>
        </div>
      ))}
    </section>
  );
}

/* ───────── Funnel ───────── */
function Funnel({ orders }) {
  const c = (k) => orders.filter((o) => o.status === k).length;
  const total = orders.length;
  const st = [
    ["Masuk", total, "#CFE0FD", "#152033"],
    ["Disetujui", c("approved") + c("process") + c("done"), "#93B8F7", "#152033"],
    ["Diproses", c("process") + c("done"), "#3B73E6", "#FFFFFF"],
    ["Selesai", c("done"), "#1D46A5", "#FFFFFF"],
  ];
  const max = Math.max(total, 1), RH = 60, W = 220, cx = W / 2;
  const ws = st.map((s) => 70 + 150 * (s[1] / max));

  return (
    <section aria-labelledby="t-funnel" className="card rounded-3xl p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3"><h2 id="t-funnel" className="text-lg font-extrabold">Alur Orderan</h2><span className="text-xs font-semibold text-ink-600">{c("rejected")} ditolak tidak termasuk alur</span></div>
      <div className="mt-5 grid items-start gap-4 min-[480px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="relative" role="img" aria-label={`Corong orderan: ${st.map((s) => `${s[0]} ${s[1]}`).join(", ")}`}>
          <svg viewBox={`0 0 ${W} ${RH * 4}`} preserveAspectRatio="none" className="block w-full" style={{ height: RH * 4 }}>
            {st.map((s, i) => {
              const y0 = i * RH + 2, y1 = y0 + RH - 8, top = ws[i], bot = i < st.length - 1 ? ws[i + 1] : ws[i] * 0.8;
              return (
                <polygon
                  key={s[0]}
                  data-tip={`${s[0]}: ${s[1]} orderan (${pct(s[1], total)}% dari masuk)`}
                  points={`${cx - top / 2},${y0} ${cx + top / 2},${y0} ${cx + bot / 2},${y1} ${cx - bot / 2},${y1}`}
                  fill={s[2]} stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" className="fade-in" style={{ "--d": `${i * 90}ms` }}
                />
              );
            })}
          </svg>
          <div className="pointer-events-none absolute inset-0">
            {st.map((s) => <div key={s[0]} className="flex items-center justify-center pb-1 text-lg font-extrabold tabular-nums" style={{ height: RH, color: s[3] }}>{s[1]}</div>)}
          </div>
        </div>
        <div>
          {st.map((s) => (
            <div key={s[0]} className="flex items-center justify-between gap-3 border-b border-ink-100 last:border-0" style={{ height: RH }}>
              <span className="font-semibold text-ink-800">{s[0]}</span>
              <span className="text-sm tabular-nums text-ink-600"><b className="text-ink-900">{s[1]}</b> · {pct(s[1], total)}%</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────── Bar per status ───────── */
function Bars({ orders }) {
  const vals = ORDER_KEYS.map((k) => orders.filter((o) => o.status === k).length);
  const W = 480, H = 250, L = 30, R = 8, T = 22, B = 38, iw = W - L - R, ih = H - T - B;
  const nt = niceTop(Math.max(...vals)), slot = iw / vals.length, bw = Math.min(46, slot * 0.52);
  return (
    <section aria-labelledby="t-bar" className="card rounded-3xl p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3"><h2 id="t-bar" className="text-lg font-extrabold">Orderan per Status</h2><span className="text-xs font-semibold text-ink-600">Semua waktu</span></div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 block w-full" role="img" aria-label={`Jumlah orderan per status: ${ORDER_KEYS.map((k, i) => `${ORDER_STATUS[k].adminLabel} ${vals[i]}`).join(", ")}`}>
        {[0, 1, 2, 3, 4].map((t) => {
          const yy = T + ih - (ih * t) / 4;
          return (
            <g key={t}>
              <line x1={L} x2={W - R} y1={yy} y2={yy} stroke="#E4EBF4" strokeWidth="1" />
              <text x={L - 8} y={yy + 4} textAnchor="end" fontSize="11" fill="#4B5A73">{t * nt.step}</text>
            </g>
          );
        })}
        {vals.map((v, i) => {
          const h = (v / nt.top) * ih, xx = L + slot * i + (slot - bw) / 2, y = T + ih - h, r = Math.min(5, h), k = ORDER_KEYS[i];
          return (
            <g key={k}>
              {v > 0 && <path className="bar-g" style={{ "--d": `${i * 70}ms` }} d={`M${xx},${y + h} L${xx},${y + r} Q${xx},${y} ${xx + r},${y} L${xx + bw - r},${y} Q${xx + bw},${y} ${xx + bw},${y + r} L${xx + bw},${y + h} Z`} fill="#3B73E6" />}
              <text x={xx + bw / 2} y={y - 7} textAnchor="middle" fontSize="13" fontWeight="800" fill="#152033">{v}</text>
              <text x={xx + bw / 2} y={H - 14} textAnchor="middle" fontSize="12" fontWeight="600" fill="#36445A">{ORDER_STATUS[k].adminLabel}</text>
              <rect x={L + slot * i} y={T} width={slot} height={ih} fill="transparent" data-tip={`${ORDER_STATUS[k].adminLabel}: ${v} orderan`} />
            </g>
          );
        })}
      </svg>
    </section>
  );
}

/* ───────── Donut kategori ───────── */
function Donut({ orders }) {
  const map = {};
  orders.forEach((o) => { const c = categoryLabel(o.category); map[c] = (map[c] || 0) + 1; });
  const cats = Object.keys(map).sort((a, b) => map[b] - map[a]);
  const total = orders.length;
  const gap = cats.length > 1 ? 1.2 : 0;
  let cum = 0;
  const segs = cats.map((c, i) => {
    const p = (map[c] / total) * 100, col = DONUT_COLORS[i % DONUT_COLORS.length], len = Math.max(0, p - gap);
    const el = <circle key={c} r="15.9155" cx="21" cy="21" fill="none" stroke={col} strokeWidth="6" strokeDasharray={`${len} ${100 - len}`} strokeDashoffset={25 - cum} data-tip={`${c}: ${map[c]} orderan (${Math.round(p)}%)`} />;
    cum += p;
    return el;
  });
  return (
    <section aria-labelledby="t-donut" className="card rounded-3xl p-5 sm:p-6 xl:col-span-2">
      <div className="flex items-center justify-between gap-3"><h2 id="t-donut" className="text-lg font-extrabold">Kategori Layanan</h2><span className="text-xs font-semibold text-ink-600">Semua waktu</span></div>
      <div className="mt-5 flex flex-col items-center gap-5 min-[560px]:flex-row xl:flex-col 2xl:flex-row">
        <div className="relative h-44 w-44 shrink-0" role="img" aria-label={`Kategori layanan: ${cats.map((c) => `${c} ${map[c]}`).join(", ") || "belum ada data"}`}>
          <svg viewBox="0 0 42 42" className="h-full w-full">
            {total ? segs : <circle r="15.9155" cx="21" cy="21" fill="none" stroke="#E4EBF4" strokeWidth="6" />}
          </svg>
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
            <div><p className="text-3xl font-extrabold tabular-nums">{total}</p><p className="text-xs text-ink-600">Total orderan</p></div>
          </div>
        </div>
        <ul className="w-full min-w-0 flex-1">
          {cats.map((c, i) => (
            <li key={c} className="flex items-center gap-3 py-1.5">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
              <span className="min-w-0 flex-1 truncate text-sm text-ink-800">{c}</span>
              <span className="text-sm font-bold tabular-nums text-ink-900">{Math.round((map[c] / total) * 100)}%</span>
            </li>
          ))}
          {!cats.length && <li className="text-sm text-ink-600">Belum ada orderan.</li>}
        </ul>
      </div>
    </section>
  );
}

/* ───────── Line per bulan ───────── */
function Line({ orders }) {
  const [range, setRange] = useState(6);
  const ms = monthsBack(range);
  const vals = ms.map((m) => orders.filter((o) => isoMonth(o.createdAt) === m.key).length);
  const W = 560, H = 240, L = 32, R = 18, T = 24, B = 34, iw = W - L - R, ih = H - T - B;
  const nt = niceTop(Math.max(...vals)), vmax = Math.max(...vals);
  const pts = vals.map((v, i) => [L + (ms.length === 1 ? iw / 2 : (iw * i) / (ms.length - 1)), T + ih - (v / nt.top) * ih]);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${d} L${pts[pts.length - 1][0]},${T + ih} L${pts[0][0]},${T + ih} Z`;

  return (
    <section aria-labelledby="t-line" className="card rounded-3xl p-5 sm:p-6 xl:col-span-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="t-line" className="text-lg font-extrabold">Orderan Masuk per Bulan</h2>
        <div>
          <label htmlFor="range" className="sr-only">Rentang waktu</label>
          <select id="range" value={range} onChange={(e) => setRange(+e.target.value)} className="cursor-pointer rounded-xl border border-ink-200 bg-white/80 py-2 pl-3 pr-8 text-sm font-semibold text-ink-800 outline-none focus-visible:ring-2 focus-visible:ring-brand-400">
            <option value={6}>6 bulan terakhir</option>
            <option value={12}>12 bulan terakhir</option>
          </select>
        </div>
      </div>
      <svg key={range} viewBox={`0 0 ${W} ${H}`} className="mt-4 block w-full" role="img" aria-label={`Orderan masuk per bulan: ${ms.map((m, i) => `${m.label} ${vals[i]}`).join(", ")}`}>
        <defs>
          <linearGradient id="lg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3B73E6" stopOpacity=".28" /><stop offset="1" stopColor="#3B73E6" stopOpacity="0" /></linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((t) => {
          const yy = T + ih - (ih * t) / 4;
          return (
            <g key={t}>
              <line x1={L} x2={W - R} y1={yy} y2={yy} stroke="#E4EBF4" />
              <text x={L - 8} y={yy + 4} textAnchor="end" fontSize="11" fill="#4B5A73">{t * nt.step}</text>
            </g>
          );
        })}
        <path d={area} fill="url(#lg1)" className="fade-in" />
        <path d={d} pathLength="1" fill="none" stroke="#2559CC" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" className="line-draw" />
        {ms.map((m, i) => (
          <g key={m.key}>
            <circle cx={pts[i][0]} cy={pts[i][1]} r="5" fill="#2559CC" stroke="#fff" strokeWidth="2.5" />
            {(i === ms.length - 1 || (vals[i] === vmax && vmax > 0)) && <text x={pts[i][0]} y={pts[i][1] - 12} textAnchor="middle" fontSize="12.5" fontWeight="800" fill="#152033">{vals[i]}</text>}
            <circle cx={pts[i][0]} cy={pts[i][1]} r="18" fill="transparent" data-tip={`${m.label} ${m.y}: ${vals[i]} orderan`} />
            <text x={pts[i][0]} y={H - 10} textAnchor="middle" fontSize="11.5" fontWeight="600" fill="#36445A">{m.label}</text>
          </g>
        ))}
      </svg>
    </section>
  );
}

/* ───────── Perlu tindakan & aktivitas ───────── */
function Tasks({ orders, onOpen }) {
  const items = orders
    .filter((o) => o.status === "pending" || o.status === "approved")
    .sort((a, b) => (a.status === "pending" ? 0 : 1) - (b.status === "pending" ? 0 : 1) || new Date(b.createdAt) - new Date(a.createdAt));
  return (
    <section id="aksi" aria-labelledby="t-aksi" className="card scroll-mt-6 rounded-3xl p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3"><h2 id="t-aksi" className="text-lg font-extrabold">Perlu Tindakan</h2><span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-800">{items.length} item</span></div>
      <ul className="mt-3 space-y-1">
        {!items.length ? (
          <li className="flex flex-col items-center gap-2 py-10 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#DCFCE7] text-[#15803D]"><CircleCheck className="h-6 w-6" aria-hidden="true" /></span>
            <p className="font-bold">Semua beres</p>
            <p className="text-sm text-ink-600">Tidak ada orderan yang menunggu tindakan.</p>
          </li>
        ) : (
          items.slice(0, 6).map((o) => {
            const wait = o.status === "pending";
            const Icon = wait ? ClipboardCheck : Rocket;
            return (
              <li key={o.id}>
                <button type="button" onClick={() => onOpen(o)} className="flex w-full items-center gap-3 rounded-2xl p-3 text-left transition hover:bg-brand-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400">
                  <span className="tile grid h-10 w-10 shrink-0 place-items-center rounded-xl text-brand-700"><Icon className="h-[18px] w-[18px]" aria-hidden="true" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold text-ink-900">{o.projectTitle}</span>
                    <span className="block truncate text-sm text-ink-600">{o.contactName} · {wait ? formatDate(o.createdAt) : "pastikan pembayaran sudah masuk"}</span>
                  </span>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${wait ? "bg-[#FEF3C7] text-[#B45309]" : "bg-brand-100 text-brand-800"}`}>
                    {wait ? (o.price ? "Tinjau" : "Tinjau + atur harga") : "Mulai proyek"}
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>
    </section>
  );
}

const ACT_ICON = { order: PackagePlus, status: Repeat, reject: CircleX, price: Banknote };

function Activities({ orders, acts }) {
  const base = [...orders]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 4)
    .map((o) => ({ id: `o-${o.id}`, icon: "order", html: { who: o.contactName, name: o.projectTitle }, when: formatDate(o.createdAt) }));
  const list = [...acts, ...base].slice(0, 5);
  return (
    <section aria-labelledby="t-act" className="card rounded-3xl p-5 sm:p-6">
      <h2 id="t-act" className="text-lg font-extrabold">Aktivitas Terbaru</h2>
      <ul className="mt-3 space-y-1" aria-live="polite">
        {list.map((a, i) => {
          const Icon = ACT_ICON[a.icon] || Repeat;
          return (
            <li key={a.id} className="fade-in flex items-center gap-3 rounded-2xl p-3" style={{ "--d": `${i * 50}ms` }}>
              <span className="tile grid h-10 w-10 shrink-0 place-items-center rounded-xl text-brand-700"><Icon className="h-[18px] w-[18px]" aria-hidden="true" /></span>
              <p className="min-w-0 flex-1 text-sm text-ink-800">
                {a.icon === "order" && <><b>{a.html.who}</b> mengirim orderan <b>{a.html.name}</b></>}
                {(a.icon === "status" || a.icon === "reject") && <>Kamu mengubah status <b>{a.html.name}</b> menjadi <b>{a.html.to}</b></>}
                {a.icon === "price" && <>Kamu mengatur harga <b>{a.html.name}</b> ke <b>{a.html.price}</b></>}
              </p>
              <span className="shrink-0 text-xs text-ink-600">{a.when}</span>
            </li>
          );
        })}
        {!list.length && <li className="py-6 text-center text-sm text-ink-600">Belum ada aktivitas.</li>}
      </ul>
    </section>
  );
}

/* ───────── Halaman Dashboard ───────── */
export default function AdminHome({ ctx }) {
  const navigate = useNavigate();
  const { orders, loading, refresh, query, setQuery, pickStatus, setPrice, openOrder, busyId, notify, acts, adminName } = ctx;
  const [filter, setFilter] = useState("all");
  const [spinning, setSpinning] = useState(false);
  const [tip, setTip] = useState(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...orders]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .filter((o) => (filter === "all" || o.status === filter) && (!q || `${o.projectTitle} ${o.contactName} ${categoryLabel(o.category)} ${o.planTitle} ${o.contactPhone}`.toLowerCase().includes(q)))
      .slice(0, 8);
  }, [orders, filter, query]);

  const cnt = (k) => (k === "all" ? orders.length : orders.filter((o) => o.status === k).length);

  const onRefresh = async () => { setSpinning(true); await refresh(); setSpinning(false); };

  const onPointerMove = (e) => {
    const t = e.target.closest?.("[data-tip]");
    if (!t) { if (tip) setTip(null); return; }
    setTip({ text: t.getAttribute("data-tip"), x: Math.min(window.innerWidth - 200, e.clientX + 14), y: e.clientY + 16 });
  };

  return (
    <div onPointerMove={onPointerMove} onPointerLeave={() => setTip(null)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-ink-700">Selamat datang kembali, {adminName || "Admin"}</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">Dashboard Admin</h1>
          <p className="mt-1 text-ink-600">Pantau orderan masuk dan progres proyek Webkita.</p>
        </div>
        <button type="button" onClick={onRefresh} disabled={spinning || loading} className={A_CARD_BTN}>
          <RefreshCw className={`h-4 w-4 ${spinning || loading ? "animate-spin" : ""}`} aria-hidden="true" /> Refresh
        </button>
      </div>

      <Kpis orders={orders} />

      <div className="admin-grid mt-5 grid gap-5 xl:grid-cols-2">
        <Funnel orders={orders} />
        <Bars orders={orders} />
      </div>

      <div className="admin-grid mt-5 grid gap-5 xl:grid-cols-5">
        <Donut orders={orders} />
        <Line orders={orders} />
      </div>

      <div className="admin-grid mt-5 grid gap-5 xl:grid-cols-2">
        <Tasks orders={orders} onOpen={openOrder} />
        <Activities orders={orders} acts={acts} />
      </div>

      {/* Tabel orderan terbaru */}
      <section id="orderan" aria-labelledby="orders-title" className="mt-5 scroll-mt-6">
        <div className="card rounded-3xl">
          <div className="flex flex-col gap-4 p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 id="orders-title" className="text-lg font-extrabold">Orderan Terbaru</h2>
              <button type="button" onClick={() => navigate("/admin/orderan")} className="inline-flex items-center gap-1 rounded text-sm font-bold text-brand-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400">
                Lihat semua <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="relative w-full xl:max-w-sm">
                <label htmlFor="search" className="sr-only">Cari orderan</label>
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-500" aria-hidden="true" />
                <input id="search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari proyek atau nama…" autoComplete="off" className={`${A_INPUT} pl-10 pr-4`} />
              </div>
              <div className="scroll-thin -mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
                <div className="flex w-max gap-2" role="group" aria-label="Filter status">
                  {["all", ...ORDER_KEYS].map((k) => (
                    <button key={k} type="button" aria-pressed={k === filter} onClick={() => setFilter(k)} className={filterChip(k === filter)}>
                      {k === "all" ? "Semua" : ORDER_STATUS[k].adminLabel}
                      <span className={`text-xs font-bold ${k === filter ? "text-brand-700" : "text-ink-600"}`}>{cnt(k)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {loading && !orders.length ? (
            <p className="px-6 pb-10 text-center text-sm text-ink-600">Memuat orderan…</p>
          ) : (
            <OrdersTable rows={rows} animKey={filter} onView={openOrder} onPick={pickStatus} onSetPrice={setPrice} busyId={busyId} notify={notify} />
          )}
        </div>
        <p className="sr-only" role="status" aria-live="polite">{rows.length} orderan ditampilkan</p>
      </section>

      {tip && (
        <div role="presentation" className="pointer-events-none fixed z-[95] max-w-[16rem] rounded-xl bg-ink-900 px-3 py-2 text-xs font-semibold text-white shadow-lift" style={{ left: Math.max(8, tip.x), top: tip.y }}>
          {tip.text}
        </div>
      )}
    </div>
  );
}
