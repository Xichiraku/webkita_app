import React from "react";
import { ArrowLeft, Check } from "lucide-react";

const STEPS = ["Email", "Kode OTP", "Password baru"];

/** Indikator 3 langkah. current: 0..2, atau 3 = selesai */
export function Stepper({ current }) {
  if (current > 2) return null;
  return (
    <ol className="mb-7 flex items-center justify-center gap-2" aria-label="Langkah reset password">
      {STEPS.map((label, i) => {
        const done = i < current;
        const cur = i === current;
        return (
          <React.Fragment key={label}>
            {i > 0 && <li aria-hidden="true" className="h-px w-6 bg-ink-300" />}
            <li className="flex items-center gap-2" aria-current={cur ? "step" : undefined}>
              <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${cur ? "bg-brand-600 text-white" : done ? "bg-[#DCFCE7] text-[#15803D]" : "bg-ink-100 text-ink-600"}`}>
                {done ? <Check className="h-4 w-4" aria-hidden="true" /> : i + 1}
              </span>
              <span className={`hidden text-xs min-[420px]:inline ${cur ? "font-bold text-ink-800" : "font-semibold text-ink-600"}`}>{label}</span>
            </li>
          </React.Fragment>
        );
      })}
    </ol>
  );
}

/** Judul tiap langkah: ikon bulat + h1 */
export function StepHeader({ icon: Icon, title, children, tone = "brand" }) {
  const toneCls = tone === "success" ? "h-16 w-16 bg-[#DCFCE7] text-[#15803D] pop" : "h-14 w-14 bg-brand-50 text-brand-600";
  return (
    <div className="flex flex-col items-center text-center">
      <span className={`grid place-items-center rounded-full ${toneCls}`}><Icon className={tone === "success" ? "h-8 w-8" : "h-6 w-6"} aria-hidden="true" /></span>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-ink-900 outline-none">{title}</h1>
      {children && <p className="mt-2 text-ink-600">{children}</p>}
    </div>
  );
}

/** Kerangka halaman lupa/OTP/reset password sesuai lupa-password.html */
export default function ResetShell({ current, onBack, backLabel = "Kembali ke Login", cardRef, children }) {
  return (
    <div className="relative min-h-screen bg-white font-sans text-ink-900">
      <div className="pointer-events-none fixed inset-0 overflow-hidden bg-gradient-to-b from-white to-ink-50" aria-hidden="true">
        <div className="absolute -left-24 top-10 h-80 w-80 animate-blob rounded-full bg-brand-100 opacity-80 blur-3xl" />
        <div className="absolute -right-24 bottom-10 h-96 w-96 animate-blob rounded-full bg-brand-200/60 blur-3xl" style={{ animationDelay: "-7s" }} />
      </div>
      <main className="relative flex min-h-screen flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-[29rem] animate-rise">
          <button
            type="button"
            onClick={onBack}
            className={`group mb-6 inline-flex items-center gap-2 rounded-md text-sm font-semibold text-ink-700 transition hover:text-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-400 ${current > 2 ? "invisible" : ""}`}
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" aria-hidden="true" /> {backLabel}
          </button>
          <div ref={cardRef} className="rounded-3xl border border-ink-200 bg-white p-6 shadow-lift sm:p-9">
            <Stepper current={current} />
            <div className="step-in">{children}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
