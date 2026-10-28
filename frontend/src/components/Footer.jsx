import React from "react";
import { useNavigate } from "react-router-dom";
import Logo, { GithubIcon } from "./ui/Logo";

const COLUMNS = [
  { title: "Perusahaan", items: ["Tentang Kami", "Karir", "Blog", "Kontak"] },
  { title: "Layanan", items: ["Developer", "E-commerce", "Design", "Konsultasi"] },
  { title: "Dukungan", items: ["Pusat Bantuan", "FAQ", "Syarat & Ketentuan", "Kebijakan Privasi"] },
];

export default function Footer() {
  const navigate = useNavigate();

  return (
    <footer className="border-t border-ink-200 bg-white">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <Logo onClick={() => { navigate("/"); window.scrollTo({ top: 0 }); }} />
            <p className="mt-4 max-w-[15rem] text-sm leading-relaxed text-ink-600">Hubungkan bisnis Anda dengan developer terbaik.</p>
            <a href="#" aria-label="Webkita di GitHub" className="mt-4 inline-grid h-10 w-10 place-items-center rounded-full text-ink-600 transition hover:bg-brand-50 hover:text-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400">
              <GithubIcon />
            </a>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="text-sm font-bold text-ink-900">{col.title}</h3>
              <ul className="mt-4 space-y-3 text-sm text-ink-600">
                {col.items.map((it) => (
                  <li key={it}><a href="#" className="transition hover:text-brand-700 hover:underline">{it}</a></li>
                ))}
              </ul>
            </nav>
          ))}

          <div>
            <h3 className="text-sm font-bold text-ink-900">Newsletter</h3>
            <p className="mt-4 text-sm text-ink-600">Dapatkan update terbaru dari kami.</p>
            <form className="mt-4 flex" onSubmit={(e) => e.preventDefault()}>
              <label htmlFor="newsletter-email" className="sr-only">Email Anda</label>
              <input
                id="newsletter-email"
                type="email"
                required
                placeholder="Email Anda"
                autoComplete="email"
                className="min-w-0 flex-1 rounded-l-xl border border-r-0 border-ink-300 bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
              <button type="submit" className="rounded-r-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400">Kirim</button>
            </form>
          </div>
        </div>

        <div className="mt-12 border-t border-ink-200 pt-6 text-center text-sm text-ink-600">
          &copy; {new Date().getFullYear()} Webkita. Semua hak dilindungi.
        </div>
      </div>
    </footer>
  );
}
