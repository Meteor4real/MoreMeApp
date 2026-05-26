import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NetworkChuck Hub — Download",
  description:
    "NetworkChuck Hub — your unified personal-ops command center. Browser, terminal, AI group chat, homelab, and all your apps in one glowing-red desktop app.",
  icons: {
    icon: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
