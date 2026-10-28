import React from "react";
import { ArrowLeft } from "lucide-react";
import { LogoMark } from "../../components/ui/Logo";

/** Kerangka halaman auth (login/register) sesuai desain HTML */
export default function AuthShell({ title, subtitle, onBack, backLabel = "Kembali ke Beranda", maxWidth = "max-w-[29rem]", cardRef, children, footer }) {
  return (
    <div className="relative min-h-screen bg-white font-sans text-ink-900">
      <div className="pointer-events-none fixed inset-0 overflow-hidden bg-gradient-to-b from-white to-ink-50" aria-hidden="true">
        <div className="absolute -left-24 top-10 h-80 w-80 animate-blob rounded-full bg-brand-100 opacity-80 blur-3xl" />
        <div className="absolute -right-24 bottom-10 h-96 w-96 animate-blob rounded-full bg-brand-200/60 blur-3xl" style={{ animationDelay: "-7s" }} />
      </div>

      <main className="relative flex min-h-screen flex-col items-center justify-center px-5 py-10">
        <div className={`w-full animate-rise ${maxWidth}`}>
          {onBack && (
            <button type="button" onClick={onBack} className="group mb-6 inline-flex items-center gap-2 rounded-md text-sm font-semibold text-ink-700 transition hover:text-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-400">
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" aria-hidden="true" /> {backLabel}
            </button>
          )}

          <div ref={cardRef} className="rounded-3xl border border-ink-200 bg-white p-6 shadow-lift sm:p-9">
            <div className="flex flex-col items-center text-center">
              <LogoMark className="h-12 w-12 rounded-2xl shadow-soft" iconClass="h-6 w-6" />
              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-ink-900">{title}</h1>
              {subtitle && <p className="mt-1.5 text-ink-600">{subtitle}</p>}
            </div>
            {children}
            {footer}
          </div>
        </div>
      </main>
    </div>
  );
}
