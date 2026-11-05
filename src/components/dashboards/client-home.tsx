import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldCheck, FileCheck2, Clock, Plus, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { date, rwf } from "@/lib/format";
import {
  EmptyState,
  Loading,
  PageHeader,
  Panel,
  StatCard,
  StatusBadge,
} from "@/components/app/kit";
import { Pipeline } from "@/components/app/pipeline";

export type MyRequest = {
  id: string;
  reference: string | null;
  event_name: string | null;
  event_type: string | null;
  location: string | null;
  event_date: string | null;
  expected_attendees: number | null;
  details: string | null;
  status: string;
  created_at: string;
  stages: { stage: string; note: string | null; created_at: string }[];
  quotations: {
    id: string;
    officers: number | null;
    days: number | null;
    currency: string;
    amount: number | null;
    valid_until: string | null;
    notes: string | null;
    status: string;
  }[];
};

export function ClientHome() {
  const { profile } = useAuth();
  const [reqs, setReqs] = useState<MyRequest[] | null>(null);

  useEffect(() => {
    supabase.rpc("my_service_requests").then(({ data }) => setReqs((data as MyRequest[]) ?? []));
  }, []);

  if (!reqs) return <Loading />;
  const open = reqs.filter((r) => !["reported", "cancelled"].includes(r.status));
  const quotes = reqs.flatMap((r) =>
    r.quotations.filter((q) => q.status === "sent").map((q) => ({ ...q, r })),
  );

  return (
    <>
      <PageHeader
        eyebrow="Client dashboard"
        title={profile?.full_name || "Welcome"}
        subtitle="Request security for your events and follow every request from assessment to report."
        actions={
          <Link
            to="/dashboard/requests"
            search={{ new: true }}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="h-4 w-4" /> New request
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Open requests" value={open.length} icon={ShieldCheck} />
        <StatCard
          label="Quotations to review"
          value={quotes.length}
          icon={FileCheck2}
          tone={quotes.length ? "red" : "default"}
        />
        <StatCard
          label="Completed"
          value={reqs.filter((r) => r.status === "reported").length}
          icon={CheckCircle2}
        />
      </div>

      {quotes.length > 0 && (
        <Panel title="Quotations awaiting your answer" className="mt-6">
          <div className="grid gap-3 md:grid-cols-2">
            {quotes.map((q) => (
              <Link
                key={q.id}
                to="/dashboard/requests"
                search={{ id: q.r.id }}
                className="rounded-xl border border-primary/40 bg-primary/5 p-4 transition hover:border-primary"
              >
                <div className="text-xs text-muted-foreground">{q.r.reference}</div>
                <div className="font-semibold">
                  {q.r.event_name || q.r.event_type || "Security request"}
                </div>
                <div className="mt-2 font-display text-2xl font-bold text-primary">
                  {rwf(q.amount)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {q.officers} officers · {q.days} day(s) · valid until {date(q.valid_until)}
                </div>
              </Link>
            ))}
          </div>
        </Panel>
      )}

      <Panel
        title="Your requests"
        className="mt-6"
        actions={
          <Link to="/dashboard/requests" className="text-xs text-primary">
            All requests
          </Link>
        }
      >
        {reqs.length ? (
          <div className="space-y-4">
            {reqs.slice(0, 4).map((r) => (
              <Link
                key={r.id}
                to="/dashboard/requests"
                search={{ id: r.id }}
                className="block rounded-xl border border-border p-4 transition hover:border-primary/50"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs text-muted-foreground">{r.reference}</div>
                    <div className="font-semibold">
                      {r.event_name || r.event_type || "Security request"}
                    </div>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <div className="mt-3">
                  <Pipeline status={r.status} compact />
                </div>
                <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />{" "}
                  {r.event_date ? `Event ${date(r.event_date)}` : `Sent ${date(r.created_at)}`}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No requests yet"
            hint="Tell us about your event and we will assess it and send a quotation."
            action={
              <Link
                to="/dashboard/requests"
                search={{ new: true }}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                Request security
              </Link>
            }
          />
        )}
      </Panel>
    </>
  );
}
