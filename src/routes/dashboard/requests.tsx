import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Plus,
  Loader2,
  ShieldCheck,
  Search,
  Phone,
  Mail,
  MapPin,
  CalendarDays,
  Users,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { date, dateTime, pipelineStages, rwf, titleCase } from "@/lib/format";
import {
  DataList,
  EmptyState,
  Field,
  inputClass,
  Loading,
  PageHeader,
  Panel,
  StatusBadge,
  Tabs,
} from "@/components/app/kit";
import { Pipeline } from "@/components/app/pipeline";
import { RoleGate } from "@/components/app/role-gate";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { MyRequest } from "@/components/dashboards/client-home";

type Search = { id?: string; new?: boolean };

export const Route = createFileRoute("/dashboard/requests")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    id: typeof s.id === "string" ? s.id : undefined,
    new: s.new === true || s.new === "true" ? true : undefined,
  }),
  component: RequestsPage,
});

function RequestsPage() {
  const { profile } = useAuth();
  if (profile?.role === "staff" || profile?.role === "admin") return <StaffRequests />;
  return (
    <RoleGate roles={["client", "employer"]}>
      <ClientRequests />
    </RoleGate>
  );
}

export const EVENT_TYPES = [
  "Concert",
  "Conference",
  "Corporate",
  "Sports",
  "Wedding / private",
  "Festival",
  "Exhibition",
  "VIP / close protection",
  "Site security",
  "Consultancy / risk assessment",
  "Other",
];

export function RequestForm({
  onDone,
  requestedBy,
}: {
  onDone: (ref?: string) => void;
  requestedBy?: string;
}) {
  const { profile, user } = useAuth();
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) ?? "").trim() || null;
    setBusy(true);
    const { error } = await supabase.from("service_requests").insert({
      client_name: v("client_name"),
      email: v("email"),
      phone: v("phone"),
      event_name: v("event_name"),
      event_type: v("event_type"),
      event_date: v("event_date"),
      location: v("location"),
      expected_attendees: f.get("attendees") ? Number(f.get("attendees")) : null,
      details: v("details"),
      requested_by: requestedBy ?? null,
    });
    setBusy(false);
    if (error) return toast.error("Your request could not be sent. Please try again.");
    toast.success("Request received — we will contact you within 24 hours.");
    onDone();
  }
  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <Field label="Your name or organisation" required>
        <input
          name="client_name"
          required
          defaultValue={profile?.full_name ?? ""}
          className={inputClass}
        />
      </Field>
      <Field label="Email" required>
        <input
          name="email"
          type="email"
          required
          defaultValue={user?.email ?? ""}
          className={inputClass}
        />
      </Field>
      <Field label="Phone">
        <input name="phone" type="tel" defaultValue={profile?.phone ?? ""} className={inputClass} />
      </Field>
      <Field label="Type of service">
        <select name="event_type" className={inputClass}>
          {EVENT_TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </Field>
      <Field label="Event or site name">
        <input name="event_name" className={inputClass} />
      </Field>
      <Field label="Date">
        <input name="event_date" type="date" className={inputClass} />
      </Field>
      <Field label="Venue / location">
        <input name="location" className={inputClass} placeholder="e.g. Kigali Convention Centre" />
      </Field>
      <Field label="Expected attendance">
        <input name="attendees" type="number" min={0} className={inputClass} />
      </Field>
      <Field label="What do you need?" className="sm:col-span-2" required>
        <textarea
          name="details"
          rows={4}
          required
          className={inputClass}
          placeholder="Entrances, VIPs, timing, specific concerns…"
        />
      </Field>
      <button
        disabled={busy}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground sm:col-span-2 sm:w-max"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Send request
      </button>
    </form>
  );
}

function ClientRequests() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rows, setRows] = useState<MyRequest[] | null>(null);
  const load = useCallback(() => {
    supabase.rpc("my_service_requests").then(({ data }) => setRows((data as MyRequest[]) ?? []));
  }, []);
  useEffect(load, [load]);

  const open = rows?.find((r) => r.id === search.id);

  async function answer(qid: string, status: "accepted" | "declined") {
    const { error } = await supabase.from("quotations").update({ status }).eq("id", qid);
    if (error) return toast.error(error.message);
    toast.success(
      status === "accepted"
        ? "Quotation accepted — Kagoma will confirm the deployment."
        : "Quotation declined",
    );
    load();
  }

  if (!rows) return <Loading />;

  return (
    <>
      <PageHeader
        title="Security requests"
        subtitle="Every request moves through assessment, quotation, approval, deployment and a final report."
        actions={
          <button
            onClick={() => navigate({ to: "/dashboard/requests", search: { new: true } })}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="h-4 w-4" /> New request
          </button>
        }
      />
      {search.new && (
        <Panel title="Request security" className="mb-6">
          <RequestForm
            requestedBy={user!.id}
            onDone={() => {
              navigate({ to: "/dashboard/requests", search: {} });
              load();
            }}
          />
        </Panel>
      )}
      {rows.length ? (
        <div className="space-y-3">
          {rows.map((r) => (
            <button
              key={r.id}
              onClick={() => navigate({ to: "/dashboard/requests", search: { id: r.id } })}
              className="block w-full rounded-2xl border border-border bg-card p-5 text-left transition hover:border-primary/50"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-mono text-xs text-muted-foreground">{r.reference}</div>
                  <div className="font-semibold">
                    {r.event_name || r.event_type || "Security request"}
                  </div>
                </div>
                <StatusBadge status={r.status} />
              </div>
              <div className="mt-4">
                <Pipeline status={r.status} />
              </div>
            </button>
          ))}
        </div>
      ) : (
        !search.new && (
          <EmptyState
            icon={ShieldCheck}
            title="No requests yet"
            hint="Send your first request and we will assess it."
          />
        )
      )}

      <Sheet
        open={!!open}
        onOpenChange={(o) => !o && navigate({ to: "/dashboard/requests", search: {} })}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {open && (
            <>
              <SheetHeader>
                <SheetTitle className="font-display">
                  {open.event_name || open.event_type || "Security request"}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-6 text-sm">
                <div className="font-mono text-xs text-muted-foreground">{open.reference}</div>
                <Pipeline status={open.status} />
                <Facts r={open} />
                {open.quotations.length > 0 && (
                  <section>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">
                      Quotations
                    </h3>
                    {open.quotations.map((q) => (
                      <div key={q.id} className="rounded-xl border border-border p-4">
                        <div className="flex items-center justify-between">
                          <div className="font-display text-2xl font-bold">{rwf(q.amount)}</div>
                          <StatusBadge status={q.status} />
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {q.officers} officers · {q.days} day(s) · valid until{" "}
                          {date(q.valid_until)}
                        </div>
                        {q.notes && <p className="mt-2">{q.notes}</p>}
                        {q.status === "sent" && (
                          <div className="mt-3 flex gap-2">
                            <button
                              onClick={() => answer(q.id, "accepted")}
                              className="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => answer(q.id, "declined")}
                              className="rounded-lg border border-border px-4 py-2"
                            >
                              Decline
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </section>
                )}
                <Timeline stages={open.stages} />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function Facts({
  r,
}: {
  r: {
    event_type: string | null;
    event_date: string | null;
    location: string | null;
    expected_attendees: number | null;
    details: string | null;
  };
}) {
  return (
    <dl className="grid grid-cols-2 gap-3">
      {[
        { icon: FileText, k: "Type", v: r.event_type },
        { icon: CalendarDays, k: "Date", v: date(r.event_date) },
        { icon: MapPin, k: "Location", v: r.location },
        { icon: Users, k: "Attendance", v: r.expected_attendees?.toLocaleString() },
      ].map(({ icon: Icon, k, v }) => (
        <div key={k} className="rounded-lg bg-muted/50 p-3">
          <dt className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">
            <Icon className="h-3 w-3" /> {k}
          </dt>
          <dd className="mt-0.5 font-medium">{v || "—"}</dd>
        </div>
      ))}
      {r.details && (
        <dd className="col-span-2 whitespace-pre-line rounded-lg border border-border p-3">
          {r.details}
        </dd>
      )}
    </dl>
  );
}

function Timeline({
  stages,
}: {
  stages: { stage: string; note: string | null; created_at: string }[];
}) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">History</h3>
      <ol className="space-y-3">
        {stages.map((s, i) => (
          <li key={i} className="border-l-2 border-primary/40 pl-3">
            <div className="font-semibold">{titleCase(s.stage)}</div>
            <div className="text-xs text-muted-foreground">{dateTime(s.created_at)}</div>
            {s.note && <div className="mt-1 text-muted-foreground">{s.note}</div>}
          </li>
        ))}
      </ol>
    </section>
  );
}

type StaffReq = {
  id: string;
  reference: string;
  client_name: string;
  email: string;
  phone: string | null;
  event_name: string | null;
  event_type: string | null;
  event_date: string | null;
  location: string | null;
  expected_attendees: number | null;
  details: string | null;
  status: string;
  created_at: string;
  service_stages: { stage: string; note: string | null; created_at: string }[];
  quotations: {
    id: string;
    officers: number | null;
    days: number | null;
    amount: number | null;
    valid_until: string | null;
    notes: string | null;
    status: string;
  }[];
};

function StaffRequests() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"service" | "recruitment">("service");
  const [rows, setRows] = useState<StaffReq[] | null>(null);
  const [recruit, setRecruit] = useState<
    {
      id: string;
      role_needed: string;
      quantity: number;
      location: string | null;
      start_date: string | null;
      details: string | null;
      status: string;
      created_at: string;
      profiles: { full_name: string | null; phone: string | null } | null;
    }[]
  >([]);
  const [filter, setFilter] = useState<string>("open");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    const [r, e] = await Promise.all([
      supabase
        .from("service_requests")
        .select("*, service_stages(stage,note,created_at), quotations(*)")
        .order("created_at", { ascending: false }),
      supabase
        .from("employer_requests")
        .select("*, profiles!employer_requests_employer_id_fkey(full_name,phone)")
        .order("created_at", { ascending: false }),
    ]);
    setRows((r.data as StaffReq[]) ?? []);
    setRecruit((e.data as typeof recruit) ?? []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const list = useMemo(
    () =>
      (rows ?? []).filter(
        (r) =>
          (filter === "all" ||
            (filter === "open"
              ? !["reported", "cancelled"].includes(r.status)
              : r.status === filter)) &&
          (!q ||
            `${r.reference} ${r.client_name} ${r.event_name} ${r.location}`
              .toLowerCase()
              .includes(q.toLowerCase())),
      ),
    [rows, filter, q],
  );
  const open = rows?.find((r) => r.id === search.id);

  if (!rows) return <Loading />;

  return (
    <>
      <PageHeader
        title="Service requests"
        subtitle="Assess, quote, approve, deploy and report — every move is logged for the client to see."
      />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          {
            value: "service",
            label: "Security requests",
            count: rows.filter((r) => !["reported", "cancelled"].includes(r.status)).length,
          },
          {
            value: "recruitment",
            label: "Recruitment requests",
            count: recruit.filter((r) => r.status === "new").length,
          },
        ]}
      />
      {tab === "service" ? (
        <>
          <div className="mb-4 flex flex-col gap-3 md:flex-row">
            <div className="relative md:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Reference, client, venue…"
                className={`${inputClass} pl-9`}
              />
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className={`${inputClass} md:w-56`}
            >
              <option value="open">Open (not reported)</option>
              <option value="all">All</option>
              {[...pipelineStages, "cancelled"].map((s) => (
                <option key={s} value={s}>
                  {titleCase(s)}
                </option>
              ))}
            </select>
          </div>
          <Panel bodyClassName="p-0 md:p-2">
            <DataList
              rows={list}
              rowKey={(r) => r.id}
              onRowClick={(r) => navigate({ to: "/dashboard/requests", search: { id: r.id } })}
              empty={
                <div className="p-5">
                  <EmptyState icon={ShieldCheck} title="No requests match" />
                </div>
              }
              columns={[
                {
                  key: "ref",
                  label: "Reference",
                  render: (r) => <span className="font-mono text-xs">{r.reference}</span>,
                },
                {
                  key: "c",
                  label: "Client",
                  render: (r) => (
                    <div>
                      <div className="font-semibold">{r.client_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.event_name || r.event_type}
                      </div>
                    </div>
                  ),
                },
                { key: "d", label: "Event date", render: (r) => date(r.event_date) },
                {
                  key: "l",
                  label: "Location",
                  render: (r) => r.location ?? "—",
                  hideOnMobile: true,
                },
                { key: "s", label: "Stage", render: (r) => <StatusBadge status={r.status} /> },
              ]}
            />
          </Panel>
        </>
      ) : (
        <Panel bodyClassName="p-0 md:p-2">
          <DataList
            rows={recruit}
            rowKey={(r) => r.id}
            empty={
              <div className="p-5">
                <EmptyState title="No recruitment requests" />
              </div>
            }
            columns={[
              {
                key: "e",
                label: "Employer",
                render: (r) => (
                  <div>
                    <div className="font-semibold">{r.profiles?.full_name}</div>
                    <div className="text-xs text-muted-foreground">{r.profiles?.phone}</div>
                  </div>
                ),
              },
              { key: "r", label: "Need", render: (r) => `${r.quantity} × ${r.role_needed}` },
              {
                key: "l",
                label: "Where / when",
                render: (r) => `${r.location ?? "—"} · ${date(r.start_date)}`,
                hideOnMobile: true,
              },
              {
                key: "d",
                label: "Details",
                render: (r) => (
                  <span className="line-clamp-2 text-xs text-muted-foreground">{r.details}</span>
                ),
                hideOnMobile: true,
              },
              {
                key: "s",
                label: "Status",
                render: (r) => (
                  <select
                    value={r.status}
                    onChange={async (e) => {
                      await supabase
                        .from("employer_requests")
                        .update({ status: e.target.value })
                        .eq("id", r.id);
                      load();
                    }}
                    className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                  >
                    {["new", "reviewing", "matched", "closed"].map((s) => (
                      <option key={s} value={s}>
                        {titleCase(s)}
                      </option>
                    ))}
                  </select>
                ),
              },
            ]}
          />
        </Panel>
      )}

      <Sheet
        open={!!open}
        onOpenChange={(o) => !o && navigate({ to: "/dashboard/requests", search: {} })}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {open && <StaffRequestDetail r={open} onChanged={load} />}
        </SheetContent>
      </Sheet>
    </>
  );
}

function StaffRequestDetail({ r, onChanged }: { r: StaffReq; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const at = pipelineStages.indexOf(r.status as (typeof pipelineStages)[number]);
  const nextStage = at >= 0 && at < pipelineStages.length - 1 ? pipelineStages[at + 1] : null;

  async function move(stage: string) {
    const note =
      window.prompt(`Note for the client about "${titleCase(stage)}" (optional):`) ?? null;
    setBusy(true);
    const { error } = await supabase.rpc("advance_service_request", {
      p_request: r.id,
      p_stage: stage,
      p_note: note || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Moved to ${titleCase(stage)}`);
    onChanged();
  }

  async function quote(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("quotations").insert({
      request_id: r.id,
      officers: Number(f.get("officers")) || null,
      days: Number(f.get("days")) || null,
      amount: Number(f.get("amount")) || null,
      valid_until: String(f.get("valid")) || null,
      notes: String(f.get("notes")).trim() || null,
      created_by: u.user?.id,
    });
    if (error) return toast.error(error.message);
    if (r.status === "requested" || r.status === "assessment") {
      await supabase.rpc("advance_service_request", {
        p_request: r.id,
        p_stage: "quotation",
        p_note: "Quotation sent.",
      });
    }
    toast.success("Quotation sent to the client");
    setQuoting(false);
    onChanged();
  }

  const stages = [...r.service_stages].sort((a, b) => a.created_at.localeCompare(b.created_at));

  return (
    <>
      <SheetHeader>
        <SheetTitle className="font-display">
          {r.event_name || r.event_type || "Security request"}
        </SheetTitle>
      </SheetHeader>
      <div className="mt-4 space-y-6 text-sm">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs text-muted-foreground">{r.reference}</span>
          <StatusBadge status={r.status} />
        </div>
        <Pipeline status={r.status} />
        <section className="rounded-xl border border-border p-4">
          <div className="font-semibold">{r.client_name}</div>
          <div className="mt-1 flex flex-wrap gap-4 text-muted-foreground">
            <a
              href={`mailto:${r.email}`}
              className="inline-flex items-center gap-1 hover:text-primary"
            >
              <Mail className="h-3.5 w-3.5" /> {r.email}
            </a>
            {r.phone && (
              <a
                href={`tel:${r.phone}`}
                className="inline-flex items-center gap-1 hover:text-primary"
              >
                <Phone className="h-3.5 w-3.5" /> {r.phone}
              </a>
            )}
          </div>
        </section>
        <Facts r={r} />

        <div className="flex flex-wrap gap-2">
          {nextStage && r.status !== "cancelled" && (
            <button
              disabled={busy}
              onClick={() => move(nextStage)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Move to {titleCase(nextStage)}
            </button>
          )}
          <button
            onClick={() => setQuoting((x) => !x)}
            className="rounded-lg border border-border px-4 py-2"
          >
            New quotation
          </button>
          {r.status !== "cancelled" && r.status !== "reported" && (
            <button
              onClick={() => move("cancelled")}
              className="rounded-lg border border-destructive/40 px-4 py-2 text-destructive"
            >
              Cancel
            </button>
          )}
        </div>

        {quoting && (
          <form
            onSubmit={quote}
            className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2"
          >
            <Field label="Officers">
              <input name="officers" type="number" min={1} className={inputClass} />
            </Field>
            <Field label="Days">
              <input name="days" type="number" min={1} defaultValue={1} className={inputClass} />
            </Field>
            <Field label="Amount (RWF)" required>
              <input name="amount" type="number" min={1} required className={inputClass} />
            </Field>
            <Field label="Valid until">
              <input name="valid" type="date" className={inputClass} />
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <textarea name="notes" rows={2} className={inputClass} />
            </Field>
            <button className="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground sm:col-span-2">
              Send quotation
            </button>
          </form>
        )}

        {r.quotations.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">
              Quotations
            </h3>
            <div className="space-y-2">
              {r.quotations.map((qq) => (
                <div
                  key={qq.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div>
                    <div className="font-semibold">{rwf(qq.amount)}</div>
                    <div className="text-xs text-muted-foreground">
                      {qq.officers} officers · {qq.days} day(s) · until {date(qq.valid_until)}
                    </div>
                  </div>
                  <StatusBadge status={qq.status} />
                </div>
              ))}
            </div>
          </section>
        )}
        <Timeline stages={stages} />
      </div>
    </>
  );
}
