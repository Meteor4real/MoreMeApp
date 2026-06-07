import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MoreMe — Download",
  description:
    "MoreMe — a calendar-first personal life OS. Real event model, Get Ahead per class, an Empire dashboard, GTD capture + Weekly Review, and 20 levels you actually earn. Synced. Quiet. Always on.",
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
