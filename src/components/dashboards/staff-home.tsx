import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ListChecks,
  ClipboardList,
  Receipt,
  ShieldCheck,
  UsersRound,
  CalendarDays,
  GraduationCap,
  Award,
  Building2,
  Wallet,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { date, rwf } from "@/lib/format";
import { Loading, PageHeader, Panel, StatCard, StatusBadge } from "@/components/app/kit";

type Inbox = {
  vetting: number;
  applications: number;
  payments: number;
  requests: number;
  pipeline: number;
  pool_new: number;
  events_next: number;
  learners: number;
  enrolments: number;
  certificates: number;
  employers: number;
  clients: number;
  outstanding: number;
  recent_requests: {
    id: string;
    reference: string;
    client_name: string;
    event_name: string | null;
    status: string;
    created_at: string;
  }[];
  upcoming_events: {
    id: string;
    name: string;
    venue: string | null;
    starts_on: string;
    staff_needed: number | null;
    rostered: number;
  }[];
  enrolments_by_course: { id: string; title: string; n: number }[];
};

export function StaffHome() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [d, setD] = useState<Inbox | null>(null);
  const isAdmin = profile?.role === "admin";

  useEffect(() => {
    supabase.rpc("staff_inbox").then(({ data }) => setD(data as Inbox));
  }, []);

  if (!d) return <Loading />;
  const maxN = Math.max(1, ...d.enrolments_by_course.map((c) => c.n));

  return (
    <>
      <PageHeader
        eyebrow={isAdmin ? "Administration" : "Staff desk"}
        title="Today at Kagoma"
        subtitle="What needs attention across training, operations and clients."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isAdmin && (
          <>
            <StatCard
              label="Identity checks"
              value={d.vetting}
              icon={ListChecks}
              tone={d.vetting ? "red" : "default"}
              hint="Learners awaiting vetting"
              onClick={() => navigate({ to: "/dashboard/vetting" })}
            />
            <StatCard
              label="Course applications"
              value={d.applications}
              icon={ClipboardList}
              tone={d.applications ? "red" : "default"}
              onClick={() => navigate({ to: "/dashboard/applications" })}
            />
            <StatCard
              label="Payments to confirm"
              value={d.payments}
              icon={Receipt}
              tone={d.payments ? "red" : "default"}
              onClick={() => navigate({ to: "/dashboard/payments" })}
            />
          </>
        )}
        <StatCard
          label="New service requests"
          value={d.requests}
          icon={ShieldCheck}
          tone={d.requests ? "red" : "default"}
          hint={`${d.pipeline} open in pipeline`}
          onClick={() => navigate({ to: "/dashboard/requests" })}
        />
        <StatCard
          label="Upcoming events"
          value={d.events_next}
          icon={CalendarDays}
          onClick={() => navigate({ to: "/dashboard/events" })}
        />
        <StatCard
          label="New in talent pool"
          value={d.pool_new}
          icon={UsersRound}
          hint="Awaiting screening"
          onClick={() => navigate({ to: "/dashboard/pool" })}
        />
        <StatCard
          label="Client balances"
          value={rwf(d.outstanding)}
          icon={Wallet}
          hint="Outstanding on service orders"
          onClick={() => navigate({ to: "/dashboard/clients" })}
        />
        {!isAdmin && <StatCard label="Valid certificates" value={d.certificates} icon={Award} />}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel
          title="Latest service requests"
          className="lg:col-span-2"
          actions={
            <Link to="/dashboard/requests" className="text-xs text-primary">
              Pipeline
            </Link>
          }
        >
          {d.recent_requests.length ? (
            <div className="divide-y divide-border">
              {d.recent_requests.map((r) => (
                <Link
                  key={r.id}
                  to="/dashboard/requests"
                  search={{ id: r.id }}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">
                      {r.event_name || r.client_name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {r.reference} · {r.client_name} · {date(r.created_at)}
                    </div>
                  </div>
                  <StatusBadge status={r.status} />
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No requests yet.</p>
          )}
        </Panel>

        <Panel
          title="Next events"
          actions={
            <Link to="/dashboard/events" className="text-xs text-primary">
              Events
            </Link>
          }
        >
          {d.upcoming_events.length ? (
            <div className="space-y-3">
              {d.upcoming_events.map((e) => (
                <Link
                  key={e.id}
                  to="/dashboard/events/$eventId"
                  params={{ eventId: e.id }}
                  className="block rounded-xl border border-border p-3 transition hover:border-primary/50"
                >
                  <div className="text-sm font-semibold">{e.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {date(e.starts_on)} · {e.venue}
                  </div>
                  <div className="mt-1 text-xs">
                    <span className="font-semibold text-primary">{e.rostered}</span>
                    {e.staff_needed ? ` / ${e.staff_needed}` : ""} on roster
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No upcoming events.</p>
          )}
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel title="Platform" className="lg:col-span-1">
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              { icon: GraduationCap, k: d.learners, v: "Learners" },
              { icon: ClipboardList, k: d.enrolments, v: "Enrolments" },
              { icon: Award, k: d.certificates, v: "Certificates" },
              { icon: Building2, k: d.employers + d.clients, v: "Employers & clients" },
            ].map(({ icon: Icon, k, v }) => (
              <div key={v} className="rounded-xl bg-muted/50 p-3">
                <Icon className="h-4 w-4 text-primary" />
                <div className="mt-2 font-display text-2xl font-bold">{k}</div>
                <div className="text-xs text-muted-foreground">{v}</div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel
          title="Enrolments by course"
          className="lg:col-span-2"
          actions={
            isAdmin && (
              <Link
                to="/dashboard/reports"
                className="inline-flex items-center gap-1 text-xs text-primary"
              >
                Reports <ArrowRight className="h-3 w-3" />
              </Link>
            )
          }
        >
          {d.enrolments_by_course.length ? (
            <div className="space-y-2.5">
              {d.enrolments_by_course.map((c) => (
                <div
                  key={c.id}
                  className="grid grid-cols-[minmax(0,1fr)_2fr_auto] items-center gap-3 text-sm"
                >
                  <span className="truncate text-muted-foreground" title={c.title}>
                    {c.id} · {c.title}
                  </span>
                  <div className="h-2.5 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                      style={{ width: `${(c.n / maxN) * 100}%` }}
                    />
                  </div>
                  <span className="w-6 text-right font-semibold">{c.n}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No enrolments yet.</p>
          )}
        </Panel>
      </div>
    </>
  );
}
