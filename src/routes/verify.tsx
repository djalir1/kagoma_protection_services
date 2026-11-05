import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BadgeCheck, XCircle, Loader2, Search, ShieldCheck, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { date, titleCase } from "@/lib/format";
import { PageHero } from "@/components/page-hero";

type Search = { ref?: string };

export const Route = createFileRoute("/verify")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    ref: typeof s.ref === "string" ? s.ref : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Verify a certificate — KAGOMA" },
      {
        name: "description",
        content: "Check that a Kagoma Protection Services certificate is genuine and valid.",
      },
    ],
  }),
  component: VerifyPage,
});

type Result = {
  found: boolean;
  certificate_number?: string;
  holder?: string;
  course?: string;
  issued?: string;
  expires?: string | null;
  level?: string;
  status?: string;
};

function VerifyPage() {
  const { ref } = Route.useSearch();
  const navigate = useNavigate();
  const [value, setValue] = useState(ref ?? "");
  const [busy, setBusy] = useState(false);
  const [r, setR] = useState<Result | null>(null);

  useEffect(() => {
    if (!ref) return setR(null);
    setValue(ref);
    setBusy(true);
    supabase.rpc("verify_certificate", { p_ref: ref }).then(({ data, error }) => {
      setBusy(false);
      setR(error || !data ? { found: false } : (data as Result));
    });
  }, [ref]);

  const ok = r?.found && r.status === "valid";

  return (
    <>
      <PageHero
        eyebrow="Certificate register"
        title={
          <>
            Check a <span className="text-gradient-gold">Kagoma certificate.</span>
          </>
        }
        subtitle="Every certificate carries a number. Enter it below to see who holds it, for which course, and whether it is still valid."
      />
      <section className="mx-auto max-w-3xl px-4 pb-24 md:px-8">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (value.trim()) navigate({ to: "/verify", search: { ref: value.trim() } });
          }}
          className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="KAGOMA-CERT-2026-000125"
              className="w-full rounded-lg border border-border bg-background/60 py-3 pl-9 pr-3 font-mono text-sm outline-none focus:border-primary"
            />
          </div>
          <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-bold uppercase tracking-widest text-primary-foreground">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Check
          </button>
        </form>

        {r && !busy && (
          <div
            className={`mt-6 rounded-2xl border p-6 ${ok ? "border-emerald-500/40 bg-emerald-500/5" : "border-destructive/40 bg-destructive/5"}`}
          >
            {r.found ? (
              <>
                <div className="flex items-center gap-3">
                  {ok ? (
                    <BadgeCheck className="h-10 w-10 text-emerald-500" />
                  ) : (
                    <XCircle className="h-10 w-10 text-destructive" />
                  )}
                  <div>
                    <div
                      className={`font-display text-xl font-bold ${ok ? "text-emerald-500" : "text-destructive"}`}
                    >
                      {ok ? "Valid certificate" : `This certificate is ${titleCase(r.status)}`}
                    </div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {r.certificate_number}
                    </div>
                  </div>
                </div>
                <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                  {[
                    ["Holder", r.holder],
                    ["Course", r.course],
                    ["Issued", date(r.issued)],
                    ["Level", titleCase(r.level)],
                    ...(r.expires ? [["Valid until", date(r.expires)]] : []),
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-xs uppercase tracking-widest text-muted-foreground">
                        {k}
                      </dt>
                      <dd className="mt-1 font-semibold">{v}</dd>
                    </div>
                  ))}
                </dl>
                <Link
                  to="/certificate/$ref"
                  params={{ ref: r.certificate_number! }}
                  className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
                >
                  View the certificate <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <XCircle className="h-10 w-10 text-destructive" />
                <div>
                  <div className="font-display text-xl font-bold text-destructive">
                    Not on the register
                  </div>
                  <div className="text-sm text-muted-foreground">
                    No Kagoma certificate has the number “{ref}”. Check it was typed exactly as
                    printed.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-10 flex items-start gap-3 rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          Only the holder's name, course, issue date and status are shown. Kagoma never publishes a
          holder's contact details, ID number or exam answers.
        </div>
      </section>
    </>
  );
}
