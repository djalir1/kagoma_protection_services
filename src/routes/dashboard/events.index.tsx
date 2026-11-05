import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, CalendarDays, MapPin, Users, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { date, rwf } from "@/lib/format";
import {
  EmptyState,
  Field,
  inputClass,
  Loading,
  PageHeader,
  Panel,
  StatusBadge,
  Tabs,
} from "@/components/app/kit";
import { RoleGate, STAFF } from "@/components/app/role-gate";

export const Route = createFileRoute("/dashboard/events/")({
  component: () => (
    <RoleGate roles={STAFF}>
      <Events />
    </RoleGate>
  ),
});

export type EventRow = {
  id: string;
  code: string;
  join_token: string;
  name: string;
  client_name: string | null;
  venue: string | null;
  starts_on: string;
  ends_on: string | null;
  call_time: string | null;
  hourly_rate_rwf: number | null;
  staff_needed: number | null;
  notes: string | null;
  status: string;
  publish: boolean;
  roles_wanted: string[];
  public_note: string | null;
  event_staff?: { count: number }[];
};

export const ROLES = [
  "Steward",
  "Usher",
  "Security Officer",
  "Supervisor",
  "Accreditation",
  "Gate Control",
  "VIP Escort",
  "First Aider",
  "Radio Operator",
];

function Events() {
  const { user } = useAuth();
  const [rows, setRows] = useState<EventRow[] | null>(null);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [show, setShow] = useState(false);

  const load = useCallback(() => {
    supabase
      .from("events")
      .select("*, event_staff(count)")
      .order("starts_on", { ascending: true })
      .then(({ data }) => setRows((data as EventRow[]) ?? []));
  }, []);
  useEffect(load, [load]);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) ?? "").trim() || null;
    const { error } = await supabase.from("events").insert({
      name: v("name"),
      client_name: v("client"),
      venue: v("venue"),
      starts_on: v("starts"),
      ends_on: v("ends"),
      call_time: v("call"),
      hourly_rate_rwf: f.get("rate") ? Number(f.get("rate")) : null,
      staff_needed: f.get("needed") ? Number(f.get("needed")) : null,
      roles_wanted: f.getAll("roles").map(String),
      publish: f.get("publish") === "on",
      public_note: v("public_note"),
      notes: v("notes"),
      status: f.get("publish") === "on" ? "open" : "planned",
      created_by: user?.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Event created");
    setShow(false);
    load();
  }

  if (!rows) return <Loading />;
  const today = new Date().toISOString().slice(0, 10);
  const list =
    tab === "upcoming"
      ? rows.filter((r) => (r.ends_on ?? r.starts_on) >= today)
      : rows.filter((r) => (r.ends_on ?? r.starts_on) < today).reverse();

  return (
    <>
      <PageHeader
        title="Events"
        subtitle="Plan events, build the roster, clock people in at the gate and close the payroll."
        actions={
          <button
            onClick={() => setShow((s) => !s)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="h-4 w-4" /> New event
          </button>
        }
      />
      {show && (
        <Panel title="New event" className="mb-6">
          <form onSubmit={create} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Event name" required className="sm:col-span-2">
              <input name="name" required className={inputClass} />
            </Field>
            <Field label="Client">
              <input name="client" className={inputClass} />
            </Field>
            <Field label="Venue">
              <input name="venue" className={inputClass} />
            </Field>
            <Field label="Starts" required>
              <input name="starts" type="date" required className={inputClass} />
            </Field>
            <Field label="Ends">
              <input name="ends" type="date" className={inputClass} />
            </Field>
            <Field label="Call time">
              <input name="call" type="time" className={inputClass} />
            </Field>
            <Field label="Hourly rate (RWF)">
              <input name="rate" type="number" min={0} className={inputClass} />
            </Field>
            <Field label="Staff needed">
              <input name="needed" type="number" min={1} className={inputClass} />
            </Field>
            <div className="sm:col-span-2 lg:col-span-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Roles wanted
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {ROLES.map((r) => (
                  <label
                    key={r}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/10"
                  >
                    <input
                      type="checkbox"
                      name="roles"
                      value={r}
                      className="accent-[var(--gold)]"
                    />{" "}
                    {r}
                  </label>
                ))}
              </div>
            </div>
            <Field label="Note shown to workers" className="sm:col-span-2">
              <input
                name="public_note"
                className={inputClass}
                placeholder="Dress code, meeting point…"
              />
            </Field>
            <Field label="Internal notes" className="sm:col-span-2">
              <input name="notes" className={inputClass} />
            </Field>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" name="publish" className="accent-[var(--gold)]" /> Publish as
              an open shift so the talent pool can offer to work
            </label>
            <button className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground sm:col-span-2 lg:col-span-1 lg:col-start-4">
              Create event
            </button>
          </form>
        </Panel>
      )}
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: "upcoming", label: "Upcoming" },
          { value: "past", label: "Past" },
        ]}
      />
      {list.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((e) => {
            const n = e.event_staff?.[0]?.count ?? 0;
            return (
              <Link
                key={e.id}
                to="/dashboard/events/$eventId"
                params={{ eventId: e.id }}
                className="rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/60"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-lg font-bold leading-tight">{e.name}</h3>
                  <StatusBadge status={e.status} />
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{e.client_name}</div>
                <div className="mt-4 space-y-1.5 text-sm">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-primary" />{" "}
                    {date(e.starts_on, {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                    {e.call_time ? ` · ${e.call_time.slice(0, 5)}` : ""}
                  </div>
                  {e.venue && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" /> {e.venue}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" /> {n}
                    {e.staff_needed ? ` / ${e.staff_needed}` : ""} on roster
                    {e.hourly_rate_rwf ? ` · ${rwf(e.hourly_rate_rwf)}/h` : ""}
                  </div>
                  {e.publish && (
                    <div className="flex items-center gap-2 text-emerald-500">
                      <Megaphone className="h-4 w-4" /> Published as open shift
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={CalendarDays}
          title={tab === "upcoming" ? "No upcoming events" : "No past events"}
        />
      )}
    </>
  );
}
