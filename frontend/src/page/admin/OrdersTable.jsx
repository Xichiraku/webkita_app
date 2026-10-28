import React, { useRef, useState } from "react";
import { Check, Eye, Loader2, Pencil, SearchX, X } from "lucide-react";
import StatusUpdater from "./StatusUpdater";
import { formatDate, rp } from "../../utils/format";
import { categoryLabel } from "../../utils/status";
import { A_ICON_BTN } from "../../utils/ui";

/**
 * Harga final per orderan. Backend hanya mengizinkan harga di-set SEKALI
 * (PATCH /project/:id/price menolak jika sudah ada), jadi tombol ubah hanya
 * muncul selama harga belum diatur & orderan belum selesai/ditolak.
 */
const PriceCell = ({ order, onSave, notify }) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState("");
  const [bad, setBad] = useState(false);
  const [saving, setSaving] = useState(false);
  const editBtn = useRef(null);
  const locked = !!order.planPriceRange || order.status === "done" || order.status === "rejected";

  const close = () => { setEditing(false); setBad(false); requestAnimationFrame(() => editBtn.current?.focus()); };

  const submit = async (e) => {
    e.preventDefault();
    const n = +val.replace(/\D/g, "");
    if (!n || n < 1000) { setBad(true); notify?.("Masukkan harga minimal Rp 1.000.", "err"); return; }
    setSaving(true);
    const ok = await onSave(order, n);
    setSaving(false);
    if (ok) setEditing(false);
  };

  if (editing) {
    return (
      <form onSubmit={submit} className="flex items-center gap-1.5">
        <label className="sr-only" htmlFor={`pi-${order.id}`}>Harga final</label>
        <span className="text-ink-600">Rp</span>
        <input
          id={`pi-${order.id}`}
          autoFocus
          inputMode="numeric"
          autoComplete="off"
          value={val}
          onChange={(e) => { const d = e.target.value.replace(/\D/g, ""); setVal(d ? (+d).toLocaleString("id-ID") : ""); setBad(false); }}
          onKeyDown={(e) => { if (e.key === "Escape") close(); }}
          aria-invalid={bad || undefined}
          className={`h-9 w-28 rounded-lg border px-2 text-sm font-bold outline-none ring-2 ${bad ? "border-[#DC2626] ring-[#FEE2E2]" : "border-brand-400 ring-brand-200"}`}
        />
        <button type="submit" disabled={saving} className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400" aria-label="Simpan harga">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
        </button>
        <button type="button" onClick={close} className="grid h-8 w-8 place-items-center rounded-lg border border-ink-200 text-ink-700 hover:bg-ink-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400" aria-label="Batal ubah harga">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span className={order.price ? "font-bold text-ink-900" : "text-ink-600"}>{order.price ? rp(order.price) : order.planPriceRange || "Belum diatur"}</span>
      {!locked && (
        <button
          ref={editBtn}
          type="button"
          onClick={() => { setVal(""); setEditing(true); }}
          className="grid h-8 w-8 place-items-center rounded-lg border border-ink-200 bg-white/80 text-ink-600 transition hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400"
          aria-label={`Atur harga ${order.projectTitle}`}
          title="Atur harga final (hanya bisa sekali)"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}
    </span>
  );
};

const OrdersTable = ({ rows, animKey, onView, onPick, onSetPrice, busyId, notify, minWidth = "min-w-[1000px]", emptyText = "Coba ubah kata kunci atau filter status.", onReset }) => {
  if (!rows.length) {
    return (
      <div className="px-6 py-14 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600"><SearchX className="h-7 w-7" aria-hidden="true" /></span>
        <p className="mt-4 font-extrabold text-ink-900">Tidak ada orderan yang cocok</p>
        <p className="mt-1 text-ink-600">{emptyText}</p>
        {onReset && (
          <button type="button" onClick={onReset} className="mt-4 inline-flex items-center gap-2 rounded-xl border-2 border-ink-200 px-4 py-2 text-sm font-bold text-ink-800 hover:bg-ink-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400">Reset filter</button>
        )}
      </div>
    );
  }

  return (
    <div className="scroll-thin overflow-x-auto">
      <table className={`w-full text-left text-sm ${minWidth}`}>
        <caption className="sr-only">Daftar orderan</caption>
        <thead className="bg-brand-50/70 text-xs font-bold uppercase tracking-wide text-ink-600">
          <tr>
            <th scope="col" className="px-6 py-3.5">#</th>
            <th scope="col" className="px-3 py-3.5">Proyek</th>
            <th scope="col" className="px-3 py-3.5">Kategori</th>
            <th scope="col" className="px-3 py-3.5">Paket</th>
            <th scope="col" className="px-3 py-3.5">Kontak</th>
            <th scope="col" className="px-3 py-3.5">Tanggal</th>
            <th scope="col" className="px-3 py-3.5">Harga</th>
            <th scope="col" className="px-3 py-3.5">Status</th>
            <th scope="col" className="px-6 py-3.5 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {rows.map((o, i) => (
            <tr key={`${animKey}-${o.id}`} className="row-in align-middle transition hover:bg-brand-50/50" style={{ "--d": `${i * 40}ms` }}>
              <td className="px-6 py-4 text-ink-600">{o.id}</td>
              <td className="min-w-[14rem] max-w-[20rem] px-3 py-4 font-bold text-ink-900">{o.projectTitle}</td>
              <td className="px-3 py-4"><span className="whitespace-nowrap rounded-md bg-ink-100 px-2.5 py-1 text-xs font-semibold text-ink-700">{categoryLabel(o.category)}</span></td>
              <td className="px-3 py-4 text-ink-700">{o.planTitle || "–"}</td>
              <td className="px-3 py-4"><span className="block font-semibold text-ink-900">{o.contactName}</span><span className="text-xs text-ink-600">{o.contactPhone}</span></td>
              <td className="whitespace-nowrap px-3 py-4 text-ink-700">{formatDate(o.createdAt)}</td>
              <td className="whitespace-nowrap px-3 py-4"><PriceCell order={o} onSave={onSetPrice} notify={notify} /></td>
              <td className="px-3 py-4"><StatusUpdater order={o} onPick={onPick} busy={busyId === o.id} /></td>
              <td className="px-6 py-4 text-right">
                <button type="button" onClick={() => onView(o)} className={A_ICON_BTN} aria-label={`Lihat detail ${o.projectTitle}`}>
                  <Eye className="h-4 w-4" aria-hidden="true" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OrdersTable;
