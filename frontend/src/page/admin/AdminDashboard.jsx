import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, Bell, CircleX, Menu, Search } from "lucide-react";
import API from "../../core/utils/api_client";
import { ENDPOINTS } from "../../core/constants/api_endpoint";
import { useUser } from "../../provider/user_provider";
import { transformPlan, transformProject, transformTrx, transformUser } from "../../utils/adminConstants";
import { initials, rp } from "../../utils/format";
import { statusOf } from "../../utils/status";
import useToast from "../../hooks/useToast";
import Toast from "../../components/ui/Toast";
import Modal from "../../components/ui/Modal";
import AdminSidebar from "./AdminSidebar";
import AdminHome from "./StatsGrid";
import AdminOrders from "./AdminOrders";
import UsersTable from "./UsersTable";
import TransactionsTable from "./TransactionsTable";
import PricingTable from "./PricingTable";
import OrderDetailModal from "./OrderDetailModal";

const CRUMB = { orderan: "Orderan", pengguna: "Pengguna", transaksi: "Transaksi", paket: "Paket Layanan" };

/**
 * Layout panel admin: sidebar + header + halaman (Dashboard, Orderan, Pengguna,
 * Transaksi, Paket). Data dimuat sekali di sini lalu dibagikan ke tiap halaman.
 */
const AdminDashboard = () => {
  const navigate = useNavigate();
  const { pathname, hash } = useLocation();
  const { user, logoutUser } = useUser();
  const [toast, notify] = useToast();

  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [trx, setTrx] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sideOpen, setSideOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [acts, setActs] = useState([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    const results = await Promise.allSettled([
      API.get(ENDPOINTS.GET_ALL_PROJECTS),
      API.get(ENDPOINTS.GET_ALL_USERS),
      API.get("/payment/all"),
      API.get(ENDPOINTS.GET_ALL_PRICING),
    ]);
    const pick = (r) => (r.status === "fulfilled" ? (Array.isArray(r.value?.data) ? r.value.data : Array.isArray(r.value) ? r.value : []) : null);
    const [o, u, t, p] = results.map(pick);
    if (o) setOrders(o.map(transformProject));
    if (u) setUsers(u.map(transformUser));
    if (t) setTrx(t.map(transformTrx));
    if (p) setPlans(p.map(transformPlan));
    const failed = results.find((r) => r.status === "rejected");
    if (failed) setError(failed.reason?.message || "Sebagian data gagal dimuat");
    setLoading(false);
    return !failed;
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // kunci scroll saat sidebar mobile terbuka
  useEffect(() => {
    document.documentElement.style.overflow = sideOpen ? "hidden" : "";
    return () => { document.documentElement.style.overflow = ""; };
  }, [sideOpen]);

  // tautan /admin#aksi
  useEffect(() => {
    if (!hash || loading) return;
    requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth" }));
  }, [hash, loading, pathname]);

  const addAct = useCallback((icon, html) => setActs((a) => [{ id: Date.now(), icon, html, when: "Baru saja" }, ...a]), []);

  /* ----- aksi orderan ----- */
  const setStatus = useCallback(async (order, to, reason = "") => {
    setBusyId(order.id);
    try {
      await API.patch(`${ENDPOINTS.UPDATE_PROJECT_STATUS}/${order.id}/status`, to === "rejected" ? { status: to, reason } : { status: to });
      const extra = to === "rejected" ? { rejectReason: reason } : {};
      setOrders((list) => list.map((x) => (x.id === order.id ? { ...x, status: to, ...extra } : x)));
      setDetail((d) => (d && d.id === order.id ? { ...d, status: to, ...extra } : d));
      notify(`Status "${order.projectTitle}" diubah menjadi ${statusOf(to).adminLabel}.`);
      addAct(to === "rejected" ? "reject" : "status", { name: order.projectTitle, to: statusOf(to).adminLabel });
      return true;
    } catch (err) {
      notify(`Gagal mengubah status: ${err?.message || "terjadi kesalahan"}`, "err");
      return false;
    } finally {
      setBusyId(null);
    }
  }, [notify, addAct]);

  const pickStatus = useCallback((order, to) => {
    if (to === "rejected") { setRejectReason(""); setRejectTarget(order); }
    else setStatus(order, to);
  }, [setStatus]);

  const setPrice = useCallback(async (order, n) => {
    try {
      await API.patch(`/project/${order.id}/price`, { plan_price_range: String(n) });
      setOrders((list) => list.map((x) => (x.id === order.id ? { ...x, planPriceRange: String(n), price: n } : x)));
      notify(`Harga ${order.projectTitle} diatur ke ${rp(n)}.`);
      addAct("price", { name: order.projectTitle, price: rp(n) });
      return true;
    } catch (err) {
      notify(`Gagal mengatur harga: ${err?.message || "terjadi kesalahan"}`, "err");
      return false;
    }
  }, [notify, addAct]);

  const openOrder = useCallback((idOrOrder) => {
    const o = typeof idOrOrder === "object" ? idOrOrder : orders.find((x) => String(x.id) === String(idOrOrder));
    if (o) setDetail(o);
    return !!o;
  }, [orders]);

  const refresh = async () => {
    const ok = await fetchAll();
    notify(ok ? "Data diperbarui." : "Sebagian data gagal dimuat.", ok ? "ok" : "err");
  };

  const handleLogout = async () => {
    await logoutUser();
    navigate("/login", { replace: true });
  };

  /* ----- ringkasan untuk sidebar/header ----- */
  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const needAction = pendingCount + orders.filter((o) => o.status === "approved").length;
  const usedByPlan = useMemo(() => {
    const m = {};
    orders.forEach((o) => { const k = (o.planTitle || "").toLowerCase(); if (k) m[k] = (m[k] || 0) + 1; });
    return m;
  }, [orders]);

  const section = pathname.replace(/^\/admin\/?/, "").split("/")[0];
  const adminName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.username || "Admin";

  const ctx = {
    orders, users, trx, plans, setPlans, loading, refresh, fetchAll, notify, busyId, query, setQuery,
    pickStatus, setPrice, openOrder, acts, usedByPlan, meId: user?.id, adminName,
  };

  return (
    <div className="admin-bg min-h-screen font-sans text-ink-900 antialiased">
      <a href="#utama" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[90] focus:rounded-lg focus:bg-brand-700 focus:px-4 focus:py-2 focus:text-white">Lewati ke konten utama</a>

      <AdminSidebar
        open={sideOpen}
        onClose={() => setSideOpen(false)}
        counts={{ orders: section === "" ? pendingCount : orders.length, users: users.length, trx: trx.length }}
        pending={needAction}
        onLogout={handleLogout}
      />

      <div className="lg:pl-[18.5rem]">
        <header className="flex flex-wrap items-center gap-3 px-4 pt-4 sm:px-8 lg:pr-8 lg:pt-5">
          <button type="button" onClick={() => setSideOpen(true)} className="card grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-ink-800 transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400 lg:hidden" aria-label="Buka menu" aria-controls="admin-sidebar" aria-expanded={sideOpen}>
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          {section === "" ? (
            <div className="card relative min-w-0 max-w-xl flex-1 rounded-2xl">
              <label htmlFor="gsearch" className="sr-only">Cari orderan, klien, atau paket</label>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-500" aria-hidden="true" />
              <input
                id="gsearch"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); document.getElementById("orderan")?.scrollIntoView({ behavior: "smooth" }); } }}
                placeholder="Cari orderan, klien, paket…"
                autoComplete="off"
                className="h-12 w-full rounded-2xl bg-transparent pl-11 pr-4 text-sm text-ink-900 outline-none placeholder:text-ink-500 focus:ring-2 focus:ring-brand-300"
              />
            </div>
          ) : (
            <nav aria-label="Breadcrumb" className="hidden text-sm text-ink-600 sm:block">
              <button type="button" onClick={() => navigate("/admin")} className="rounded font-semibold hover:text-brand-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400">Dashboard</button>
              {" "}<span aria-hidden="true">/</span>{" "}
              <span aria-current="page" className="font-bold text-ink-900">{CRUMB[section] || section}</span>
            </nav>
          )}

          <div className="ml-auto flex items-center gap-3">
            <button type="button" onClick={() => navigate("/admin#aksi")} className="card relative grid h-12 w-12 place-items-center rounded-2xl text-ink-800 transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400" aria-label={`${needAction} hal perlu tindakan`}>
              <Bell className="h-5 w-5" aria-hidden="true" />
              {needAction > 0 && <span className="absolute -right-1 -top-1 grid min-w-[1.35rem] place-items-center rounded-full bg-brand-600 px-1 text-xs font-bold text-white ring-2 ring-white">{needAction}</span>}
            </button>
            <div className="card hidden items-center gap-3 rounded-2xl py-2 pl-2 pr-5 sm:flex">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 text-sm font-extrabold text-brand-800">{initials(adminName)}</span>
              <span className="leading-tight"><span className="block max-w-[10rem] truncate text-sm font-bold text-ink-900">{adminName}</span><span className="block text-xs text-ink-600">{user?.role === "developer" ? "Developer" : "Administrator"}</span></span>
            </div>
          </div>
        </header>

        <main id="utama" className="px-4 pb-16 pt-6 sm:px-8 lg:pr-8">
          {error && (
            <div className="mb-5 flex items-center gap-3 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#7F1D1D]" role="alert">
              <AlertCircle className="h-5 w-5 shrink-0 text-[#DC2626]" aria-hidden="true" />
              <span className="flex-1">{error}</span>
              <button type="button" onClick={refresh} className="rounded-lg border border-[#FECACA] bg-white px-3 py-1.5 text-xs font-bold text-[#B91C1C] hover:bg-[#FEE2E2]">Coba lagi</button>
            </div>
          )}
          <Routes>
            <Route index element={<AdminHome ctx={ctx} />} />
            <Route path="orderan" element={<AdminOrders ctx={ctx} />} />
            <Route path="pengguna" element={<UsersTable ctx={ctx} />} />
            <Route path="transaksi" element={<TransactionsTable ctx={ctx} />} />
            <Route path="paket" element={<PricingTable ctx={ctx} />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </main>
      </div>

      <OrderDetailModal
        order={detail}
        onClose={() => setDetail(null)}
        onApprove={async (o) => { setDetail(null); await setStatus(o, "approved"); }}
        onReject={(o) => { setDetail(null); setRejectReason(""); setRejectTarget(o); }}
        notify={notify}
      />

      {/* Konfirmasi tolak */}
      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} labelledBy="r-title" className="w-[min(92vw,28rem)]">
        {rejectTarget && (
          <div className="p-6 sm:p-7">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#FEE2E2] text-[#B91C1C]"><CircleX className="h-6 w-6" aria-hidden="true" /></span>
            <h2 id="r-title" className="mt-4 text-xl font-extrabold tracking-tight">Tolak orderan ini?</h2>
            <p className="mt-1.5 text-ink-600">"{rejectTarget.projectTitle}" milik {rejectTarget.contactName}.</p>
            <p className="mt-3 rounded-xl bg-ink-50 p-3 text-sm text-ink-700">Status "Ditolak" tidak dapat diubah kembali. Alasan akan ditampilkan kepada klien di halaman orderannya.</p>
            <label htmlFor="r-reason" className="mt-4 block text-sm font-bold text-ink-800">Alasan penolakan <span className="font-normal text-ink-500">(opsional)</span></label>
            <textarea
              id="r-reason"
              rows={3}
              maxLength={500}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Contoh: Di luar cakupan layanan kami saat ini."
              className="mt-1.5 w-full resize-none rounded-xl border-2 border-ink-200 px-3 py-2 text-sm text-ink-900 outline-none transition focus:border-brand-500"
            />
            <p className="mt-1 text-right text-xs text-ink-500">{rejectReason.length}/500</p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setRejectTarget(null)} className="inline-flex items-center justify-center rounded-xl border-2 border-ink-200 px-5 py-2.5 font-bold text-ink-800 transition hover:bg-ink-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400">Batal</button>
              <button
                type="button"
                data-autofocus
                onClick={async () => { const o = rejectTarget; setRejectTarget(null); await setStatus(o, "rejected", rejectReason.trim()); }}
                className="inline-flex items-center justify-center rounded-xl bg-[#B91C1C] px-5 py-2.5 font-bold text-white transition hover:bg-[#991B1B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DC2626]"
              >
                Ya, Tolak Orderan
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Toast toast={toast} />
    </div>
  );
};

export default AdminDashboard;
