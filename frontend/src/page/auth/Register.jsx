import React, { useEffect, useRef, useState } from "react";
import { CircleAlert, MailCheck, Mail, Phone, User } from "lucide-react";
import { useUser } from "../../provider/user_provider";
import FieldError from "../../components/ui/FieldError";
import Modal from "../../components/ui/Modal";
import { ButtonSpinner } from "../../components/ui/Spinner";
import AuthShell from "./AuthShell";
import PasswordInput from "./PasswordInput";
import { EMAIL_RE, PHONE_RE, USERNAME_RE } from "../../utils/format";
import { BTN_PRIMARY, INPUT, LABEL } from "../../utils/ui";

const ORDER = ["username", "first_name", "last_name", "email", "phone", "password", "password_confirmation"];

const makeRules = (vals) => ({
  username: (v) => (!v ? "Username wajib diisi." : !USERNAME_RE.test(v) ? "Gunakan 3-30 karakter: huruf, angka, titik, garis bawah, atau tanda hubung." : ""),
  first_name: (v) => (v.length > 50 ? "Maksimal 50 karakter." : ""),
  last_name: (v) => (v.length > 50 ? "Maksimal 50 karakter." : ""),
  email: (v) => (!v ? "Email wajib diisi." : !EMAIL_RE.test(v) ? "Format email tidak valid." : ""),
  phone: (v) => (!v ? "Nomor WhatsApp wajib diisi." : !PHONE_RE.test(v.replace(/[\s-]/g, "")) ? "Gunakan nomor Indonesia, contoh 08123456789." : ""),
  password: (v) => (!v ? "Password wajib diisi." : v.length < 8 ? "Password minimal 8 karakter." : !/[A-Za-z]/.test(v) || !/\d/.test(v) ? "Password harus mengandung huruf dan angka." : ""),
  password_confirmation: (v) => (!v ? "Konfirmasi password wajib diisi." : v !== vals.password ? "Konfirmasi password tidak sama." : ""),
});

function Register({ onBackToHome, onGoToLogin }) {
  const { registerUser, loading, error, setError } = useUser();
  const cardRef = useRef(null);

  const [vals, setVals] = useState({
    username: "", first_name: "", last_name: "", email: "", phone: "", password: "", password_confirmation: "",
  });
  const [terms, setTerms] = useState(false);
  const [termsErr, setTermsErr] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(null); // { message }
  const [countdown, setCountdown] = useState(0);

  // bersihkan error global dari halaman lain saat masuk
  useEffect(() => { setError(""); }, [setError]);

  // hitung mundur lalu ke halaman login
  useEffect(() => {
    if (!success) return undefined;
    if (countdown <= 0) { (onGoToLogin || onBackToHome)?.(); return undefined; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [success, countdown, onGoToLogin, onBackToHome]);

  const ruleFor = (k, v, all = vals) => makeRules(all)[k](k.startsWith("password") ? v : v.trim());

  const onChange = (k) => (e) => {
    let v = e.target.value;
    if (k === "phone") v = v.replace(/[^0-9+]/g, "");
    const next = { ...vals, [k]: v };
    setVals(next);
    if (error) setError("");
    setErrors((er) => {
      const out = { ...er };
      if (er[k]) out[k] = ruleFor(k, v, next);
      if (k === "password" && next.password_confirmation) out.password_confirmation = ruleFor("password_confirmation", next.password_confirmation, next);
      return out;
    });
  };
  const onBlur = (k) => (e) => { if (e.target.value) setErrors((er) => ({ ...er, [k]: ruleFor(k, e.target.value) })); };

  const shake = () => {
    const el = cardRef.current; if (!el) return;
    el.classList.remove("animate-shake"); void el.offsetWidth; el.classList.add("animate-shake");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    ORDER.forEach((k) => { const m = ruleFor(k, vals[k]); if (m) errs[k] = m; });
    setErrors(errs);
    setTermsErr(!terms);
    const bad = ORDER.find((k) => errs[k]);
    if (bad || !terms) { document.getElementById(bad || "terms")?.focus(); shake(); return; }

    const payload = {
      username: vals.username.trim(),
      email: vals.email.trim(),
      password: vals.password,
      confirmPassword: vals.password_confirmation,
      role: "pembeli",
      group_id: 2,
      is_aktif: "Y",
      first_name: vals.first_name.trim(),
      last_name: vals.last_name.trim(),
      phone: vals.phone.replace(/[\s-]/g, ""),
      subscribe_newsletter: false,
    };

    try {
      const result = await registerUser(payload);
      const ok = result === true || result?.success === true || result?.status === "success" || result?.data?.success === true;
      if (ok) {
        setSuccess({
          message: result?.data?.message || "Registrasi berhasil! Silakan cek email Anda untuk verifikasi akun sebelum login.",
        });
        setCountdown(5);
      } else {
        if (!result?.message) setError("Registrasi gagal. Silakan periksa kembali data Anda dan coba lagi.");
        shake();
      }
    } catch (err) {
      setError(err?.message || "Terjadi kesalahan saat menghubungi server. Silakan coba lagi.");
      shake();
    }
  };

  const field = (k, label, { icon: Icon, required, ...props } = {}) => (
    <div>
      <label htmlFor={k} className={LABEL}>{label} {required && <span className="text-[#B91C1C]" aria-hidden="true">*</span>}</label>
      <div className="relative">
        {Icon && <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-500" aria-hidden="true" />}
        <input
          id={k}
          name={k}
          value={vals[k]}
          onChange={onChange(k)}
          onBlur={onBlur(k)}
          disabled={loading}
          aria-invalid={errors[k] ? true : undefined}
          aria-describedby={`${k}-err${k === "username" ? " username-hint" : ""}`}
          className={`${INPUT} ${Icon ? "pl-11" : ""}`}
          {...props}
        />
      </div>
      {k === "username" && !errors.username && <p id="username-hint" className="mt-1.5 text-sm text-ink-600">3-30 karakter: huruf, angka, titik, garis bawah, atau tanda hubung.</p>}
      <FieldError id={`${k}-err`} msg={errors[k]} />
    </div>
  );

  const goLogin = onGoToLogin || onBackToHome;

  return (
    <AuthShell
      title="Buat Akun"
      subtitle="Silakan lengkapi formulir di bawah ini."
      onBack={onBackToHome}
      maxWidth="max-w-[40rem]"
      cardRef={cardRef}
      footer={
        <p className="mt-6 text-center text-sm text-ink-600">
          Sudah punya akun? <button type="button" onClick={onGoToLogin} className="font-bold text-brand-700 hover:underline">Masuk</button>
        </p>
      }
    >
      <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
        {error && (
          <p className="flex items-start gap-2.5 rounded-xl bg-[#FEF2F2] p-3.5 text-sm font-semibold text-[#7F1D1D]" role="alert">
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#B91C1C]" aria-hidden="true" /> {error}
          </p>
        )}

        {field("username", "Username", { icon: User, required: true, type: "text", placeholder: "Contoh: budisudono", autoComplete: "username" })}
        <div className="grid gap-5 sm:grid-cols-2">
          {field("first_name", "Nama Depan", { type: "text", placeholder: "Nama Depan", autoComplete: "given-name" })}
          {field("last_name", "Nama Belakang", { type: "text", placeholder: "Nama Belakang", autoComplete: "family-name" })}
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {field("email", "Email", { icon: Mail, required: true, type: "email", placeholder: "nama@email.com", autoComplete: "email" })}
          {field("phone", "Nomor WhatsApp", { icon: Phone, required: true, type: "tel", inputMode: "tel", placeholder: "08123456789", autoComplete: "tel" })}
        </div>
        <PasswordInput id="password" label="Password" placeholder="Min. 8 karakter, huruf dan angka" autoComplete="new-password" value={vals.password} onChange={onChange("password")} onBlur={onBlur("password")} disabled={loading} error={errors.password} />
        <PasswordInput id="password_confirmation" label="Konfirmasi Password" placeholder="Ulangi password" autoComplete="new-password" value={vals.password_confirmation} onChange={onChange("password_confirmation")} onBlur={onBlur("password_confirmation")} disabled={loading} error={errors.password_confirmation} />

        <div>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-ink-50 p-3.5 text-sm text-ink-700">
            <input
              id="terms"
              type="checkbox"
              checked={terms}
              onChange={(e) => { setTerms(e.target.checked); if (e.target.checked) setTermsErr(false); }}
              disabled={loading}
              aria-invalid={termsErr ? true : undefined}
              aria-describedby="terms-err"
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink-400 accent-brand-600"
            />
            <span>Saya menyetujui <a href="#" className="font-semibold text-brand-700 underline">Syarat &amp; Ketentuan</a> serta <a href="#" className="font-semibold text-brand-700 underline">Kebijakan Privasi</a> yang berlaku.</span>
          </label>
          <FieldError id="terms-err" msg={termsErr ? "Anda harus menyetujui syarat dan kebijakan untuk mendaftar." : ""} />
        </div>

        <button type="submit" disabled={loading} className={`h-12 w-full text-[15px] ${BTN_PRIMARY}`}>
          {loading && <ButtonSpinner />}
          {loading ? "Memproses…" : "Daftar Sekarang"}
        </button>
      </form>

      <Modal open={!!success} onClose={goLogin} labelledBy="reg-ok-title" className="w-[min(92vw,28rem)]">
        <div className="p-6 text-center sm:p-8">
          <span className="mx-auto grid h-16 w-16 animate-pop place-items-center rounded-full bg-brand-100 text-brand-700"><MailCheck className="h-8 w-8" aria-hidden="true" /></span>
          <h2 id="reg-ok-title" className="mt-5 text-2xl font-extrabold tracking-tight">Registrasi Berhasil!</h2>
          <p className="mt-2 font-semibold text-ink-800">{success?.message}</p>
          <p className="mt-2 text-sm text-ink-600">Buka email Anda dan klik link verifikasi untuk mengaktifkan akun. Mengalihkan dalam {countdown}…</p>
          <button type="button" data-autofocus onClick={goLogin} className={`mt-6 h-12 w-full ${BTN_PRIMARY}`}>Lanjut ke Login</button>
        </div>
      </Modal>
    </AuthShell>
  );
}

export default Register;
