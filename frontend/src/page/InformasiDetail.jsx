import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Check, ChevronDown, CircleAlert, CircleCheck, ClipboardList, FileText,
  Image, PackageCheck, Phone, Plus, Trash2, TriangleAlert, Upload, Wrench, X,
} from "lucide-react";
import { useProject } from "../provider/project_provider";
import { useUser } from "../provider/user_provider";
import FieldError from "../components/ui/FieldError";
import { ButtonSpinner } from "../components/ui/Spinner";
import { CATEGORIES, categoryLabel } from "../utils/status";
import { formatSize, PHONE_RE } from "../utils/format";
import { BTN_PRIMARY, BTN_SECONDARY, INPUT, LABEL } from "../utils/ui";

const DRAFT_KEY = "webkita_pesan_draft";
const STEPS = [
  { title: "Informasi Dasar", icon: ClipboardList },
  { title: "Skill & Lampiran", icon: Wrench },
  { title: "Kontak", icon: Phone },
];
const SUGGEST = ["Laravel", "WordPress", "React", "Node.js", "MongoDB", "Tailwind CSS", "Serahkan ke developer"];
const MAX_FILE = 10 * 1024 * 1024;
const OK_FILE = /\.(pdf|png|jpe?g)$/i;
const FIELDS = [["projectTitle", "category", "description"], ["skills"], ["contactName", "contactPhone"]];

const loadDraft = () => {
  try { return JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null"); } catch { return null; }
};

const validate = (step, f) => {
  const e = {};
  if (step === 0) {
    const t = f.projectTitle.trim(), d = f.description.trim();
    if (!t) e.projectTitle = "Judul proyek wajib diisi."; else if (t.length < 5) e.projectTitle = "Judul minimal 5 karakter.";
    if (!f.category) e.category = "Pilih kategori proyek.";
    if (!d) e.description = "Deskripsi proyek wajib diisi.";
    else if (d.length < 100) e.description = `Deskripsi minimal 100 karakter (kurang ${100 - d.length} lagi).`;
  }
  if (step === 1 && !f.skills.length) e.skills = 'Tambahkan minimal satu skill, atau pilih "Serahkan ke developer".';
  if (step === 2) {
    const p = f.contactPhone.replace(/[\s-]/g, "");
    if (!f.contactName.trim()) e.contactName = "Nama lengkap wajib diisi.";
    if (!p) e.contactPhone = "Nomor WhatsApp wajib diisi.";
    else if (!PHONE_RE.test(p)) e.contactPhone = "Gunakan nomor Indonesia, contoh 08123456789.";
  }
  return e;
};

export default function InformasiDetail({ plan, onBackToHome, onBackToHarga }) {
  const navigate = useNavigate();
  const { user } = useUser();
  const { createProject, loading, error, clearError } = useProject();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState(() => {
    const d = loadDraft() || {};
    const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
    return {
      projectTitle: d.projectTitle || "",
      category: CATEGORIES.some((c) => c.value === d.category) ? d.category : "",
      description: d.description || "",
      skills: Array.isArray(d.skills) ? d.skills : [],
      contactName: d.contactName || fullName || "",
      contactPhone: d.contactPhone || user?.phone || "",
      additionalNotes: d.additionalNotes || "",
    };
  });
  const [files, setFiles] = useState([]);
  const [fileErr, setFileErr] = useState("");
  const [errors, setErrors] = useState({});
  const [skillInput, setSkillInput] = useState("");
  const [skillStatus, setSkillStatus] = useState("");
  const [shake, setShake] = useState(0);
  const [drag, setDrag] = useState(false);
  const [done, setDone] = useState(false);

  const headRef = useRef(null);
  const skillRef = useRef(null);
  const formRef = useRef(null);
  const firstRender = useRef(true);

  // simpan draft (tanpa lampiran) — aman jika storage diblokir
  useEffect(() => {
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(form)); } catch { /* abaikan */ }
  }, [form]);

  // fokus & scroll ke judul langkah saat berpindah langkah
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    headRef.current?.focus({ preventScroll: true });
    headRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [step]);

  // animasi "geleng" saat validasi gagal
  useEffect(() => {
    const el = formRef.current;
    if (!shake || !el) return;
    el.classList.remove("shake");
    void el.offsetWidth;
    el.classList.add("shake");
  }, [shake]);

  const set = (k, v) => {
    const next = { ...form, [k]: v };
    setForm(next);
    // perbarui pesan error secara langsung bila field yang sedang error diubah
    if (errors[k]) setErrors((e) => ({ ...e, [k]: validate(step, next)[k] }));
  };

  const stepErrors = useMemo(() => validate(step, form), [step, form]);
  const stepOk = Object.keys(stepErrors).length === 0;
  const descLen = form.description.trim().length;

  /* ----- skill ----- */
  const addSkill = (raw) => {
    const v = raw.trim().replace(/\s+/g, " ");
    if (!v) return;
    if (form.skills.some((x) => x.toLowerCase() === v.toLowerCase())) { setSkillStatus(`${v} sudah ditambahkan.`); return; }
    const skills = [...form.skills, v];
    setForm({ ...form, skills });
    setErrors((e) => ({ ...e, skills: undefined }));
    setSkillInput("");
    setSkillStatus(`${v} ditambahkan. Total ${skills.length} skill.`);
  };
  const removeSkill = (i) => {
    const removed = form.skills[i];
    setForm({ ...form, skills: form.skills.filter((_, idx) => idx !== i) });
    setSkillStatus(`${removed} dihapus.`);
    skillRef.current?.focus();
  };

  /* ----- lampiran ----- */
  const addFiles = (list) => {
    const bad = [];
    const nextFiles = [...files];
    Array.from(list || []).forEach((f) => {
      if (!OK_FILE.test(f.name)) bad.push(`${f.name}: format harus PDF, PNG, atau JPG`);
      else if (f.size > MAX_FILE) bad.push(`${f.name}: ukuran melebihi 10MB`);
      else if (!nextFiles.some((x) => x.name === f.name && x.size === f.size)) nextFiles.push(f);
    });
    setFiles(nextFiles);
    setFileErr(bad.join(". "));
  };

  /* ----- kirim ----- */
  const submit = async () => {
    clearError();
    const result = await createProject(
      {
        planTitle: plan?.title ?? "",
        priceRange: plan?.priceRange ?? "",
        projectTitle: form.projectTitle.trim(),
        category: form.category,
        description: form.description.trim(),
        skills: form.skills.join(", "),
        contactName: form.contactName.trim(),
        contactPhone: form.contactPhone.replace(/[\s-]/g, ""),
        additionalNotes: form.additionalNotes.trim(),
      },
      files
    );
    if (result.success) {
      try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* abaikan */ }
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setShake((n) => n + 1);
    }
  };

  /* ----- navigasi langkah ----- */
  const next = () => {
    if (loading) return;
    const e = validate(step, form);
    if (Object.keys(e).length) {
      setErrors(e);
      const first = FIELDS[step].find((f) => e[f]);
      document.getElementById(first === "skills" ? "skill-input" : first)?.focus();
      setShake((n) => n + 1);
      return;
    }
    setErrors({});
    if (step < 2) setStep(step + 1);
    else submit();
  };
  const backToHarga = () => (onBackToHarga ? onBackToHarga() : navigate("/harga"));
  const prev = () => (step === 0 ? backToHarga() : setStep(step - 1));

  const inputProps = (k) => ({
    id: k,
    value: form[k],
    onChange: (e) => set(k, e.target.value),
    "aria-invalid": errors[k] ? true : undefined,
    "aria-describedby": `${k}-err`,
  });

  return (
    <main className="relative overflow-hidden bg-ink-50">
      <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 animate-blob rounded-full bg-brand-100 opacity-70 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-24 top-80 h-72 w-72 animate-blob rounded-full bg-brand-200/50 blur-3xl" style={{ animationDelay: "-7s" }} aria-hidden="true" />

      <div className="relative mx-auto max-w-3xl px-5 pb-20 pt-8 sm:px-8 sm:pt-10">
        <button type="button" onClick={backToHarga} className="group inline-flex items-center gap-2 rounded-md text-sm font-semibold text-ink-700 transition hover:text-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-400">
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" aria-hidden="true" /> Kembali ke Halaman Harga
        </button>

        <div className="mt-6 animate-rise text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">Informasi Detail Proyek</h1>
          <p className="mt-2 text-ink-600">Lengkapi informasi proyek Anda untuk mendapatkan penawaran terbaik.</p>
          <div className="mt-4 inline-flex">
            {plan ? (
              <span className="inline-flex flex-wrap items-center justify-center gap-x-2 rounded-full bg-brand-100 px-4 py-2 text-sm font-bold text-brand-800">
                <PackageCheck className="h-4 w-4" aria-hidden="true" />
                Paket Terpilih: {plan.title} ({plan.priceRange})
                {!done && <button type="button" onClick={backToHarga} className="rounded font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400">Ganti</button>}
              </span>
            ) : (
              <button type="button" onClick={() => navigate("/harga")} className="inline-flex items-center gap-2 rounded-full bg-[#FEF3C7] px-4 py-2 text-sm font-bold text-[#92400E] hover:bg-[#FDE68A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400">
                <TriangleAlert className="h-4 w-4" aria-hidden="true" /> Belum memilih paket. Pilih paket dulu
              </button>
            )}
          </div>
        </div>

        {done ? (
          /* ===== Berhasil ===== */
          <div className="step-in mt-8 rounded-3xl border border-ink-200 bg-white px-6 py-14 text-center shadow-lift sm:px-12">
            <span className="mx-auto grid h-20 w-20 animate-pop place-items-center rounded-full bg-[#DCFCE7] text-[#15803D]"><Check className="h-10 w-10" aria-hidden="true" /></span>
            <h2 className="mt-6 text-2xl font-extrabold tracking-tight sm:text-3xl">Pengajuan Terkirim</h2>
            <p className="mx-auto mt-2 max-w-md text-ink-600">Terima kasih! Kami akan menghubungi Anda melalui WhatsApp. Status pengajuan bisa dipantau di halaman Orderan.</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <button type="button" onClick={() => navigate("/orderan")} className={`px-6 py-3 ${BTN_PRIMARY}`}>Lihat Orderan Saya <ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
              <button type="button" onClick={() => (onBackToHome ? onBackToHome() : navigate("/"))} className={`px-6 py-3 ${BTN_SECONDARY}`}>Kembali ke Beranda</button>
            </div>
          </div>
        ) : (
          <>
            {/* ===== Stepper ===== */}
            <nav aria-label="Langkah pengisian" className="mt-8 rounded-2xl border border-ink-200 bg-white px-4 py-5 shadow-soft sm:px-8">
              <ol className="flex items-start">
                {STEPS.map((s, i) => {
                  const isDone = i < step, cur = i === step;
                  const Icon = isDone ? Check : s.icon;
                  return (
                    <React.Fragment key={s.title}>
                      <li className="flex flex-col items-center">
                        <button
                          type="button"
                          onClick={() => isDone && setStep(i)}
                          tabIndex={isDone ? 0 : -1}
                          aria-disabled={!isDone}
                          aria-current={cur ? "step" : undefined}
                          className={`flex w-20 flex-col items-center gap-2 rounded-xl text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-400 sm:w-28 ${isDone ? "cursor-pointer" : "cursor-default"}`}
                        >
                          <span className={`grid h-12 w-12 place-items-center rounded-full transition-all duration-300 ${cur ? "bg-brand-600 text-white shadow-soft ring-4 ring-brand-100" : isDone ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-600"}`}>
                            <Icon className="h-5 w-5" aria-hidden="true" />
                          </span>
                          <span className={`text-xs font-bold leading-tight sm:text-sm ${cur || isDone ? "text-brand-700" : "text-ink-600"}`}>
                            {s.title}<span className="sr-only">{isDone ? " (selesai)" : cur ? " (langkah saat ini)" : ""}</span>
                          </span>
                        </button>
                      </li>
                      {i < STEPS.length - 1 && (
                        <li aria-hidden="true" className="mt-[22px] h-1 flex-1 overflow-hidden rounded-full bg-ink-200">
                          <div className="h-full rounded-full bg-brand-600 transition-all duration-500" style={{ width: i < step ? "100%" : "0%" }} />
                        </li>
                      )}
                    </React.Fragment>
                  );
                })}
              </ol>
            </nav>

            <form
              ref={formRef}
              noValidate
              onSubmit={(e) => { e.preventDefault(); next(); }}
              className="mt-6 rounded-3xl border border-ink-200 bg-white p-6 shadow-lift sm:p-9"
            >
              {error && (
                <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm text-[#7F1D1D]" role="alert">
                  <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#B91C1C]" aria-hidden="true" />
                  <div className="flex-1"><p className="font-bold">Gagal mengirim pengajuan</p><p className="mt-0.5">{error}</p></div>
                  <button type="button" onClick={clearError} className="grid h-8 w-8 place-items-center rounded-lg text-[#B91C1C] hover:bg-[#FEE2E2]" aria-label="Tutup pesan error"><X className="h-4 w-4" aria-hidden="true" /></button>
                </div>
              )}

              {/* ===== LANGKAH 1 ===== */}
              {step === 0 && (
                <section className="step-in" aria-labelledby="h-0">
                  <h2 id="h-0" ref={headRef} tabIndex={-1} className="text-2xl font-extrabold tracking-tight outline-none">Informasi Dasar</h2>
                  <p className="mt-1.5 text-ink-600">Berikan informasi dasar tentang proyek Anda.</p>
                  <div className="mt-7 space-y-6">
                    <div>
                      <label htmlFor="projectTitle" className={LABEL}>Judul Proyek <span className="text-[#B91C1C]" aria-hidden="true">*</span></label>
                      <input {...inputProps("projectTitle")} type="text" maxLength={100} placeholder="Contoh: Website E-commerce untuk Fashion" autoComplete="off" className={INPUT} />
                      <FieldError id="projectTitle-err" msg={errors.projectTitle} />
                    </div>
                    <div>
                      <label htmlFor="category" className={LABEL}>Kategori <span className="text-[#B91C1C]" aria-hidden="true">*</span></label>
                      <div className="relative">
                        <select {...inputProps("category")} className={`${INPUT} appearance-none pr-11 ${form.category ? "" : "text-ink-500"}`}>
                          <option value="" disabled>Pilih kategori proyek</option>
                          {CATEGORIES.map((c) => <option key={c.value} value={c.value} className="text-ink-900">{c.label}</option>)}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-500" aria-hidden="true" />
                      </div>
                      <FieldError id="category-err" msg={errors.category} />
                    </div>
                    <div>
                      <label htmlFor="description" className={LABEL}>Deskripsi Proyek <span className="text-[#B91C1C]" aria-hidden="true">*</span></label>
                      <textarea
                        {...inputProps("description")}
                        aria-describedby="description-count description-err"
                        rows={6}
                        placeholder="Jelaskan secara detail kebutuhan proyek Anda, fitur yang diinginkan, target audience, dan ekspektasi hasil..."
                        className={`${INPUT} h-auto min-h-[10rem] resize-y py-3 leading-relaxed`}
                      />
                      <div className="mt-1.5 flex items-center justify-between gap-3">
                        <p id="description-count" className={`text-sm ${descLen >= 100 ? "text-[#15803D]" : "text-ink-600"}`}>Minimal 100 karakter. ({descLen}/100)</p>
                        {descLen >= 100 && <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#15803D]"><CircleCheck className="h-4 w-4" aria-hidden="true" /> Cukup</span>}
                      </div>
                      <FieldError id="description-err" msg={errors.description} />
                    </div>
                  </div>
                </section>
              )}

              {/* ===== LANGKAH 2 ===== */}
              {step === 1 && (
                <section className="step-in" aria-labelledby="h-1">
                  <h2 id="h-1" ref={headRef} tabIndex={-1} className="text-2xl font-extrabold tracking-tight outline-none">Skill &amp; Lampiran</h2>
                  <p className="mt-1.5 text-ink-600">Tambahkan skill atau teknologi yang dibutuhkan untuk proyek ini.</p>
                  <div className="mt-7 space-y-8">
                    <div>
                      <label htmlFor="skill-input" className="mb-1 block text-sm font-bold text-ink-800">Skill yang Dibutuhkan <span className="text-[#B91C1C]" aria-hidden="true">*</span></label>
                      <p id="skill-hint" className="mb-2 text-sm text-ink-600">Ketik lalu tekan Enter atau tombol Tambah. Belum tahu? Pilih "Serahkan ke developer".</p>
                      <div className="flex gap-3">
                        <input
                          id="skill-input"
                          ref={skillRef}
                          type="text"
                          maxLength={30}
                          value={skillInput}
                          onChange={(e) => setSkillInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(skillInput); } }}
                          placeholder="Contoh: React, Node.js, MongoDB"
                          autoComplete="off"
                          aria-describedby="skill-hint skills-err"
                          aria-invalid={errors.skills ? true : undefined}
                          className={`${INPUT} min-w-0 flex-1`}
                        />
                        <button type="button" onClick={() => { addSkill(skillInput); skillRef.current?.focus(); }} className={`h-12 shrink-0 px-5 ${BTN_PRIMARY}`}>
                          <Plus className="h-5 w-5" aria-hidden="true" /> Tambah
                        </button>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="Saran skill">
                        <span className="text-sm text-ink-600">Saran:</span>
                        {SUGGEST.filter((s) => !form.skills.some((x) => x.toLowerCase() === s.toLowerCase())).map((s) => (
                          <button key={s} type="button" onClick={() => addSkill(s)} className="rounded-full border border-ink-300 bg-white px-3 py-1 text-sm font-semibold text-ink-700 transition hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400">+ {s}</button>
                        ))}
                      </div>
                      <ul className="mt-4 flex flex-wrap gap-2" aria-label="Skill yang dipilih">
                        {form.skills.map((s, i) => (
                          <li key={s} className="step-in inline-flex items-center gap-1.5 rounded-full bg-brand-100 py-1.5 pl-3.5 pr-1.5 text-sm font-semibold text-brand-800">
                            {s}
                            <button type="button" onClick={() => removeSkill(i)} className="grid h-6 w-6 place-items-center rounded-full text-brand-700 transition hover:bg-brand-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400" aria-label={`Hapus skill ${s}`}>
                              <X className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </li>
                        ))}
                      </ul>
                      <p className="sr-only" role="status" aria-live="polite">{skillStatus}</p>
                      <FieldError id="skills-err" msg={errors.skills} />
                    </div>

                    <div>
                      <p className="mb-1 text-sm font-bold text-ink-800">Lampiran <span className="font-normal text-ink-600">(opsional)</span></p>
                      <p id="file-hint" className="mb-2 text-sm text-ink-600">Upload dokumen pendukung seperti wireframe, mockup, atau requirement document.</p>
                      <label
                        htmlFor="files"
                        onDragEnter={(e) => { e.preventDefault(); setDrag(true); }}
                        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                        onDragLeave={(e) => { e.preventDefault(); setDrag(false); }}
                        onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
                        className={`flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed px-6 py-9 text-center transition hover:border-brand-400 hover:bg-brand-50 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-300 ${drag ? "border-brand-500 bg-brand-50" : "border-ink-300 bg-white"}`}
                      >
                        <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-100 text-brand-700"><Upload className="h-6 w-6" aria-hidden="true" /></span>
                        <span className="mt-3 font-bold text-ink-900">Klik untuk upload file <span className="font-normal text-ink-600">atau seret ke sini</span></span>
                        <span className="mt-1 text-sm text-ink-600">PDF, PNG, JPG (Maks 10MB per file)</span>
                        <input
                          id="files"
                          type="file"
                          multiple
                          accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                          className="sr-only"
                          aria-describedby="file-hint files-err"
                          onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
                        />
                      </label>
                      <FieldError id="files-err" msg={fileErr} />
                      <ul className="mt-4 space-y-2">
                        {files.map((f, i) => {
                          const Ico = /\.(png|jpe?g)$/i.test(f.name) ? Image : FileText;
                          return (
                            <li key={`${f.name}-${f.size}`} className="step-in flex items-center gap-3 rounded-xl border border-ink-200 bg-white p-3">
                              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700"><Ico className="h-5 w-5" aria-hidden="true" /></span>
                              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-ink-900">{f.name}</span><span className="text-xs text-ink-600">{formatSize(f.size)}</span></span>
                              <button type="button" onClick={() => { setFiles(files.filter((_, idx) => idx !== i)); setFileErr(""); }} className="grid h-9 w-9 place-items-center rounded-lg text-ink-600 transition hover:bg-[#FEE2E2] hover:text-[#B91C1C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400" aria-label={`Hapus file ${f.name}`}>
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                </section>
              )}

              {/* ===== LANGKAH 3 ===== */}
              {step === 2 && (
                <section className="step-in" aria-labelledby="h-2">
                  <h2 id="h-2" ref={headRef} tabIndex={-1} className="text-2xl font-extrabold tracking-tight outline-none">Informasi Kontak</h2>
                  <p className="mt-1.5 text-ink-600">Kami akan menghubungi Anda melalui informasi ini.</p>
                  <div className="mt-7 space-y-6">
                    <div>
                      <label htmlFor="contactName" className={LABEL}>Nama Lengkap <span className="text-[#B91C1C]" aria-hidden="true">*</span></label>
                      <input {...inputProps("contactName")} type="text" placeholder="Masukkan nama lengkap Anda" autoComplete="name" className={INPUT} />
                      <FieldError id="contactName-err" msg={errors.contactName} />
                    </div>
                    <div>
                      <label htmlFor="contactPhone" className={LABEL}>Nomor WhatsApp <span className="text-[#B91C1C]" aria-hidden="true">*</span></label>
                      <input {...inputProps("contactPhone")} type="tel" inputMode="tel" placeholder="08xxxxxxxxxx" autoComplete="tel" className={INPUT} />
                      <FieldError id="contactPhone-err" msg={errors.contactPhone} />
                    </div>
                    <div>
                      <label htmlFor="additionalNotes" className={LABEL}>Catatan Tambahan</label>
                      <textarea id="additionalNotes" value={form.additionalNotes} onChange={(e) => set("additionalNotes", e.target.value)} rows={4} placeholder="Ada hal lain yang ingin Anda sampaikan?" className={`${INPUT} h-auto resize-y py-3 leading-relaxed`} />
                    </div>

                    <dl className="grid gap-x-6 gap-y-3 rounded-2xl bg-ink-50 p-5 text-sm sm:grid-cols-2" aria-label="Ringkasan pengajuan">
                      <div><dt className="font-semibold text-ink-600">Paket</dt><dd className="font-bold text-ink-900">{plan?.title || "-"}</dd></div>
                      <div><dt className="font-semibold text-ink-600">Kategori</dt><dd className="font-bold text-ink-900">{form.category ? categoryLabel(form.category) : "-"}</dd></div>
                      <div className="sm:col-span-2"><dt className="font-semibold text-ink-600">Judul proyek</dt><dd className="break-words font-bold text-ink-900">{form.projectTitle.trim() || "-"}</dd></div>
                      <div><dt className="font-semibold text-ink-600">Skill</dt><dd className="font-bold text-ink-900">{form.skills.length ? form.skills.join(", ") : "-"}</dd></div>
                      <div><dt className="font-semibold text-ink-600">Lampiran</dt><dd className="font-bold text-ink-900">{files.length ? `${files.length} file` : "Tidak ada"}</dd></div>
                    </dl>

                    <p className="flex items-start gap-2.5 rounded-xl bg-[#DCFCE7] p-4 text-sm text-[#14532D]">
                      <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#15803D]" aria-hidden="true" />
                      <span><strong>Hampir selesai!</strong> Pastikan semua informasi sudah benar sebelum mengirim.</span>
                    </p>
                  </div>
                </section>
              )}

              {/* ===== Navigasi ===== */}
              <div className="mt-9 flex items-center justify-between gap-3 border-t border-ink-200 pt-6">
                <button type="button" onClick={prev} disabled={loading} className={`px-6 py-3 ${BTN_SECONDARY}`}>{step === 0 ? "Kembali" : "Sebelumnya"}</button>
                <button
                  type="submit"
                  aria-disabled={!stepOk || loading}
                  className={`group px-6 py-3 ${BTN_PRIMARY} aria-[disabled=true]:cursor-not-allowed aria-[disabled=true]:bg-ink-200 aria-[disabled=true]:text-ink-600 aria-[disabled=true]:shadow-none aria-[disabled=true]:hover:translate-y-0`}
                >
                  {loading && <ButtonSpinner />}
                  {loading ? "Mengirim…" : step === 2 ? "Kirim Pengajuan" : "Selanjutnya"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
