import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Building2, CircleCheck, Clock, CreditCard, FileX, Printer, UserRound } from "lucide-react";
import API from "../core/utils/api_client";
import { useUser } from "../provider/user_provider";
import { usePayment } from "../provider/payment_provider";
import Toast from "../components/ui/Toast";
import { ButtonSpinner } from "../components/ui/Spinner";
import useToast from "../hooks/useToast";
import { formatDateLong, rupiahOrNull } from "../utils/format";
import { categoryLabel } from "../utils/status";
import { loadMidtrans } from "../utils/payment";
import { BTN_PRIMARY, BTN_SECONDARY } from "../utils/ui";

const Label = ({ children }) => <p className="mb-1 text-xs font-extrabold uppercase tracking-wider text-ink-500">{children}</p>;

const Backdrop = () => (
  <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-gradient-to-b from-white to-ink-50 print:hidden" aria-hidden="true">
    <div className="absolute -left-24 top-10 h-80 w-80 animate-blob rounded-full bg-brand-100 opacity-80 blur-3xl" />
    <div className="absolute -right-24 bottom-10 h-96 w-96 animate-blob rounded-full bg-brand-200/60 blur-3xl" style={{ animationDelay: "-7s" }} />
  </div>
);

export default function InvoicePage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const { createTransaction, openSnapPayment } = usePayment();
  const [toast, showToast] = useToast(4200);

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [paying, setPaying] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await API.get(`/payment/invoice/${projectId}`);
      setProject(res?.data || null);
      setError(!res?.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  const goBack = () => { if (window.history.length > 1) navigate(-1); else navigate("/orderan"); };

  if (loading) {
    return (
      <div className="min-h-screen bg-ink-50 font-sans">
        <Backdrop />
        <main className="mx-auto mt-24 max-w-3xl rounded-3xl border border-ink-200 bg-white p-10 text-center shadow-soft" role="status">
          <span className="mx-auto mb-4 block h-10 w-10 animate-spin rounded-full border-[3px] border-brand-100 border-t-brand-600" aria-hidden="true" />
          <p className="text-sm font-semibold text-ink-600">Memuat invoice…</p>
        </main>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-ink-50 px-4 py-10 font-sans">
        <Backdrop />
        <main className="mx-auto mt-14 max-w-3xl rounded-3xl border border-ink-200 bg-white p-10 text-center shadow-soft">
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-[#FEE2E2] text-[#B91C1C]"><FileX className="h-7 w-7" aria-hidden="true" /></span>
          <h1 className="text-xl font-extrabold tracking-tight">Invoice tidak dapat dimuat</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-600" role="alert">Invoice tidak ditemukan atau kamu tidak punya akses ke invoice ini.</p>
          <Link to="/orderan" className={`mt-6 min-h-[2.75rem] px-5 text-sm ${BTN_PRIMARY}`}>Ke Orderan Saya</Link>
        </main>
      </div>
    );
  }

  // semua data invoice (nomor, tanggal terbit, nominal, status lunas) datang dari server
  const isPaid = project.is_paid === true;
  const number = project.invoice_number || `INV-${String(projectId).padStart(4, "0")}`;
  const amount = Number(project.amount) || 0;
  const total = rupiahOrNull(amount) || "Belum ditetapkan";
  const canPay = !isPaid && ["approved", "process"].includes(project.status) && amount > 0;
  const plan = project.plan_title || "–";

  const pay = async () => {
    if (!user?.email) { showToast("Email akun tidak ditemukan. Lengkapi profil Anda terlebih dahulu.", "err"); return; }
    setPaying(true);
    try {
      await loadMidtrans();
      const result = await createTransaction(project.id, {
        customerName: project.contact_name,
        customerEmail: user.email,
        customerPhone: project.contact_phone,
      });
      if (!result.success) { showToast(result.message || "Gagal membuat transaksi", "err"); return; }
      openSnapPayment(
        result.data.snap_token,
        () => { showToast("Pembayaran berhasil. Status invoice diperbarui setelah dikonfirmasi."); load(); },
        () => showToast("Pembayaran pending. Silakan selesaikan pembayaran Anda."),
        () => showToast("Pembayaran gagal. Silakan coba lagi.", "err"),
      );
    } catch {
      showToast("Terjadi kesalahan saat memproses pembayaran", "err");
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink-50 font-sans text-ink-900 antialiased selection:bg-brand-200 print:bg-white">
      <Backdrop />
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10 print:max-w-none print:p-0">

        <nav className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden" aria-label="Aksi invoice">
          <button type="button" onClick={goBack} className={`min-h-[2.75rem] border px-4 text-sm ${BTN_SECONDARY}`}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Kembali
          </button>
          <div className="flex flex-wrap gap-2">
            {canPay && (
              <button type="button" onClick={pay} disabled={paying} className={`min-h-[2.75rem] px-4 text-sm ${BTN_PRIMARY} disabled:cursor-wait`}>
                {paying ? <ButtonSpinner className="h-4 w-4" /> : <CreditCard className="h-4 w-4" aria-hidden="true" />}
                {paying ? "Memproses…" : "Bayar sekarang"}
              </button>
            )}
            <button type="button" onClick={() => window.print()} className={`min-h-[2.75rem] border border-brand-700 px-4 text-sm text-brand-700 ${BTN_SECONDARY}`}>
              <Printer className="h-4 w-4" aria-hidden="true" /> Cetak / Simpan PDF
            </button>
          </div>
        </nav>

        <article className="overflow-hidden rounded-3xl bg-white shadow-lift print:rounded-none print:shadow-none" aria-labelledby="inv-no">
          <header className="keep-color bg-gradient-to-br from-brand-900 to-brand-600 px-6 py-8 text-white sm:px-11 sm:py-9 print:px-8 print:py-6">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <p className="text-3xl font-black tracking-tight">Webkita</p>
                <p className="mt-1 max-w-[15rem] text-xs leading-relaxed text-brand-100">Hubungkan bisnis Anda dengan developer terbaik</p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs font-bold uppercase tracking-[.14em] text-brand-100">Invoice</p>
                <h1 id="inv-no" className="mb-2 mt-1 text-xl font-extrabold">{number}</h1>
                {isPaid ? (
                  <span className="keep-color inline-flex items-center gap-1.5 rounded-full bg-[#DCFCE7] px-3 py-1 text-xs font-extrabold tracking-wide text-[#15803D]">
                    <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" />LUNAS
                  </span>
                ) : (
                  <span className="keep-color inline-flex items-center gap-1.5 rounded-full bg-[#FEF3C7] px-3 py-1 text-xs font-extrabold tracking-wide text-[#B45309]">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />MENUNGGU PEMBAYARAN
                  </span>
                )}
              </div>
            </div>
          </header>

          <div className="px-6 py-8 sm:px-11 sm:py-9 print:px-8 print:py-6">
            <section className="mb-7 grid gap-4 border-b border-ink-100 pb-7 sm:grid-cols-3 sm:gap-5" aria-label="Informasi invoice">
              <div><Label>Tanggal invoice</Label><p className="text-sm font-semibold">{project.invoice_issued_at ? formatDateLong(project.invoice_issued_at) : "Belum terbit"}</p></div>
              <div><Label>Tanggal proyek</Label><p className="text-sm font-semibold">{formatDateLong(project.created_at)}</p></div>
              <div><Label>ID proyek</Label><p className="break-all text-sm font-semibold">#{projectId}</p></div>
            </section>

            <section className="mb-7 grid gap-5 sm:grid-cols-2 sm:gap-6">
              <div>
                <Label>Dari</Label>
                <div className="mt-2 flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700"><Building2 className="h-5 w-5" aria-hidden="true" /></span>
                  <div><p className="text-sm font-bold">Webkita</p><p className="text-xs text-ink-600">webkita.com</p></div>
                </div>
              </div>
              <div>
                <Label>Kepada</Label>
                <div className="mt-2 flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700"><UserRound className="h-5 w-5" aria-hidden="true" /></span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{project.contact_name || "–"}</p>
                    <p className="text-xs text-ink-600">{project.contact_phone || "–"}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="mb-7 rounded-2xl border border-ink-100 bg-ink-50 p-4 sm:p-5">
              <h2 className="mb-3 text-sm font-extrabold text-ink-800">Rincian Proyek</h2>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-ink-200 text-left text-xs font-bold uppercase tracking-wider text-ink-500">
                    <th scope="col" className="py-2 pr-3">Deskripsi</th>
                    <th scope="col" className="hidden px-3 py-2 text-center sm:table-cell">Paket</th>
                    <th scope="col" className="py-2 pl-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="align-top">
                    <td className="py-4 pr-3">
                      <p className="font-bold">{project.project_title || "–"}</p>
                      <p className="mt-1 text-xs text-ink-600">{categoryLabel(project.category)}</p>
                      <span className="keep-color mt-2 inline-block rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700 sm:hidden">{plan}</span>
                    </td>
                    <td className="hidden px-3 py-4 text-center sm:table-cell">
                      <span className="keep-color inline-block rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">{plan}</span>
                    </td>
                    <td className="whitespace-nowrap py-4 pl-3 text-right font-semibold">{total}</td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section className="mb-7 ml-auto w-full sm:max-w-xs" aria-label="Total pembayaran">
              <div className="flex justify-between gap-4 border-b border-ink-100 py-2 text-sm text-ink-600"><span>Subtotal</span><strong className="text-ink-800">{total}</strong></div>
              <div className="flex justify-between gap-4 border-b border-ink-100 py-2 text-sm text-ink-600"><span>Pajak (0%)</span><strong className="text-ink-800">Rp 0</strong></div>
              <div className="flex items-baseline justify-between gap-4 pt-3 font-extrabold"><span className="text-base">Total</span><strong className="text-xl text-brand-800">{total}</strong></div>
            </section>

            {isPaid ? (
              <section className="keep-color mb-7 flex items-start gap-3 rounded-2xl border border-[#86EFAC] bg-[#DCFCE7] p-4 text-[#15803D]">
                <CircleCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-sm font-extrabold">Pembayaran Telah Diterima</p>
                  <p className="mt-0.5 text-sm">Terima kasih! Pembayaran kamu sudah dikonfirmasi.</p>
                  <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                    {project.paid_at && (<div><dt className="inline font-bold">Tanggal bayar: </dt><dd className="inline">{formatDateLong(project.paid_at)}</dd></div>)}
                    {project.payment_reference && (<div className="min-w-0"><dt className="inline font-bold">Referensi: </dt><dd className="inline break-all">{project.payment_reference}</dd></div>)}
                    {project.payment_type && (<div><dt className="inline font-bold">Metode: </dt><dd className="inline">{String(project.payment_type).replace(/_/g, " ")}</dd></div>)}
                  </dl>
                </div>
              </section>
            ) : (
              <section className="keep-color mb-7 flex items-start gap-3 rounded-2xl border border-[#FCD34D] bg-[#FEF3C7] p-4 text-[#B45309] print:break-inside-avoid">
                <Clock className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-sm font-extrabold">Menunggu pembayaran</p>
                  <p className="mt-0.5 text-sm">
                    {canPay
                      ? <>Selesaikan pembayaran lewat tombol <strong>Bayar sekarang</strong>. Status invoice berubah otomatis setelah pembayaran terkonfirmasi.</>
                      : "Pembayaran dapat dilakukan setelah proyek disetujui dan harga final ditetapkan oleh admin."}
                  </p>
                </div>
              </section>
            )}

            <footer className="border-t border-ink-100 pt-5 text-center text-xs leading-relaxed text-ink-500">
              Terima kasih telah mempercayakan proyek Anda kepada <strong className="text-ink-700">Webkita</strong>. Jika ada pertanyaan, hubungi kami di{" "}
              <a href="mailto:support@webkita.com" className="font-semibold text-brand-700 underline">support@webkita.com</a>
            </footer>
          </div>
        </article>
      </div>
      <Toast toast={toast} />
    </div>
  );
}
