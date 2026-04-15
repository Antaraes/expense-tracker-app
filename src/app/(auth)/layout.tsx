export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-canvas flex min-h-screen flex-col items-center justify-center p-6">
      <div className="animate-fade-in-up w-full max-w-md">{children}</div>
    </div>
  );
}
