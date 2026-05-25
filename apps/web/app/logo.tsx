// TEMPORARY placeholder mark. The real NetworkChuck Hub logo will be the
// recolored NetworkChuck headshot art (red->orange gradient on black) with
// "HUB" underneath, dropped in as /public/networkchuck-hub-logo.png and
// swapped in here once the source image is provided.
export function Logo({ size = 96 }: { size?: number }) {
  const h = Math.round(size * 1.38);
  return (
    <svg
      width={size}
      height={h}
      viewBox="0 0 100 138"
      role="img"
      aria-label="NetworkChuck Hub"
    >
      <defs>
        <linearGradient id="nc-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ff2d4a" />
          <stop offset="55%" stopColor="#ff5577" />
          <stop offset="100%" stopColor="#ff7a2d" />
        </linearGradient>
        <filter id="nc-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g transform="translate(18 8)" filter="url(#nc-glow)">
        <path
          d="M46 22 a16 16 0 1 0 0 20"
          fill="none"
          stroke="url(#nc-g)"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <circle cx="26" cy="28" r="2.2" fill="#0a0a0c" stroke="url(#nc-g)" strokeWidth="1.8" />
        <circle cx="26" cy="36" r="2.2" fill="#0a0a0c" stroke="url(#nc-g)" strokeWidth="1.8" />
      </g>
      <text
        x="50"
        y="128"
        textAnchor="middle"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, monospace"
        fontWeight="900"
        fontSize="30"
        letterSpacing="6"
        fill="url(#nc-g)"
        filter="url(#nc-glow)"
      >
        HUB
      </text>
    </svg>
  );
}
