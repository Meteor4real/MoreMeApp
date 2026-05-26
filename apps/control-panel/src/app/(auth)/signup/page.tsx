import { redirect } from "next/navigation";
import { getCurrentAccount } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";
import { Logo } from "@/components/Logo";
import Link from "next/link";

export default async function SignupPage() {
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
            Create your <span className="chuck-glow-text">command center</span>
          </h1>
        </div>
      </div>

      <p className="mt-3 font-mono text-xs text-chuck-mute">
        One sidebar, every service. Tokens encrypted at rest, sessions stored in Postgres.
      </p>

      <div className="mt-6">
        <AuthForm mode="signup" />
      </div>

      <p className="mt-6 text-center font-mono text-xs text-chuck-mute">
        Already have an account?{" "}
        <Link className="chuck-glow-text" href="/login">
          Sign in
        </Link>
      </p>
      <span className="chuck-strip absolute inset-x-0 bottom-0" />
    </div>
  );
}
