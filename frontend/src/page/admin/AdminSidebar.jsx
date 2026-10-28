import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { ArrowRight, CreditCard, LayoutDashboard, LogOut, Package, Tags, Users, X } from "lucide-react";

const NAV = [
  { to: "/admin", end: true, label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/orderan", label: "Orderan", icon: Package, count: "orders" },
  { to: "/admin/pengguna", label: "Pengguna", icon: Users, count: "users" },
  { to: "/admin/transaksi", label: "Transaksi", icon: CreditCard, count: "trx" },
  { to: "/admin/paket", label: "Paket Layanan", icon: Tags },
];

const AdminSidebar = ({ open, onClose, counts = {}, pending = 0, onLogout }) => {
  const navigate = useNavigate();

  return (
    <>
      {/* overlay mobile */}
      <div className={`fixed inset-0 z-40 bg-ink-950/50 backdrop-blur-sm lg:hidden ${open ? "" : "hidden"}`} aria-hidden="true" onClick={onClose} />

      <aside
        id="admin-sidebar"
        aria-label="Menu admin"
        className={`card fixed inset-y-0 left-0 z-50 flex w-64 flex-col rounded-r-3xl transition-transform duration-300 lg:inset-y-4 lg:left-4 lg:translate-x-0 lg:rounded-3xl ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-6">
          <button type="button" onClick={() => navigate("/admin")} className="flex items-center gap-3 rounded-lg text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-400">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-lg font-extrabold text-white shadow-soft">W</span>
            <span className="leading-tight"><span className="block text-lg font-extrabold text-ink-900">Webkita</span><span className="block text-xs font-semibold text-ink-600">Admin Panel</span></span>
          </button>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl border border-ink-200 text-ink-700 transition hover:bg-ink-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400 lg:hidden" aria-label="Tutup menu">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <nav className="mt-3 flex-1 space-y-1.5 overflow-y-auto px-3" aria-label="Navigasi admin">
          {NAV.map(({ to, end, label, icon: Icon, count }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400 ${
                  isActive
                    ? "bg-brand-100 font-bold text-brand-800 shadow-[0_1px_0_#fff_inset,0_8px_16px_-10px_rgba(37,89,204,.5)]"
                    : "font-semibold text-ink-700 hover:bg-brand-50 hover:text-ink-900"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" /> {label}
                  {count && counts[count] !== undefined && (
                    <span className={`ml-auto grid min-w-[1.4rem] place-items-center rounded-full px-1.5 text-xs font-bold ${isActive ? "bg-white/80 text-brand-800" : "bg-ink-100 text-ink-700"}`}>
                      {counts[count]}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-3 p-3">
          <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-4 text-white shadow-soft">
            <p className="text-xs font-semibold text-brand-100">Perlu tindakan</p>
            <p className="mt-1 text-3xl font-extrabold tabular-nums">{pending}</p>
            <button type="button" onClick={() => { onClose?.(); navigate("/admin#aksi"); }} className="mt-2 inline-flex items-center gap-1 rounded text-sm font-bold text-white underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
              Lihat daftar <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <button type="button" onClick={onLogout} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-[#B91C1C] transition hover:bg-[#FEE2E2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#DC2626]">
            <LogOut className="h-[18px] w-[18px]" aria-hidden="true" /> Keluar
          </button>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
