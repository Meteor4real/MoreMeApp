type Props = {
  size?: number;
  className?: string;
  glow?: boolean;
  /**
   * "icon"     — just the silhouette inside a rounded-square panel. Use this
   *              wherever the asset has to be square (favicons, sidebar chip).
   * "withText" — silhouette stacked on top of "HUB". Used for the hero on
   *              Overview and the auth pages where the brand reads as a wordmark.
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
    // Vertical wordmark: silhouette on top, HUB underneath.
    const aspect = 100 / 130; // viewBox below
    const w = size;
    const h = Math.round(size / aspect);
    return (
      <svg
        width={w}
        height={h}
        viewBox="0 0 100 130"
        role="img"
        aria-label="ChuckHub logo"
        className={className}
      >
        <Defs glow={glow} />
        <Character />
        <text
          x="50"
          y="122"
          textAnchor="middle"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, monospace"
          fontWeight="900"
          fontSize="28"
          letterSpacing="4"
          fill="url(#chk-g)"
          filter={glow ? "url(#chk-glow)" : undefined}
        >
          HUB
        </text>
      </svg>
    );
  }

  // Square icon: silhouette inside the signature rounded panel.
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
      {/* Scale the 100x130 character into the 64x64 frame, centered. */}
      <g transform="translate(8 6) scale(0.48 0.48)">
        <Character />
      </g>
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
 * Inspired by the NetworkChuck silhouette: curly hair on top, eyes,
 * cupped hands at the mouth (megaphone gesture), big shield-shaped beard.
 * Lives in a 100x100 box; the surrounding wordmark variant adds the HUB
 * text below in a 100x130 viewBox.
 */
function Character() {
  return (
    <g filter="url(#chk-glow)">
      {/* Curly hair — chain of bumps across the top */}
      <g fill="url(#chk-g)">
        <circle cx="28" cy="22" r="9" />
        <circle cx="42" cy="14" r="10" />
        <circle cx="58" cy="14" r="10" />
        <circle cx="72" cy="22" r="9" />
      </g>

      {/* Head silhouette */}
      <ellipse cx="50" cy="40" rx="22" ry="20" fill="url(#chk-g)" />

      {/* Beard — shield/heart shape extending below the chin */}
      <path
        d="M 30 48
           C 26 60, 30 78, 42 84
           C 47 87, 53 87, 58 84
           C 70 78, 74 60, 70 48
           C 65 50, 55 52, 50 52
           C 45 52, 35 50, 30 48 Z"
        fill="url(#chk-g)"
      />

      {/* Hands cupping the mouth — two C-curves flanking the face */}
      <path
        d="M 20 50 C 14 52, 12 62, 18 66 C 22 66, 26 64, 28 60 Z"
        fill="url(#chk-g)"
      />
      <path
        d="M 80 50 C 86 52, 88 62, 82 66 C 78 66, 74 64, 72 60 Z"
        fill="url(#chk-g)"
      />

      {/* Eyes — punched out in the panel color */}
      <circle cx="42" cy="40" r="2.6" fill="#0a0a0c" />
      <circle cx="58" cy="40" r="2.6" fill="#0a0a0c" />

      {/* Mouth — small gap to suggest the megaphone yell */}
      <ellipse cx="50" cy="52" rx="4.5" ry="1.6" fill="#0a0a0c" />
    </g>
  );
}
