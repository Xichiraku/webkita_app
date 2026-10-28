import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, Calendar, ChevronDown, CircleCheck, Clock, CreditCard, FileText, Info, Layers,
  PackageOpen, Phone, Plus, RefreshCw, TrendingUp, User, XCircle,
} from "lucide-react";
import API from "../core/utils/api_client";
import { ENDPOINTS } from "../core/constants/api_endpoint";
import { usePayment } from "../provider/payment_provider";
import { useUser } from "../provider/user_provider";
import { OrderStatusChip } from "../components/ui/StatusChip";
import CountUp from "../components/ui/CountUp";
import Toast from "../components/ui/Toast";
import PageLoader, { ButtonSpinner } from "../components/ui/Spinner";
import useToast from "../hooks/useToast";
import { formatDate, formatDateLong, rupiahOrNull } from "../utils/format";
import { categoryLabel, ORDER_STATUS } from "../utils/status";
import { BTN_PRIMARY, BTN_SECONDARY } from "../utils/ui";
import { loadMidtrans, parseAmount } from "../utils/payment";

const FILTERS = ["all", "pending", "process", "approved", "rejected", "done"];
const PLAN_DAYS = { Starter: 14, Professional: 30, Business: 60, Enterprise: 120 };
const PROGRESS = { process: 50, done: 100 };

const estimate = (createdAt, planTitle) => {
  if (!createdAt) return "–";
  const d = new Date(createdAt);
  d.setDate(d.getDate() + (PLAN_DAYS[planTitle] || 30));
  return formatDateLong(d.toISOString());
};

const transform = (item) => ({
  id: item.id,
  projectTitle: item.project_title,
  category: item.category,
  description: item.description,
  skills: item.skills,
  contactName: item.contact_name,
  contactPhone: item.contact_phone,
  additionalNotes: item.additional_notes || "",
  planTitle: item.plan_title,
  estimateRange: item.price_range || "",
  finalPriceRaw: item.plan_price_range || "",
  rejectReason: item.reject_reason || "",
  finalPrice: rupiahOrNull(parseAmount(item.plan_price_range)) || item.plan_price_range || "",
  status: item.status || "pending",
  createdAt: item.created_at,
});

const STAT_CARDS = [
  { key: "all", label: "Total Orderan", icon: Layers, border: "border-l-brand-600", tile: "bg-brand-100 text-brand-700" },
  { key: "pending", label: "Menunggu", icon: Clock, border: "border-l-[#D97706]", tile: "bg-[#FEF3C7] text-[#B45309]" },
  { key: "process", label: "Dalam Proses", icon: TrendingUp, border: "border-l-[#0E7490]", tile: "bg-[#CFFAFE] text-[#0E7490]" },
  { key: "done", label: "Selesai", icon: CircleCheck, border: "border-l-[#15803D]", tile: "bg-[#DCFCE7] text-[#15803D]" },
];

const Field = ({ label, children }) => (
  <div>
    <p className="text-xs font-bold uppercase tracking-wide text-ink-600">{label}</p>
    <p className="mt-1 whitespace-pre-line break-words leading-relaxed text-ink-900">{children}</p>
  </div>
);

function OrderCard({ order, index, open, onToggle, onPay, paying, isPaid }) {
  const navigate = useNavigate();
  const pct = PROGRESS[order.status];
  const canPay = !!order.finalPriceRaw && ["approved", "process"].includes(order.status);

  let action = null;
  if (isPaid) {
    action = (
      <button type="button" onClick={() => navigate(`/invoice/${order.id}`)} className={`px-4 py-2.5 text-sm ${BTN_SECONDARY}`}>
        <FileText className="h-4 w-4" aria-hidden="true" /> Lihat Invoice
      </button>
    );
  } else if (canPay) {
    action = (
      <button type="button" onClick={() => onPay(order)} disabled={paying} className={`px-4 py-2.5 text-sm ${BTN_PRIMARY}`}>
        {paying ? <ButtonSpinner className="h-4 w-4" /> : <CreditCard className="h-4 w-4" aria-hidden="true" />}
        {paying ? "Memproses…" : "Bayar Sekarang"}
      </button>
    );
  } else if (order.status === "rejected") {
    action = <button type="button" onClick={() => navigate("/harga")} className={`px-4 py-2.5 text-sm ${BTN_SECONDARY}`}>Ajukan Ulang</button>;
  }

  return (
    <article
      className={`card-in rounded-2xl border bg-white p-5 shadow-soft transition duration-300 hover:border-brand-300 hover:shadow-lift sm:p-6 ${open ? "border-brand-300" : "border-ink-200"}`}
      style={{ "--d": `${index * 70}ms` }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-wide text-ink-600">#{order.id}</p>
          <h3 className="mt-0.5 break-words text-lg font-extrabold text-ink-900">{order.projectTitle}</h3>
          <p className="mt-1 text-sm text-ink-600">{order.planTitle ? `Paket ${order.planTitle} · ` : ""}{formatDate(order.createdAt)}</p>
        </div>
        <OrderStatusChip status={order.status} />
      </div>

      {pct !== undefined && (
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="font-semibold text-ink-600">Progress</span>
            <span className="font-extrabold text-ink-900">{pct}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-ink-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Progress ${order.projectTitle}`}>
            <div className={`bar-grow h-full rounded-full ${order.status === "done" ? "bg-[#15803D]" : "bg-gradient-to-r from-brand-600 to-brand-400"}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {order.status === "approved" && !isPaid && (
        <p className="mt-3 flex items-center gap-2 text-sm text-ink-600">
          <Info className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
          {canPay ? "Orderan disetujui. Selesaikan pembayaran agar proyek dapat segera dikerjakan." : "Orderan disetujui. Admin sedang menetapkan harga final proyek Anda."}
        </p>
      )}
      {order.status === "rejected" && (
        <p className="mt-3 rounded-xl bg-[#FEE2E2] p-3 text-sm text-[#991B1B]">
          <strong>Alasan penolakan:</strong> {order.rejectReason || "Admin tidak mencantumkan alasan. Hubungi kami lewat WhatsApp untuk informasi lebih lanjut."}
        </p>
      )}
      {isPaid && (
        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#DCFCE7] px-3 py-1 text-xs font-bold text-[#15803D]">
          <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" /> Pembayaran Lunas
        </p>
      )}

      {open && (
        <div className="step-in mt-5 grid gap-5 rounded-2xl bg-ink-50 p-5 text-sm sm:grid-cols-2">
          <div className="space-y-4">
            <h4 className="flex items-center gap-2 font-extrabold text-ink-900"><FileText className="h-4 w-4 text-brand-600" aria-hidden="true" /> Detail Proyek</h4>
            <Field label="Kategori">{categoryLabel(order.category)}</Field>
            <Field label="Deskripsi">{order.description}</Field>
            <Field label="Skill Dibutuhkan">{order.skills}</Field>
            {order.additionalNotes && <Field label="Catatan Tambahan">{order.additionalNotes}</Field>}
          </div>
          <div className="space-y-4">
            <h4 className="flex items-center gap-2 font-extrabold text-ink-900"><User className="h-4 w-4 text-brand-600" aria-hidden="true" /> Informasi Kontak</h4>
            <Field label="Nama Kontak">{order.contactName}</Field>
            <Field label="Nomor Telepon"><span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-ink-500" aria-hidden="true" />{order.contactPhone}</span></Field>
            <Field label="Target Selesai"><span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-ink-500" aria-hidden="true" />{estimate(order.createdAt, order.planTitle)}</span></Field>
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3 border-t border-ink-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-ink-600">{order.finalPriceRaw ? "Harga final dari admin" : "Estimasi biaya"}</p>
          <p className="font-extrabold text-ink-900">{order.finalPrice || order.estimateRange || "Menunggu penetapan harga"}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={onToggle} aria-expanded={open} className={`px-4 py-2.5 text-sm ${BTN_SECONDARY}`}>
            {open ? "Tutup Detail" : "Lihat Detail"}
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
          {action}
        </div>
      </div>
    </article>
  );
}

export default function Orderan() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { createTransaction, openSnapPayment } = usePayment();
  const [toast, showToast] = useToast();

  const [orders, setOrders] = useState([]);
  const [paid, setPaid] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [openId, setOpenId] = useState(null);
  const [payingId, setPayingId] = useState(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await API.get(ENDPOINTS.GET_MY_PROJECTS);
      const list = (Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []).map(transform);
      setOrders(list);
      const res = {};
      await Promise.all(list.map(async (o) => {
        try { res[o.id] = (await API.get(`/payment/project/${o.id}`))?.isPaid === true; } catch { res[o.id] = false; }
      }));
      setPaid(res);
    } catch (err) {
      setError(err?.message || "Terjadi kesalahan saat memuat data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const count = useCallback((s) => (s === "all" ? orders.length : orders.filter((o) => o.status === s).length), [orders]);
  const rows = useMemo(() => (filter === "all" ? orders : orders.filter((o) => o.status === filter)), [orders, filter]);

  const handlePay = async (order) => {
    if (!user?.email) { showToast("Email akun tidak ditemukan. Lengkapi profil Anda terlebih dahulu.", "err"); return; }
    const amount = parseAmount(order.finalPriceRaw);
    if (!amount) { showToast("Harga tidak valid. Silakan hubungi admin.", "err"); return; }

    setPayingId(order.id);
    try {
      await loadMidtrans();
      const result = await createTransaction(order.id, {
        amount,
        customerName: order.contactName,
        customerEmail: user.email,
        customerPhone: order.contactPhone,
      });
      if (!result.success) { showToast(result.message || "Gagal membuat transaksi", "err"); return; }
      openSnapPayment(
        result.data.snap_token,
        () => { showToast("Pembayaran berhasil! Tim kami akan segera menghubungi Anda."); fetchOrders(); },
        () => showToast("Pembayaran pending. Silakan selesaikan pembayaran Anda."),
        () => showToast("Pembayaran gagal. Silakan coba lagi.", "err"),
      );
    } catch {
      showToast("Terjadi kesalahan saat memproses pembayaran", "err");
    } finally {
      setPayingId(null);
    }
  };

  if (loading) return <div className="bg-ink-50"><PageLoader label="Memuat data orderan…" /></div>;

  return (
    <main className="relative overflow-hidden bg-ink-50">
      <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 animate-blob rounded-full bg-brand-100 opacity-70 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-24 top-64 h-72 w-72 animate-blob rounded-full bg-brand-200/50 blur-3xl" style={{ animationDelay: "-7s" }} aria-hidden="true" />

      <div className="relative mx-auto max-w-5xl px-5 pb-20 pt-10 sm:px-8 sm:pt-14">
        <div className="flex animate-rise flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">Orderan Saya</h1>
            <p className="mt-1.5 text-ink-600">Pantau status dan progress semua proyek Anda.</p>
          </div>
          <button type="button" onClick={() => navigate("/harga")} className={`self-start px-5 py-3 text-sm ${BTN_PRIMARY}`}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Buat Orderan Baru
          </button>
        </div>

        {error ? (
          <div className="mx-auto mt-10 max-w-md rounded-3xl border border-ink-200 bg-white px-8 py-10 text-center shadow-soft">
            <XCircle className="mx-auto h-12 w-12 text-[#DC2626]" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-extrabold">Gagal Memuat Data</h2>
            <p className="mt-1.5 text-sm text-ink-600">{error}</p>
            <button type="button" onClick={fetchOrders} className={`mt-6 px-5 py-2.5 text-sm ${BTN_PRIMARY}`}><RefreshCw className="h-4 w-4" aria-hidden="true" /> Coba Lagi</button>
          </div>
        ) : (
          <>
            {/* Ringkasan */}
            <section aria-label="Ringkasan orderan" className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {STAT_CARDS.map(({ key, label, icon: Icon, border, tile }, i) => (
                <div key={key} className={`animate-rise rounded-2xl border border-l-4 border-ink-200 bg-white p-5 shadow-soft ${border}`} style={{ animationDelay: `${60 * (i + 1)}ms` }}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-ink-600">{label}</p>
                    <span className={`grid h-10 w-10 place-items-center rounded-xl ${tile}`}><Icon className="h-5 w-5" aria-hidden="true" /></span>
                  </div>
                  <p className="mt-2 text-3xl font-extrabold tabular-nums text-ink-900"><CountUp to={count(key)} /></p>
                </div>
              ))}
            </section>

            {/* Filter status */}
            <div className="no-scrollbar -mx-5 mt-8 overflow-x-auto px-5 sm:mx-0 sm:px-0">
              <div className="flex w-max gap-2 sm:w-auto sm:flex-wrap" role="group" aria-label="Filter status orderan">
                {FILTERS.map((f) => {
                  const on = f === filter;
                  return (
                    <button
                      key={f}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setFilter(f)}
                      className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400 ${on ? "border-brand-600 bg-brand-600 text-white shadow-soft" : "border-ink-200 bg-white text-ink-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"}`}
                    >
                      {f === "all" ? "Semua" : ORDER_STATUS[f].label}
                      <span className={`grid min-w-[1.4rem] place-items-center rounded-full px-1.5 text-xs font-bold ${on ? "bg-white/20 text-white" : "bg-ink-100 text-ink-700"}`}>{count(f)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Daftar orderan */}
            <p className="sr-only" role="status" aria-live="polite">Menampilkan {rows.length} orderan{filter === "all" ? "" : ` berstatus ${ORDER_STATUS[filter].label}`}</p>
            <div className="mt-5 space-y-4">
              {rows.length === 0 ? (
                <div className="card-in rounded-2xl border border-ink-200 bg-white px-6 py-14 text-center shadow-soft">
                  <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 text-brand-600"><PackageOpen className="h-8 w-8" aria-hidden="true" /></span>
                  <h3 className="mt-5 text-lg font-extrabold text-ink-900">{filter === "all" ? "Belum ada orderan" : `Tidak ada orderan berstatus ${ORDER_STATUS[filter].label}`}</h3>
                  <p className="mx-auto mt-1.5 max-w-sm text-ink-600">{filter === "all" ? "Orderan Anda akan muncul di sini setelah Anda memesan paket." : "Coba pilih status lain untuk melihat orderan Anda."}</p>
                  {filter === "all" ? (
                    <button type="button" onClick={() => navigate("/harga")} className={`mt-6 px-5 py-3 text-sm ${BTN_PRIMARY}`}>Pilih Paket <ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
                  ) : (
                    <button type="button" onClick={() => setFilter("all")} className={`mt-6 px-5 py-2.5 text-sm ${BTN_SECONDARY}`}>Lihat Semua Orderan</button>
                  )}
                </div>
              ) : (
                rows.map((o, i) => (
                  <OrderCard
                    key={`${filter}-${o.id}`}
                    order={o}
                    index={i}
                    open={openId === o.id}
                    onToggle={() => setOpenId(openId === o.id ? null : o.id)}
                    onPay={handlePay}
                    paying={payingId === o.id}
                    isPaid={paid[o.id] === true}
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>
      <Toast toast={toast} />
    </main>
  );
}
