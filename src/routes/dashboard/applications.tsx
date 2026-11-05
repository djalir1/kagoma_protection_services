import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { reasonText } from "@/lib/queries";
import { date } from "@/lib/format";
import { EmptyState, Loading, PageHeader, StatusBadge } from "@/components/app/kit";
import { RoleGate, ADMIN } from "@/components/app/role-gate";

export const Route = createFileRoute("/dashboard/applications")({
  component: () => (
    <RoleGate roles={ADMIN}>
      <Applications />
    </RoleGate>
  ),
});

type App = {
  id: string;
  full_name: string;
  vetting: string;
  course_id: string;
  course: string;
  motivation: string | null;
  created_at: string;
  eligibility: { eligible: boolean; reasons: { code: string; course?: string; need?: number }[] };
};

function Applications() {
  const [rows, setRows] = useState<App[] | null>(null);
  const load = useCallback(() => {
    supabase.rpc("admin_applications").then(({ data }) => setRows((data as App[]) ?? []));
  }, []);
  useEffect(load, [load]);

  async function decide(a: App, decision: "approved" | "rejected") {
    const note = decision === "rejected" ? window.prompt("Reason for the learner:") : null;
    if (decision === "rejected" && note === null) return;
    const { data, error } = await supabase.rpc("decide_application", {
      p_application: a.id,
      p_decision: decision,
      p_note: note,
    });
    if (error) return toast.error(error.message);
    const r = data as { ok: boolean; reason?: string };
    if (!r.ok) return toast.error("This learner does not meet the entry requirements yet.");
    toast.success(
      decision === "approved"
        ? `${a.full_name} is enrolled on ${a.course_id}`
        : "Application rejected",
    );
    load();
  }

  if (!rows) return <Loading />;

  return (
    <>
      <PageHeader
        title="Course applications"
        subtitle="Applications that need a decision. Approving enrols the learner straight away."
      />
      {rows.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((a) => (
            <div key={a.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-display text-lg font-bold">{a.full_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {a.course_id} · {a.course}
                  </div>
                  <div className="text-xs text-muted-foreground">Applied {date(a.created_at)}</div>
                </div>
                <StatusBadge status={a.vetting} label={`ID ${a.vetting}`} />
              </div>
              {a.motivation && (
                <p className="mt-3 rounded-lg bg-muted/60 p-3 text-sm">“{a.motivation}”</p>
              )}
              {a.eligibility.eligible ? (
                <p className="mt-3 flex items-center gap-1.5 text-sm text-emerald-500">
                  <CheckCircle2 className="h-4 w-4" /> Meets all entry requirements
                </p>
              ) : (
                <div className="mt-3 flex items-start gap-2 text-sm text-amber-500">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <ul>
                    {a.eligibility.reasons.map((r, i) => (
                      <li key={i}>{reasonText(r)}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => decide(a, "approved")}
                  disabled={!a.eligibility.eligible}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
                >
                  Approve & enrol
                </button>
                <button
                  onClick={() => decide(a, "rejected")}
                  className="rounded-lg border border-destructive/40 px-4 py-2 text-sm text-destructive"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={CheckCircle2}
          title="No applications waiting"
          hint="Learners can also enrol themselves directly from the catalogue."
        />
      )}
    </>
  );
}
