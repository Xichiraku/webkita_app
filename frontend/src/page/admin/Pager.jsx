import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const btn = (on, dis) =>
  `grid h-9 min-w-[2.25rem] place-items-center rounded-lg border px-2 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400 ${
    on ? "border-brand-500 bg-brand-600 text-white" : "border-ink-200 bg-white/80 text-ink-700 hover:bg-brand-50"
  } ${dis ? "cursor-not-allowed opacity-40" : ""}`;

/** Paginasi + info "Menampilkan x–y dari z" (gaya desain admin) */
export default function Pager({ page, pages, info, onPage, hideWhenSingle = false }) {
  if (hideWhenSingle && pages <= 1) return null;

  // tampilkan maksimal ±1 di sekitar halaman aktif + awal/akhir
  const nums = [];
  for (let n = 1; n <= pages; n++) {
    if (n === 1 || n === pages || Math.abs(n - page) <= 1) nums.push(n);
    else if (nums[nums.length - 1] !== "…") nums.push("…");
  }

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-ink-100 px-5 py-4 sm:flex-row sm:px-6">
      <p className="text-sm text-ink-600">{info}</p>
      {pages > 1 && (
        <nav className="flex flex-wrap items-center gap-1.5" aria-label="Halaman">
          <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className={btn(false, page <= 1)} aria-label="Halaman sebelumnya"><ChevronLeft className="h-4 w-4" aria-hidden="true" /></button>
          {nums.map((n, i) =>
            n === "…" ? (
              <span key={`d${i}`} className="px-1 text-sm text-ink-500">…</span>
            ) : (
              <button key={n} type="button" onClick={() => onPage(n)} aria-current={n === page ? "page" : undefined} aria-label={`Halaman ${n}`} className={btn(n === page, false)}>{n}</button>
            )
          )}
          <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)} className={btn(false, page >= pages)} aria-label="Halaman berikutnya"><ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
        </nav>
      )}
    </div>
  );
}
