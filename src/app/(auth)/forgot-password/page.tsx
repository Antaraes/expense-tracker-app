"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setPending(true);
    const supabase = createClient();
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo: `${origin}/login` }
    );
    setPending(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setInfo("If an account exists for this email, you will receive a reset link.");
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-md border-border">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Reset password
          </CardTitle>
          <CardDescription>
            We will email you a link to choose a new password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fp-email">Email</Label>
              <Input
                id="fp-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            {info ? (
              <p className="text-sm text-muted-foreground" role="status">
                {info}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Sending…" : "Send reset link"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            <Link href="/login" className="underline underline-offset-4 hover:text-foreground">
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
