import { useEffect, useState } from "react";

const reduceMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Angka yang "menghitung naik" seperti di desain HTML */
export default function CountUp({ to = 0, duration = 700 }) {
  const [val, setVal] = useState(reduceMotion() ? to : 0);

  useEffect(() => {
    if (reduceMotion() || !to) { setVal(to); return undefined; }
    let raf;
    const t0 = performance.now();
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / duration);
      setVal(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);

  return val;
}
