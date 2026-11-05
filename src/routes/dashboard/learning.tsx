import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { fetchMyEnrollments, type Enrollment } from "@/lib/queries";
import { courseCover, date } from "@/lib/format";
import {
  EmptyState,
  Loading,
  PageHeader,
  ProgressBar,
  StatusBadge,
  Tabs,
} from "@/components/app/kit";
import { RoleGate, LEARNER } from "@/components/app/role-gate";

export const Route = createFileRoute("/dashboard/learning")({
  component: () => (
    <RoleGate roles={LEARNER}>
      <MyLearning />
    </RoleGate>
  ),
});

function MyLearning() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Enrollment[] | null>(null);
  const [tab, setTab] = useState<"active" | "completed">("active");

  useEffect(() => {
    if (user) fetchMyEnrollments(user.id).then(setRows);
  }, [user]);

  if (!rows) return <Loading />;
  const list = rows.filter((r) =>
    tab === "completed" ? r.status === "completed" : r.status !== "completed",
  );

  return (
    <>
      <PageHeader title="My learning" subtitle="Every course you are enrolled on." />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          {
            value: "active",
            label: "In progress",
            count: rows.filter((r) => r.status !== "completed").length,
          },
          {
            value: "completed",
            label: "Completed",
            count: rows.filter((r) => r.status === "completed").length,
          },
        ]}
      />
      {list.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((e) => (
            <Link
              key={e.id}
              to="/dashboard/learn/$courseId"
              params={{ courseId: e.course_id }}
              className="group overflow-hidden rounded-2xl border border-border bg-card transition hover:border-primary/60"
            >
              <img
                src={courseCover(e.course_id)}
                alt=""
                className="aspect-[16/7] w-full object-cover"
              />
              <div className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-xs text-primary">{e.course_id}</span>
                  <StatusBadge status={e.status} />
                </div>
                <h3 className="mt-2 font-display font-bold leading-tight">{e.courses?.title}</h3>
                <div className="mt-4 flex items-center gap-3">
                  <ProgressBar value={e.progress} />
                  <span className="text-sm font-semibold">{e.progress}%</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Enrolled {date(e.enrolled_at)}</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-primary group-hover:gap-2">
                    {e.status === "completed" ? "Review" : "Continue"}{" "}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={BookOpen}
          title={tab === "completed" ? "No completed courses yet" : "No courses in progress"}
          action={
            <Link
              to="/dashboard/catalog"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Browse the catalogue
            </Link>
          }
        />
      )}
    </>
  );
}
