import { redirect } from "next/navigation";
import { getCurrentAccount } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";
import { Logo } from "@/components/Logo";
import Link from "next/link";

export default async function LoginPage() {
  if (await getCurrentAccount()) redirect("/");

  return (
    <div className="chuck-panel-hot relative overflow-hidden p-8">
      <div className="flex items-center gap-3">
        <Logo size={40} />
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-chuck-pink">
            // chuckhub
          </div>
          <h1 className="font-display text-2xl font-bold">
            Sign in to <span className="chuck-glow-text">your hub</span>
          </h1>
        </div>
      </div>

      <p className="mt-3 font-mono text-xs text-chuck-mute">
        Postgres-backed sessions · AES-GCM token vault · zero third-party auth.
      </p>

      <div className="mt-6">
        <AuthForm mode="login" />
      </div>

      <p className="mt-6 text-center font-mono text-xs text-chuck-mute">
        No account?{" "}
        <Link className="chuck-glow-text" href="/signup">
          Create one
        </Link>
      </p>
      <span className="chuck-strip absolute inset-x-0 bottom-0" />
    </div>
  );
}
