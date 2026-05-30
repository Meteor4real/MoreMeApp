import type { ReactNode } from "react";

// Sidebar marks. Hub-control panels use the red→orange gradient. Each site
// app uses its own brand mark — the same artwork that ships on the real site,
// trimmed down to read clearly at 24px. NT5 has a reworked mark (legible at
// any size; the old hex+wedge was hard to read).

const S = 24;

function hubSvg(children: ReactNode, stroke = "url(#nchg)") {
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

function tile(children: ReactNode, bg: string, accent: string, viewBox = "0 0 24 24") {
  return (
    <svg width={S} height={S} viewBox={viewBox} className="rail-ico">
      <defs>
        <linearGradient id={"g-" + accent.replace(/[^a-z0-9]/gi, "")} x1="0" y1="0" x2="24" y2="24">
          <stop offset="0" stopColor={accent} />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="5" fill={bg} />
      {children}
    </svg>
  );
}

export const ICON: Record<string, ReactNode> = {
  // Hub panels
  control: hubSvg(<><circle cx="12" cy="13" r="7" /><path d="M12 13 L15.5 9.5" /><path d="M5 13h1M18 13h1M12 6v1" /></>),
  terminal: hubSvg(<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 9l3 3-3 3M13 15h4" /></>),
  // Plain speech-bubble mark — centered to match the rest of the rail.
  // Bubble body 4-20 × 5-17, tail tucked under so the visual center sits at
  // (12,12) like every other 24×24 icon in this set.
  ai: hubSvg(<path d="M4 5h16a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 20 17h-7l-4 3v-3H4a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 4 5z" />),
  browser: hubSvg(<><circle cx="12" cy="12" r="8" /><path d="M4 12h16M12 4c2.5 2.5 2.5 13 0 16M12 4c-2.5 2.5-2.5 13 0 16" /></>),
  library: hubSvg(<><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M10 9l5 3-5 3z" fill="url(#nchg)" /></>),
  settings: hubSvg(<><circle cx="12" cy="12" r="3" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" /></>),

  // ── Site apps — using the real site brand marks ────────────────────────────

  // NT5: reworked from the old hex+wedge into a hex tile with bold "NT5"
  // letterforms in the site's magenta→cyan gradient. Reads at 24px and 240px.
  nt5: (
    <svg width={S} height={S} viewBox="0 0 24 24" className="rail-ico">
      <defs>
        <linearGradient id="nt5tile" x1="0" y1="0" x2="24" y2="24">
          <stop offset="0" stopColor="#d946ef" />
          <stop offset="0.5" stopColor="#7c3aed" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <path d="M12 1.6L21.5 7v10L12 22.4 2.5 17V7z" fill="#0a0820" stroke="url(#nt5tile)" strokeWidth="1.2" />
      <text x="12" y="14.4" textAnchor="middle"
        fontFamily="'Orbitron','Space Grotesk',sans-serif" fontWeight={800} fontSize="6.6" letterSpacing="0.3"
        fill="url(#nt5tile)">NT5</text>
      <line x1="6" y1="17" x2="18" y2="17" stroke="url(#nt5tile)" strokeWidth="0.6" opacity="0.6" />
    </svg>
  ),

  // HALOS: the real site's triangle + dashed-line + orb mark.
  halos: (
    <svg width={S} height={S} viewBox="0 0 80 80" className="rail-ico">
      <rect width="80" height="80" rx="14" fill="#07050f" />
      <polygon points="40,9 72,64 8,64" stroke="#00e5ff" strokeWidth="3.5" fill="none" />
      <polygon points="40,21 60,58 20,58" stroke="#00e5ff" strokeWidth="1.4" fill="none" opacity="0.4" />
      <circle cx="40" cy="46" r="8" fill="#00e5ff" opacity="0.9" />
      <line x1="40" y1="11" x2="40" y2="38" stroke="#00e5ff" strokeWidth="1.6" strokeDasharray="3 3" opacity="0.85" />
      <circle cx="40" cy="46" r="14" stroke="#00e5ff" strokeWidth="1" opacity="0.4" strokeDasharray="4 4" />
    </svg>
  ),

  // MoreMe: the actual sun + peaks + barbell mark on its mint tile.
  moreme: (
    <svg width={S} height={S} viewBox="-6 -8 76 80" className="rail-ico">
      <rect x="-6" y="-8" width="76" height="80" rx="14" fill="#00C896" />
      <g stroke="#FFFFFF" fill="#FFFFFF">
        <circle cx="32" cy="10" r="4" stroke="none" />
        <path d="M6 52 L20 24 L32 42 L44 24 L58 52" fill="none" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 56 L58 56" fill="none" strokeWidth="1.6" strokeLinecap="round" opacity="0.4" />
        <path d="M22 58 L42 58" fill="none" strokeWidth="3" strokeLinecap="round" />
        <circle cx="20" cy="58" r="3" stroke="none" />
        <circle cx="44" cy="58" r="3" stroke="none" />
      </g>
    </svg>
  ),

  // DigitalBlueprint: matches the in-tab header — amber techy hex frame with
  // a dotted arc and a center hub.
  blueprint: (
    <svg width={S} height={S} viewBox="0 0 32 32" className="rail-ico">
      <defs>
        <linearGradient id="dbg-rail" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffb84d" />
          <stop offset="1" stopColor="#ff7a4a" />
        </linearGradient>
      </defs>
      <path d="M3 16 A13 13 0 0 1 29 16" fill="none" stroke="url(#dbg-rail)" strokeWidth="1" strokeDasharray="2 3" opacity="0.7" />
      <g fill="none" stroke="url(#dbg-rail)" strokeWidth="1.6" strokeLinejoin="round">
        <path d="M16 4 L27 10 L27 22 L16 28 L5 22 L5 10 Z" />
        <path d="M16 4 L16 16 M16 16 L27 10 M16 16 L5 10 M16 16 L16 28" />
      </g>
      <circle cx="16" cy="16" r="2" fill="url(#dbg-rail)" />
    </svg>
  ),

  // BroBot: onyx + gold-trimmed monogram tile.
  brobot: (
    <svg width={S} height={S} viewBox="0 0 24 24" className="rail-ico">
      <defs>
        <linearGradient id="brogold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f3dca0" />
          <stop offset="50%" stopColor="#c9a961" />
          <stop offset="100%" stopColor="#8c7339" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="5" fill="#08070a" />
      <rect x="1.5" y="1.5" width="21" height="21" rx="4" fill="none" stroke="url(#brogold)" strokeWidth="0.9" />
      <text x="12" y="16.5" textAnchor="middle" fontFamily="'Cinzel','Cormorant Garamond',serif" fontWeight={700} fontSize="11" fill="url(#brogold)" letterSpacing="0.5">B</text>
    </svg>
  ),

  // SignalFinder: hub-themed (it has no real site to match).
  signalfinder: tile(
    <g stroke="#ff5577" strokeWidth="1.5" fill="none" strokeLinecap="round">
      <circle cx="12" cy="16" r="1.4" fill="#ff5577" stroke="none" />
      <path d="M9 13a4 4 0 0 1 6 0" />
      <path d="M6.5 10.5a8 8 0 0 1 11 0" />
    </g>,
    "#0b0710", "#ff5577"
  ),
};
