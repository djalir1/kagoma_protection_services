import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Briefcase, Building2, GraduationCap, Loader2, MailCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { AuthShell } from "@/components/app/auth-shell";
import { Field, inputClass } from "@/components/app/kit";
import { cn } from "@/lib/utils";

type AccountType = "student" | "employer" | "client";
type Search = { type?: AccountType };

export const Route = createFileRoute("/signup")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    type: s.type === "employer" || s.type === "client" || s.type === "student" ? s.type : undefined,
  }),
  head: () => ({ meta: [{ title: "Create an account — KAGOMA" }] }),
  component: SignupPage,
});

const types: { value: AccountType; icon: typeof GraduationCap; title: string; desc: string }[] = [
  {
    value: "student",
    icon: GraduationCap,
    title: "Learner",
    desc: "Study courses and earn certificates",
  },
  {
    value: "employer",
    icon: Building2,
    title: "Employer",
    desc: "Hire certified security professionals",
  },
  {
    value: "client",
    icon: Briefcase,
    title: "Client",
    desc: "Request security for your event or site",
  },
];

function SignupPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [type, setType] = useState<AccountType>(search.type ?? "student");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [checkEmail, setCheckEmail] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) ?? "").trim();
    if (v("password") !== v("confirm")) return setError("The two passwords do not match.");
    if (v("password").length < 8) return setError("Use at least 8 characters for your password.");
    setBusy(true);
    setError("");
    const first = v("first_name");
    const last = v("last_name");
    const meta =
      type === "student"
        ? {
            role: "student",
            first_name: first,
            last_name: last,
            full_name: `${last} ${first}`.trim(),
            phone: v("phone") || null,
            date_of_birth: v("dob") || null,
            gender: v("gender") || null,
            country_code: "RW",
            country_name: v("country") || "Rwanda",
          }
        : { role: type, full_name: v("org"), phone: v("phone") || null };
    const email = v("email");
    const { data, error } = await supabase.auth.signUp({
      email,
      password: v("password"),
      options: { data: meta, emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    setBusy(false);
    if (error) {
      setError(
        /registered/i.test(error.message)
          ? "An account with that email already exists."
          : error.message,
      );
      return;
    }
    if (data.session) navigate({ to: "/dashboard", replace: true });
    else setCheckEmail(email);
  }

  if (checkEmail) {
    return (
      <AuthShell
        title="Check your email"
        subtitle={`We sent a confirmation link to ${checkEmail}.`}
      >
        <div className="flex flex-col items-center rounded-2xl border border-border bg-card p-8 text-center">
          <MailCheck className="h-10 w-10 text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">
            Open the link to activate your account, then sign in. It can take a minute to arrive —
            check your spam folder too.
          </p>
          <Link
            to="/login"
            className="mt-6 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold uppercase tracking-widest text-primary-foreground"
          >
            Go to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="One account for everything you do with Kagoma."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <div className="grid grid-cols-3 gap-2">
        {types.map(({ value, icon: Icon, title, desc }) => (
          <button
            key={value}
            type="button"
            onClick={() => setType(value)}
            className={cn(
              "rounded-xl border p-3 text-left transition",
              type === value
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50",
            )}
          >
            <Icon
              className={cn("h-5 w-5", type === value ? "text-primary" : "text-muted-foreground")}
            />
            <div className="mt-2 text-sm font-semibold">{title}</div>
            <div className="hidden text-[11px] leading-tight text-muted-foreground sm:block">
              {desc}
            </div>
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2" key={type}>
        {type === "student" ? (
          <>
            <Field label="First name" required>
              <input name="first_name" required autoComplete="given-name" className={inputClass} />
            </Field>
            <Field label="Last name" required>
              <input name="last_name" required autoComplete="family-name" className={inputClass} />
            </Field>
            <Field label="Date of birth" hint="You must be 18 to be certified.">
              <input name="dob" type="date" className={inputClass} />
            </Field>
            <Field label="Gender">
              <select name="gender" className={inputClass} defaultValue="">
                <option value="">Prefer not to say</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="undisclosed">Undisclosed</option>
              </select>
            </Field>
            <Field label="Country">
              <input name="country" defaultValue="Rwanda" className={inputClass} />
            </Field>
          </>
        ) : (
          <Field
            label={type === "employer" ? "Company name" : "Organisation or your name"}
            required
            className="sm:col-span-2"
          >
            <input name="org" required autoComplete="organization" className={inputClass} />
          </Field>
        )}
        <Field label="Phone" className={type === "student" ? "" : "sm:col-span-2"}>
          <input
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+250 7xx xxx xxx"
            className={inputClass}
          />
        </Field>
        <Field label="Email" required className="sm:col-span-2">
          <input name="email" type="email" required autoComplete="email" className={inputClass} />
        </Field>
        <Field label="Password" required>
          <input
            name="password"
            type="password"
            required
            autoComplete="new-password"
            className={inputClass}
          />
        </Field>
        <Field label="Confirm password" required>
          <input
            name="confirm"
            type="password"
            required
            autoComplete="new-password"
            className={inputClass}
          />
        </Field>
        <p className="text-xs text-muted-foreground sm:col-span-2">
          By creating an account you accept the{" "}
          <Link to="/terms" className="text-primary hover:underline">
            terms
          </Link>{" "}
          and the{" "}
          <Link to="/privacy" className="text-primary hover:underline">
            privacy notice
          </Link>
          .
        </p>
        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive sm:col-span-2">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold uppercase tracking-widest text-primary-foreground transition hover:brightness-110 disabled:opacity-60 sm:col-span-2"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Create account
        </button>
      </form>
    </AuthShell>
  );
}
