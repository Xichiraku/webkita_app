import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, AtSign, Bell, Calendar, CircleAlert, CircleCheck, Lock, Mail, Phone, Save, Shield, SquarePen, User, X,
} from "lucide-react";
import { useUser } from "../../provider/user_provider";
import FieldError from "../../components/ui/FieldError";
import Toast from "../../components/ui/Toast";
import PageLoader, { ButtonSpinner } from "../../components/ui/Spinner";
import useToast from "../../hooks/useToast";
import { formatDateLong, PHONE_RE, USERNAME_RE } from "../../utils/format";
import { BTN_PRIMARY, BTN_SECONDARY, INPUT } from "../../utils/ui";

const ROLE = { user: "Pembeli", developer: "Developer", admin: "Admin" };
const EDIT = ["username", "first_name", "last_name", "phone"];

const RULES = {
  username: (v) => (!v ? "Username wajib diisi." : !USERNAME_RE.test(v) ? "Gunakan 3-30 karakter: huruf, angka, titik, garis bawah, atau tanda hubung." : ""),
  first_name: (v) => (v.length > 50 ? "Maksimal 50 karakter." : ""),
  last_name: (v) => (v.length > 50 ? "Maksimal 50 karakter." : ""),
  phone: (v) => { const p = v.replace(/[\s-]/g, ""); return !p || PHONE_RE.test(p) ? "" : "Gunakan nomor Indonesia, contoh 08123456789."; },
};

const LABEL_CLS = "block text-xs font-bold uppercase tracking-wide text-ink-600";
const VIEW_CLS = "mt-1.5 flex min-h-[2.5rem] items-center gap-2.5 text-[17px] text-ink-900";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, loading, initializing, error, updateProfile, setError } = useUser();
  const [toast, showToast] = useToast(3800);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const formRef = useRef(null);
  const editBtnRef = useRef(null);

  const startEdit = () => {
    setForm({
      username: user?.username || "",
      first_name: user?.firstName || "",
      last_name: user?.lastName || "",
      phone: user?.phone || "",
      subscribe_newsletter: !!user?.subscribeNewsletter,
    });
    setErrors({});
    setError("");
    setEditing(true);
  };
  const cancel = () => { setEditing(false); setForm(null); setErrors({}); requestAnimationFrame(() => editBtnRef.current?.focus()); };

  useEffect(() => { if (editing) document.getElementById("f-username")?.focus(); }, [editing]);
  useEffect(() => {
    if (!editing) return undefined;
    const onKey = (e) => { if (e.key === "Escape" && !saving) cancel(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [editing, saving]);

  const change = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k] && RULES[k]) setErrors((e) => ({ ...e, [k]: RULES[k](String(v).trim()) }));
  };

  const shake = () => {
    const el = formRef.current; if (!el) return;
    el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake");
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    EDIT.forEach((k) => { const m = RULES[k](String(form[k]).trim()); if (m) errs[k] = m; });
    setErrors(errs);
    const bad = EDIT.find((k) => errs[k]);
    if (bad) { document.getElementById(`f-${bad}`)?.focus(); shake(); return; }

    setSaving(true);
    const payload = {
      username: form.username.trim(),
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      phone: form.phone.replace(/[\s-]/g, ""),
      subscribe_newsletter: form.subscribe_newsletter,
    };
    const result = await updateProfile(payload);
    setSaving(false);
    if (result.success) {
      setEditing(false);
      setForm(null);
      showToast("Perubahan profil disimpan.");
      requestAnimationFrame(() => editBtnRef.current?.focus());
    } else {
      shake();
    }
  };

  if ((initializing || loading) && !user) {
    return <div className="bg-gradient-to-b from-brand-50 to-ink-50"><PageLoader label="Memuat profil…" /></div>;
  }

  if (!user) {
    return (
      <main className="grid min-h-[60vh] place-items-center bg-gradient-to-b from-brand-50 to-ink-50 p-5">
        <div className="w-full max-w-md rounded-3xl border border-ink-200 bg-white p-8 text-center shadow-soft">
          <CircleAlert className="mx-auto h-12 w-12 text-[#DC2626]" aria-hidden="true" />
          <h2 className="mt-4 text-2xl font-extrabold">Gagal Memuat Profil</h2>
          <p className="mt-2 text-ink-600">{error || "Anda belum login. Silakan login terlebih dahulu."}</p>
          <button type="button" onClick={() => navigate("/login")} className={`mt-6 px-5 py-3 ${BTN_PRIMARY}`}>Masuk</button>
        </div>
      </main>
    );
  }

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "Pengguna";
  const active = user.isAktif === "Y" || user.isAktif === true;
  const view = { username: user.username, email: user.email, first_name: user.firstName, last_name: user.lastName, phone: user.phone };

  const inputFor = (k, props) => (
    <div className="mt-1.5">
      <input
        id={`f-${k}`}
        value={form[k]}
        onChange={(e) => change(k, e.target.value)}
        onBlur={(e) => { if (e.target.value && RULES[k]) setErrors((er) => ({ ...er, [k]: RULES[k](e.target.value.trim()) })); }}
        aria-invalid={errors[k] ? true : undefined}
        aria-describedby={`f-${k}-err`}
        className={INPUT}
        {...props}
      />
      <FieldError id={`f-${k}-err`} msg={errors[k]} />
    </div>
  );

  return (
    <main className="relative overflow-hidden bg-gradient-to-b from-brand-50 to-ink-50">
      <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 animate-blob rounded-full bg-brand-100 opacity-70 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-24 top-96 h-72 w-72 animate-blob rounded-full bg-brand-200/50 blur-3xl" style={{ animationDelay: "-7s" }} aria-hidden="true" />

      <div className="relative mx-auto max-w-3xl px-5 pb-20 pt-10 sm:px-8 sm:pt-14">
        <div className="animate-rise">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">Profil Pengguna</h1>
          <p className="mt-1.5 text-ink-600">Kelola informasi akun Anda.</p>
        </div>

        {/* ===== Kartu identitas ===== */}
        <section aria-label="Identitas akun" className="mt-8 animate-rise overflow-hidden rounded-3xl border border-ink-200 bg-white shadow-lift" style={{ animationDelay: "80ms" }}>
          <div className="relative h-32 bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 sm:h-36">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
            <div className="absolute bottom-0 left-1/3 h-24 w-24 rounded-full bg-brand-400/20 blur-2xl" aria-hidden="true" />
          </div>
          <div className="px-6 pb-7 sm:px-8">
            <div className="-mt-14 flex flex-col gap-4 sm:-mt-16 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-5">
                <span className="relative z-10 grid h-28 w-28 shrink-0 place-items-center rounded-full border-4 border-white bg-white text-brand-600 shadow-lift sm:h-32 sm:w-32">
                  <User className="h-14 w-14 sm:h-16 sm:w-16" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <div className="pb-1">
                  <h2 className="text-2xl font-extrabold tracking-tight text-ink-900">{fullName}</h2>
                  <p className="text-ink-600">@{user.username}</p>
                </div>
              </div>
              {!editing && (
                <button ref={editBtnRef} type="button" onClick={startEdit} className={`self-start px-5 py-3 text-sm sm:self-end ${BTN_PRIMARY}`}>
                  <SquarePen className="h-4 w-4" aria-hidden="true" /> Edit Profil
                </button>
              )}
            </div>
            <ul className="mt-5 flex flex-wrap gap-2" aria-label="Status akun">
              <li className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-800"><Shield className="h-3.5 w-3.5" aria-hidden="true" /> {ROLE[user.role] || ROLE.user}</li>
              <li className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${active ? "bg-[#DCFCE7] text-[#15803D]" : "bg-ink-100 text-ink-700"}`}>
                {active ? <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" /> : <X className="h-3.5 w-3.5" aria-hidden="true" />} {active ? "Aktif" : "Tidak Aktif"}
              </li>
            </ul>
          </div>
        </section>

        {/* ===== Informasi detail ===== */}
        <form ref={formRef} noValidate onSubmit={submit} className="mt-6 animate-rise rounded-3xl border border-ink-200 bg-white p-6 shadow-soft sm:p-8" style={{ animationDelay: "140ms" }} aria-labelledby="detail-title">
          <h2 id="detail-title" className="flex items-center gap-2.5 text-xl font-extrabold tracking-tight text-ink-900">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-100 text-brand-700"><User className="h-5 w-5" aria-hidden="true" /></span> Informasi Detail
          </h2>

          {error && editing && (
            <p className="mt-5 flex items-start gap-2.5 rounded-xl bg-[#FEF2F2] p-4 text-sm font-semibold text-[#7F1D1D]" role="alert">
              <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#B91C1C]" aria-hidden="true" /> {error}
            </p>
          )}

          <div className="mt-7 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            <div>
              <label htmlFor="f-username" className={LABEL_CLS}>Username</label>
              {editing ? (
                <>
                  {inputFor("username", { type: "text", placeholder: "Contoh: budisudono", autoComplete: "username" })}
                  {!errors.username && <p className="mt-1.5 text-sm text-ink-600">3-30 karakter: huruf, angka, titik, garis bawah, atau tanda hubung.</p>}
                </>
              ) : (
                <p className={VIEW_CLS}><AtSign className="h-[18px] w-[18px] shrink-0 text-ink-500" aria-hidden="true" /><span className="break-all">{view.username || "-"}</span></p>
              )}
            </div>

            <div>
              <p className={LABEL_CLS}>Email</p>
              <p className={VIEW_CLS}><Mail className="h-[18px] w-[18px] shrink-0 text-ink-500" aria-hidden="true" /><span className="break-all">{view.email || "-"}</span></p>
              {editing && <p className="mt-1 text-sm text-ink-600">Email tidak dapat diubah dari sini.</p>}
            </div>

            <div>
              <label htmlFor="f-first_name" className={LABEL_CLS}>Nama Depan</label>
              {editing ? inputFor("first_name", { type: "text", placeholder: "Nama depan", autoComplete: "given-name" }) : <p className={VIEW_CLS}>{view.first_name || "-"}</p>}
            </div>

            <div>
              <label htmlFor="f-last_name" className={LABEL_CLS}>Nama Belakang</label>
              {editing ? inputFor("last_name", { type: "text", placeholder: "Nama belakang", autoComplete: "family-name" }) : <p className={VIEW_CLS}>{view.last_name || "-"}</p>}
            </div>

            <div>
              <label htmlFor="f-phone" className={LABEL_CLS}>Nomor Telepon</label>
              {editing ? inputFor("phone", { type: "tel", placeholder: "08123456789", autoComplete: "tel" }) : (
                <p className={VIEW_CLS}><Phone className="h-[18px] w-[18px] shrink-0 text-ink-500" aria-hidden="true" />{view.phone || "-"}</p>
              )}
            </div>

            <div>
              <p className={LABEL_CLS}>Tanggal Bergabung</p>
              <p className={VIEW_CLS}><Calendar className="h-[18px] w-[18px] shrink-0 text-ink-500" aria-hidden="true" />{formatDateLong(user.createdAt)}</p>
            </div>
          </div>

          <label className={`mt-6 flex items-start gap-3 rounded-2xl bg-ink-50 p-4 ${editing ? "cursor-pointer" : "cursor-default"}`}>
            <input
              type="checkbox"
              disabled={!editing}
              checked={editing ? form.subscribe_newsletter : !!user.subscribeNewsletter}
              onChange={(e) => change("subscribe_newsletter", e.target.checked)}
              className="mt-1 h-5 w-5 shrink-0 rounded border-ink-400 accent-brand-600 disabled:opacity-100"
            />
            <span>
              <span className="flex items-center gap-2 font-bold text-ink-900"><Bell className="h-4 w-4 text-ink-600" aria-hidden="true" /> Subscribe Newsletter</span>
              <span className="mt-0.5 block text-sm text-ink-600">Terima update dan informasi terbaru via email.</span>
            </span>
          </label>

          {editing && (
            <div className="mt-7 flex flex-col gap-3 border-t border-ink-200 pt-6 sm:flex-row">
              <button type="submit" disabled={saving} className={`px-6 py-3 ${BTN_PRIMARY} disabled:cursor-wait`}>
                {saving ? <ButtonSpinner /> : <Save className="h-4 w-4" aria-hidden="true" />}
                {saving ? "Menyimpan…" : "Simpan Perubahan"}
              </button>
              <button type="button" onClick={cancel} disabled={saving} className={`px-6 py-3 ${BTN_SECONDARY}`}>
                <X className="h-4 w-4" aria-hidden="true" /> Batal
              </button>
            </div>
          )}
        </form>

        {/* ===== Keamanan ===== */}
        <section aria-labelledby="sec-title" className="mt-6 animate-rise rounded-3xl border border-ink-200 bg-white p-6 shadow-soft sm:p-8" style={{ animationDelay: "200ms" }}>
          <h2 id="sec-title" className="flex items-center gap-2.5 text-xl font-extrabold tracking-tight text-ink-900">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-100 text-brand-700"><Lock className="h-5 w-5" aria-hidden="true" /></span> Keamanan Akun
          </h2>
          <div className="mt-6 flex flex-col gap-4 rounded-2xl bg-ink-50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-bold text-ink-900">Password</p>
              <p className="mt-0.5 text-ink-600">Reset lewat halaman "Lupa Password".</p>
            </div>
            <button type="button" onClick={() => navigate("/forgot-password")} className={`px-5 py-2.5 text-sm ${BTN_SECONDARY}`}>
              Reset Password <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </section>
      </div>
      <Toast toast={toast} />
    </main>
  );
}
