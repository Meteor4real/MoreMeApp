// MoreMe wordmark — pure SVG so the download page has no PNG asset to ship.
// A hexagonal mint sigil with a stylized "M" inside, plus the wordmark.
export function Logo({ size = 104 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label="MoreMe"
      style={{ display: "block", filter: "drop-shadow(0 0 18px rgba(62,219,181,0.45))" }}
    >
      <defs>
        <linearGradient id="mm-grad" x1="0" y1="0" x2="120" y2="120">
          <stop offset="0" stopColor="#7FEBD0" />
          <stop offset="1" stopColor="#3EDBB5" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="112" height="112" rx="22" fill="#0F1318" stroke="url(#mm-grad)" strokeWidth="2.5" />
      <path
        d="M30 84 V40 L46 64 L62 40 V84"
        fill="none"
        stroke="url(#mm-grad)"
        strokeWidth="6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M62 84 V40 L78 64 L94 40 V84"
        fill="none"
        stroke="url(#mm-grad)"
        strokeWidth="6"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}
