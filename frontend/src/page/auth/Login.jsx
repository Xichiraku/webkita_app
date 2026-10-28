import React, { useRef, useState } from "react";
import { CircleAlert, CircleCheck, Mail } from "lucide-react";
import { useUser } from "../../provider/user_provider";
import FieldError from "../../components/ui/FieldError";
import { ButtonSpinner } from "../../components/ui/Spinner";
import AuthShell from "./AuthShell";
import PasswordInput from "./PasswordInput";
import { EMAIL_RE } from "../../utils/format";
import { BTN_PRIMARY, INPUT, LABEL } from "../../utils/ui";

const RULES = {
  email: (v) => (!v ? "Email wajib diisi." : !EMAIL_RE.test(v) ? "Format email tidak valid." : ""),
  password: (v) => (v ? "" : "Password wajib diisi."),
};

function Login({ onBackToHome, onForgotPassword, onGoToRegister, onGoToAdmin }) {
  const { loginUser } = useUser();
  const cardRef = useRef(null);

  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState("");

  const check = (k, v) => setErrors((e) => ({ ...e, [k]: RULES[k](k === "email" ? v.trim() : v) }));

  const onChange = (k) => (e) => {
    const v = e.target.value;
    setValues((s) => ({ ...s, [k]: v }));
    setServerError("");
    if (errors[k]) check(k, v);
  };

  const shake = () => {
    const el = cardRef.current; if (!el) return;
    el.classList.remove("animate-shake"); void el.offsetWidth; el.classList.add("animate-shake");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    setSuccess("");
    const errs = { email: RULES.email(values.email.trim()), password: RULES.password(values.password) };
    setErrors(errs);
    const bad = ["email", "password"].find((k) => errs[k]);
    if (bad) { document.getElementById(bad)?.focus(); shake(); return; }

    setLoading(true);
    const result = await loginUser(values.email.trim(), values.password);
    setLoading(false);

    if (!result.success) {
      setServerError(result.message || "Login gagal. Periksa email dan password.");
      shake();
      return;
    }

    setSuccess("Login berhasil! Mengalihkan…");
    setTimeout(() => {
      const role = result.user?.role;
      if (role === "admin" || role === "developer") onGoToAdmin?.();
      else onBackToHome?.();
    }, 800);
  };

  return (
    <AuthShell
      title="Masuk ke Akun"
      subtitle="Pantau proyek website Anda di Project Workspace."
      onBack={onBackToHome}
      cardRef={cardRef}
      footer={
        <p className="mt-6 text-center text-sm text-ink-600">
          Belum punya akun?{" "}
          <button type="button" onClick={onGoToRegister} className="font-bold text-brand-700 hover:underline">Daftar sekarang</button>
        </p>
      }
    >
      <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
        {serverError && (
          <p className="flex items-start gap-2.5 rounded-xl bg-[#FEF2F2] p-3.5 text-sm font-semibold text-[#7F1D1D]" role="alert">
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#B91C1C]" aria-hidden="true" /> {serverError}
          </p>
        )}
        {success && (
          <p className="flex items-start gap-2.5 rounded-xl bg-[#DCFCE7] p-3.5 text-sm font-semibold text-[#14532D]" role="status">
            <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#15803D]" aria-hidden="true" /> {success}
          </p>
        )}

        <div>
          <label htmlFor="email" className={LABEL}>Email <span className="text-[#B91C1C]" aria-hidden="true">*</span></label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-500" aria-hidden="true" />
            <input
              id="email"
              name="email"
              type="email"
              placeholder="nama@email.com"
              autoComplete="email"
              value={values.email}
              onChange={onChange("email")}
              onBlur={(e) => e.target.value && check("email", e.target.value)}
              disabled={loading}
              aria-invalid={errors.email ? true : undefined}
              aria-describedby="email-err"
              className={`${INPUT} pl-11`}
            />
          </div>
          <FieldError id="email-err" msg={errors.email} />
        </div>

        <PasswordInput
          id="password"
          label="Password"
          placeholder="Masukkan password"
          autoComplete="current-password"
          value={values.password}
          onChange={onChange("password")}
          disabled={loading}
          error={errors.password}
        />

        <div className="flex justify-end">
          <button type="button" onClick={onForgotPassword} className="rounded text-sm font-semibold text-brand-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400">
            Lupa password?
          </button>
        </div>

        <button type="submit" disabled={loading} className={`h-12 w-full text-[15px] ${BTN_PRIMARY}`}>
          {loading && <ButtonSpinner />}
          {loading ? "Memproses…" : "Masuk"}
        </button>
      </form>
    </AuthShell>
  );
}

export default Login;
