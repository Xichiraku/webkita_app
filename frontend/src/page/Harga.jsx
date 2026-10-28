import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, Check, ClipboardCheck, LifeBuoy, LogIn, MessageCircle, Sparkles, Timer, TrendingUp, Wallet, X,
} from "lucide-react";
import { useUser } from "../provider/user_provider";
import API from "../core/utils/api_client";
import { ENDPOINTS } from "../core/constants/api_endpoint";
import useReveal from "../hooks/useReveal";
import Modal from "../components/ui/Modal";
import PageLoader from "../components/ui/Spinner";
import { rp } from "../utils/format";
import { BTN_PRIMARY, BTN_SECONDARY, WA_PAKET } from "../utils/ui";

// Skala slider (logaritmik) sesuai desain
const MIN = 500000, MAX = 100000000, STEPS = 1000;
const LOGR = Math.log(MAX / MIN);
const pos = (v) => Math.min(1, Math.max(0, Math.log(Math.max(v, MIN) / MIN) / LOGR));
const valueAt = (t) => {
  const v = MIN * Math.exp(LOGR * (t / STEPS));
  const step = v < 5e6 ? 1e5 : v < 25e6 ? 5e5 : 1e6;
  return Math.min(MAX, Math.max(MIN, Math.round(v / step) * step));
};
const calcLeft = (p) => `calc(14px + (100% - 28px) * ${p.toFixed(4)})`;
const BARS = ["bg-brand-300", "bg-brand-500", "bg-brand-700", "bg-brand-950"];

const mapPlan = (item) => ({
  id: item.id,
  title: item.title || "-",
  minPrice: Number(item.min_price || 0),
  maxPrice: item.max_price == null ? null : Number(item.max_price), // null = tanpa batas atas
  priceRange: item.price_range || "-",
  tier: item.tier || "starter",
  timeline: item.timeline || "-",
  badge: item.badge || "",
  description: item.description || "",
  features: Array.isArray(item.features)
    ? [...item.features].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map((f) => (typeof f === "string" ? f : f.feature)).filter(Boolean)
    : [],
  notIncluded: Array.isArray(item.not_included)
    ? item.not_included.map((f) => (typeof f === "string" ? f : f.feature)).filter(Boolean)
    : [],
  upgradeNote: item.upgrade_note || "",
});

const Feature = ({ children, className = "" }) => (
  <li className={`flex items-start gap-2.5 ${className}`}>
    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
    <span>{children}</span>
  </li>
);

export default function Harga({ onSelectPlan }) {
  const { user } = useUser();
  const navigate = useNavigate();

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [t, setT] = useState(Math.round(STEPS * pos(13000000))); // nilai awal Rp 13 juta
  const [detail, setDetail] = useState(null);
  const [loginPrompt, setLoginPrompt] = useState(false);
  const [announce, setAnnounce] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await API.get(ENDPOINTS.GET_PUBLIC_PRICING);
        const data = res?.data ?? res ?? [];
        const mapped = Array.isArray(data) ? data.filter((p) => p.is_active !== false).map(mapPlan) : [];
        mapped.sort((a, b) => a.minPrice - b.minPrice);
        if (alive) setPlans(mapped);
      } catch (err) {
        console.error("Gagal memuat paket layanan:", err);
        if (alive) setPlans([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const ref = useReveal([loading, plans.length]);

  const budget = valueAt(t);
  const current = useMemo(() => {
    if (!plans.length) return null;
    for (let i = plans.length - 1; i >= 0; i--) if (budget >= plans[i].minPrice) return plans[i];
    return plans[0];
  }, [plans, budget]);

  // posisi penanda batas paket & label zona
  const zones = useMemo(() => {
    const th = plans.slice(1).map((p) => pos(p.minPrice));
    const edges = [0, ...th, 1];
    return { ticks: th, labels: plans.map((p, i) => ({ p, c: (edges[i] + edges[i + 1]) / 2 })) };
  }, [plans]);

  const barOf = (p) => BARS[Math.min(plans.indexOf(p), BARS.length - 1)] || BARS[0];

  const order = (plan) => {
    if (!user) { setDetail(null); setLoginPrompt(true); return; }
    setDetail(null);
    onSelectPlan?.({ ...plan, userId: user.id });
  };

  if (loading) return <div className="bg-ink-50"><PageLoader label="Memuat paket layanan…" /></div>;

  return (
    <main ref={ref} className="relative overflow-hidden bg-ink-50">
      <div className="pointer-events-none absolute -left-24 top-0 h-80 w-80 animate-blob rounded-full bg-brand-100 opacity-70 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-24 top-72 h-80 w-80 animate-blob rounded-full bg-brand-200/50 blur-3xl" style={{ animationDelay: "-7s" }} aria-hidden="true" />

      {/* ================= JUDUL ================= */}
      <section className="relative mx-auto max-w-7xl px-5 pb-10 pt-14 text-center sm:px-8 lg:pt-20">
        <h1 className="reveal text-4xl font-extrabold tracking-tight text-ink-900 sm:text-5xl">Paket Layanan Kami</h1>
        <p className="reveal mx-auto mt-4 max-w-2xl text-lg text-ink-600" style={{ "--d": "100ms" }}>
          Pilih paket yang sesuai dengan kebutuhan bisnis Anda. Dari UMKM hingga enterprise, kami siap membantu mewujudkan website impian Anda.
        </p>
      </section>

      {!current ? (
        <section className="relative mx-auto max-w-3xl px-5 pb-20 sm:px-8">
          <p className="rounded-3xl border border-ink-200 bg-white p-10 text-center font-semibold text-ink-600 shadow-soft">Belum ada paket layanan.</p>
        </section>
      ) : (
        <>
          {/* ================= KALKULATOR BUDGET ================= */}
          <section className="relative mx-auto max-w-3xl px-5 sm:px-8" aria-labelledby="budget-title">
            <div className="reveal rounded-3xl border border-ink-200 bg-white p-6 shadow-soft sm:p-8" style={{ "--d": "150ms" }}>
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-700"><Wallet className="h-5 w-5" aria-hidden="true" /></span>
                <div>
                  <h2 id="budget-title" className="text-xl font-extrabold text-ink-900 sm:text-2xl">Berapa Budget Anda?</h2>
                  <p className="text-sm text-ink-600">Geser slider untuk melihat rekomendasi paket dan fitur.</p>
                </div>
              </div>

              <div className="mt-7">
                <div className="flex items-end justify-between gap-4">
                  <label htmlFor="budget" className="text-sm font-bold text-ink-700">Budget Anda</label>
                  <output htmlFor="budget" className="whitespace-nowrap text-2xl font-extrabold tabular-nums tracking-tight text-ink-900 min-[420px]:text-3xl sm:text-4xl" aria-hidden="true">
                    {rp(budget)}{budget >= MAX ? "+" : ""}
                  </output>
                </div>

                <div className="relative mt-5">
                  <input
                    id="budget"
                    className="budget-range"
                    type="range"
                    min="0"
                    max={STEPS}
                    step="1"
                    value={t}
                    style={{ "--p": (t / STEPS).toFixed(4) }}
                    onChange={(e) => setT(+e.target.value)}
                    onPointerUp={() => setAnnounce(`Paket rekomendasi: ${current.title}, ${current.priceRange}`)}
                    onKeyUp={() => setAnnounce(`Paket rekomendasi: ${current.title}, ${current.priceRange}`)}
                    aria-valuetext={`${rp(budget)}, paket ${current.title}`}
                    aria-describedby="budget-help"
                  />
                  <div className="pointer-events-none absolute inset-x-0 top-[28px] h-3" aria-hidden="true">
                    {zones.ticks.map((p, i) => <span key={i} className="absolute top-0 h-2.5 w-px bg-ink-300" style={{ left: calcLeft(p) }} />)}
                  </div>
                </div>
                <div className="relative mt-5 h-5 text-[11px] font-semibold text-ink-600 sm:text-xs" aria-hidden="true">
                  {zones.labels.map(({ p, c }) => (
                    <span key={p.id} className={`absolute -translate-x-1/2 whitespace-nowrap transition-colors ${p.id === current.id ? "font-extrabold text-brand-700" : ""}`} style={{ left: calcLeft(c) }}>
                      {p.title.length > 9 ? <><span className="sm:hidden">{p.title.slice(0, 3)}</span><span className="hidden sm:inline">{p.title}</span></> : p.title}
                    </span>
                  ))}
                </div>

                <div className="mt-1 flex items-center justify-between text-xs text-ink-600">
                  <span>Rp 500 Ribu</span>
                  <span>Rp 100 Juta</span>
                </div>
                <p id="budget-help" className="sr-only">Gunakan tombol panah kiri dan kanan untuk mengubah budget. Rekomendasi paket diperbarui otomatis.</p>
                <p className="sr-only" role="status" aria-live="polite">{announce}</p>
              </div>

              <div className="mt-7 border-t border-ink-200 pt-6">
                <div key={current.id} className="animate-rise">
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                    <p className="flex items-center gap-2 font-bold text-ink-900"><span className={`h-3 w-3 rounded-full ${barOf(current)}`} />Paket Rekomendasi: {current.title}</p>
                    <p className="text-sm font-semibold text-ink-600">{current.priceRange}</p>
                  </div>
                  <p className="mt-5 flex items-center gap-2 font-extrabold text-ink-900">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-100 text-brand-700"><Check className="h-4 w-4" aria-hidden="true" /></span>
                    Yang Anda Dapatkan:
                  </p>
                  <ul className="mt-3 grid gap-2.5 text-sm text-ink-700 sm:grid-cols-2">
                    {current.features.map((f, i) => <Feature key={i}>{f}</Feature>)}
                  </ul>
                  {current.upgradeNote && <p className="mt-4 text-sm text-brand-700">{current.upgradeNote}</p>}
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <button type="button" onClick={() => order(current)} className={`px-5 py-3 ${BTN_PRIMARY}`}>Pesan Paket {current.title}</button>
                    <button type="button" onClick={() => setDetail(current)} className={`px-5 py-3 ${BTN_SECONDARY}`}>Lihat Detail</button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ================= DAFTAR PAKET ================= */}
          <section className="relative mx-auto max-w-7xl px-5 pb-6 pt-14 sm:px-8" aria-label="Daftar paket">
            <div className="grid items-stretch gap-6 pt-3 sm:grid-cols-2 lg:grid-cols-4">
              {plans.map((p, i) => {
                const on = p.id === current.id;
                return (
                  <article
                    key={p.id}
                    className={`reveal relative flex flex-col rounded-3xl border bg-white p-6 transition duration-300 ${on ? "border-brand-500 shadow-lift ring-2 ring-brand-200" : "border-ink-200 shadow-soft"}`}
                    style={{ "--d": `${i * 80}ms` }}
                  >
                    {on && (
                      <span className="pointer-events-none absolute -top-3 left-6 inline-flex animate-pop items-center gap-1.5 rounded-full bg-brand-600 px-3 py-1 text-xs font-bold text-white shadow-soft">
                        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />Rekomendasi Anda
                      </span>
                    )}
                    <div className={`h-1.5 rounded-full ${barOf(p)}`} />
                    <h3 className="mt-5 text-xl font-extrabold text-ink-900">{p.title}</h3>
                    <p className="mt-1 text-sm font-semibold text-ink-600">{p.priceRange}</p>
                    <ul className="mb-6 mt-5 space-y-2.5 text-sm text-ink-700">
                      {p.features.slice(0, 5).map((f, i) => <Feature key={i}>{f}</Feature>)}
                    </ul>
                    <button type="button" onClick={() => setDetail(p)} className={`mt-auto w-full px-4 py-2.5 text-sm ${BTN_SECONDARY}`}>
                      Lihat Detail<span className="sr-only"> paket {p.title}</span>
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        </>
      )}

      {/* ================= TIPS ================= */}
      <section className="relative mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <div className="reveal rounded-3xl bg-brand-50 p-7 ring-1 ring-brand-100 sm:p-10">
          <h2 className="text-2xl font-extrabold tracking-tight text-ink-900">Tips Menentukan Budget</h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [ClipboardCheck, "Pertimbangkan Kebutuhan", "Apakah Anda butuh website sederhana atau platform kompleks dengan banyak fitur?"],
              [Timer, "Timeline Proyek", "Proyek mendesak biasanya membutuhkan budget lebih tinggi."],
              [LifeBuoy, "Maintenance & Support", "Alokasikan budget untuk pemeliharaan website setelah launching."],
              [TrendingUp, "Skalabilitas", "Pikirkan pertumbuhan bisnis untuk 1-2 tahun ke depan."],
            ].map(([Icon, title, desc]) => (
              <div key={title}>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-brand-700 shadow-sm"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                <h3 className="mt-4 font-bold text-ink-900">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="relative mx-auto max-w-7xl px-5 pb-20 sm:px-8">
        <div className="reveal relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-700 to-brand-900 px-6 py-14 text-center shadow-lift sm:px-12 lg:py-16">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 animate-blob rounded-full bg-brand-400/30 blur-3xl" aria-hidden="true" />
          <div className="relative">
            <h2 className="text-3xl font-extrabold tracking-tight text-white">Butuh Konsultasi Paket?</h2>
            <p className="mx-auto mt-3 max-w-2xl text-lg text-brand-100">Tim kami siap membantu Anda menemukan solusi terbaik untuk kebutuhan bisnis Anda. Hubungi kami untuk konsultasi gratis!</p>
            <a href={WA_PAKET} target="_blank" rel="noopener noreferrer" className="group mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 font-bold text-brand-700 shadow-soft transition hover:-translate-y-0.5 hover:bg-brand-50 hover:shadow-lift focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              <MessageCircle className="h-5 w-5" aria-hidden="true" /> Hubungi Kami di WhatsApp
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      {/* ================= DETAIL PAKET ================= */}
      <Modal open={!!detail} onClose={() => setDetail(null)} labelledBy="detail-title" className="w-[min(92vw,30rem)]">
        {detail && (
          <div className="p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-brand-700">Detail paket{detail.badge ? ` · ${detail.badge}` : ""}</p>
                <h2 id="detail-title" className="text-2xl font-extrabold tracking-tight">Paket {detail.title}</h2>
                <p className="mt-1 text-ink-600">{detail.priceRange}{detail.timeline && detail.timeline !== "-" ? ` · ${detail.timeline}` : ""}</p>
              </div>
              <button type="button" onClick={() => setDetail(null)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-ink-600 transition hover:bg-ink-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400" aria-label="Tutup detail">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            {detail.description && <p className="mt-4 text-sm leading-relaxed text-ink-700">{detail.description}</p>}
            <h3 className="mt-6 text-sm font-bold uppercase tracking-wide text-ink-600">Yang Anda dapatkan</h3>
            <ul className="mt-3 space-y-2.5">
              {detail.features.map((f, i) => <Feature key={i} className="text-ink-800">{f}</Feature>)}
            </ul>
            {detail.notIncluded.length > 0 && (
              <>
                <h3 className="mt-6 text-sm font-bold uppercase tracking-wide text-ink-600">Tidak termasuk</h3>
                <ul className="mt-3 space-y-2.5">
                  {detail.notIncluded.map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-ink-700"><X className="mt-0.5 h-4 w-4 shrink-0 text-ink-500" aria-hidden="true" /><span>{f}</span></li>
                  ))}
                </ul>
              </>
            )}
            <p className="mt-6 rounded-xl bg-ink-50 p-3.5 text-sm text-ink-600">Rentang harga adalah estimasi. Harga final ditentukan setelah kebutuhan proyek Anda dikonfirmasi.</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button type="button" data-autofocus onClick={() => order(detail)} className={`flex-1 px-5 py-3 ${BTN_PRIMARY} shadow-none hover:translate-y-0`}>Pesan Paket Ini</button>
              <button type="button" onClick={() => setDetail(null)} className={`px-5 py-3 ${BTN_SECONDARY}`}>Tutup</button>
            </div>
          </div>
        )}
      </Modal>

      {/* ================= PERLU LOGIN ================= */}
      <Modal open={loginPrompt} onClose={() => setLoginPrompt(false)} labelledBy="login-title" className="w-[min(92vw,26rem)]">
        <div className="p-6 text-center sm:p-8">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-100 text-brand-700"><LogIn className="h-6 w-6" aria-hidden="true" /></span>
          <h2 id="login-title" className="mt-4 text-2xl font-extrabold tracking-tight">Login Diperlukan</h2>
          <p className="mt-2 text-ink-600">Masuk atau buat akun terlebih dahulu untuk memesan paket layanan kami.</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => setLoginPrompt(false)} className={`flex-1 px-5 py-3 ${BTN_SECONDARY}`}>Batal</button>
            <button type="button" data-autofocus onClick={() => navigate("/login")} className={`flex-1 px-5 py-3 ${BTN_PRIMARY}`}>Masuk Sekarang</button>
          </div>
          <p className="mt-4 text-sm text-ink-600">Belum punya akun? <button type="button" onClick={() => navigate("/register")} className="font-bold text-brand-700 hover:underline">Daftar</button></p>
        </div>
      </Modal>
    </main>
  );
}
