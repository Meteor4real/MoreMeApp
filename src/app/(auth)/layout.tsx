export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center px-4 py-10">
      <span className="chuck-strip absolute inset-x-0 top-0 z-50" />
      <span className="chuck-strip absolute inset-x-0 bottom-0 z-50" />
      <div className="chuck-scan absolute inset-0 pointer-events-none" />
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  );
}
