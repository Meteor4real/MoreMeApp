// MoreMe wordmark — the real one: sun + mountain peaks + barbell on a mint
// tile. Same mark that ships inside the app (apps/desktop/public/embedded/
// moreme/icon-*.svg) so the download page and the installed app match.
export function Logo({ size = 104 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 192 192"
      role="img"
      aria-label="MoreMe"
      style={{ display: "block", filter: "drop-shadow(0 0 18px rgba(62,219,181,0.45))" }}
    >
      <rect width="192" height="192" rx="36" fill="#00C896" />
      <g transform="translate(0,6) scale(3)" stroke="#FFFFFF" fill="#FFFFFF">
        <circle cx="32" cy="10" r="4" stroke="none" />
        <path d="M6 52 L20 24 L32 42 L44 24 L58 52" fill="none" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 56 L58 56" fill="none" strokeWidth={1.6} strokeLinecap="round" opacity={0.4} />
        <path d="M22 58 L42 58" fill="none" strokeWidth={3} strokeLinecap="round" />
        <circle cx="20" cy="58" r="3" stroke="none" />
        <circle cx="44" cy="58" r="3" stroke="none" />
      </g>
    </svg>
  );
}
