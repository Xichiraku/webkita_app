import React, { useCallback, useEffect, useRef, useState } from "react";
import { CircleAlert, MailCheck } from "lucide-react";
import { useUser } from "../../provider/user_provider";
import { ButtonSpinner } from "../../components/ui/Spinner";
import ResetShell, { StepHeader } from "./ResetShell";
import { BTN_ARIA_OFF, BTN_PRIMARY } from "../../utils/ui";

const OTP_LEN = 6;
const OTP_TTL = 300;      // detik, sama dengan masa berlaku kode di backend (5 menit)
const RESEND_WAIT = 60;   // detik

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const empty = () => Array(OTP_LEN).fill("");

const maskEmail = (m = "") => {
  const [u = "", d = ""] = m.split("@");
  const head = u.length <= 2 ? u.slice(0, 1) : u[0] + "*".repeat(Math.min(u.length - 2, 5)) + u[u.length - 1];
  return `${head}@${d}`;
};

function VerifyOTP({ email, onBackToForgot, onOTPVerified }) {
  const { verifyOtp, forgotPassword } = useUser();
  const cardRef = useRef(null);
  const cells = useRef([]);

  const [otp, setOtp] = useState(empty);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [expLeft, setExpLeft] = useState(OTP_TTL);
  const [resendLeft, setResendLeft] = useState(RESEND_WAIT);
  const [resending, setResending] = useState(false);

  // Halaman dibuka langsung/refresh → email hilang, ulangi dari awal
  useEffect(() => { if (!email) onBackToForgot?.(); }, [email, onBackToForgot]);
  useEffect(() => { cells.current[0]?.focus(); }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setExpLeft((v) => (v > 0 ? v - 1 : 0));
      setResendLeft((v) => (v > 0 ? v - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const expired = expLeft <= 0;
  const code = otp.join("");
  const complete = code.length === OTP_LEN;
  const disabled = !complete || expired || loading;

  const shake = () => {
    const el = cardRef.current; if (!el) return;
    el.classList.remove("animate-shake"); void el.offsetWidth; el.classList.add("animate-shake");
  };

  const submit = useCallback(async (value) => {
    if (loading || expired) return;
    setLoading(true);
    setError("");
    setInfo("");
    const result = await verifyOtp(email, value);
    setLoading(false);

    if (!result.success) {
      setError(result.message || "Kode OTP tidak valid atau sudah kedaluwarsa.");
      setOtp(empty());
      shake();
      requestAnimationFrame(() => cells.current[0]?.focus());
      return;
    }
    onOTPVerified({ resetToken: result.resetToken, email });
  }, [email, expired, loading, onOTPVerified, verifyOtp]);

  const fillFrom = (index, digits) => {
    const next = [...otp];
    for (let k = 0; k < digits.length && index + k < OTP_LEN; k++) next[index + k] = digits[k];
    setOtp(next);
    setError("");
    const last = Math.min(OTP_LEN - 1, index + digits.length);
    cells.current[last]?.focus();
    cells.current[last]?.select();
    if (next.every(Boolean)) setTimeout(() => submit(next.join("")), 120);
  };

  const onChange = (i, raw) => {
    const d = raw.replace(/\D/g, "");
    if (!d) {
      const next = [...otp]; next[i] = ""; setOtp(next); setError("");
      return;
    }
    fillFrom(i, d);
  };

  const onKeyDown = (i, e) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) {
      e.preventDefault();
      const next = [...otp]; next[i - 1] = ""; setOtp(next);
      cells.current[i - 1]?.focus();
    } else if (e.key === "ArrowLeft" && i > 0) { e.preventDefault(); cells.current[i - 1]?.focus(); }
    else if (e.key === "ArrowRight" && i < OTP_LEN - 1) { e.preventDefault(); cells.current[i + 1]?.focus(); }
    else if (e.key === "Home") { e.preventDefault(); cells.current[0]?.focus(); }
    else if (e.key === "End") { e.preventDefault(); cells.current[OTP_LEN - 1]?.focus(); }
  };

  const onPaste = (i, e) => {
    const t = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!t) return;
    e.preventDefault();
    const next = [...otp];
    for (let k = i; k < OTP_LEN; k++) next[k] = "";
    setOtp(next);
    // pakai nilai bersih: isi ulang dari posisi i
    const merged = [...next];
    for (let k = 0; k < t.length && i + k < OTP_LEN; k++) merged[i + k] = t[k];
    setOtp(merged);
    setError("");
    cells.current[Math.min(OTP_LEN - 1, i + t.length)]?.focus();
    if (merged.every(Boolean)) setTimeout(() => submit(merged.join("")), 120);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (loading || expired) return;
    if (!complete) {
      setError(`Masukkan ${OTP_LEN} digit kode OTP.`);
      shake();
      cells.current[Math.max(0, code.length)]?.focus();
      return;
    }
    submit(code);
  };

  const resend = async () => {
    if (resendLeft > 0 || resending) return;
    setResending(true);
    setError("");
    setInfo("");
    const result = await forgotPassword(email);
    setResending(false);
    if (!result.success) { setError(result.message || "Gagal mengirim ulang kode. Coba lagi."); return; }
    setOtp(empty());
    setExpLeft(OTP_TTL);
    setResendLeft(RESEND_WAIT);
    setInfo("Kode baru sudah dikirim.");
    cells.current[0]?.focus();
  };

  return (
    <ResetShell current={1} onBack={onBackToForgot} backLabel="Kembali ke Login" cardRef={cardRef}>
      <StepHeader icon={MailCheck} title="Masukkan Kode OTP">
        Jika <b className="[overflow-wrap:anywhere] text-ink-900">{maskEmail(email)}</b> terdaftar, kami telah mengirim kode 6 digit ke email tersebut.
      </StepHeader>
      <div className="mt-1 text-center">
        <button type="button" onClick={onBackToForgot} className="rounded text-sm font-bold text-brand-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400">Ganti email</button>
      </div>

      <form className="mt-7" onSubmit={handleSubmit} noValidate>
        <div role="group" aria-labelledby="otp-lbl">
          <p id="otp-lbl" className="sr-only">Kode OTP 6 digit</p>
          <div className="flex justify-center gap-2 sm:gap-3">
            {otp.map((d, i) => (
              <input
                key={i}
                ref={(el) => { cells.current[i] = el; }}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                value={d}
                disabled={loading}
                onChange={(e) => onChange(i, e.target.value)}
                onKeyDown={(e) => onKeyDown(i, e)}
                onPaste={(e) => onPaste(i, e)}
                onFocus={(e) => e.target.select()}
                aria-label={`Digit ${i + 1} dari ${OTP_LEN}`}
                aria-describedby="otp-err"
                aria-invalid={error ? true : undefined}
                className="h-14 w-11 rounded-xl border border-ink-300 bg-white text-center text-2xl font-extrabold tabular-nums text-ink-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-300 disabled:bg-ink-50 aria-[invalid=true]:border-[#DC2626] aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-[#FECACA] sm:h-16 sm:w-14"
              />
            ))}
          </div>
          {error && (
            <p id="otp-err" className="mt-3 flex items-start justify-center gap-1.5 text-center text-sm font-semibold text-[#B91C1C]" role="alert">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> <span>{error}</span>
            </p>
          )}
          {info && !error && <p className="mt-3 text-center text-sm font-semibold text-[#15803D]" role="status">{info}</p>}
        </div>

        <p className="mt-4 text-center text-sm text-ink-600">
          {expired
            ? <span className="font-semibold text-[#B91C1C]">Kode kedaluwarsa. Kirim ulang kode baru.</span>
            : <>Kode berlaku <b className="tabular-nums text-ink-900">{fmt(expLeft)}</b></>}
        </p>

        <button type="submit" aria-disabled={disabled} className={`mt-6 h-12 w-full text-[15px] ${BTN_PRIMARY}${BTN_ARIA_OFF}`}>
          {loading && <ButtonSpinner />}
          {loading ? "Memeriksa…" : "Verifikasi"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-ink-600">
        Tidak menerima kode?{" "}
        <button
          type="button"
          onClick={resend}
          aria-disabled={resendLeft > 0 || resending}
          className="rounded font-bold text-brand-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400 aria-disabled:cursor-not-allowed aria-disabled:text-ink-500 aria-disabled:no-underline"
        >
          {resending ? "Mengirim…" : "Kirim ulang"}
        </button>{" "}
        {resendLeft > 0 && <span className="tabular-nums text-ink-600">({fmt(resendLeft)})</span>}
      </p>
      <p className="mt-3 text-center text-xs text-ink-600">Cek juga folder spam.</p>
    </ResetShell>
  );
}

export default VerifyOTP;
