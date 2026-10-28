import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Loader2, Lock } from "lucide-react";
import { NEXT_STATUS, ORDER_KEYS, ORDER_STATUS, statusOf } from "../../utils/status";
import { OrderStatusChip } from "../../components/ui/StatusChip";

/**
 * Dropdown status melayang (tidak terpotong tabel).
 * Mengikuti alur satu arah: Menunggu → Disetujui → Diproses → Selesai, Ditolak final.
 */
const StatusUpdater = ({ order, onPick, busy = false }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const allowed = NEXT_STATUS[order.status] || ORDER_KEYS;
  const cur = statusOf(order.status);

  useLayoutEffect(() => {
    if (!open || !btnRef.current || !menuRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const h = menuRef.current.offsetHeight, w = menuRef.current.offsetWidth;
    let top = r.bottom + 6;
    if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 6);
    setPos({ top, left: Math.max(8, Math.min(r.left, window.innerWidth - w - 8)) });
    (menuRef.current.querySelector('[aria-selected="true"]') || menuRef.current.querySelector('[role="option"]:not([aria-disabled="true"])'))?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const close = () => setOpen(false);
    // tutup hanya jika tombol benar-benar bergeser (mis. halaman di-scroll)
    const start = btnRef.current?.getBoundingClientRect();
    const onScroll = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (!r || !start || Math.abs(r.top - start.top) > 2 || Math.abs(r.left - start.left) > 2) setOpen(false);
    };
    const onDown = (e) => {
      if (menuRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  if (allowed.length <= 1) return <OrderStatusChip status={order.status} admin />;

  const pick = (k) => {
    setOpen(false);
    btnRef.current?.focus();
    if (k !== order.status) onPick?.(order, k);
  };

  const onKey = (e) => {
    const items = Array.from(menuRef.current?.querySelectorAll('[role="option"]:not([aria-disabled="true"])') || []);
    const i = items.indexOf(document.activeElement);
    if (e.key === "ArrowDown") { e.preventDefault(); items[(i + 1) % items.length]?.focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus(); }
    else if (e.key === "Home") { e.preventDefault(); items[0]?.focus(); }
    else if (e.key === "End") { e.preventDefault(); items[items.length - 1]?.focus(); }
    else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setOpen(false); btnRef.current?.focus(); }
    else if (e.key === "Tab") setOpen(false);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        disabled={busy}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Ubah status orderan ${order.projectTitle}, saat ini ${cur.adminLabel}`}
        className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white py-1.5 pl-1.5 pr-2.5 shadow-sm transition hover:border-brand-300 disabled:cursor-wait disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400"
      >
        <span className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${cur.chip}`}>
          <span className="h-2 w-2 rounded-full" style={{ background: cur.dot }} />
          {cur.adminLabel}
        </span>
        {busy ? <Loader2 className="h-4 w-4 animate-spin text-ink-500" aria-hidden="true" /> : <ChevronDown className="h-4 w-4 text-ink-500" aria-hidden="true" />}
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          aria-label="Pilih status"
          onKeyDown={onKey}
          className="fixed z-[96] w-60 rounded-2xl border border-ink-200 bg-white p-2 shadow-lift"
          style={{ top: pos.top, left: pos.left }}
        >
          {ORDER_KEYS.map((k) => {
            const s = ORDER_STATUS[k];
            const isCur = k === order.status;
            const ok = allowed.includes(k);
            return (
              <button
                key={k}
                type="button"
                role="option"
                aria-selected={isCur}
                aria-disabled={!ok}
                tabIndex={-1}
                title={ok ? undefined : `Status tidak bisa diubah ke ${s.adminLabel} dari ${cur.adminLabel}`}
                onMouseDown={(e) => { if (!ok) e.preventDefault(); }}
                onClick={() => ok && pick(k)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[15px] transition focus-visible:outline-none ${ok ? "hover:bg-ink-50 focus-visible:bg-brand-50" : "cursor-not-allowed opacity-45"} ${isCur ? "bg-ink-50 font-bold" : "font-medium"}`}
                style={isCur ? { color: s.dot } : undefined}
              >
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: s.dot }} />
                <span className={`flex-1 ${isCur ? "" : "text-ink-800"}`}>{s.adminLabel}</span>
                {isCur ? <Check className="h-4 w-4" aria-hidden="true" /> : !ok && <Lock className="h-3.5 w-3.5 text-ink-500" aria-hidden="true" />}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
};

export default StatusUpdater;
