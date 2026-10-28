import React, { useEffect, useRef, useState } from "react";
import { Circle, CircleAlert, CircleCheck, KeyRound, ShieldCheck } from "lucide-react";
import { useUser } from "../../provider/user_provider";
import { ButtonSpinner } from "../../components/ui/Spinner";
import ResetShell, { StepHeader } from "./ResetShell";
import PasswordInput from "./PasswordInput";
import { BTN_ARIA_OFF, BTN_PRIMARY } from "../../utils/ui";

const RULES = [
  { key: "len", label: "Minimal 8 karakter", test: (v) => v.length >= 8 },
  { key: "mix", label: "Mengandung huruf dan angka", test: (v) => /[A-Za-z]/.test(v) && /\d/.test(v) },
];

function ResetPassword({ resetToken, email, onBackToVerify, onSuccess }) {
  const { resetPassword } = useUser();
  const cardRef = useRef(null);

  const [pw, setPw] = useState("");
  const [pc, setPc] = useState("");
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Tanpa token (mis. halaman di-refresh) alur harus diulang dari OTP
  useEffect(() => { if (!resetToken && !success) onBackToVerify?.(); }, [resetToken, success, onBackToVerify]);

  const ok = Object.fromEntries(RULES.map((r) => [r.key, r.test(pw)]));
  const rulesOk = RULES.every((r) => ok[r.key]);
  const match = pc.length > 0 && pw === pc;
  const canSubmit = rulesOk && match && !loading;

  const shake = () => {
    const el = cardRef.current; if (!el) return;
    el.classList.remove("animate-shake"); void el.offsetWidth; el.classList.add("animate-shake");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    const errs = {
      password: rulesOk ? "" : "Password belum memenuhi syarat.",
      password_confirmation: !pc ? "Konfirmasi password wajib diisi." : match ? "" : "Konfirmasi password tidak sama.",
    };
    setErrors(errs);
    if (errs.password || errs.password_confirmation) {
      shake();
      document.getElementById(errs.password ? "password" : "password_confirmation")?.focus();
      return;
    }

    setLoading(true);
    setServerError("");
    const result = await resetPassword({ resetToken, newPassword: pw });
    setLoading(false);
    if (!result.success) {
      setServerError(result.message || "Gagal mereset password. Silakan coba lagi.");
      shake();
      return;
    }
    setSuccess(true);
  };

  if (success) {
    return (
      <ResetShell current={3} onBack={onSuccess} cardRef={cardRef}>
        <div className="text-center">
          <StepHeader icon={ShieldCheck} tone="success" title="Password Berhasil Diubah">
            Demi keamanan, silakan masuk kembali dengan password baru Anda.
          </StepHeader>
          <button type="button" onClick={onSuccess} className={`mt-7 h-12 w-full text-[15px] ${BTN_PRIMARY}`}>Masuk ke Akun</button>
        </div>
      </ResetShell>
    );
  }

  return (
    <ResetShell current={2} onBack={onBackToVerify} backLabel="Kembali" cardRef={cardRef}>
      <StepHeader icon={KeyRound} title="Buat Password Baru">
        Kode terverifikasi. Buat password baru untuk akun{" "}
        <b className="[overflow-wrap:anywhere] text-ink-900">{email}</b>.
      </StepHeader>

      <form className="mt-7 space-y-5" onSubmit={handleSubmit} noValidate>
        {serverError && (
          <p className="flex items-start gap-2.5 rounded-xl bg-[#FEF2F2] p-3.5 text-sm font-semibold text-[#7F1D1D]" role="alert">
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#B91C1C]" aria-hidden="true" /> {serverError}
          </p>
        )}

        <PasswordInput
          id="password"
          label="Password baru"
          autoComplete="new-password"
          value={pw}
          disabled={loading}
          error={errors.password}
          onChange={(e) => { setPw(e.target.value); setErrors((x) => ({ ...x, password: "" })); setServerError(""); }}
        />

        <ul className="space-y-1.5 text-sm" aria-label="Syarat password">
          {RULES.map((r) => (
            <li key={r.key} className={`flex items-center gap-2 ${ok[r.key] ? "font-semibold text-[#15803D]" : "text-ink-600"}`}>
              {ok[r.key] ? <CircleCheck className="h-4 w-4 shrink-0" aria-hidden="true" /> : <Circle className="h-4 w-4 shrink-0" aria-hidden="true" />}
              <span>{r.label}</span>
            </li>
          ))}
        </ul>

        <PasswordInput
          id="password_confirmation"
          label="Konfirmasi password"
          autoComplete="new-password"
          value={pc}
          disabled={loading}
          error={errors.password_confirmation || (pc && !match ? "Konfirmasi password tidak sama." : "")}
          onChange={(e) => { setPc(e.target.value); setErrors((x) => ({ ...x, password_confirmation: "" })); setServerError(""); }}
        />

        <button type="submit" aria-disabled={!canSubmit} className={`h-12 w-full text-[15px] ${BTN_PRIMARY}${BTN_ARIA_OFF}`}>
          {loading && <ButtonSpinner />}
          {loading ? "Menyimpan…" : "Simpan Password Baru"}
        </button>
      </form>
    </ResetShell>
  );
}

export default ResetPassword;
