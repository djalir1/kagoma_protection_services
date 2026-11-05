import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Users,
  ClipboardList,
  MessageSquare,
  Briefcase,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { date } from "@/lib/format";
import { Loading, PageHeader, Panel, StatCard, StatusBadge } from "@/components/app/kit";

type Pro = {
  id: string;
  name: string;
  headline: string | null;
  district: string | null;
  certificates: number;
};

export function EmployerHome() {
  const { user, profile } = useAuth();
  const [data, setData] = useState<{
    pros: Pro[];
    jobs: { id: string; title: string; status: string; closes_on: string | null }[];
    apps: number;
    contacts: { id: string; status: string }[];
    reqs: {
      id: string;
      role_needed: string;
      quantity: number;
      status: string;
      created_at: string;
    }[];
  } | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [pros, jobs, contacts, reqs] = await Promise.all([
        supabase.rpc("professional_directory", {}),
        supabase
          .from("jobs")
          .select("id,title,status,closes_on")
          .eq("employer_id", user.id)
          .order("created_at", { ascending: false }),
        supabase.from("employer_contacts").select("id,status").eq("employer_id", user.id),
        supabase
          .from("employer_requests")
          .select("id,role_needed,quantity,status,created_at")
          .eq("employer_id", user.id)
          .order("created_at", { ascending: false }),
      ]);
      const jobIds = (jobs.data ?? []).map((j) => j.id);
      const apps = jobIds.length
        ? await supabase
            .from("job_applications")
            .select("id", { count: "exact", head: true })
            .in("job_id", jobIds)
        : { count: 0 };
      setData({
        pros: (pros.data as Pro[]) ?? [],
        jobs: jobs.data ?? [],
        apps: apps.count ?? 0,
        contacts: contacts.data ?? [],
        reqs: reqs.data ?? [],
      });
    })();
  }, [user]);

  if (!data) return <Loading />;

  return (
    <>
      <PageHeader
        eyebrow="Employer dashboard"
        title={profile?.full_name || "Your company"}
        subtitle="Find certified, identity-checked security professionals and manage your hiring."
        actions={
          <Link
            to="/dashboard/talent"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <Users className="h-4 w-4" /> Find professionals
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Listed professionals"
          value={data.pros.length}
          icon={Users}
          hint="Certified and vetted"
        />
        <StatCard
          label="Open jobs"
          value={data.jobs.filter((j) => j.status === "open").length}
          icon={ClipboardList}
        />
        <StatCard label="Applications received" value={data.apps} icon={Briefcase} />
        <StatCard
          label="Messages sent"
          value={data.contacts.length}
          icon={MessageSquare}
          hint={`${data.contacts.filter((c) => c.status === "accepted").length} accepted`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel
          title="Recently listed professionals"
          actions={
            <Link to="/dashboard/talent" className="text-xs text-primary">
              Directory
            </Link>
          }
        >
          {data.pros.length ? (
            <div className="space-y-3">
              {data.pros.slice(0, 5).map((p) => (
                <Link
                  key={p.id}
                  to="/dashboard/talent"
                  search={{ id: p.id }}
                  className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-muted/60"
                >
                  <ShieldCheck className="h-8 w-8 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{p.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {p.headline || "Certified security professional"}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{p.certificates} cert.</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No professionals are listed yet.</p>
          )}
        </Panel>

        <Panel
          title="Your recruitment requests"
          actions={
            <Link to="/dashboard/recruitment" className="text-xs text-primary">
              Manage
            </Link>
          }
        >
          {data.reqs.length ? (
            <div className="space-y-2">
              {data.reqs.slice(0, 5).map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 text-sm"
                >
                  <div>
                    <div className="font-semibold">
                      {r.quantity} × {r.role_needed}
                    </div>
                    <div className="text-xs text-muted-foreground">{date(r.created_at)}</div>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Need several people at once? Ask Kagoma to recruit for you.
              <Link
                to="/dashboard/recruitment"
                className="mt-3 flex items-center gap-1 font-semibold text-primary"
              >
                New request <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
