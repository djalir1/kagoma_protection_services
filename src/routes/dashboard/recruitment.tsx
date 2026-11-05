import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { date } from "@/lib/format";
import {
  DataList,
  EmptyState,
  Field,
  inputClass,
  Loading,
  PageHeader,
  Panel,
  StatusBadge,
} from "@/components/app/kit";
import { RoleGate } from "@/components/app/role-gate";

export const Route = createFileRoute("/dashboard/recruitment")({
  component: () => (
    <RoleGate roles={["employer"]}>
      <Recruitment />
    </RoleGate>
  ),
});

type Req = {
  id: string;
  role_needed: string;
  quantity: number;
  location: string | null;
  start_date: string | null;
  details: string | null;
  status: string;
  created_at: string;
};

function Recruitment() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Req[] | null>(null);
  const [show, setShow] = useState(false);

  const load = useCallback(() => {
    if (!user) return;
    supabase
      .from("employer_requests")
      .select("*")
      .eq("employer_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setRows((data as Req[]) ?? []));
  }, [user]);
  useEffect(load, [load]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) ?? "").trim() || null;
    const { error } = await supabase.from("employer_requests").insert({
      employer_id: user!.id,
      role_needed: v("role"),
      quantity: Number(f.get("quantity") || 1),
      location: v("location"),
      start_date: v("start"),
      details: v("details"),
    });
    if (error) return toast.error(error.message);
    toast.success("Request sent to Kagoma");
    setShow(false);
    load();
  }

  if (!rows) return <Loading />;

  return (
    <>
      <PageHeader
        title="Recruitment requests"
        subtitle="Ask Kagoma to find and supply a team — stewards, officers or supervisors."
        actions={
          <button
            onClick={() => setShow((s) => !s)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="h-4 w-4" /> New request
          </button>
        }
      />
      {show && (
        <Panel title="New recruitment request" className="mb-6">
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Role needed" required className="lg:col-span-2">
              <input
                name="role"
                required
                placeholder="e.g. Event stewards"
                className={inputClass}
              />
            </Field>
            <Field label="How many">
              <input
                name="quantity"
                type="number"
                min={1}
                defaultValue={1}
                className={inputClass}
              />
            </Field>
            <Field label="Start date">
              <input name="start" type="date" className={inputClass} />
            </Field>
            <Field label="Location" className="lg:col-span-2">
              <input name="location" className={inputClass} />
            </Field>
            <Field label="Details" className="sm:col-span-2 lg:col-span-4">
              <textarea
                name="details"
                rows={3}
                className={inputClass}
                placeholder="Shifts, dress code, languages, experience…"
              />
            </Field>
            <button className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground sm:col-span-2 lg:col-span-1">
              Send request
            </button>
          </form>
        </Panel>
      )}
      <Panel bodyClassName="p-0 md:p-2">
        <DataList
          rows={rows}
          rowKey={(r) => r.id}
          empty={
            <div className="p-5">
              <EmptyState icon={Briefcase} title="No requests yet" />
            </div>
          }
          columns={[
            {
              key: "r",
              label: "Role",
              render: (r) => (
                <span className="font-semibold">
                  {r.quantity} × {r.role_needed}
                </span>
              ),
            },
            { key: "l", label: "Location", render: (r) => r.location ?? "—" },
            { key: "s", label: "Start", render: (r) => date(r.start_date) },
            { key: "d", label: "Sent", render: (r) => date(r.created_at), hideOnMobile: true },
            { key: "st", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
          ]}
        />
      </Panel>
    </>
  );
}
