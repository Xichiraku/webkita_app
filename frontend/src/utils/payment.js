// Pembayaran Midtrans Snap (sandbox) — dipakai Orderan & Invoice
export const MIDTRANS_SNAP = "https://app.sandbox.midtrans.com/snap/snap.js";
export const MIDTRANS_CLIENT_KEY = "SB-Mid-client-4Lymuq91xf7MtA6u";

/** Ambil angka pertama dari teks harga ("Rp 5.000.000" → 5000000) */
export const parseAmount = (priceRange) => {
  if (!priceRange) return 0;
  const m = String(priceRange).replace(/[.,]/g, "").match(/\d{4,}/);
  return m ? parseInt(m[0], 10) : 0;
};

export const loadMidtrans = () =>
  new Promise((resolve, reject) => {
    if (window.snap) return resolve();
    const s = document.createElement("script");
    s.src = MIDTRANS_SNAP;
    s.setAttribute("data-client-key", MIDTRANS_CLIENT_KEY);
    s.onload = resolve;
    s.onerror = () => reject(new Error("Gagal memuat Midtrans"));
    document.body.appendChild(s);
  });
