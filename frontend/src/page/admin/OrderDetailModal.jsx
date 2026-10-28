import React, { useEffect, useState } from "react";
import { BadgeCheck, CircleX, Download, FileText, Image, Loader2, MessageCircle, Paperclip, Tag, User, X } from "lucide-react";
import API from "../../core/utils/api_client";
import { ENDPOINTS } from "../../core/constants/api_endpoint";
import Modal from "../../components/ui/Modal";
import { OrderStatusChip } from "../../components/ui/StatusChip";
import { formatDateLong, formatSize, rp, waLink } from "../../utils/format";
import { categoryLabel } from "../../utils/status";

const Label = ({ children }) => <p className="mt-4 text-xs font-bold uppercase tracking-wide text-ink-600 first:mt-0">{children}</p>;

const OrderDetailModal = ({ order, onClose, onApprove, onReject, notify }) => {
  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    if (!order?.id) return;
    let alive = true;
    setLoadingFiles(true);
    API.get(ENDPOINTS.GET_ATTACHMENTS(order.id))
      .then((res) => alive && setFiles(res?.data ?? []))
      .catch(() => alive && setFiles([]))
      .finally(() => alive && setLoadingFiles(false));
    return () => { alive = false; };
  }, [order?.id]);

  const download = async (att) => {
    setDownloading(att.id);
    try {
      const blob = await API.get(`/attachments/download/${att.id}`, { responseType: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = att.file_name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      notify?.("Gagal mengunduh file", "err");
    } finally {
      setDownloading(null);
    }
  };

  const skills = String(order?.skills || "").split(",").map((s) => s.trim()).filter(Boolean);

  return (
    <Modal open={!!order} onClose={onClose} labelledBy="d-title" className="w-[min(94vw,46rem)] overflow-hidden">
      {order && (
        <div className="flex max-h-[92vh] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-ink-100 p-5 sm:p-6">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <OrderStatusChip status={order.status} admin />
                {order.planTitle && <span className="rounded-full bg-ink-100 px-3 py-1 text-xs font-bold text-ink-800">Paket {order.planTitle}</span>}
              </div>
              <h2 id="d-title" className="mt-3 break-words text-xl font-extrabold tracking-tight sm:text-2xl">{order.projectTitle}</h2>
              <p className="mt-1 text-sm text-ink-600">#{order.id} · {categoryLabel(order.category)} · Dibuat {formatDateLong(order.createdAt)}</p>
            </div>
            <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-ink-200 text-ink-700 transition hover:bg-ink-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400" aria-label="Tutup detail">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div className="scroll-thin space-y-4 overflow-y-auto bg-white p-5 sm:p-6">
            <section className="rounded-2xl bg-ink-50 p-5">
              <h3 className="flex items-center gap-2 text-sm font-extrabold"><FileText className="h-4 w-4 text-brand-600" aria-hidden="true" /> Detail Proyek</h3>
              <Label>Deskripsi</Label>
              <p className="mt-1 whitespace-pre-line break-words leading-relaxed text-ink-900">{order.description}</p>
              <Label>Skill</Label>
              <ul className="mt-1.5 flex flex-wrap gap-2">
                {skills.length ? skills.map((s) => <li key={s} className="rounded-full bg-brand-100 px-3 py-1 text-sm font-semibold text-brand-800">{s}</li>) : <li className="text-ink-600">-</li>}
              </ul>
              {order.status === "rejected" && (<><Label>Alasan Penolakan</Label><p className="mt-1 whitespace-pre-line break-words text-[#991B1B]">{order.rejectReason || "Tidak dicantumkan"}</p></>)}
              {order.additionalNotes && (<><Label>Catatan Tambahan</Label><p className="mt-1 whitespace-pre-line break-words text-ink-900">{order.additionalNotes}</p></>)}
            </section>

            <div className="grid gap-4 sm:grid-cols-2">
              <section className="rounded-2xl bg-ink-50 p-5">
                <h3 className="flex items-center gap-2 text-sm font-extrabold"><User className="h-4 w-4 text-brand-600" aria-hidden="true" /> Kontak</h3>
                <Label>Nama</Label>
                <p className="mt-1 text-ink-900">{order.contactName}</p>
                <Label>Telepon</Label>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-ink-900">{order.contactPhone}</span>
                  {order.contactPhone && order.contactPhone !== "–" && (
                    <a href={waLink(order.contactPhone)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded text-sm font-bold text-brand-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400">
                      <MessageCircle className="h-4 w-4" aria-hidden="true" /> Chat WhatsApp
                    </a>
                  )}
                </p>
              </section>
              <section className="rounded-2xl bg-ink-50 p-5">
                <h3 className="flex items-center gap-2 text-sm font-extrabold"><Tag className="h-4 w-4 text-brand-600" aria-hidden="true" /> Paket &amp; Harga</h3>
                <Label>Paket</Label>
                <p className="mt-1 text-ink-900">{order.planTitle || "–"}</p>
                <Label>Estimasi harga</Label>
                <p className="mt-1 font-extrabold text-brand-700">{order.priceRange || "–"}</p>
                <Label>Harga final</Label>
                <p className="mt-1 font-extrabold text-ink-900">{order.price ? rp(order.price) : order.planPriceRange || "Belum diatur"}</p>
              </section>
            </div>

            <section className="rounded-2xl bg-ink-50 p-5">
              <h3 className="flex items-center gap-2 text-sm font-extrabold"><Paperclip className="h-4 w-4 text-brand-600" aria-hidden="true" /> Lampiran</h3>
              <ul className="mt-4 space-y-2">
                {loadingFiles ? (
                  <li className="flex items-center gap-2 text-ink-600"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Memuat lampiran…</li>
                ) : files.length === 0 ? (
                  <li className="text-ink-600">Tidak ada lampiran.</li>
                ) : (
                  files.map((f) => {
                    const Ico = String(f.file_type || "").startsWith("image") ? Image : FileText;
                    return (
                      <li key={f.id} className="flex items-center gap-3 rounded-xl border border-ink-200 bg-white p-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700"><Ico className="h-5 w-5" aria-hidden="true" /></span>
                        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{f.file_name}</span><span className="text-xs text-ink-600">{formatSize(f.file_size)} · {f.file_type}</span></span>
                        <button type="button" onClick={() => download(f)} disabled={downloading === f.id} className="inline-flex items-center gap-1.5 rounded-lg border border-brand-300 bg-brand-50 px-3 py-1.5 text-sm font-bold text-brand-700 transition hover:bg-brand-100 disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400">
                          {downloading === f.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />} Unduh
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </section>
          </div>

          {order.status === "pending" && (
            <div className="flex flex-col-reverse gap-3 border-t border-ink-100 bg-white p-5 sm:flex-row sm:justify-end sm:p-6">
              <button type="button" onClick={() => onReject(order)} className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#FCA5A5] px-5 py-2.5 font-bold text-[#B91C1C] transition hover:bg-[#FEE2E2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DC2626]">
                <CircleX className="h-4 w-4" aria-hidden="true" /> Tolak
              </button>
              <button type="button" onClick={() => onApprove(order)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 font-bold text-white shadow-soft transition hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400">
                <BadgeCheck className="h-4 w-4" aria-hidden="true" /> Setujui Orderan
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default OrderDetailModal;
