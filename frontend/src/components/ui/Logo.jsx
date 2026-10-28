import React from "react";
import { CodeXml } from "lucide-react";

export function LogoMark({ className = "h-8 w-8 rounded-lg", iconClass = "h-[18px] w-[18px]" }) {
  return (
    <span className={`grid place-items-center bg-brand-600 text-white ${className}`}>
      <CodeXml className={iconClass} aria-hidden="true" />
    </span>
  );
}

export default function Logo({ onClick, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-md text-xl font-extrabold tracking-tight text-ink-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-400 ${className}`}
    >
      <LogoMark />
      Webkita
    </button>
  );
}

// lucide-react v1 tidak lagi menyertakan ikon brand, jadi GitHub digambar manual
export function GithubIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.237 2.766 7.824 6.64 9.123.486.089.665-.213.665-.473v-1.64c-2.68.583-3.243-1.288-3.243-1.288-.438-1.111-1.07-1.405-1.07-1.405-.875-.596.066-.584.066-.584.77 0 1.173.793 1.173.793.682 1.168 1.794.83 2.235.635.068-.492.269-.83.487-1.02-2.04-.23-4.183-1.02-4.183-4.524 0-1.002.359-1.82.951-2.46-.096-.23-.413-1.166.091-2.42 0 0 .779-.246 2.55.945.74-.206 1.52-.308 2.308-.312.788.004 1.568.106 2.308.312 1.77-1.191 2.549-.945 2.549-.945.504 1.254.187 2.19.091 2.42.592.64.951 1.458.951 2.46 0 3.513-2.146 4.29-4.195 4.516.326.279.62.833.62 1.674v2.486c0 .26.179.564.66.473C19.237 19.82 22 16.237 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  );
}
