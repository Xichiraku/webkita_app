import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight, Calculator, ChartNoAxesColumnIncreasing, CircleCheck, CircleDashed, ClipboardList,
  Clock, Clock3, CodeXml, MessageCircle, Presentation, ShieldCheck, ShoppingCart, Sparkles, UserCheck, Users,
} from "lucide-react";
import { useUser } from "../../provider/user_provider";
import useReveal from "../../hooks/useReveal";
import { BTN_PRIMARY, FOCUS, WA_KONSULTASI } from "../../utils/ui";

const SERVICES = [
  { icon: CodeXml, title: "Pembuatan Website Kustom", desc: "Dari nol hingga siap pakai, kami rancang website yang unik, optimal, dan sesuai dengan identitas merek Anda." },
  { icon: ShoppingCart, title: "Integrasi E-commerce", desc: "Tingkatkan penjualan dengan toko online yang canggih, aman, dan terintegrasi dengan berbagai sistem pembayaran." },
  { icon: ShieldCheck, title: "Keamanan & Perawatan", desc: "Pastikan website Anda selalu aman, cepat, dan bebas dari masalah dengan dukungan teknis 24/7 kami." },
];

const STEPS = [
  { icon: ClipboardList, title: "Pesan & Ajukan Kebutuhan", desc: "Pilih layanan, hitung estimasi budget, dan kirim kebutuhan proyek Anda." },
  { icon: UserCheck, title: "Diteruskan ke Developer", desc: "Kebutuhan Anda diteruskan ke developer profesional yang sesuai." },
  { icon: ChartNoAxesColumnIncreasing, title: "Pengerjaan & Pantau Progres", desc: "Pantau milestone dan chat langsung dengan developer lewat Project Workspace." },
  { icon: Presentation, title: "Presentasi & Revisi", desc: "Tinjau hasilnya, ajukan revisi bila perlu, lalu setujui hasil akhir." },
];

const d = (ms) => ({ "--d": `${ms}ms` });

export default function Home() {
  const navigate = useNavigate();
  const { hash } = useLocation();
  const { user } = useUser();
  const ref = useReveal();

  // Dukung tautan /#cara-kerja dari halaman lain
  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    if (el) requestAnimationFrame(() => el.scrollIntoView({ behavior: "smooth" }));
  }, [hash]);

  const start = () => navigate(user ? "/harga" : "/register");

  return (
    <main ref={ref} className="bg-white">
      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 animate-blob rounded-full bg-brand-100 opacity-70 blur-3xl motion-reduce:animate-none" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-24 top-40 h-80 w-80 animate-blob rounded-full bg-brand-200/60 blur-3xl motion-reduce:animate-none" style={{ animationDelay: "-6s" }} aria-hidden="true" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-14 sm:px-8 lg:grid-cols-2 lg:gap-10 lg:pb-28 lg:pt-20">
          <div>
            <span className="reveal inline-flex items-center gap-2 rounded-full bg-brand-100 px-3.5 py-1.5 text-sm font-semibold text-brand-700">
              <Sparkles className="h-4 w-4" aria-hidden="true" /> Platform Teknologi #1
            </span>

            <h1 className="reveal mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-ink-900 sm:text-5xl lg:text-[3.5rem]" style={d(80)}>
              Hubungkan Bisnis Anda dengan{" "}
              <span className="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">Developer Terbaik</span>
            </h1>

            <p className="reveal mt-6 max-w-xl text-lg leading-relaxed text-ink-600" style={d(160)}>
              Platform marketplace yang menghubungkan pembeli dengan developer profesional. Kami mengelola pihak ketiga terpercaya untuk memastikan proyek website Anda berjalan lancar.
            </p>

            <div className="reveal mt-8 flex flex-col gap-3 sm:flex-row" style={d(240)}>
              <button type="button" onClick={start} className={`group px-6 py-3.5 ${BTN_PRIMARY}`}>
                Mulai Sekarang
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true" />
              </button>
              <a href="#cara-kerja" className={`inline-flex items-center justify-center rounded-xl border-2 border-ink-200 bg-white px-6 py-3.5 font-bold text-ink-800 transition hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700 ${FOCUS}`}>
                Pelajari Lebih Lanjut
              </a>
            </div>

            <ul className="reveal mt-10 space-y-4" style={d(320)}>
              <li className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600"><Users className="h-[18px] w-[18px]" aria-hidden="true" /></span>
                <span className="leading-tight"><span className="block text-sm font-bold text-ink-900">100k+ Pengguna</span><span className="text-sm text-ink-600">Bergabung dengan Kami</span></span>
              </li>
              <li className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600"><Clock className="h-[18px] w-[18px]" aria-hidden="true" /></span>
                <span className="text-sm font-bold text-ink-900">Respon Cepat</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600"><ShieldCheck className="h-[18px] w-[18px]" aria-hidden="true" /></span>
                <span className="text-sm font-bold text-ink-900">Garansi Keamanan</span>
              </li>
            </ul>
          </div>

          {/* Visual: ilustrasi Project Workspace */}
          <div className="reveal relative mx-auto mb-10 w-full max-w-[520px]" style={d(200)}>
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-brand-200/70 to-brand-50 blur-2xl" aria-hidden="true" />

            <div className="relative animate-float rounded-3xl border border-ink-200 bg-white p-5 shadow-lift motion-reduce:animate-none sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5" aria-hidden="true">
                  <span className="h-2.5 w-2.5 rounded-full bg-ink-200" /><span className="h-2.5 w-2.5 rounded-full bg-ink-200" /><span className="h-2.5 w-2.5 rounded-full bg-ink-200" />
                </div>
                <span className="text-xs font-semibold text-ink-500">Project Workspace</span>
              </div>

              <div className="mt-5 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Proyek</p>
                  <h2 className="text-lg font-extrabold text-ink-900">Website Toko Batik</h2>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-600" /> Berjalan
                </span>
              </div>

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-semibold text-ink-600">Progres keseluruhan</span>
                  <span className="font-extrabold text-brand-700">68%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-ink-100" role="progressbar" aria-valuenow={68} aria-valuemin={0} aria-valuemax={100} aria-label="Progres keseluruhan proyek">
                  <div className="bar-fill h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400" style={{ "--w": "68%" }} />
                </div>
              </div>

              <ul className="mt-6 space-y-3">
                <li className="flex items-center justify-between gap-3 rounded-2xl bg-ink-50 p-3.5">
                  <span className="flex min-w-0 items-center gap-3">
                    <CircleCheck className="h-5 w-5 shrink-0 text-[#15803D]" aria-hidden="true" />
                    <span className="truncate text-sm font-bold text-ink-900">Desain antarmuka</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-[#DCFCE7] px-2.5 py-1 text-xs font-bold text-[#15803D]">Disetujui</span>
                </li>
                <li className="flex items-center justify-between gap-3 rounded-2xl bg-ink-50 p-3.5 ring-2 ring-brand-200">
                  <span className="flex min-w-0 items-center gap-3">
                    <Clock3 className="h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
                    <span className="truncate text-sm font-bold text-ink-900">Pengembangan frontend</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-brand-100 px-2.5 py-1 text-xs font-bold text-brand-700">Menunggu review</span>
                </li>
                <li className="flex items-center justify-between gap-3 rounded-2xl bg-ink-50 p-3.5">
                  <span className="flex min-w-0 items-center gap-3">
                    <CircleDashed className="h-5 w-5 shrink-0 text-ink-500" aria-hidden="true" />
                    <span className="truncate text-sm font-bold text-ink-900">Integrasi pembayaran</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-ink-200 px-2.5 py-1 text-xs font-bold text-ink-700">Belum mulai</span>
                </li>
              </ul>
            </div>

            <div className="absolute -bottom-12 -left-4 hidden animate-float-slow items-center gap-3 rounded-2xl border border-ink-200 bg-white px-4 py-3 shadow-lift motion-reduce:animate-none sm:flex">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 text-brand-700"><MessageCircle className="h-[18px] w-[18px]" aria-hidden="true" /></span>
              <span className="leading-tight"><span className="block text-xs font-semibold text-ink-500">Chat developer</span><span className="text-sm font-bold text-ink-900">Hasil milestone 2 diunggah</span></span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= LAYANAN ================= */}
      <section id="layanan" className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="reveal mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">Layanan Kami</h2>
            <p className="mt-4 text-lg text-ink-600">Kami menawarkan berbagai layanan pembuatan website yang profesional dan disesuaikan dengan kebutuhan bisnis Anda.</p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {SERVICES.map(({ icon: Icon, title, desc }, i) => (
              <article key={title} className="reveal group rounded-3xl border border-ink-200 bg-white p-7 shadow-soft transition duration-300 hover:-translate-y-1.5 hover:border-brand-300 hover:shadow-lift motion-reduce:transition-none motion-reduce:hover:translate-y-0" style={d(i * 100)}>
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-100 text-brand-700 transition duration-300 group-hover:bg-brand-600 group-hover:text-white"><Icon className="h-6 w-6" aria-hidden="true" /></span>
                <h3 className="mt-5 text-xl font-bold text-ink-900">{title}</h3>
                <p className="mt-2 leading-relaxed text-ink-600">{desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ================= CARA KERJA ================= */}
      <section id="cara-kerja" className="scroll-mt-20 bg-ink-50 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="reveal mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">Cara Kerja</h2>
            <p className="mt-4 text-lg text-ink-600">Empat langkah sederhana dari pemesanan hingga website Anda siap, dengan progres yang bisa Anda pantau kapan saja.</p>
          </div>

          <ol className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {STEPS.map(({ icon: Icon, title, desc }, i) => (
              <li key={title} className="reveal step-line relative text-center" style={d(i * 100)}>
                <span className="relative mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-600 text-white shadow-soft"><Icon className="h-6 w-6" aria-hidden="true" /></span>
                <p className="mt-4 text-sm font-bold text-brand-700">Langkah {i + 1}</p>
                <h3 className="mt-1 text-lg font-bold text-ink-900">{title}</h3>
                <p className="mx-auto mt-2 max-w-[16rem] text-ink-600">{desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ================= HARGA ================= */}
      <section id="harga" className="scroll-mt-20 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="reveal mx-auto flex max-w-4xl flex-col items-center gap-8 rounded-3xl border border-ink-200 bg-white p-8 text-center shadow-soft sm:p-12 md:flex-row md:text-left">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-brand-100 text-brand-700"><Calculator className="h-7 w-7" aria-hidden="true" /></span>
            <div className="flex-1">
              <h2 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">Harga sesuai kebutuhan proyek Anda</h2>
              <p className="mt-2 text-ink-600">Gunakan kalkulator budget untuk mendapatkan estimasi biaya sebelum memesan. Tanpa kejutan di tengah proyek.</p>
            </div>
            <button type="button" onClick={() => navigate("/harga")} className={`shrink-0 px-6 py-3.5 ${BTN_PRIMARY} shadow-none`}>
              Hitung Estimasi <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="bg-ink-50 py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="reveal relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-900 to-brand-950 px-6 py-16 text-center shadow-lift sm:px-12 lg:py-20">
            <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 animate-blob rounded-full bg-brand-500/30 blur-3xl motion-reduce:animate-none" aria-hidden="true" />
            <div className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 animate-blob rounded-full bg-brand-400/20 blur-3xl motion-reduce:animate-none" style={{ animationDelay: "-7s" }} aria-hidden="true" />
            <div className="relative">
              <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Siap Memulai Proyek Website Anda?</h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-brand-100">Jangan tunda lagi. Hubungi kami sekarang dan dapatkan konsultasi gratis untuk mewujudkan ide digital Anda.</p>
              <a
                href={WA_KONSULTASI}
                target="_blank"
                rel="noopener noreferrer"
                className="group mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 font-bold text-brand-700 shadow-soft transition hover:-translate-y-0.5 hover:bg-brand-50 hover:shadow-lift focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:hover:translate-y-0"
              >
                Konsultasi Gratis
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
