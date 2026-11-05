import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Copy,
  LogIn,
  LogOut,
  Pencil,
  Printer,
  Search,
  UserPlus,
  Link2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { date, rwf, time, titleCase } from "@/lib/format";
import {
  DataList,
  EmptyState,
  Field,
  inputClass,
  Loading,
  PageHeader,
  Panel,
  StatCard,
  StatusBadge,
  Tabs,
} from "@/components/app/kit";
import { RoleGate, STAFF } from "@/components/app/role-gate";
import { Switch } from "@/components/ui/switch";
import type { EventRow } from "./events.index";
import { ROLES } from "./events.index";

export const Route = createFileRoute("/dashboard/events/$eventId")({
  component: () => (
    <RoleGate roles={STAFF}>
      <EventDesk />
    </RoleGate>
  ),
});

type RosterRow = {
  staff_id: string;
  name: string;
  phone: string | null;
  role: string;
  status: string;
  place: string | null;
  rate: number | null;
  shift_id: string | null;
  in: string | null;
  out: string | null;
  on_duty: boolean;
  hours: number;
  amount: number;
  edited: boolean;
};
type Offer = {
  id: string;
  pool_id: string;
  name: string;
  phone: string;
  note: string | null;
  pool_status: string;
  roles: string[];
  address: string | null;
  events_worked: number;
  on_roster: boolean;
};
type PoolRow = {
  id: string;
  name: string;
  phone: string;
  roles: string[];
  address: string | null;
  years: number | null;
  status: string;
  events_worked: number;
  certificates: number;
};
type ManifestRow = {
  no: number;
  names: string;
  id_number: string | null;
  phone: string;
  province: string | null;
  district: string | null;
  sector: string | null;
  cell: string | null;
  village: string | null;
  role: string;
  complete: boolean;
};

function EventDesk() {
  const { eventId } = Route.useParams();
  const [ev, setEv] = useState<EventRow | null>(null);
  const [roster, setRoster] = useState<RosterRow[] | null>(null);
  const [tab, setTab] = useState<"roster" | "offers" | "pool" | "manifest" | "payroll">("roster");
  const [payroll, setPayroll] = useState<{
    people: number;
    shifts: number;
    hours: number;
    total: number;
  } | null>(null);

  const load = useCallback(async () => {
    const [e, r, p] = await Promise.all([
      supabase.from("events").select("*").eq("id", eventId).maybeSingle(),
      supabase.rpc("event_roster", { p_event: eventId }),
      supabase.rpc("event_payroll", { p_event: eventId }),
    ]);
    setEv(e.data as EventRow);
    setRoster((r.data as RosterRow[]) ?? []);
    setPayroll(p.data as typeof payroll);
  }, [eventId]);
  useEffect(() => {
    load();
  }, [load]);

  if (!ev || !roster) return <Loading />;
  const joinUrl =
    typeof window !== "undefined" ? `${window.location.origin}/join/${ev.join_token}` : "";
  const onDuty = roster.filter((r) => r.on_duty).length;

  async function update(patch: Partial<EventRow>) {
    const { error } = await supabase.from("events").update(patch).eq("id", eventId);
    if (error) return toast.error(error.message);
    load();
  }

  async function clock(r: RosterRow) {
    const fn = r.on_duty ? "clock_out" : "clock_in";
    const { data, error } = await supabase.rpc(fn, { p_staff: r.staff_id });
    if (error) return toast.error(error.message);
    const res = data as { ok: boolean; reason?: string; hours?: number; amount?: number };
    if (!res.ok)
      return toast.error(res.reason === "already_in" ? "Already clocked in" : "Not clocked in");
    toast.success(
      r.on_duty ? `${r.name} out · ${res.hours} h · ${rwf(res.amount)}` : `${r.name} clocked in`,
    );
    load();
  }

  async function adjust(r: RosterRow) {
    if (!r.shift_id) return;
    const h = window.prompt(`Hours for ${r.name} (leave empty to use the clock):`, String(r.hours));
    if (h === null) return;
    const note = window.prompt("Reason for the change:") ?? null;
    const { error } = await supabase.rpc("adjust_shift", {
      p_shift: r.shift_id,
      p_hours: h === "" ? null : Number(h),
      p_amount: null,
      p_note: note,
    });
    if (error) return toast.error(error.message);
    load();
  }

  async function addWalkIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const { error } = await supabase.from("event_staff").insert({
      event_id: eventId,
      full_name: String(f.get("name")).trim(),
      phone: String(f.get("phone")).trim(),
      national_id: String(f.get("nid")).trim() || null,
      role: String(f.get("role")),
    });
    if (error)
      return toast.error(
        error.code === "23505" ? "That phone number is already on the roster." : error.message,
      );
    e.currentTarget.reset();
    load();
  }

  return (
    <>
      <Link
        to="/dashboard/events"
        className="no-print mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> All events
      </Link>
      <PageHeader
        eyebrow={`Event ${ev.code}`}
        title={ev.name}
        subtitle={`${ev.client_name ?? ""} · ${ev.venue ?? ""} · ${date(ev.starts_on, { weekday: "long", day: "numeric", month: "long" })}${ev.call_time ? ` · call ${ev.call_time.slice(0, 5)}` : ""}`}
        actions={
          <select
            value={ev.status}
            onChange={(e) => update({ status: e.target.value })}
            className={`${inputClass} no-print w-40`}
          >
            {["planned", "open", "running", "closed", "cancelled"].map((s) => (
              <option key={s} value={s}>
                {titleCase(s)}
              </option>
            ))}
          </select>
        }
      />

      <div className="no-print grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="On roster"
          value={`${roster.length}${ev.staff_needed ? ` / ${ev.staff_needed}` : ""}`}
        />
        <StatCard label="On duty now" value={onDuty} tone={onDuty ? "gold" : "default"} />
        <StatCard label="Hours logged" value={payroll?.hours ?? 0} />
        <StatCard label="Payroll" value={rwf(payroll?.total ?? 0)} />
      </div>

      <Panel
        className="no-print mt-6"
        bodyClassName="flex flex-col gap-4 md:flex-row md:items-center"
      >
        <div className="flex items-center gap-3">
          <Switch
            checked={ev.publish}
            onCheckedChange={(v) =>
              update({ publish: v, status: v && ev.status === "planned" ? "open" : ev.status })
            }
          />
          <div className="text-sm">
            <div className="font-semibold">Open shift</div>
            <div className="text-xs text-muted-foreground">
              Listed on the Careers page for the talent pool
            </div>
          </div>
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-sm">
          <Link2 className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate font-mono text-xs">{joinUrl}</span>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(joinUrl);
              toast.success("Sign-up link copied — share it with workers on the day");
            }}
            className="ml-auto shrink-0 rounded-md p-1 hover:bg-background"
            aria-label="Copy link"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
        <span className="text-xs text-muted-foreground">
          Workers open this link to register themselves (event must be Open or Running).
        </span>
      </Panel>

      <div className="no-print mt-6">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: "roster", label: "Roster & clock", count: roster.length },
            { value: "offers", label: "Offers" },
            { value: "pool", label: "Add from pool" },
            { value: "manifest", label: "Manifest" },
            { value: "payroll", label: "Payroll" },
          ]}
        />
      </div>

      {tab === "roster" && (
        <>
          <Panel bodyClassName="p-0 md:p-2">
            <DataList
              rows={roster}
              rowKey={(r) => r.staff_id}
              empty={
                <div className="p-5">
                  <EmptyState
                    title="Nobody on the roster yet"
                    hint="Add people from the talent pool, accept offers, or share the sign-up link."
                  />
                </div>
              }
              columns={[
                {
                  key: "n",
                  label: "Name",
                  render: (r) => (
                    <div>
                      <div className="font-semibold">{r.name}</div>
                      <div className="text-xs text-muted-foreground">{r.phone}</div>
                    </div>
                  ),
                },
                { key: "r", label: "Role", render: (r) => r.role },
                { key: "i", label: "In", render: (r) => time(r.in) },
                { key: "o", label: "Out", render: (r) => time(r.out) },
                {
                  key: "h",
                  label: "Hours",
                  render: (r) => (
                    <span>
                      {r.hours}
                      {r.edited && <span className="ml-1 text-xs text-amber-500">edited</span>}
                    </span>
                  ),
                },
                { key: "a", label: "Pay", render: (r) => rwf(r.amount), hideOnMobile: true },
                {
                  key: "x",
                  label: "",
                  className: "text-right",
                  render: (r) => (
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => clock(r)}
                        className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold ${r.on_duty ? "border border-destructive/40 text-destructive" : "bg-primary text-primary-foreground"}`}
                      >
                        {r.on_duty ? (
                          <LogOut className="h-3.5 w-3.5" />
                        ) : (
                          <LogIn className="h-3.5 w-3.5" />
                        )}{" "}
                        {r.on_duty ? "Clock out" : "Clock in"}
                      </button>
                      {r.shift_id && (
                        <button
                          onClick={() => adjust(r)}
                          className="rounded-lg border border-border p-1.5"
                          aria-label="Adjust hours"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </Panel>
          <Panel title="Add a walk-in" className="mt-6">
            <form onSubmit={addWalkIn} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Field label="Full name" required>
                <input name="name" required className={inputClass} />
              </Field>
              <Field label="Phone" required>
                <input name="phone" required className={inputClass} />
              </Field>
              <Field label="National ID">
                <input name="nid" className={inputClass} />
              </Field>
              <Field label="Role">
                <select name="role" className={inputClass}>
                  {ROLES.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </Field>
              <button className="inline-flex items-center justify-center gap-2 self-end rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
                <UserPlus className="h-4 w-4" /> Add
              </button>
            </form>
          </Panel>
        </>
      )}
      {tab === "offers" && <Offers eventId={eventId} onAdded={load} />}
      {tab === "pool" && <PoolSearch eventId={eventId} onAdded={load} />}
      {tab === "manifest" && <Manifest eventId={eventId} ev={ev} />}
      {tab === "payroll" && (
        <Panel
          title="Payroll"
          bodyClassName="p-0 md:p-2"
          actions={
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs"
            >
              <Printer className="h-3.5 w-3.5" /> Print
            </button>
          }
        >
          <DataList
            rows={roster.filter((r) => r.shift_id)}
            rowKey={(r) => r.staff_id}
            empty={
              <div className="p-5">
                <EmptyState title="No shifts recorded yet" />
              </div>
            }
            columns={[
              { key: "n", label: "Name", render: (r) => r.name },
              { key: "p", label: "Phone", render: (r) => r.phone },
              { key: "r", label: "Rate", render: (r) => (r.rate ? `${rwf(r.rate)}/h` : "—") },
              { key: "h", label: "Hours", render: (r) => r.hours },
              {
                key: "a",
                label: "Amount",
                render: (r) => <span className="font-semibold">{rwf(r.amount)}</span>,
              },
            ]}
          />
          <div className="flex justify-end gap-6 border-t border-border p-4 text-sm">
            <span>
              {payroll?.people} people · {payroll?.shifts} shifts · {payroll?.hours} h
            </span>
            <span className="font-display text-lg font-bold">{rwf(payroll?.total ?? 0)}</span>
          </div>
        </Panel>
      )}
    </>
  );
}

function Offers({ eventId, onAdded }: { eventId: string; onAdded: () => void }) {
  const [rows, setRows] = useState<Offer[] | null>(null);
  const load = useCallback(() => {
    supabase
      .rpc("event_offers", { p_event: eventId })
      .then(({ data }) => setRows((data as Offer[]) ?? []));
  }, [eventId]);
  useEffect(load, [load]);
  if (!rows) return <Loading />;
  return (
    <Panel bodyClassName="p-0 md:p-2" title="People who offered to work this event">
      <DataList
        rows={rows}
        rowKey={(r) => r.id}
        empty={
          <div className="p-5">
            <EmptyState
              title="No offers yet"
              hint="Publish the event as an open shift so the talent pool can offer."
            />
          </div>
        }
        columns={[
          {
            key: "n",
            label: "Name",
            render: (r) => (
              <div>
                <div className="font-semibold">{r.name}</div>
                <div className="text-xs text-muted-foreground">{r.phone}</div>
              </div>
            ),
          },
          {
            key: "r",
            label: "Roles",
            render: (r) => r.roles?.join(", ") || "—",
            hideOnMobile: true,
          },
          { key: "w", label: "Events worked", render: (r) => r.events_worked },
          { key: "s", label: "Screening", render: (r) => <StatusBadge status={r.pool_status} /> },
          {
            key: "x",
            label: "",
            className: "text-right",
            render: (r) =>
              r.on_roster ? (
                <span className="text-xs text-emerald-500">On roster</span>
              ) : (
                <CallButton
                  eventId={eventId}
                  poolId={r.pool_id}
                  onDone={() => {
                    load();
                    onAdded();
                  }}
                  disabled={!["approved", "standby"].includes(r.pool_status)}
                />
              ),
          },
        ]}
      />
    </Panel>
  );
}

function CallButton({
  eventId,
  poolId,
  onDone,
  disabled,
}: {
  eventId: string;
  poolId: string;
  onDone: () => void;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy || disabled}
      title={disabled ? "Screen and approve this person in the talent pool first" : undefined}
      onClick={async () => {
        setBusy(true);
        const { data, error } = await supabase.rpc("call_to_event", {
          p_event: eventId,
          p_pool_id: poolId,
          p_role: null,
        });
        setBusy(false);
        const r = data as { ok: boolean; reason?: string; name?: string } | null;
        if (error || !r?.ok)
          return toast.error(
            r?.reason === "not_approved"
              ? "Approve this person in the talent pool first."
              : (error?.message ?? "Could not add"),
          );
        toast.success(`${r.name} added to the roster`);
        onDone();
      }}
      className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-40"
    >
      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}{" "}
      Add to roster
    </button>
  );
}

function PoolSearch({ eventId, onAdded }: { eventId: string; onAdded: () => void }) {
  const [rows, setRows] = useState<PoolRow[] | null>(null);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const run = useCallback(() => {
    supabase
      .rpc("search_pool", {
        p_role: role || null,
        p_district: null,
        p_status: "approved",
        p_query: q || null,
      })
      .then(({ data }) => setRows((data as PoolRow[]) ?? []));
  }, [q, role]);
  useEffect(run, [run]);
  return (
    <Panel
      title="Approved people in the talent pool"
      bodyClassName="p-0 md:p-2"
      actions={
        <div className="flex gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name, phone, ID"
              className={`${inputClass} w-44 py-1.5 pl-8 text-xs`}
            />
          </div>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className={`${inputClass} w-36 py-1.5 text-xs`}
          >
            <option value="">Any role</option>
            {ROLES.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </div>
      }
    >
      {!rows ? (
        <Loading />
      ) : (
        <DataList
          rows={rows}
          rowKey={(r) => r.id}
          empty={
            <div className="p-5">
              <EmptyState
                title="Nobody matches"
                hint="Only approved pool members can be called to an event."
              />
            </div>
          }
          columns={[
            {
              key: "n",
              label: "Name",
              render: (r) => (
                <div>
                  <div className="font-semibold">{r.name}</div>
                  <div className="text-xs text-muted-foreground">{r.phone}</div>
                </div>
              ),
            },
            { key: "r", label: "Roles", render: (r) => r.roles?.join(", ") || "—" },
            { key: "a", label: "Area", render: (r) => r.address ?? "—", hideOnMobile: true },
            { key: "w", label: "Worked", render: (r) => `${r.events_worked} events` },
            {
              key: "x",
              label: "",
              className: "text-right",
              render: (r) => <CallButton eventId={eventId} poolId={r.id} onDone={onAdded} />,
            },
          ]}
        />
      )}
    </Panel>
  );
}

function Manifest({ eventId, ev }: { eventId: string; ev: EventRow }) {
  const [rows, setRows] = useState<ManifestRow[] | null>(null);
  useEffect(() => {
    supabase
      .rpc("event_manifest", { p_event: eventId })
      .then(({ data }) => setRows((data as ManifestRow[]) ?? []));
  }, [eventId]);
  if (!rows) return <Loading />;
  const incomplete = rows.filter((r) => !r.complete).length;
  return (
    <Panel
      title={`Staff manifest — ${ev.name}, ${date(ev.starts_on)}`}
      actions={
        <button
          onClick={() => window.print()}
          className="no-print inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs"
        >
          <Printer className="h-3.5 w-3.5" /> Print
        </button>
      }
      className="print-sheet"
    >
      {incomplete > 0 && (
        <p className="no-print mb-3 text-sm text-amber-500">
          {incomplete} person(s) have an incomplete ID or address.
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-left uppercase tracking-wider text-muted-foreground">
              {[
                "No",
                "Names",
                "ID number",
                "Phone",
                "Province",
                "District",
                "Sector",
                "Cell",
                "Village",
                "Role",
              ].map((h) => (
                <th key={h} className="px-2 py-2">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.no}
                className={`border-b border-border/60 ${r.complete ? "" : "bg-amber-500/5"}`}
              >
                <td className="px-2 py-1.5">{r.no}</td>
                <td className="px-2 py-1.5 font-semibold">{r.names}</td>
                <td className="px-2 py-1.5 font-mono">{r.id_number}</td>
                <td className="px-2 py-1.5">{r.phone}</td>
                <td className="px-2 py-1.5">{r.province}</td>
                <td className="px-2 py-1.5">{r.district}</td>
                <td className="px-2 py-1.5">{r.sector}</td>
                <td className="px-2 py-1.5">{r.cell}</td>
                <td className="px-2 py-1.5">{r.village}</td>
                <td className="px-2 py-1.5">{r.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <EmptyState title="The roster is empty" />}
      </div>
    </Panel>
  );
}
