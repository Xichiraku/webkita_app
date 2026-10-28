import { useEffect, useRef } from "react";

/**
 * Animasi "muncul saat di-scroll" dari desain HTML.
 * Pasang ref yang dikembalikan ke elemen pembungkus; semua `.reveal` di dalamnya
 * akan mendapat kelas `is-visible` ketika terlihat.
 * `deps` dipakai untuk memindai ulang ketika isi berubah (mis. data selesai dimuat).
 */
export default function useReveal(deps = []) {
  const ref = useRef(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    const items = Array.from(root.querySelectorAll(".reveal:not(.is-visible)"));
    if (!("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-visible"));
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("is-visible");
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}
