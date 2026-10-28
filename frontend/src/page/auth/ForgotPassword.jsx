import React, { useEffect, useRef, useState } from "react";
import { CircleAlert, CircleCheck, LockKeyhole, Mail } from "lucide-react";
import { useUser } from "../../provider/user_provider";
import FieldError from "../../components/ui/FieldError";
import { ButtonSpinner } from "../../components/ui/Spinner";
import ResetShell, { StepHeader } from "./ResetShell";
import { EMAIL_RE } from "../../utils/format";
import { BTN_ARIA_OFF, BTN_PRIMARY, INPUT, LABEL } from "../../utils/ui";

function ForgotPassword({ onBackToLogin, onOTPSent }) {
  const { forgotPassword } = useUser();
  const cardRef = useRef(null);
  const inputRef = useRef(null);

  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  useEffect(() => { inputRef.current?.focus(); }, []);

  const value = email.trim();
  const valid = EMAIL_RE.test(value);
  const fieldError = touched && !valid ? (value ? "Format email tidak valid." : "Email wajib diisi.") : "";

  const shake = () => {
    const el = cardRef.current; if (!el) return;
    el.classList.remove("animate-shake"); void el.offsetWidth; el.classList.add("animate-shake");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setTouched(true);
    if (!valid) { shake(); inputRef.current?.focus(); return; }

    setLoading(true);
    setServerError("");
    const result = await forgotPassword(value);
    setLoading(false);

    if (!result.success) {
      setServerError(result.message || "Terjadi kesalahan. Silakan coba lagi.");
      shake();
      return;
    }
    onOTPSent({ email: value });
  };

  return (
    <ResetShell current={0} onBack={onBackToLogin} cardRef={cardRef}>
      <StepHeader icon={LockKeyhole} title="Lupa Password">
        Masukkan alamat email akun Anda. Kami akan mengirimkan kode OTP untuk mengatur ulang password.
      </StepHeader>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
        {serverError && (
          <p className="flex items-start gap-2.5 rounded-xl bg-[#FEF2F2] p-3.5 text-sm font-semibold text-[#7F1D1D]" role="alert">
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#B91C1C]" aria-hidden="true" /> {serverError}
          </p>
        )}

        <div>
          <label htmlFor="email" className={LABEL}>Alamat Email <span className="text-[#B91C1C]" aria-hidden="true">*</span></label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-500" aria-hidden="true" />
            <input
              ref={inputRef}
              id="email"
              name="email"
              type="email"
              inputMode="email"
              placeholder="nama@email.com"
              autoComplete="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (serverError) setServerError(""); }}
              onBlur={() => email && setTouched(true)}
              disabled={loading}
              aria-invalid={fieldError ? true : undefined}
              aria-describedby="email-err"
              className={`${INPUT} pl-11 pr-11 ${valid ? "!border-[#16A34A]" : ""}`}
            />
            {valid && <CircleCheck className="pointer-events-none absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#15803D]" aria-hidden="true" />}
          </div>
          <FieldError id="email-err" msg={fieldError} />
        </div>

        <button type="submit" aria-disabled={!valid || loading} className={`h-12 w-full text-[15px] ${BTN_PRIMARY}${BTN_ARIA_OFF}`}>
          {loading && <ButtonSpinner />}
          {loading ? "Mengirim…" : "Kirim Kode OTP"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-600">
        Sudah ingat password?{" "}
        <button type="button" onClick={onBackToLogin} className="font-bold text-brand-700 hover:underline">Masuk sekarang</button>
      </p>
    </ResetShell>
  );
}

export default ForgotPassword;
