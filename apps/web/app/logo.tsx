/* eslint-disable @next/next/no-img-element */
// The NetworkChuck Hub logo: the recolored NetworkChuck source mark
// (red->orange gradient on black) with "HUB" beneath, generated into
// /public/networkchuck-hub-logo.png.
export function Logo({ size = 104 }: { size?: number }) {
  return (
    <img
      src="/networkchuck-hub-logo.png"
      width={size}
      height={size}
      alt="NetworkChuck Hub"
      style={{
        display: "block",
        borderRadius: 18,
        filter: "drop-shadow(0 0 18px rgba(255,51,85,0.45))",
      }}
    />
  );
}
