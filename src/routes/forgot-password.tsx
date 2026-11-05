import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, MailCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { AuthShell } from "@/components/app/auth-shell";
import { Field, inputClass } from "@/components/app/kit";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset your password — KAGOMA" }] }),
  component: ForgotPage,
});

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="We'll email you a link to choose a new one."
      footer={
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <div className="flex flex-col items-center rounded-2xl border border-border bg-card p-8 text-center">
          <MailCheck className="h-10 w-10 text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">
            If an account exists for {email}, a reset link is on its way.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="Email">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </Field>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold uppercase tracking-widest text-primary-foreground disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Send reset link
          </button>
        </form>
      )}
    </AuthShell>
  );
}
