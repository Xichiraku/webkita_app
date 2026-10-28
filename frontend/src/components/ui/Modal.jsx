import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

/**
 * Modal ringan pengganti <dialog> pada desain HTML.
 * - Klik latar / tombol Esc menutup modal
 * - Scroll halaman dikunci selama modal terbuka
 * - Fokus dipindah ke dalam modal lalu dikembalikan saat ditutup
 */
export default function Modal({ open, onClose, labelledBy, className = "w-[min(92vw,30rem)]", children }) {
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const prevFocus = document.activeElement;
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";

    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current?.();
      }
    };
    document.addEventListener("keydown", onKey);

    // fokus ke elemen pertama yang punya autofocus, atau panel
    requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const auto = panel.querySelector("[data-autofocus]");
      (auto || panel).focus({ preventScroll: true });
    });

    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = prevOverflow;
      if (prevFocus && typeof prevFocus.focus === "function") prevFocus.focus({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="modal-backdrop fixed inset-0 z-[100] grid place-items-center overflow-y-auto p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={`animate-rise rounded-3xl bg-white text-ink-900 shadow-lift outline-none ${className}`}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
