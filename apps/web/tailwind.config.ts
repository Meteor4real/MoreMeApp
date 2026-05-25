import type { Config } from "tailwindcss";

// Master NetworkChuck Hub theme tokens — kept identical to the Control Panel
// (apps/control-panel/tailwind.config.ts) so the whole product looks like one app.
const config: Config = {
  content: ["./app/**/*.{ts,tsx,js,jsx,mdx}"],
  theme: {
    extend: {
      colors: {
        chuck: {
          bg: "#0a0a0c",
          panel: "#111114",
          line: "#1c1c22",
          ink: "#e8e8ee",
          mute: "#7a7a85",
          red: "#ff2d4a",
          pink: "#ff5577",
          orange: "#ff7a2d",
          glow: "#ff3355",
        },
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "monospace"],
        display: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 24px 0 rgba(255, 51, 85, 0.55), 0 0 4px 0 rgba(255, 122, 45, 0.5)",
        glowSoft: "0 0 18px 0 rgba(255, 51, 85, 0.35)",
      },
      animation: {
        pulseGlow: "pulseGlow 2.6s ease-in-out infinite",
        scan: "scan 6s linear infinite",
        flicker: "flicker 4s steps(20, end) infinite",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { opacity: "1", filter: "drop-shadow(0 0 6px #ff3355)" },
          "50%": { opacity: "0.6", filter: "drop-shadow(0 0 14px #ff7a2d)" },
        },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        flicker: {
          "0%, 100%": { opacity: "1" },
          "47%": { opacity: "1" },
          "48%": { opacity: "0.4" },
          "49%": { opacity: "1" },
          "78%": { opacity: "1" },
          "79%": { opacity: "0.6" },
          "80%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
