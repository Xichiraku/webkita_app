// Helper format angka & tanggal (Bahasa Indonesia)

export const rp = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");

/** Ambil angka dari string harga seperti "Rp 5.000.000" atau "5000000" */
export const toNumber = (v) => {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  const d = String(v).replace(/\D/g, "");
  return d ? parseInt(d, 10) : 0;
};

/** "Rp 5.000.000" dari angka/teks; null jika kosong */
export const rupiahOrNull = (v) => {
  const n = toNumber(v);
  return n > 0 ? rp(n) : null;
};

export const fmtJt = (v) => "Rp " + (v / 1000000).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + " jt";

export const formatDate = (s) => {
  if (!s) return "–";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "–";
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
};

export const formatDateLong = (s) => {
  if (!s) return "–";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "–";
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
};

export const formatSize = (bytes) => {
  if (!bytes) return "";
  if (bytes < 1048576) return Math.max(1, Math.round(bytes / 1024)) + " KB";
  return (bytes / 1048576).toFixed(1).replace(".", ",") + " MB";
};

export const initials = (name = "") => {
  const w = name.trim().split(/\s+/).filter(Boolean);
  if (!w.length) return "?";
  return ((w[0][0] || "") + (w.length > 1 ? w[w.length - 1][0] : "")).toUpperCase();
};

/** Nomor 08xx → format wa.me (62xx) */
export const waLink = (phone = "") => "https://wa.me/" + String(phone).replace(/\D/g, "").replace(/^0/, "62");

export const PHONE_RE = /^(\+62|62|0)8[1-9][0-9]{6,11}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// tanda hubung diizinkan karena akun bawaan seed memakai "admin-demo"
export const USERNAME_RE = /^[a-zA-Z0-9._-]{3,30}$/;
