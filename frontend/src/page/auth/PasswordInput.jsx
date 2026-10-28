import React, { useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import FieldError from "../../components/ui/FieldError";
import { INPUT, LABEL } from "../../utils/ui";

/** Input password dengan ikon gembok + tombol tampil/sembunyi */
export default function PasswordInput({ id, label, required = true, error, ...props }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className={LABEL}>
        {label} {required && <span className="text-[#B91C1C]" aria-hidden="true">*</span>}
      </label>
      <div className="relative">
        <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-500" aria-hidden="true" />
        <input
          id={id}
          name={id}
          type={show ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-err`}
          className={`${INPUT} pl-11 pr-12`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-ink-500 transition hover:bg-brand-50 hover:text-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400"
          aria-label={show ? "Sembunyikan password" : "Tampilkan password"}
          aria-pressed={show}
        >
          {show ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
        </button>
      </div>
      <FieldError id={`${id}-err`} msg={error} />
    </div>
  );
}
