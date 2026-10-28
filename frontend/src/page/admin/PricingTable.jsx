import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown, ChevronUp, CircleCheck, CircleX, ExternalLink, Eye, EyeOff, Info, Pencil, Plus, RefreshCw, Tags, Trash2, TriangleAlert, X,
} from "lucide-react";
import API from "../../core/utils/api_client";
import { ENDPOINTS } from "../../core/constants/api_endpoint";
import Modal from "../../components/ui/Modal";
import FieldError from "../../components/ui/FieldError";
import { ButtonSpinner } from "../../components/ui/Spinner";
import { transformPlan } from "../../utils/adminConstants";
import { rp } from "../../utils/format";
import { A_CARD_BTN } from "../../utils/ui";

const TIERS = ["starter", "professional", "business", "enterprise"];
const TIER_CLS = { starter: "bg-[#CFFAFE] text-[#0E7490]", professional: "bg-brand-100 text-brand-800", business: "bg-[#E0E7FF] text-[#3730A3]", enterprise: "bg-ink-900 text-white" };
const SLIDER_MIN = 500000;
const FIELD = "h-11 w-full rounded-xl border border-ink-300 bg-white px-3.5 text-[15px] text-ink-900 placeholder:text-ink-500 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-300 aria-[invalid=true]:border-[#DC2626] aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-[#FECACA]";
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const digits = (v) => String(v || "").replace(/\D/g, "");
const fmtNum = (v) => { const d = digits(v); return d ? (+d).toLocaleString("id-ID") : ""; };
const labelOf = (p) => (p.open ? `Mulai ${rp(p.min)}` : `${rp(p.min)} – ${rp(p.max)}`);
const uid = () => Math.random().toString(36).slice(2);

/* ───────── Editor daftar fitur (hook: mengembalikan fungsi tambah + tampilan) ───────── */
function useFeatureList({ items, onChange, inputIdPrefix }) {
  const refs = useRef({});
  const focusLater = (key) => requestAnimationFrame(() => refs.current[key]?.focus());

  const add = (at = items.length) => {
    if (items.length >= 20) return false;
    const it = { key: uid(), v: "" };
    const next = [...items];
    next.splice(at, 0, it);
    onChange(next);
    focusLater(it.key);
    return true;
  };
  const move = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const remove = (i) => {
    const next = items.filter((_, idx) => idx !== i);
    onChange(next);
    const nb = next[i] || next[i - 1];
    if (nb) focusLater(nb.key);
  };

  return { add, view: (
    <ul className="mt-3 space-y-2">
      {items.map((it, i) => (
        <li key={it.key} className="flex items-center gap-1.5">
          <input
            id={i === 0 ? `${inputIdPrefix}-first` : undefined}
            ref={(el) => { refs.current[it.key] = el; }}
            value={it.v}
            maxLength={80}
            autoComplete="off"
            placeholder="Nama fitur…"
            aria-label="Nama fitur"
            onChange={(e) => onChange(items.map((x, idx) => (idx === i ? { ...x, v: e.target.value } : x)))}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(i + 1); } }}
            className="h-10 min-w-0 flex-1 rounded-xl border border-ink-300 bg-white px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-300"
          />
          <button type="button" onClick={() => move(i, -1)} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-500 hover:bg-white hover:text-ink-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400" aria-label="Naikkan urutan"><ChevronUp className="h-4 w-4" aria-hidden="true" /></button>
          <button type="button" onClick={() => move(i, 1)} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-500 hover:bg-white hover:text-ink-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400" aria-label="Turunkan urutan"><ChevronDown className="h-4 w-4" aria-hidden="true" /></button>
          <button type="button" onClick={() => remove(i)} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[#B91C1C] hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#DC2626]" aria-label="Hapus fitur"><X className="h-4 w-4" aria-hidden="true" /></button>
        </li>
      ))}
    </ul>
  ) };
}

/* ───────── Form tambah / edit ───────── */
function PlanForm({ open, plan, plans, onClose, onSaved, notify }) {
  const [f, setF] = useState(null);
  const [errs, setErrs] = useState({});
  const [saving, setSaving] = useState(false);
  // isi ulang form setiap kali dibuka
  useEffect(() => {
    if (!open) { setF(null); return; }
    const nextSort = plans.reduce((m, x) => Math.max(m, x.sort), 0) + 1;
    setF({
      title: plan?.title || "",
      tier: plan?.tier || "",
      min: plan ? plan.min.toLocaleString("id-ID") : "",
      max: plan && !plan.open && plan.max ? plan.max.toLocaleString("id-ID") : "",
      open: plan ? plan.open : false,
      desc: plan?.desc || "",
      sort: plan ? plan.sort : nextSort,
      active: plan ? plan.active : true,
      inc: (plan?.inc || []).map((v) => ({ key: uid(), v })),
      out: (plan?.out || []).map((v) => ({ key: uid(), v })),
    });
    setErrs({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, plan]);

  const set = (k, v) => { setF((s) => ({ ...s, [k]: v })); if (errs[k]) setErrs((e) => ({ ...e, [k]: "" })); };

  const inc = useFeatureList({ items: f?.inc || [], onChange: (v) => { set("inc", v); }, inputIdPrefix: "f-in" });
  const out = useFeatureList({ items: f?.out || [], onChange: (v) => set("out", v), inputIdPrefix: "f-out" });

  const cur = f ? { min: +digits(f.min), max: f.open ? null : +digits(f.max) || null, open: f.open } : null;
  const label = cur && cur.min && (cur.open || (cur.max && cur.max > cur.min)) ? labelOf(cur) : "-";

  const warnings = useMemo(() => {
    if (!cur || !cur.min) return [];
    const msgs = [];
    if (cur.min < SLIDER_MIN) msgs.push(`Di bawah batas slider halaman Harga (${rp(SLIDER_MIN)}), jadi paket ini tidak akan pernah direkomendasikan.`);
    if (f.active) {
      const myMax = cur.open ? Infinity : cur.max || cur.min;
      plans.forEach((o) => {
        if (o.id === plan?.id || !o.active) return;
        const oMax = o.open ? Infinity : o.max;
        if (cur.min < oMax && o.min < myMax) msgs.push(`Rentang tumpang tindih dengan paket ${o.title} (${labelOf(o)}). Rekomendasi di halaman Harga bisa ambigu.`);
      });
    }
    return msgs;
  }, [cur?.min, cur?.max, cur?.open, f?.active, plans, plan?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e) => {
    e.preventDefault();
    const title = f.title.trim();
    const incList = f.inc.map((x) => x.v.trim()).filter(Boolean);
    const outList = f.out.map((x) => x.v.trim()).filter(Boolean);
    const er = {};
    if (!title) er.title = "Nama paket wajib diisi.";
    else if (plans.some((p) => p.id !== plan?.id && p.title.toLowerCase() === title.toLowerCase())) er.title = "Nama paket sudah dipakai paket lain.";
    if (!f.tier) er.tier = "Pilih tier paket.";
    if (!cur.min) er.min = "Harga minimum wajib diisi."; else if (cur.min < 1000) er.min = "Harga minimum minimal Rp 1.000.";
    if (!cur.open) { if (!cur.max) er.max = 'Isi harga maksimum atau centang "Tanpa batas atas".'; else if (cur.min && cur.max <= cur.min) er.max = "Harga maksimum harus lebih besar dari minimum."; }
    if (!incList.length) er.inc = "Tambahkan minimal satu fitur yang termasuk.";
    setErrs(er);
    const first = ["title", "tier", "min", "max", "inc"].find((k) => er[k]);
    if (first) {
      const el = document.getElementById(first === "inc" ? "f-in-first" : `f-${first}`) || document.getElementById("f-add-in");
      el?.focus();
      return;
    }

    const payload = {
      title,
      tier: f.tier,
      min_price: cur.min,
      max_price: cur.open ? null : cur.max, // null = tanpa batas atas
      price_range: labelOf(cur),
      description: f.desc.trim(),
      sort_order: Math.max(0, parseInt(f.sort, 10) || 0),
      is_active: f.active,
      features: incList.map((feature, i) => ({ feature, sort_order: i })),
      not_included: outList.map((feature, i) => ({ feature, sort_order: i })),
    };

    setSaving(true);
    try {
      if (plan) await API.put(ENDPOINTS.UPDATE_PRICING(plan.id), payload);
      else await API.post(ENDPOINTS.CREATE_PRICING, payload);
      await onSaved();
      notify(`Paket ${title} ${plan ? "diperbarui" : "ditambahkan"}.`);
      onClose();
    } catch (err) {
      notify(err?.message || "Gagal menyimpan paket", "err");
    } finally {
      setSaving(false);
    }
  };

  const tiers = plan && !TIERS.includes(plan.tier) ? [...TIERS, plan.tier] : TIERS;

  return (
    <Modal open={open} onClose={() => !saving && onClose()} labelledBy="p-title" className="w-[min(94vw,44rem)] overflow-hidden">
      {f && (
        <form onSubmit={submit} noValidate className="flex max-h-[92vh] flex-col">
          <div className="flex items-center justify-between gap-4 border-b border-ink-100 px-6 py-5">
            <h2 id="p-title" className="text-xl font-extrabold tracking-tight">{plan ? "Edit Paket" : "Tambah Paket"}</h2>
            <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl border border-ink-200 text-ink-700 transition hover:bg-ink-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400" aria-label="Tutup"><X className="h-5 w-5" aria-hidden="true" /></button>
          </div>

          <div className="scroll-thin space-y-5 overflow-y-auto px-6 py-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="f-title" className="mb-1.5 block text-sm font-bold">Nama paket <span className="text-[#B91C1C]" aria-hidden="true">*</span></label>
                <input id="f-title" data-autofocus value={f.title} onChange={(e) => set("title", e.target.value)} maxLength={40} autoComplete="off" placeholder="Contoh: Starter" aria-invalid={errs.title ? true : undefined} aria-describedby="e-title" className={FIELD} />
                <FieldError id="e-title" msg={errs.title} />
              </div>
              <div>
                <label htmlFor="f-tier" className="mb-1.5 block text-sm font-bold">Tier <span className="text-[#B91C1C]" aria-hidden="true">*</span></label>
                <select id="f-tier" value={f.tier} onChange={(e) => set("tier", e.target.value)} aria-invalid={errs.tier ? true : undefined} aria-describedby="e-tier" className={`${FIELD} cursor-pointer`}>
                  <option value="">Pilih tier</option>
                  {tiers.map((t) => <option key={t} value={t}>{cap(t)}</option>)}
                </select>
                <FieldError id="e-tier" msg={errs.tier} />
              </div>
            </div>

            <fieldset className="rounded-2xl bg-ink-50 p-4">
              <legend className="px-1 text-sm font-bold">Rentang harga</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="f-min" className="mb-1.5 block text-sm font-bold">Harga minimum <span className="text-[#B91C1C]" aria-hidden="true">*</span></label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-600">Rp</span>
                    <input id="f-min" inputMode="numeric" autoComplete="off" placeholder="500.000" value={f.min} onChange={(e) => set("min", fmtNum(e.target.value))} aria-invalid={errs.min ? true : undefined} aria-describedby="e-min" className={`${FIELD} pl-10`} />
                  </div>
                  <FieldError id="e-min" msg={errs.min} />
                </div>
                <div>
                  <label htmlFor="f-max" className="mb-1.5 block text-sm font-bold">Harga maksimum</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-600">Rp</span>
                    <input id="f-max" inputMode="numeric" autoComplete="off" placeholder="1.500.000" disabled={f.open} value={f.max} onChange={(e) => set("max", fmtNum(e.target.value))} aria-invalid={errs.max ? true : undefined} aria-describedby="e-max" className={`${FIELD} pl-10 disabled:cursor-not-allowed disabled:bg-ink-100 disabled:text-ink-500`} />
                  </div>
                  <FieldError id="e-max" msg={errs.max} />
                </div>
              </div>
              <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-ink-800">
                <input type="checkbox" checked={f.open} onChange={(e) => { set("open", e.target.checked); if (e.target.checked) { set("max", ""); setErrs((x) => ({ ...x, max: "" })); } }} className="h-4 w-4 rounded border-ink-300 accent-brand-600" />
                Tanpa batas atas (ditampilkan sebagai "Mulai Rp …")
              </label>
              <p className="mt-3 text-sm text-ink-700">Ditampilkan sebagai: <b className="text-brand-800" aria-live="polite">{label}</b></p>
              {warnings.length > 0 && (
                <p className="mt-2 flex items-start gap-2 rounded-xl bg-[#FEF3C7] px-3 py-2 text-sm font-semibold text-[#92400E]" role="status">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><span>{warnings.join(" ")}</span>
                </p>
              )}
            </fieldset>

            <div>
              <label htmlFor="f-desc" className="mb-1.5 flex items-center justify-between text-sm font-bold">Deskripsi <span className="text-xs font-semibold text-ink-600">{f.desc.length}/120</span></label>
              <textarea id="f-desc" rows={2} maxLength={120} value={f.desc} onChange={(e) => set("desc", e.target.value)} placeholder="Cocok untuk…" className="w-full resize-y rounded-xl border border-ink-300 bg-white px-3.5 py-2.5 text-[15px] outline-none transition placeholder:text-ink-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-300" />
            </div>

            <div className="grid items-end gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="f-sort" className="mb-1.5 block text-sm font-bold">Urutan tampil</label>
                <input id="f-sort" type="number" min="0" step="1" value={f.sort} onChange={(e) => set("sort", e.target.value)} aria-describedby="h-sort" className={FIELD} />
                <p id="h-sort" className="mt-1 text-xs text-ink-600">Angka kecil tampil lebih dulu.</p>
              </div>
              <label className="flex h-11 cursor-pointer items-center gap-3 text-sm font-bold">
                <input type="checkbox" role="switch" checked={f.active} onChange={(e) => set("active", e.target.checked)} className="h-5 w-5 rounded border-ink-300 accent-brand-600" /> Aktif (tampil di halaman Harga)
              </label>
            </div>

            <div className="rounded-2xl bg-ink-50 p-4">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-extrabold"><CircleCheck className="h-[18px] w-[18px] text-[#15803D]" aria-hidden="true" /> Fitur termasuk</h3>
                <button id="f-add-in" type="button" onClick={() => { if (!inc.add()) notify("Maksimal 20 fitur.", "err"); setErrs((x) => ({ ...x, inc: "" })); }} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-bold text-brand-700 hover:bg-brand-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400"><Plus className="h-4 w-4" aria-hidden="true" /> Tambah</button>
              </div>
              {inc.view}
              <FieldError id="e-in" msg={errs.inc} />
            </div>
            <div className="rounded-2xl bg-[#FEF2F2] p-4">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-extrabold"><CircleX className="h-[18px] w-[18px] text-[#B91C1C]" aria-hidden="true" /> Tidak termasuk</h3>
                <button type="button" onClick={() => { if (!out.add()) notify("Maksimal 20 fitur.", "err"); }} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-bold text-brand-700 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400"><Plus className="h-4 w-4" aria-hidden="true" /> Tambah</button>
              </div>
              {out.view}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-ink-100 px-6 py-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={saving} className="inline-flex items-center justify-center rounded-xl border-2 border-ink-200 px-5 py-2.5 font-bold text-ink-800 transition hover:bg-ink-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400">Batal</button>
            <button type="submit" disabled={saving} className="inline-flex min-w-[7rem] items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 font-bold text-white shadow-soft transition hover:bg-brand-700 disabled:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400">
              {saving && <ButtonSpinner className="h-4 w-4" />}{saving ? "Menyimpan…" : "Simpan"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

/* ───────── Halaman Paket Layanan ───────── */
const PricingTable = ({ ctx }) => {
  const { plans, setPlans, loading, notify, usedByPlan } = ctx;
  const [form, setForm] = useState({ open: false, plan: null });
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [anim, setAnim] = useState(0);

  const sorted = useMemo(() => [...plans].sort((a, b) => a.sort - b.sort || String(a.id).localeCompare(String(b.id))), [plans]);
  const used = (p) => usedByPlan[p.title.toLowerCase()] || 0;
  const activeCount = plans.filter((p) => p.active).length;

  const reload = async () => {
    const res = await API.get(ENDPOINTS.GET_ALL_PRICING);
    const data = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    setPlans(data.map(transformPlan));
  };

  const toggle = async (p) => {
    if (p.active && activeCount === 1) { notify("Minimal satu paket harus aktif.", "err"); return; }
    setBusy(p.id);
    try {
      await API.patch(ENDPOINTS.TOGGLE_PRICING_ACTIVE(p.id));
      setPlans((list) => list.map((x) => (x.id === p.id ? { ...x, active: !x.active } : x)));
      notify(`Paket ${p.title} ${p.active ? "dinonaktifkan" : "diaktifkan"}.`);
    } catch (err) {
      notify(err?.message || "Gagal mengubah status paket", "err");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (p) => {
    setBusy(p.id);
    try {
      await API.delete(ENDPOINTS.DELETE_PRICING(p.id));
      setPlans((list) => list.filter((x) => x.id !== p.id));
      notify(`Paket ${p.title} dihapus.`);
    } catch (err) {
      notify(err?.message || "Gagal menghapus paket", "err");
    } finally {
      setBusy(null);
      setDel(null);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">Paket Layanan</h1>
          <p className="mt-1 text-ink-600">{plans.length} paket, {activeCount} aktif</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a href="/harga" target="_blank" rel="noopener noreferrer" className={A_CARD_BTN}>
            <ExternalLink className="h-4 w-4" aria-hidden="true" /> Lihat halaman Harga
          </a>
          <button type="button" onClick={async () => { setSpinning(true); try { await reload(); setAnim((n) => n + 1); notify("Data diperbarui."); } catch (e) { notify(e?.message || "Gagal memuat paket", "err"); } setSpinning(false); }} disabled={spinning} className={A_CARD_BTN}>
            <RefreshCw className={`h-4 w-4 ${spinning ? "animate-spin" : ""}`} aria-hidden="true" /> Refresh
          </button>
          <button type="button" onClick={() => setForm({ open: true, plan: null })} className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-soft transition hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400">
            <Plus className="h-4 w-4" aria-hidden="true" /> Tambah Paket
          </button>
        </div>
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50/80 p-4 text-sm text-brand-900">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
        <p>Hanya paket <b>Aktif</b> yang tampil di halaman Harga, dan rentang harganya dipakai untuk rekomendasi paket di slider anggaran. Paket yang sudah dipakai orderan tidak bisa dihapus, hanya dinonaktifkan.</p>
      </div>

      <section aria-label="Daftar paket" className="mt-5">
        <div className="card rounded-3xl">
          {loading && !plans.length ? (
            <p className="px-6 py-10 text-center text-sm text-ink-600">Memuat paket…</p>
          ) : !sorted.length ? (
            <div className="px-6 py-14 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600"><Tags className="h-7 w-7" aria-hidden="true" /></span>
              <p className="mt-4 font-extrabold text-ink-900">Belum ada paket layanan</p>
              <p className="mt-1 text-ink-600">Tambahkan paket pertama agar tampil di halaman Harga.</p>
            </div>
          ) : (
            <div className="scroll-thin overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <caption className="sr-only">Daftar paket layanan</caption>
                <thead className="bg-brand-50/70 text-xs font-bold uppercase tracking-wide text-ink-600">
                  <tr>
                    <th scope="col" className="px-6 py-3.5">#</th>
                    <th scope="col" className="px-2.5 py-3.5">Paket</th>
                    <th scope="col" className="px-2.5 py-3.5">Tier</th>
                    <th scope="col" className="px-2.5 py-3.5">Rentang harga</th>
                    <th scope="col" className="px-2.5 py-3.5">Fitur</th>
                    <th scope="col" className="px-2.5 py-3.5">Orderan</th>
                    <th scope="col" className="px-2.5 py-3.5">Status</th>
                    <th scope="col" className="px-6 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {sorted.map((p, i) => {
                    const dim = p.active ? "" : " opacity-60";
                    return (
                      <tr key={`${anim}-${p.id}`} className="row-in align-middle transition hover:bg-brand-50/50" style={{ "--d": `${i * 50}ms` }}>
                        <td className="px-6 py-4 text-ink-600">{i + 1}</td>
                        <td className={`px-2.5 py-4${dim}`}><span className="block font-bold text-ink-900">{p.title}</span><span className="block max-w-[12rem] truncate text-xs text-ink-600" title={p.desc}>{p.desc || "-"}</span></td>
                        <td className={`px-2.5 py-4${dim}`}><span className={`rounded-full px-3 py-1 text-xs font-bold ${TIER_CLS[p.tier] || "bg-ink-100 text-ink-700"}`}>{p.tier}</span></td>
                        <td className={`min-w-[9.5rem] px-2.5 py-4 font-semibold tabular-nums text-ink-800${dim}`}>{p.priceRange || labelOf(p)}</td>
                        <td className={`px-2.5 py-4${dim}`}>
                          <span className="inline-flex items-center gap-3 text-sm font-bold tabular-nums">
                            <span className="inline-flex items-center gap-1 text-[#15803D]" title="Fitur termasuk"><CircleCheck className="h-4 w-4" aria-hidden="true" />{p.inc.length}<span className="sr-only"> fitur termasuk</span></span>
                            <span className={`inline-flex items-center gap-1 ${p.out.length ? "text-[#B91C1C]" : "text-ink-500"}`} title="Fitur tidak termasuk"><CircleX className="h-4 w-4" aria-hidden="true" />{p.out.length}<span className="sr-only"> fitur tidak termasuk</span></span>
                          </span>
                        </td>
                        <td className={`px-2.5 py-4 tabular-nums text-ink-700${dim}`}>{used(p)}</td>
                        <td className="px-2.5 py-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${p.active ? "bg-[#DCFCE7] text-[#15803D]" : "bg-ink-100 text-ink-700"}`}>
                            {p.active ? <Eye className="h-3.5 w-3.5" aria-hidden="true" /> : <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />}{p.active ? "Aktif" : "Nonaktif"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="flex items-center justify-end gap-2">
                            <button type="button" disabled={busy === p.id} onClick={() => toggle(p)} aria-pressed={p.active} aria-label={`${p.active ? "Nonaktifkan" : "Aktifkan"} paket ${p.title}`} className={`grid h-9 w-9 place-items-center rounded-lg border transition disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400 ${p.active ? "border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D] hover:bg-[#DCFCE7]" : "border-ink-200 bg-ink-50 text-ink-500 hover:bg-ink-100"}`}>
                              {p.active ? <Eye className="h-4 w-4" aria-hidden="true" /> : <EyeOff className="h-4 w-4" aria-hidden="true" />}
                            </button>
                            <button type="button" onClick={() => setForm({ open: true, plan: p })} aria-label={`Edit paket ${p.title}`} className="grid h-9 w-9 place-items-center rounded-lg border border-brand-200 bg-brand-50 text-brand-700 transition hover:bg-brand-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400">
                              <Pencil className="h-4 w-4" aria-hidden="true" />
                            </button>
                            <button type="button" onClick={() => setDel(p)} aria-label={`Hapus paket ${p.title}`} className="grid h-9 w-9 place-items-center rounded-lg border border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C] transition hover:bg-[#FEE2E2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#DC2626]">
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <PlanForm open={form.open} plan={form.plan} plans={plans} onClose={() => setForm({ open: false, plan: null })} onSaved={reload} notify={notify} />

      {/* Hapus / tidak bisa dihapus */}
      <Modal open={!!del} onClose={() => setDel(null)} labelledBy="del-title" className="w-[min(92vw,26rem)]">
        {del && (
          <div className="p-6 sm:p-7">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#FEE2E2] text-[#B91C1C]"><Trash2 className="h-6 w-6" aria-hidden="true" /></span>
            <h2 id="del-title" className="mt-4 text-xl font-extrabold tracking-tight">{used(del) ? "Paket tidak bisa dihapus" : "Hapus paket?"}</h2>
            <p className="mt-1.5 text-ink-600">
              {used(del) ? (
                <>Paket <b>{del.title}</b> dipakai oleh <b>{used(del)} orderan</b>. Menghapusnya akan merusak riwayat orderan dan transaksi. Nonaktifkan saja agar tidak tampil di halaman Harga.</>
              ) : (
                <>Paket <b>{del.title}</b> akan dihapus permanen beserta semua fiturnya. Belum ada orderan yang memakainya.</>
              )}
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" data-autofocus onClick={() => setDel(null)} className="inline-flex items-center justify-center rounded-xl border-2 border-ink-200 px-5 py-2.5 font-bold text-ink-800 transition hover:bg-ink-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400">{used(del) ? "Mengerti" : "Batal"}</button>
              {used(del) ? (
                del.active && (
                  <button type="button" onClick={async () => { const p = del; setDel(null); await toggle(p); }} className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-5 py-2.5 font-bold text-white transition hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400">Nonaktifkan</button>
                )
              ) : (
                <button type="button" disabled={busy === del.id} onClick={() => remove(del)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#B91C1C] px-5 py-2.5 font-bold text-white transition hover:bg-[#991B1B] disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DC2626]">
                  {busy === del.id && <ButtonSpinner className="h-4 w-4" />} Ya, Hapus
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default PricingTable;
