import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Award, ExternalLink, AlertTriangle, CheckCircle2, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import {
  fetchClaims,
  fetchMyCertificates,
  reasonText,
  type Certificate,
  type CertificateClaim,
} from "@/lib/queries";
import { date, rwf } from "@/lib/format";
import {
  DataList,
  EmptyState,
  inputClass,
  Loading,
  PageHeader,
  Panel,
  StatusBadge,
  Tabs,
} from "@/components/app/kit";
import { PaymentInstructions, SubmitPaymentForm } from "@/components/app/pay-box";
import { RoleGate } from "@/components/app/role-gate";

export const Route = createFileRoute("/dashboard/certificates")({
  component: CertificatesPage,
});

function CertificatesPage() {
  const { profile } = useAuth();
  if (profile?.role === "admin") return <AdminCertificates />;
  return (
    <RoleGate roles={["student", "professional"]}>
      <LearnerCertificates />
    </RoleGate>
  );
}

function LearnerCertificates() {
  const { user } = useAuth();
  const [certs, setCerts] = useState<Certificate[] | null>(null);
  const [claims, setClaims] = useState<CertificateClaim[]>([]);
  const [paying, setPaying] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!user) return;
    Promise.all([fetchMyCertificates(user.id), fetchClaims()]).then(([c, cl]) => {
      setCerts(c);
      setClaims(cl.filter((x) => !x.issued));
    });
  }, [user]);
  useEffect(load, [load]);

  if (!certs) return <Loading />;

  return (
    <>
      <PageHeader
        title="Certificates"
        subtitle="Each certificate has a number anyone can check on the Kagoma register."
      />

      {claims.length > 0 && (
        <div className="mb-6 space-y-4">
          {claims.map((c) => {
            const owed = Math.max(0, c.fee - c.paid - c.pending);
            const blocked = !c.blocked.eligible;
            return (
              <Panel
                key={c.course_id}
                title={c.course}
                actions={
                  <span className="text-sm text-muted-foreground">Final exam: {c.score}%</span>
                }
              >
                {blocked && (
                  <div className="mb-4 flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-sm">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <div>
                      Before this certificate can be issued:
                      <ul className="mt-1 list-disc pl-5">
                        {c.blocked.reasons.map((r, i) => (
                          <li key={i}>{reasonText(r)}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-3">
                  <Mini label="Certificate fee" value={rwf(c.fee)} />
                  <Mini label="Confirmed" value={rwf(c.paid)} />
                  <Mini label="Awaiting confirmation" value={rwf(c.pending)} />
                </div>
                {owed > 0 && !blocked ? (
                  <div className="mt-5">
                    <div className="mb-3 text-sm font-semibold">
                      Pay {rwf(owed)} to receive your certificate
                    </div>
                    <PaymentInstructions amount={owed} />
                    {paying === c.course_id ? (
                      <SubmitPaymentForm
                        courseId={c.course_id}
                        amount={owed}
                        onDone={() => {
                          setPaying(null);
                          load();
                        }}
                      />
                    ) : (
                      <button
                        onClick={() => setPaying(c.course_id)}
                        className="mt-4 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
                      >
                        I have paid — enter the transaction ID
                      </button>
                    )}
                  </div>
                ) : (
                  c.pending > 0 && (
                    <p className="mt-4 text-sm text-muted-foreground">
                      Kagoma is confirming your payment. The certificate is issued automatically
                      once it is confirmed.
                    </p>
                  )
                )}
              </Panel>
            );
          })}
        </div>
      )}

      {certs.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {certs.map((c) => (
            <div
              key={c.id}
              className="relative overflow-hidden rounded-2xl border border-border bg-card p-6"
            >
              <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-primary/10 blur-2xl" />
              <div className="relative flex items-start gap-4">
                <Award className="h-10 w-10 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {c.certificate_number}
                    </span>
                    <StatusBadge status={c.status} />
                  </div>
                  <h3 className="mt-1 font-display text-lg font-bold leading-tight">
                    {c.course_name}
                  </h3>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Issued {date(c.issue_date)}
                    {c.final_score ? ` · score ${c.final_score}%` : ""}
                  </div>
                  <Link
                    to="/certificate/$ref"
                    params={{ ref: c.certificate_number }}
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
                  >
                    View & print <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        !claims.length && (
          <EmptyState
            icon={Award}
            title="No certificates yet"
            hint="Pass a course's final exam (70%) to claim its certificate."
            action={
              <Link
                to="/dashboard/learning"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                Go to my courses
              </Link>
            }
          />
        )
      )}
    </>
  );
}

const Mini = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl bg-muted/50 p-3">
    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className="mt-1 font-semibold">{value}</div>
  </div>
);

type Eligible = {
  student_id: string;
  full_name: string;
  course_id: string;
  course_title: string;
  progress: number;
  best_score: number | null;
  already: boolean;
};
type RegisterRow = {
  id: string;
  certificate_number: string;
  student_name: string;
  course_name: string;
  issue_date: string;
  status: string;
  level: string;
  final_score: number | null;
};

function AdminCertificates() {
  const [tab, setTab] = useState<"issue" | "register">("issue");
  const [eligible, setEligible] = useState<Eligible[] | null>(null);
  const [register, setRegister] = useState<RegisterRow[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [e, r] = await Promise.all([
      supabase.rpc("admin_eligible", { p_course: null }),
      supabase.rpc("admin_certificates", { p_limit: 200 }),
    ]);
    setEligible(((e.data as Eligible[]) ?? []).filter((x) => !x.already));
    setRegister((r.data as RegisterRow[]) ?? []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () =>
      register.filter(
        (r) =>
          !q ||
          `${r.certificate_number} ${r.student_name} ${r.course_name}`
            .toLowerCase()
            .includes(q.toLowerCase()),
      ),
    [register, q],
  );

  async function issue(e: Eligible) {
    setBusy(e.student_id + e.course_id);
    const { data, error } = await supabase.rpc("issue_certificate", {
      p_student: e.student_id,
      p_course: e.course_id,
      p_level: "certified",
      p_expiry: null,
    });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`Issued ${(data as { certificate_number: string }).certificate_number}`);
    load();
  }

  async function setStatus(r: RegisterRow, status: string) {
    let reason: string | null = null;
    if (status !== "valid") {
      reason = window.prompt(
        `Reason for ${status === "revoked" ? "revoking" : "suspending"} ${r.certificate_number}?`,
      );
      if (!reason) return;
    }
    const { error } = await supabase.rpc("set_certificate_status", {
      p_cert: r.id,
      p_status: status,
      p_reason: reason,
    });
    if (error) return toast.error(error.message);
    toast.success("Certificate updated");
    load();
  }

  if (!eligible) return <Loading />;

  return (
    <>
      <PageHeader
        title="Certificates"
        subtitle="Issue certificates by hand and manage the public register. Every change is audited."
      />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: "issue", label: "Ready to issue", count: eligible.length },
          { value: "register", label: "Register", count: register.length },
        ]}
      />
      {tab === "issue" ? (
        <Panel bodyClassName="p-0 md:p-2">
          <DataList
            rows={eligible}
            rowKey={(r) => r.student_id + r.course_id}
            empty={
              <div className="p-5">
                <EmptyState
                  icon={CheckCircle2}
                  title="Nobody is waiting"
                  hint="Learners who pass a final exam appear here if their certificate was not issued automatically (for example, unpaid fee or missing practical)."
                />
              </div>
            }
            columns={[
              {
                key: "n",
                label: "Learner",
                render: (r) => <span className="font-semibold">{r.full_name}</span>,
              },
              { key: "c", label: "Course", render: (r) => `${r.course_id} · ${r.course_title}` },
              {
                key: "s",
                label: "Best final",
                render: (r) => (r.best_score !== null ? `${r.best_score}%` : "—"),
              },
              {
                key: "a",
                label: "",
                className: "text-right",
                render: (r) => (
                  <button
                    onClick={() => issue(r)}
                    disabled={busy === r.student_id + r.course_id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                  >
                    {busy === r.student_id + r.course_id && (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    )}{" "}
                    Issue
                  </button>
                ),
              },
            ]}
          />
        </Panel>
      ) : (
        <Panel
          bodyClassName="p-0 md:p-2"
          actions={
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search…"
                className={`${inputClass} w-56 py-1.5 pl-9`}
              />
            </div>
          }
          title="Issued certificates"
        >
          <DataList
            rows={filtered}
            rowKey={(r) => r.id}
            columns={[
              {
                key: "no",
                label: "Number",
                render: (r) => (
                  <Link
                    to="/certificate/$ref"
                    params={{ ref: r.certificate_number }}
                    className="font-mono text-xs text-primary hover:underline"
                  >
                    {r.certificate_number}
                  </Link>
                ),
              },
              { key: "h", label: "Holder", render: (r) => r.student_name },
              { key: "c", label: "Course", render: (r) => r.course_name, hideOnMobile: true },
              { key: "d", label: "Issued", render: (r) => date(r.issue_date) },
              { key: "s", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
              {
                key: "x",
                label: "",
                className: "text-right",
                render: (r) => (
                  <div className="flex justify-end gap-1">
                    {r.status !== "valid" && (
                      <button
                        onClick={() => setStatus(r, "valid")}
                        className="rounded-md border border-border px-2 py-1 text-xs"
                      >
                        Reinstate
                      </button>
                    )}
                    {r.status === "valid" && (
                      <button
                        onClick={() => setStatus(r, "suspended")}
                        className="rounded-md border border-border px-2 py-1 text-xs"
                      >
                        Suspend
                      </button>
                    )}
                    {r.status !== "revoked" && (
                      <button
                        onClick={() => setStatus(r, "revoked")}
                        className="rounded-md border border-destructive/40 px-2 py-1 text-xs text-destructive"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </Panel>
      )}
    </>
  );
}
