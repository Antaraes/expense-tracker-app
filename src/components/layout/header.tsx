"use client";

import { useRouter } from "next/navigation";
import { authService } from "@/features/auth/services/auth.service";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export function Header({ email }: { email: string }) {
  const router = useRouter();

  async function handleSignOut() {
    await authService.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-6">
      <p className="text-sm text-muted-foreground">
        Signed in as{" "}
        <span className="font-mono text-xs text-foreground">{email}</span>
      </p>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Button variant="outline" size="sm" type="button" onClick={handleSignOut}>
          Sign out
        </Button>
      </div>
    </header>
  );
}
