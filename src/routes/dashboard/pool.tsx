import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { date, titleCase } from "@/lib/format";
import {
  DataList,
  EmptyState,
  inputClass,
  Loading,
  PageHeader,
  Panel,
  StatCard,
  StatusBadge,
} from "@/components/app/kit";
import { RoleGate, STAFF } from "@/components/app/role-gate";
import { ROLES } from "./events.index";

export const Route = createFileRoute("/dashboard/pool")({
  component: () => (
    <RoleGate roles={STAFF}>
      <Pool />
    </RoleGate>
  ),
});

type Row = {
  id: string;
  name: string;
  phone: string;
  national_id: string | null;
  address: string | null;
  roles: string[];
  years: number | null;
  experience: string | null;
  status: string;
  weekends: boolean;
  nights: boolean;
  transport: boolean;
  events_worked: number;
  last_worked: string | null;
  certificates: number;
};

function Pool() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [sum, setSum] = useState<{
    total: number;
    new: number;
    approved: number;
    worked: number;
  } | null>(null);
  const [status, setStatus] = useState("new");
  const [role, setRole] = useState("");
  const [q, setQ] = useState("");

  const load = useCallback(() => {
    supabase.rpc("pool_summary").then(({ data }) => setSum(data as typeof sum));
    supabase
      .rpc("search_pool", {
        p_role: role || null,
        p_district: null,
        p_status: status || null,
        p_query: q || null,
      })
      .then(({ data }) => setRows((data as Row[]) ?? []));
  }, [status, role, q]);
  useEffect(load, [load]);

  async function screen(r: Row, s: string) {
    const note = s === "rejected" ? window.prompt("Reason (staff only):") : null;
    if (s === "rejected" && note === null) return;
    const { error } = await supabase.rpc("screen_pool_entry", {
      p_id: r.id,
      p_status: s,
      p_note: note,
    });
    if (error) return toast.error(error.message);
    toast.success(`${r.name}: ${titleCase(s)}`);
    load();
  }

  return (
    <>
      <PageHeader
        title="Talent pool"
        subtitle="Casual event workers who applied through the Careers page. Approve them before calling them to an event."
      />
      {sum && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="In the pool" value={sum.total} icon={UsersRound} />
          <StatCard
            label="To screen"
            value={sum.new}
            tone={sum.new ? "red" : "default"}
            onClick={() => setStatus("new")}
          />
          <StatCard label="Approved" value={sum.approved} onClick={() => setStatus("approved")} />
          <StatCard label="Have worked an event" value={sum.worked} />
        </div>
      )}
      <div className="mb-4 flex flex-col gap-3 md:flex-row">
        <div className="relative md:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name, phone or ID"
            className={`${inputClass} pl-9`}
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={`${inputClass} md:w-44`}
        >
          <option value="">Any status</option>
          {["new", "screened", "approved", "standby", "rejected", "inactive"].map((s) => (
            <option key={s} value={s}>
              {titleCase(s)}
            </option>
          ))}
        </select>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className={`${inputClass} md:w-44`}
        >
          <option value="">Any role</option>
          {ROLES.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </div>
      <Panel bodyClassName="p-0 md:p-2">
        {!rows ? (
          <Loading />
        ) : (
          <DataList
            rows={rows}
            rowKey={(r) => r.id}
            empty={
              <div className="p-5">
                <EmptyState icon={UsersRound} title="Nobody here" />
              </div>
            }
            columns={[
              {
                key: "n",
                label: "Name",
                render: (r) => (
                  <div>
                    <div className="font-semibold">{r.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.phone}
                      {r.national_id ? ` · ${r.national_id}` : ""}
                    </div>
                  </div>
                ),
              },
              {
                key: "r",
                label: "Roles",
                render: (r) => (
                  <div className="max-w-48 text-xs">
                    {r.roles?.join(", ") || "—"}
                    {r.years ? ` · ${r.years} yrs` : ""}
                  </div>
                ),
              },
              {
                key: "a",
                label: "Area",
                render: (r) => <span className="text-xs">{r.address ?? "—"}</span>,
                hideOnMobile: true,
              },
              {
                key: "av",
                label: "Availability",
                render: (r) => (
                  <span className="text-xs">
                    {[
                      r.weekends && "weekends",
                      r.nights && "nights",
                      r.transport && "own transport",
                    ]
                      .filter(Boolean)
                      .join(" · ") || "weekdays"}
                  </span>
                ),
                hideOnMobile: true,
              },
              {
                key: "w",
                label: "Worked",
                render: (r) => (
                  <span className="text-xs">
                    {r.events_worked} {r.last_worked ? `· last ${date(r.last_worked)}` : ""}
                  </span>
                ),
              },
              { key: "s", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
              {
                key: "x",
                label: "",
                className: "text-right",
                render: (r) => (
                  <div className="flex justify-end gap-1">
                    {r.status !== "approved" && (
                      <button
                        onClick={() => screen(r, "approved")}
                        className="rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground"
                      >
                        Approve
                      </button>
                    )}
                    {r.status !== "standby" && (
                      <button
                        onClick={() => screen(r, "standby")}
                        className="rounded-md border border-border px-2.5 py-1 text-xs"
                      >
                        Standby
                      </button>
                    )}
                    {r.status !== "rejected" && (
                      <button
                        onClick={() => screen(r, "rejected")}
                        className="rounded-md border border-destructive/40 px-2.5 py-1 text-xs text-destructive"
                      >
                        Reject
                      </button>
                    )}
                  </div>
                ),
              },
            ]}
          />
        )}
      </Panel>
    </>
  );
}
