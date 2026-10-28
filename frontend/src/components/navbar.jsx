import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LogOut, Menu, User, X } from "lucide-react";
import { useUser } from "../provider/user_provider";
import Logo from "./ui/Logo";

const linkBase = "rounded-lg px-3.5 py-2 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400";
const linkIdle = "font-semibold text-ink-700 hover:bg-brand-50 hover:text-brand-700";
const linkOn = "bg-brand-50 font-bold text-brand-700";

export default function Navbar() {
  const { user, logoutUser } = useUser();
  const navigate = useNavigate();
  const { pathname, hash } = useLocation();
  const isLoggedIn = !!user;

  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const wrapRef = useRef(null);
  const menuBtnRef = useRef(null);

  // Bayangan navbar saat scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Tutup menu saat pindah halaman
  useEffect(() => { setMobileOpen(false); setMenuOpen(false); }, [pathname, hash]);

  // Klik di luar / Esc menutup dropdown akun & menu mobile
  useEffect(() => {
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setMenuOpen(false); };
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      setMobileOpen(false);
      setMenuOpen((o) => { if (o) menuBtnRef.current?.focus(); return false; });
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, []);

  const goCaraKerja = () => {
    if (pathname === "/") {
      document.getElementById("cara-kerja")?.scrollIntoView({ behavior: "smooth" });
      window.history.replaceState(null, "", "/#cara-kerja");
    } else {
      navigate("/#cara-kerja");
    }
  };

  const links = [
    { name: "Beranda", onClick: () => { navigate("/"); window.scrollTo({ top: 0 }); }, active: pathname === "/" && hash !== "#cara-kerja" },
    { name: "Cara Kerja", onClick: goCaraKerja, active: pathname === "/" && hash === "#cara-kerja" },
    ...(isLoggedIn ? [{ name: "Orderan", onClick: () => navigate("/orderan"), active: pathname.startsWith("/orderan") }] : []),
    { name: "Harga", onClick: () => navigate("/harga"), active: pathname.startsWith("/harga") },
  ];

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.username || "Pengguna";

  const handleLogout = async () => {
    setMenuOpen(false);
    await logoutUser();
    navigate("/login");
  };

  const onMenuKey = (e) => {
    const items = Array.from(e.currentTarget.querySelectorAll('[role="menuitem"]'));
    const i = items.indexOf(document.activeElement);
    if (e.key === "ArrowDown") { e.preventDefault(); items[(i + 1) % items.length]?.focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus(); }
    else if (e.key === "Tab") setMenuOpen(false);
  };

  return (
    <header className={`sticky top-0 z-50 border-b bg-white/85 backdrop-blur transition-shadow duration-300 ${scrolled ? "border-ink-200 shadow-soft" : "border-transparent"}`}>
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">
        <Logo onClick={() => { navigate("/"); window.scrollTo({ top: 0 }); }} />

        <div className="flex items-center gap-1">
          <nav className="hidden items-center gap-1 md:flex" aria-label="Navigasi utama">
            {links.map((l) => (
              <button key={l.name} type="button" onClick={l.onClick} aria-current={l.active ? "page" : undefined} className={`${linkBase} ${l.active ? linkOn : linkIdle}`}>
                {l.name}
              </button>
            ))}
            {!isLoggedIn && (
              <>
                <button type="button" onClick={() => navigate("/login")} className={`ml-3 ${linkBase} ${linkIdle}`}>Masuk</button>
                <button
                  type="button"
                  onClick={() => navigate("/register")}
                  className="ml-1 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-lift focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400 motion-reduce:hover:translate-y-0"
                >
                  Daftar
                </button>
              </>
            )}
          </nav>

          {/* Menu akun */}
          {isLoggedIn && (
            <div ref={wrapRef} className="relative ml-2">
              <button
                ref={menuBtnRef}
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setMenuOpen(true);
                    requestAnimationFrame(() => wrapRef.current?.querySelector('[role="menuitem"]')?.focus());
                  }
                }}
                className="grid h-10 w-10 place-items-center rounded-full bg-brand-600 text-white shadow-sm transition hover:bg-brand-700 hover:shadow-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="Menu akun"
              >
                <User className="h-5 w-5" aria-hidden="true" />
              </button>
              {menuOpen && (
                <div role="menu" aria-label="Akun" onKeyDown={onMenuKey} className="menu-in absolute right-0 top-[calc(100%+12px)] w-64 rounded-2xl border border-ink-200 bg-white p-1.5 shadow-lift">
                  <div className="px-3.5 py-3">
                    <p className="truncate font-bold text-ink-900">{displayName}</p>
                    <p className="truncate text-xs text-ink-600">{user?.email}</p>
                  </div>
                  <div className="my-1 h-px bg-ink-200" role="separator" />
                  <button role="menuitem" type="button" onClick={() => { setMenuOpen(false); navigate("/profile"); }} className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold text-ink-800 transition hover:bg-brand-50 focus-visible:bg-brand-50 focus-visible:outline-none">
                    <User className="h-4 w-4" aria-hidden="true" /> Profil
                  </button>
                  <button role="menuitem" type="button" onClick={handleLogout} className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold text-[#B91C1C] transition hover:bg-[#FEE2E2] focus-visible:bg-[#FEE2E2] focus-visible:outline-none">
                    <LogOut className="h-4 w-4" aria-hidden="true" /> Keluar
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tombol menu mobile */}
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="ml-1 grid h-11 w-11 place-items-center rounded-xl text-ink-800 transition hover:bg-brand-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400 md:hidden"
            aria-controls="mobile-menu"
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Tutup menu" : "Buka menu"}
          >
            {mobileOpen ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Menu mobile */}
      {mobileOpen && (
        <div id="mobile-menu" className="border-t border-ink-200 bg-white md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-5 py-4" aria-label="Navigasi seluler">
            {links.map((l) => (
              <button
                key={l.name}
                type="button"
                onClick={() => { l.onClick(); setMobileOpen(false); }}
                aria-current={l.active ? "page" : undefined}
                className={`rounded-lg px-3 py-3 text-left ${l.active ? "bg-brand-50 font-bold text-brand-700" : "font-semibold text-ink-800 hover:bg-brand-50"}`}
              >
                {l.name}
              </button>
            ))}
            {!isLoggedIn && (
              <div className="mt-2 grid grid-cols-2 gap-3">
                <button type="button" onClick={() => navigate("/login")} className="rounded-xl border border-ink-300 px-4 py-3 text-center font-bold text-ink-800">Masuk</button>
                <button type="button" onClick={() => navigate("/register")} className="rounded-xl bg-brand-600 px-4 py-3 text-center font-bold text-white">Daftar</button>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
