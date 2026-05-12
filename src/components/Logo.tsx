type Props = {
  size?: number;
  className?: string;
  glow?: boolean;
};

export function Logo({ size = 36, className, glow = true }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="ChuckHub logo"
      className={className}
    >
      <defs>
        <linearGradient id="chk-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ff2d4a" />
          <stop offset="55%" stopColor="#ff5577" />
          <stop offset="100%" stopColor="#ff7a2d" />
        </linearGradient>
        {glow && (
          <filter id="chk-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>
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
      <g filter={glow ? "url(#chk-glow)" : undefined}>
        {/* Stylized C — open on the right like a plug socket */}
        <path
          d="M46 22 a16 16 0 1 0 0 20"
          fill="none"
          stroke="url(#chk-g)"
          strokeWidth="6"
          strokeLinecap="round"
        />
        {/* Two prongs */}
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
    </svg>
  );
}
