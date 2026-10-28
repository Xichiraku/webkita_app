import React from "react";

/** Spinner kecil untuk tombol (sama seperti desain HTML) */
export function ButtonSpinner({ className = "h-5 w-5" }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".3" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Loader satu halaman */
export default function PageLoader({ label = "Memuat…", className = "min-h-[60vh]" }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`} role="status">
      <span className="h-11 w-11 animate-spin rounded-full border-[3px] border-ink-200 border-t-brand-600" aria-hidden="true" />
      <p className="text-sm font-semibold text-ink-600">{label}</p>
    </div>
  );
}
