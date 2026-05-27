import type { ReactNode } from "react";

// Per-app / per-panel marks for the rail. Brand-colored, glowing (via CSS
// .rail-ico drop-shadow). Distinct silhouettes so nothing reads as a bland
// monogram. Site apps use their own brand colors; hub panels use the
// red->orange gradient.
const S = 24;
function svg(children: ReactNode, stroke = "url(#nchg)") {
  return (
    <svg width={S} height={S} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="rail-ico">
      <defs>
        <linearGradient id="nchg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ff2d4a" />
          <stop offset="55%" stopColor="#ff5577" />
          <stop offset="100%" stopColor="#ff7a2d" />
        </linearGradient>
      </defs>
      {children}
    </svg>
  );
}

export const ICON: Record<string, ReactNode> = {
  control: svg(<><circle cx="12" cy="13" r="7" /><path d="M12 13 L15.5 9.5" /><path d="M5 13h1M18 13h1M12 6v1" /></>),
  terminal: svg(<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 9l3 3-3 3M13 15h4" /></>),
  ai: svg(<><path d="M3 6a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H8l-4 3v-3a2 2 0 0 1-1-2z" /><circle cx="7" cy="8.5" r="0.6" fill="url(#nchg)" /><circle cx="10" cy="8.5" r="0.6" fill="url(#nchg)" /></>),
  browser: svg(<><circle cx="12" cy="12" r="8" /><path d="M4 12h16M12 4c2.5 2.5 2.5 13 0 16M12 4c-2.5 2.5-2.5 13 0 16" /></>),
  extensions: svg(<><path d="M9 4h4v3a2 2 0 1 0 4 0V4h0v0M9 4v3a2 2 0 1 1-4 0M5 7v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7" /></>),
  library: svg(<><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M10 9l5 3-5 3z" fill="url(#nchg)" /></>),
  settings: svg(<><circle cx="12" cy="12" r="3" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" /></>),
  // site apps — own brand colors
  nt5: svg(<><path d="M12 3l7 4v8l-7 4-7-4V7z" /><path d="M9.5 15V9.5l5 5V9.5" /></>, "#d946ef"),
  halos: svg(<><path d="M12 3l8 16H4z" /><path d="M12 9v6M9 16h6" /><circle cx="12" cy="6.5" r="0.8" fill="#00e5ff" /></>, "#00e5ff"),
  blueprint: svg(<><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" /><path d="M12 3v9M12 12l8-4.5M12 12l-8-4.5M12 12v9" /></>, "url(#nchg)"),
  moreme: svg(<><circle cx="12" cy="6" r="1.6" stroke="#00C896" /><path d="M4 18l5-8 3 4 3-5 5 9" stroke="#00C896" /><path d="M8 20h8" stroke="#00C896" /></>, "#00C896"),
  brobot: svg(<><path d="M12 3l9 9-9 9-9-9z" /><path d="M12 8l4 4-4 4-4-4z" stroke="#d4af37" /></>, "#d4af37"),
  signalfinder: svg(<><circle cx="12" cy="16" r="1.4" fill="#ff5577" stroke="none" /><path d="M9 13a4 4 0 0 1 6 0M6.5 10.5a8 8 0 0 1 11 0" stroke="#ff5577" /></>, "#ff5577"),
};
