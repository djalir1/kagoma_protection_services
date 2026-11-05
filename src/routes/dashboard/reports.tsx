import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Users, Award, Wallet, GraduationCap } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { rwf, titleCase } from "@/lib/format";
import { Loading, PageHeader, Panel, StatCard } from "@/components/app/kit";
import { RoleGate, ADMIN } from "@/components/app/role-gate";

export const Route = createFileRoute("/dashboard/reports")({
  component: () => (
    <RoleGate roles={ADMIN}>
      <Reports />
    </RoleGate>
  ),
});

type Demo = {
  total: number;
  gender: { key: string; n: number; pct: number }[];
  countries: { code: string; name: string; n: number; pct: number }[];
};

function Bars({ rows }: { rows: { label: string; n: number; hint?: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div
          key={r.label}
          className="grid grid-cols-[minmax(0,1.2fr)_2fr_auto] items-center gap-3 text-sm"
        >
          <span className="truncate text-muted-foreground" title={r.label}>
            {r.label}
          </span>
          <div className="h-2.5 rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
              style={{ width: `${(r.n / max) * 100}%` }}
            />
          </div>
          <span className="w-16 text-right font-semibold">
            {r.n}
            {r.hint && (
              <span className="ml-1 text-xs font-normal text-muted-foreground">{r.hint}</span>
            )}
          </span>
        </div>
      ))}
      {!rows.length && <p className="text-sm text-muted-foreground">No data yet.</p>}
    </div>
  );
}

function Reports() {
  const [d, setD] = useState<{
    demo: Demo;
    byCourse: { label: string; n: number }[];
    certs: { label: string; n: number }[];
    income: number;
    enrolments: number;
    certificates: number;
  } | null>(null);

  useEffect(() => {
    (async () => {
      const [demo, enr, certs, pays] = await Promise.all([
        supabase.rpc("admin_demographics"),
        supabase.from("enrollments").select("course_id"),
        supabase.from("certificates").select("course_id,status"),
        supabase.from("payments").select("amount_rwf").eq("status", "confirmed"),
      ]);
      const count = (xs: { course_id: string | null }[]) => {
        const m = new Map<string, number>();
        xs.forEach((x) => x.course_id && m.set(x.course_id, (m.get(x.course_id) ?? 0) + 1));
        return [...m.entries()].map(([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n);
      };
      setD({
        demo: demo.data as Demo,
        byCourse: count(enr.data ?? []),
        certs: count((certs.data ?? []).filter((c) => c.status === "valid")),
        income: (pays.data ?? []).reduce((a, p) => a + Number(p.amount_rwf), 0),
        enrolments: enr.data?.length ?? 0,
        certificates: (certs.data ?? []).filter((c) => c.status === "valid").length,
      });
    })();
  }, []);

  if (!d) return <Loading />;

  return (
    <>
      <PageHeader title="Reports" subtitle="Who is learning with Kagoma and what they achieve." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Learners" value={d.demo.total} icon={Users} />
        <StatCard label="Enrolments" value={d.enrolments} icon={GraduationCap} />
        <StatCard label="Valid certificates" value={d.certificates} icon={Award} />
        <StatCard label="Confirmed learner payments" value={rwf(d.income)} icon={Wallet} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Enrolments by course">
          <Bars rows={d.byCourse} />
        </Panel>
        <Panel title="Certificates by course">
          <Bars rows={d.certs} />
        </Panel>
        <Panel title="Learners by gender">
          <Bars
            rows={d.demo.gender.map((g) => ({
              label: titleCase(g.key),
              n: g.n,
              hint: `${g.pct}%`,
            }))}
          />
        </Panel>
        <Panel title="Learners by country">
          <Bars
            rows={d.demo.countries.map((c) => ({ label: c.name, n: c.n, hint: `${c.pct}%` }))}
          />
        </Panel>
      </div>
    </>
  );
}
