type Props = {
  size?: number;
  className?: string;
  glow?: boolean;
  /**
   * "icon"     — silhouette inside a rounded-square panel (favicons, sidebar chip).
   * "withText" — silhouette stacked on top of HUB wordmark.
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
        <Character />
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
      {/* Scale 100x100 character into the 64x64 frame, centered. */}
      <g transform="translate(7 6) scale(0.50)">
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
          <feGaussianBlur stdDeviation="1.2" result="b" />
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
 * Bearded character silhouette in a 100x100 box:
 *   - curly hair mass with sideburns coming down both sides
 *   - sharp V-shaped eyebrows over two dot eyes (visible in the face gap)
 *   - thick beard + mustache wrapping the lower half
 *
 * The face skin is the negative space between hair and beard; the panel
 * background shows through wherever the silhouette doesn't paint.
 */
function Character() {
  return (
    <g fill="url(#chk-g)" filter="url(#chk-glow)">
      {/* Hair: curly bumps across the top, sideburns down to the beard line */}
      <path
        d="
          M 24 54
          L 24 34
          C 24 25, 27 20, 32 22
          C 33 14, 41 13, 45 18
          C 47 10, 53 10, 55 18
          C 59 13, 67 14, 68 22
          C 73 20, 76 25, 76 34
          L 76 54
          L 68 54
          C 68 44, 62 40, 50 40
          C 38 40, 32 44, 32 54
          Z
        "
      />

      {/* Beard + mustache: shield-shaped mass below the eye line */}
      <path
        d="
          M 22 54
          L 32 54
          C 33 57, 40 59, 50 59
          C 60 59, 67 57, 68 54
          L 78 54
          C 81 66, 81 78, 76 86
          C 68 94, 56 96, 50 96
          C 44 96, 32 94, 24 86
          C 19 78, 19 66, 22 54
          Z
        "
      />

      {/* Eyebrows: angled inward, intense */}
      <path d="M 33 44 L 44 40 L 44 43 L 33 47 Z" />
      <path d="M 56 40 L 67 44 L 67 47 L 56 43 Z" />

      {/* Eyes: dots in the face gap */}
      <circle cx="40" cy="50" r="2.4" />
      <circle cx="60" cy="50" r="2.4" />
    </g>
  );
}
