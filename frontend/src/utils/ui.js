// Nomor WhatsApp Webkita (format 62…)
export const WA_NUMBER = "6282171484751";
export const WA_KONSULTASI = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Halo Webkita, saya mau konsultasi")}`;
export const WA_PAKET = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Halo Webkita, saya ingin konsultasi paket.")}`;

// Kumpulan kelas Tailwind yang dipakai berulang (diambil dari desain HTML)

export const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400";

export const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 font-bold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-lift disabled:cursor-not-allowed disabled:opacity-80 disabled:hover:translate-y-0 motion-reduce:hover:translate-y-0 " + FOCUS;

export const BTN_SECONDARY =
  "inline-flex items-center justify-center gap-2 rounded-xl border-2 border-ink-200 bg-white font-bold text-ink-800 transition hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-60 " + FOCUS;

export const INPUT =
  "h-12 w-full rounded-xl border border-ink-300 bg-white px-4 text-[15px] text-ink-900 placeholder:text-ink-500 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-300 aria-[invalid=true]:border-[#DC2626] aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-[#FEE2E2] disabled:bg-ink-50";

export const LABEL = "mb-1.5 block text-sm font-bold text-ink-800";

// Admin
export const A_INPUT =
  "h-11 w-full rounded-xl border border-ink-200 bg-white/80 text-sm text-ink-900 placeholder:text-ink-500 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-300";
export const A_SELECT =
  "h-11 w-full cursor-pointer rounded-xl border border-ink-200 bg-white/80 px-3 text-sm font-semibold text-ink-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-300";
export const A_ICON_BTN =
  "inline-grid h-9 w-9 place-items-center rounded-lg border border-ink-200 bg-white/80 text-ink-700 transition hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400";
export const A_CARD_BTN =
  "card inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-ink-800 transition hover:bg-white hover:text-brand-700 disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400";

export const filterChip = (on) =>
  "inline-flex items-center gap-2 whitespace-nowrap rounded-lg border px-3.5 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400 " +
  (on ? "border-brand-500 bg-brand-50 text-brand-700" : "border-ink-200 bg-white/80 text-ink-700 hover:border-brand-300 hover:bg-brand-50");

// Tombol utama yang dinonaktifkan lewat aria-disabled (tetap bisa difokus & memunculkan pesan error saat diklik)
export const BTN_ARIA_OFF =
  " aria-disabled:cursor-not-allowed aria-disabled:bg-ink-400 aria-disabled:shadow-none aria-disabled:hover:translate-y-0 aria-disabled:hover:bg-ink-400";
