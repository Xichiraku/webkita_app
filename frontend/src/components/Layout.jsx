import React from "react";
import Navbar from "./navbar";
import Footer from "./Footer";

/**
 * Kerangka halaman publik: navbar + konten + footer.
 * Navigasi kini ditangani langsung oleh Navbar (react-router), jadi props
 * on*Click lama tidak lagi dibutuhkan.
 */
export default function Layout({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <a href="#utama" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-brand-700 focus:px-4 focus:py-2 focus:text-white">
        Lewati ke konten utama
      </a>
      <Navbar />
      <div id="utama" className="flex-grow">{children}</div>
      <Footer />
    </div>
  );
}
