import React from "react";
import { CircleAlert, CircleCheck } from "lucide-react";

/** Tampilan toast di bawah tengah layar. State-nya dari hook useToast(). */
export default function Toast({ toast }) {
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-[120] flex justify-center px-4">
      {toast && (
        <div key={toast.id} className="toast-in pointer-events-auto flex items-center gap-2.5 rounded-xl bg-ink-900 px-5 py-3 text-sm font-semibold text-white shadow-lift">
          {toast.kind === "err"
            ? <CircleAlert className="h-5 w-5 shrink-0 text-[#FCA5A5]" aria-hidden="true" />
            : <CircleCheck className="h-5 w-5 shrink-0 text-[#86EFAC]" aria-hidden="true" />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
