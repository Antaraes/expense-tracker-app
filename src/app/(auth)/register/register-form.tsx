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

export function RegisterForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setPending(true);
    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });
    setPending(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    setInfo("Check your email to confirm your account, then sign in.");
  }

  return (
    <Card className="w-full max-w-md border-border">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-semibold tracking-tight">
          Create account
        </CardTitle>
        <CardDescription>
          Sign up with email. You will use the same credentials in the desktop app.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reg-email">Email</Label>
            <Input
              id="reg-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reg-password">Password</Label>
            <Input
              id="reg-password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            {pending ? "Creating…" : "Sign up"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/login" className="underline underline-offset-4 hover:text-foreground">
            Already have an account? Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
