type Props = {
  size?: number;
  className?: string;
  glow?: boolean;
  /**
   * "icon"     — just the mark inside a rounded-square panel (favicons, sidebar chip).
   * "withText" — mark stacked on top of HUB wordmark.
   */
  variant?: "icon" | "withText";
};

export function Logo({
  size = 36,
  className,
  glow = true,
  variant = "icon",
}: Props) {
  if (variant === "withText") {
    const aspect = 100 / 138;
    const w = size;
    const h = Math.round(size / aspect);
    return (
      <svg
        width={w}
        height={h}
        viewBox="0 0 100 138"
        role="img"
        aria-label="ChuckHub logo"
        className={className}
      >
        <Defs glow={glow} />
        <g transform="translate(18 10)">
          <Mark />
        </g>
        <text
          x="50"
          y="128"
          textAnchor="middle"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, monospace"
          fontWeight="900"
          fontSize="30"
          letterSpacing="6"
          fill="url(#chk-g)"
          filter={glow ? "url(#chk-glow)" : undefined}
        >
          HUB
        </text>
      </svg>
    );
  }

  const radius = (size * 12) / 64;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="ChuckHub logo"
      className={className}
      style={{ borderRadius: radius }}
    >
      <Defs glow={glow} />
      <rect x="2" y="2" width="60" height="60" rx="12" fill="#0a0a0c" />
      <rect
        x="2"
        y="2"
        width="60"
        height="60"
        rx="12"
        fill="none"
        stroke="url(#chk-g)"
        strokeWidth="2"
      />
      <Mark />
    </svg>
  );
}

function Defs({ glow }: { glow: boolean }) {
  return (
    <defs>
      <linearGradient id="chk-g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#ff2d4a" />
        <stop offset="55%" stopColor="#ff5577" />
        <stop offset="100%" stopColor="#ff7a2d" />
      </linearGradient>
      {glow && (
        <filter id="chk-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      )}
    </defs>
  );
}

/**
 * The original ChuckHub mark: a stylized C that doubles as a power-plug
 * socket — two prong sockets cut into the inner edge — drawn in the
 * red/pink/orange gradient.
 */
function Mark() {
  return (
    <g filter="url(#chk-glow)">
      <path
        d="M46 22 a16 16 0 1 0 0 20"
        fill="none"
        stroke="url(#chk-g)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <circle
        cx="26"
        cy="28"
        r="2.2"
        fill="#0a0a0c"
        stroke="url(#chk-g)"
        strokeWidth="1.8"
      />
      <circle
        cx="26"
        cy="36"
        r="2.2"
        fill="#0a0a0c"
        stroke="url(#chk-g)"
        strokeWidth="1.8"
      />
    </g>
  );
}
