import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: {
    default: "ChuckHub — Personal Ops Dashboard",
    template: "%s · ChuckHub",
  },
  description:
    "One sidebar, every service. NetworkChuck-inspired homelab + devops command center.",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon.svg" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0c",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-chuck-bg text-chuck-ink">{children}</body>
    </html>
  );
}
