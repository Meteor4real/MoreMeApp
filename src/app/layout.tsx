import "./globals.css";
import type { Metadata } from "next";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";

export const metadata: Metadata = {
  title: "ChuckHub — Personal Ops Dashboard",
  description:
    "One sidebar, every service. NetworkChuck-inspired homelab + devops command center.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="relative h-screen w-screen overflow-hidden">
        {/* Top accent strip — always visible */}
        <span className="chuck-strip absolute inset-x-0 top-0 z-50" />
        <div className="relative z-10 flex h-full w-full">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar />
            <main className="relative flex-1 overflow-y-auto px-6 py-6 chuck-scan">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
