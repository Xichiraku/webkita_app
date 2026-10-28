import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, BadgeCheck, CircleAlert, CircleCheck, Info, Mail, MailCheck, MailX } from "lucide-react";
import { useUser } from "../../provider/user_provider";
import FieldError from "../../components/ui/FieldError";
import { ButtonSpinner } from "../../components/ui/Spinner";
import { EMAIL_RE } from "../../utils/format";
import { BTN_PRIMARY, BTN_SECONDARY, INPUT, LABEL } from "../../utils/ui";

const COOLDOWN = 60; // detik

const maskEmail = (m) => { const [u, d] = m.split("@"); return `${u.slice(0, 1)}***@${d}`; };

// Backend hanya mengirim pesan teks; kenali kasus "sudah terverifikasi" & "kedaluwarsa" dari pesannya
const classify = (msg = "") => {
  if (/sudah.*(terverifikasi|diverifikasi)|already/i.test(msg)) return "already";
  if (/kedaluwarsa|kadaluarsa|expired/i.test(msg)) return "expired";
  return "invalid";
};

const Badge = ({ icon: Icon, tone }) => (
  <span className={`pop mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full ${tone}`}><Icon className="h-8 w-8" aria-hidden="true" /></span>
);

function VerifyEmail({ onGoToLogin }) {
  const { verifyEmail, resendVerification } = useUser();
  const hasVerified = useRef(false); // guard StrictMode agar tidak memanggil 2x
  const headingRef = useRef(null);

  const [state, setState] = useState("loading"); // loading | success | already | failed
  const [variant, setVariant] = useState("invalid");
  const [email, setEmail] = useState("");
  const [typed, setTyped] = useState("");
  const [typedErr, setTypedErr] = useState("");
  const [sending, setSending] = useState(false);
  const [sentMsg, setSentMsg] = useState("");
  const [sendErr, setSendErr] = useState("");
  const [cool, setCool] = useState(0);

  useEffect(() => {
    if (hasVerified.current) return;
    hasVerified.current = true;

    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const emailParam = params.get("email");
    if (emailParam) setEmail(emailParam);

    if (!token || !emailParam) { setVariant("invalid"); setState("failed"); return; }

    verifyEmail(token, emailParam).then((r) => {
      if (r.success) { setState("success"); return; }
      const v = classify(r.message);
      if (v === "already") { setState("already"); return; }
      setVariant(v);
      setState("failed");
    });
  }, [verifyEmail]);

  useEffect(() => { if (state !== "loading") headingRef.current?.focus({ preventScroll: true }); }, [state]);

  useEffect(() => {
    if (cool <= 0) return undefined;
    const t = setTimeout(() => setCool((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cool]);

  const known = !!email && EMAIL_RE.test(email);

  const handleResend = async (e) => {
    e.preventDefault();
    if (cool > 0 || sending) return;
    const target = known ? email : typed.trim();
    if (!known) {
      if (!target) { setTypedErr("Email wajib diisi."); return; }
      if (!EMAIL_RE.test(target)) { setTypedErr("Format email tidak valid."); return; }
    }
    setTypedErr("");
    setSendErr("");
    setSentMsg("");
    setSending(true);
    const r = await resendVerification(target);
    setSending(false);
    if (!r.success) { setSendErr(r.message || "Gagal mengirim email. Coba lagi."); return; }
    setSentMsg("Jika email terdaftar dan belum terverifikasi, link baru sudah dikirim. Cek juga folder spam.");
    setCool(COOLDOWN);
  };

  const h1 = "text-2xl font-extrabold tracking-tight outline-none";
  const loginBtn = `mt-7 flex min-h-[3rem] w-full px-4 text-sm ${BTN_PRIMARY}`;

  return (
    <div className="relative min-h-screen bg-white font-sans text-ink-900">
      <div className="pointer-events-none fixed inset-0 overflow-hidden bg-gradient-to-b from-white to-ink-50" aria-hidden="true">
        <div className="absolute -left-24 top-10 h-80 w-80 animate-blob rounded-full bg-brand-100 opacity-80 blur-3xl" />
        <div className="absolute -right-24 bottom-10 h-96 w-96 animate-blob rounded-full bg-brand-200/60 blur-3xl" style={{ animationDelay: "-7s" }} />
      </div>

      <main className="relative flex min-h-screen flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-[28rem] animate-rise">
          <header className="mb-7 text-center">
            <span className="inline-block text-3xl font-extrabold tracking-tight text-ink-900">Webkita</span>
            <p className="mt-1 text-xs font-bold uppercase tracking-[.18em] text-ink-500">Platform Teknologi #1</p>
          </header>

          <div className="overflow-hidden rounded-3xl border border-ink-200 bg-white shadow-lift">
            <div className="h-1 bg-gradient-to-r from-ink-900 via-brand-600 to-brand-300" aria-hidden="true" />
            <div className="p-7 text-center sm:p-9" role="status" aria-live="polite">
              {state === "loading" && (
                <section>
                  <span className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-brand-50">
                    <span className="block h-8 w-8 animate-spin rounded-full border-[3px] border-brand-100 border-t-brand-600" aria-hidden="true" />
                  </span>
                  <p className="mb-1.5 text-xs font-extrabold uppercase tracking-[.16em] text-ink-500">Memproses</p>
                  <h1 className={h1}>Memverifikasi email…</h1>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">Mohon tunggu sebentar.</p>
                </section>
              )}

              {state === "success" && (
                <section>
                  <Badge icon={MailCheck} tone="bg-[#DCFCE7] text-[#15803D]" />
                  <p className="mb-1.5 text-xs font-extrabold uppercase tracking-[.16em] text-[#15803D]">Selesai</p>
                  <h1 ref={headingRef} tabIndex={-1} className={h1}>Verifikasi Berhasil!</h1>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">Email kamu sudah terverifikasi. Sekarang kamu bisa masuk dan mulai memesan proyek.</p>
                  <button type="button" onClick={onGoToLogin} className={loginBtn}>Masuk &amp; mulai sekarang <ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
                </section>
              )}

              {state === "already" && (
                <section>
                  <Badge icon={BadgeCheck} tone="bg-[#CFFAFE] text-[#0E7490]" />
                  <p className="mb-1.5 text-xs font-extrabold uppercase tracking-[.16em] text-[#0E7490]">Info</p>
                  <h1 ref={headingRef} tabIndex={-1} className={h1}>Email sudah terverifikasi</h1>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">Link ini sudah pernah dipakai. Tidak ada yang perlu dilakukan lagi, silakan masuk ke akunmu.</p>
                  <button type="button" onClick={onGoToLogin} className={loginBtn}>Masuk ke akun <ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
                </section>
              )}

              {state === "failed" && (
                <section>
                  <Badge icon={MailX} tone="bg-[#FEE2E2] text-[#B91C1C]" />
                  <p className="mb-1.5 text-xs font-extrabold uppercase tracking-[.16em] text-[#B91C1C]">Gagal</p>
                  <h1 ref={headingRef} tabIndex={-1} className={h1}>{variant === "expired" ? "Link Kedaluwarsa" : "Verifikasi Gagal"}</h1>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">
                    {variant === "expired"
                      ? "Link verifikasi ini sudah lewat masa berlakunya. Minta link baru di bawah."
                      : "Link verifikasi tidak valid atau sudah tidak bisa dipakai. Minta link baru di bawah."}
                  </p>

                  <div className="mt-6 flex items-start gap-2.5 rounded-xl border-l-4 border-brand-600 bg-brand-50 p-3.5 text-left text-sm leading-relaxed text-brand-800">
                    <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <p>Link verifikasi berlaku <strong>24 jam</strong> sejak email dikirim. Kamu bisa minta email verifikasi baru di bawah.</p>
                  </div>

                  <form className="mt-5 text-left" onSubmit={handleResend} noValidate>
                    {known ? (
                      <p className="text-center text-sm text-ink-600">Email akan dikirim ke <strong className="text-ink-900">{maskEmail(email)}</strong></p>
                    ) : (
                      <div>
                        <label htmlFor="r-email" className={LABEL}>Email yang didaftarkan</label>
                        <div className="relative">
                          <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-500" aria-hidden="true" />
                          <input
                            id="r-email"
                            type="email"
                            inputMode="email"
                            autoComplete="email"
                            placeholder="nama@email.com"
                            value={typed}
                            onChange={(e) => { setTyped(e.target.value); setTypedErr(""); }}
                            aria-invalid={typedErr ? true : undefined}
                            aria-describedby="r-err"
                            className={`${INPUT} pl-11`}
                          />
                        </div>
                        <FieldError id="r-err" msg={typedErr} />
                      </div>
                    )}

                    <button type="submit" aria-disabled={cool > 0 || sending} className={`mt-3 min-h-[3rem] w-full px-4 text-sm ${BTN_SECONDARY} aria-disabled:cursor-not-allowed aria-disabled:opacity-60`}>
                      {sending && <ButtonSpinner className="h-4 w-4" />}
                      {sending ? "Mengirim…" : cool > 0 ? `Kirim ulang dalam ${cool} dtk` : "Kirim ulang email verifikasi"}
                    </button>

                    {sendErr && (
                      <p className="mt-3 flex items-start gap-2 rounded-xl bg-[#FEF2F2] p-3 text-sm font-semibold leading-relaxed text-[#7F1D1D]" role="alert">
                        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#B91C1C]" aria-hidden="true" /> {sendErr}
                      </p>
                    )}
                    {sentMsg && (
                      <p className="mt-3 flex items-start gap-2 rounded-xl bg-[#DCFCE7] p-3 text-sm font-semibold leading-relaxed text-[#15803D]" role="status">
                        <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {sentMsg}
                      </p>
                    )}
                  </form>

                  <button type="button" onClick={onGoToLogin} className={`mt-3 min-h-[3rem] w-full px-4 text-sm ${BTN_PRIMARY}`}>Kembali ke login</button>
                </section>
              )}
            </div>
          </div>
          <p className="mt-5 text-center text-xs text-ink-500">© 2026 Webkita · Hubungkan bisnis Anda dengan developer terbaik</p>
        </div>
      </main>
    </div>
  );
}

export default VerifyEmail;
