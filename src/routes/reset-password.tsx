import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { AuthShell } from "@/components/app/auth-shell";
import { Field, inputClass } from "@/components/app/kit";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Choose a new password — KAGOMA" }] }),
  component: ResetPage,
});

function ResetPage() {
  const { session, ready } = useAuth();
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return setError("Use at least 8 characters.");
    if (pw !== pw2) return setError("The two passwords do not match.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) setError(error.message);
    else navigate({ to: "/dashboard", replace: true });
  }

  return (
    <AuthShell title="Choose a new password">
      {ready && !session ? (
        <p className="text-sm text-muted-foreground">
          This link has expired or was already used. Request a new one from the sign-in page.
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="New password">
            <input
              type="password"
              required
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Confirm new password">
            <input
              type="password"
              required
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              className={inputClass}
            />
          </Field>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold uppercase tracking-widest text-primary-foreground disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save password
          </button>
        </form>
      )}
    </AuthShell>
  );
}
