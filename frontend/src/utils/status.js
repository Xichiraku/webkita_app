// Konfigurasi status orderan (nilai backend: pending, approved, process, done, rejected)
// Label & warna mengikuti desain HTML.

export const ORDER_STATUS = {
  pending:  { label: "Menunggu",     adminLabel: "Menunggu",  dot: "#D97706", chip: "bg-[#FEF3C7] text-[#B45309]" },
  approved: { label: "Disetujui",    adminLabel: "Disetujui", dot: "#2559CC", chip: "bg-brand-100 text-brand-800" },
  process:  { label: "Dalam Proses", adminLabel: "Diproses",  dot: "#0E7490", chip: "bg-[#CFFAFE] text-[#0E7490]" },
  done:     { label: "Selesai",      adminLabel: "Selesai",   dot: "#15803D", chip: "bg-[#DCFCE7] text-[#15803D]" },
  rejected: { label: "Ditolak",      adminLabel: "Ditolak",   dot: "#DC2626", chip: "bg-[#FEE2E2] text-[#B91C1C]" },
};

// Urutan alur: Menunggu → Disetujui → Diproses → Selesai (Ditolak di luar alur)
export const ORDER_KEYS = ["pending", "approved", "process", "done", "rejected"];

// Alur satu arah dari desain admin. Status lama yang tidak dikenal tetap bisa dipindah ke mana saja.
export const NEXT_STATUS = {
  pending:  ["pending", "approved", "rejected"],
  approved: ["approved", "process", "rejected"],
  process:  ["process", "done"],
  done:     ["done"],
  rejected: ["rejected"],
};

export const statusOf = (s) => ORDER_STATUS[s] || ORDER_STATUS.pending;

// Status transaksi Midtrans (nilai backend: pending, paid, failed, challenge)
export const TRX_STATUS = {
  pending:   { label: "Pending",   chip: "bg-[#FEF3C7] text-[#B45309]", note: "Menunggu pembayaran dari klien" },
  paid:      { label: "Lunas",     chip: "bg-[#DCFCE7] text-[#15803D]", note: "Pembayaran diterima" },
  failed:    { label: "Gagal",     chip: "bg-[#FEE2E2] text-[#B91C1C]", note: "Pembayaran ditolak, dibatalkan, atau kedaluwarsa" },
  challenge: { label: "Challenge", chip: "bg-[#E0E7FF] text-[#3730A3]", note: "Ditahan untuk tinjauan risiko penipuan" },
};
export const TRX_KEYS = ["pending", "paid", "failed", "challenge"];

// Kategori proyek (nilai dikirim ke backend sesuai tipe ProjectCategory)
export const CATEGORIES = [
  { value: "website", label: "Website / Web Application" },
  { value: "mobile", label: "Mobile Application" },
  { value: "desktop", label: "Desktop Application" },
  { value: "design", label: "Design (UI/UX)" },
  { value: "marketing", label: "Marketing & Branding" },
  { value: "other", label: "Lainnya" },
];
export const categoryLabel = (v) => CATEGORIES.find((c) => c.value === v)?.label || v || "–";
