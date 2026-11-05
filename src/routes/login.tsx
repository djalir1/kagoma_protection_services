import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, LogIn } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { AuthShell } from "@/components/app/auth-shell";
import { Field, inputClass } from "@/components/app/kit";

type Search = { next?: string };

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    next: typeof s.next === "string" ? s.next : undefined,
  }),
  head: () => ({ meta: [{ title: "Sign in — KAGOMA" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { next } = Route.useSearch();
  const { session, ready } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const target = next && next.startsWith("/") ? next : "/dashboard";

  useEffect(() => {
    if (ready && session) navigate({ to: target, replace: true });
  }, [ready, session, target, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) {
      setError(
        /confirm/i.test(error.message)
          ? "Please confirm your email first — check your inbox for the link."
          : "That email and password do not match an account.",
      );
      return;
    }
    navigate({ to: target, replace: true });
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue to your Kagoma dashboard."
      footer={
        <>
          New to Kagoma?{" "}
          <Link to="/signup" className="font-semibold text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email">
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Password">
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </Field>
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-primary">
            Forgot your password?
          </Link>
        </div>
        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold uppercase tracking-widest text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />} Sign
          in
        </button>
      </form>
    </AuthShell>
  );
}
