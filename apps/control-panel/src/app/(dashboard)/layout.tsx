import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { getCurrentAccount } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const account = await getCurrentAccount();
  if (!account) redirect("/login");

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <span className="chuck-strip absolute inset-x-0 top-0 z-50" />
      <div className="relative z-10 flex h-full w-full">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar account={account} />
          <main className="relative flex-1 overflow-y-auto px-6 py-6 chuck-scan">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
