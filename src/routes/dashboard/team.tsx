import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { date, titleCase } from "@/lib/format";
import {
  DataList,
  Field,
  inputClass,
  Loading,
  PageHeader,
  Panel,
  StatusBadge,
} from "@/components/app/kit";
import { RoleGate, ADMIN } from "@/components/app/role-gate";

export const Route = createFileRoute("/dashboard/team")({
  component: () => (
    <RoleGate roles={ADMIN}>
      <Team />
    </RoleGate>
  ),
});

type Member = {
  id: string;
  name: string;
  email: string;
  level: string;
  title: string | null;
  since: string | null;
  granted_by: string | null;
  is_you: boolean;
};

const REASON: Record<string, string> = {
  no_account: "There is no Kagoma account with that email. Ask them to sign up first.",
  yourself: "You cannot change your own access.",
  last_admin: "This is the last administrator — give someone else admin access first.",
  bad_level: "Unknown access level.",
};

function Team() {
  const [rows, setRows] = useState<Member[] | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => {
    supabase.rpc("staff_list").then(({ data }) => setRows((data as Member[]) ?? []));
  }, []);
  useEffect(load, [load]);

  async function grant(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    const { data, error } = await supabase.rpc("grant_staff_access", {
      p_email: String(f.get("email")).trim(),
      p_level: String(f.get("level")),
      p_title: String(f.get("title")).trim() || null,
    });
    setBusy(false);
    const r = data as { ok: boolean; reason?: string } | null;
    if (error || !r?.ok)
      return toast.error(REASON[r?.reason ?? ""] ?? error?.message ?? "Could not grant access");
    toast.success("Access granted");
    e.currentTarget.reset();
    load();
  }

  async function revoke(m: Member) {
    if (
      !window.confirm(`Remove ${m.name}'s ${m.level} access? They keep a normal learner account.`)
    )
      return;
    const { data, error } = await supabase.rpc("revoke_staff_access", { p_id: m.id });
    const r = data as { ok: boolean; reason?: string } | null;
    if (error || !r?.ok)
      return toast.error(REASON[r?.reason ?? ""] ?? error?.message ?? "Could not remove access");
    toast.success("Access removed");
    load();
  }

  if (!rows) return <Loading />;

  return (
    <>
      <PageHeader
        title="Team & access"
        subtitle="Staff run events, documents and clients. Administrators also vet learners, confirm payments, manage certificates and settings."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Panel title="People with access" bodyClassName="p-0 md:p-2">
          <DataList
            rows={rows}
            rowKey={(r) => r.id}
            columns={[
              {
                key: "n",
                label: "Name",
                render: (r) => (
                  <div>
                    <div className="font-semibold">
                      {r.name}
                      {r.is_you && <span className="ml-1 text-xs text-primary">(you)</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">{r.email}</div>
                  </div>
                ),
              },
              {
                key: "l",
                label: "Level",
                render: (r) => (
                  <StatusBadge
                    status={r.level === "admin" ? "approved" : "info"}
                    label={titleCase(r.level)}
                  />
                ),
              },
              { key: "t", label: "Title", render: (r) => r.title ?? "—", hideOnMobile: true },
              { key: "s", label: "Since", render: (r) => date(r.since), hideOnMobile: true },
              {
                key: "x",
                label: "",
                className: "text-right",
                render: (r) =>
                  !r.is_you ? (
                    <button
                      onClick={() => revoke(r)}
                      className="rounded-md border border-destructive/40 px-2.5 py-1 text-xs text-destructive"
                    >
                      Remove
                    </button>
                  ) : null,
              },
            ]}
          />
        </Panel>
        <Panel title="Give a colleague access">
          <form onSubmit={grant} className="space-y-3">
            <Field label="Their account email" hint="They must already have a Kagoma account.">
              <input name="email" type="email" required className={inputClass} />
            </Field>
            <Field label="Level">
              <select name="level" className={inputClass}>
                <option value="staff">Staff — events, documents, clients</option>
                <option value="admin">Administrator — everything</option>
              </select>
            </Field>
            <Field label="Job title">
              <input name="title" placeholder="e.g. Operations Supervisor" className={inputClass} />
            </Field>
            <button
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}{" "}
              Grant access
            </button>
          </form>
          <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> Nobody should hold
            more authority than their job needs.
          </p>
        </Panel>
      </div>
    </>
  );
}
