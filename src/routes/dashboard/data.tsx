import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/app/kit";
import { RoleGate, ADMIN } from "@/components/app/role-gate";
import { DataExplorer } from "@/components/app/data-explorer";

export const Route = createFileRoute("/dashboard/data")({
  component: () => (
    <RoleGate roles={ADMIN}>
      <PageHeader
        title="Data explorer"
        subtitle="Every table in the Kagoma database, with full create, edit and delete."
      />
      <div className="mb-5 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        This writes straight to the database. For daily work use the desks (vetting, payments,
        certificates) — they run the business rules, issue certificates automatically and keep the
        audit trail.
      </div>
      <DataExplorer />
    </RoleGate>
  ),
});
