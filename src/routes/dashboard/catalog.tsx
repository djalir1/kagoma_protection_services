import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { fetchCourses, fetchMyEnrollments, type Course } from "@/lib/queries";
import { inputClass, Loading, PageHeader, Tabs } from "@/components/app/kit";
import { CourseCard } from "@/components/app/course-card";
import { RoleGate, LEARNER } from "@/components/app/role-gate";

export const Route = createFileRoute("/dashboard/catalog")({
  component: () => (
    <RoleGate roles={LEARNER}>
      <Catalog />
    </RoleGate>
  ),
});

function Catalog() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [mine, setMine] = useState<Set<string>>(new Set());
  const [track, setTrack] = useState<"all" | "core" | "ep">("all");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([fetchCourses(), fetchMyEnrollments(user.id)]).then(([c, e]) => {
      setCourses(c);
      setMine(new Set(e.map((x) => x.course_id)));
    });
  }, [user]);

  const list = useMemo(
    () =>
      (courses ?? []).filter(
        (c) =>
          (track === "all" || c.track === track) &&
          (!q || `${c.id} ${c.title} ${c.description}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [courses, track, q],
  );

  async function enrol(id: string) {
    setBusy(id);
    const { data, error } = await supabase.rpc("enrol_in_course", { p_course: id });
    setBusy(null);
    if (error || !(data as { ok: boolean }).ok)
      return toast.error("Could not enrol you on this course.");
    toast.success("Enrolled — let's begin.");
    navigate({ to: "/dashboard/learn/$courseId", params: { courseId: id } });
  }

  if (!courses) return <Loading />;

  return (
    <>
      <PageHeader
        title="Course catalogue"
        subtitle="Study is free and self-paced. A certificate is issued when you pass the final exam."
      />
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative md:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search courses…"
            className={`${inputClass} pl-9`}
          />
        </div>
        <div className="md:ml-auto">
          <Tabs
            value={track}
            onChange={setTrack}
            items={[
              { value: "all", label: "All", count: courses.length },
              {
                value: "core",
                label: "Professional",
                count: courses.filter((c) => c.track === "core").length,
              },
              {
                value: "ep",
                label: "Executive Protection",
                count: courses.filter((c) => c.track === "ep").length,
              },
            ]}
          />
        </div>
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {list.map((c) => (
          <CourseCard
            key={c.id}
            course={c}
            footer={
              <div className="flex gap-2">
                {mine.has(c.id) ? (
                  <Link
                    to="/dashboard/learn/$courseId"
                    params={{ courseId: c.id }}
                    className="flex-1 rounded-lg bg-primary/15 px-3 py-2 text-center text-sm font-semibold text-primary"
                  >
                    Continue
                  </Link>
                ) : (
                  <button
                    onClick={() => enrol(c.id)}
                    disabled={busy === c.id}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
                  >
                    {busy === c.id && <Loader2 className="h-4 w-4 animate-spin" />} Enrol
                  </button>
                )}
                <Link
                  to="/training/$courseId"
                  params={{ courseId: c.id }}
                  className="rounded-lg border border-border px-3 py-2 text-sm"
                >
                  Syllabus
                </Link>
              </div>
            }
          />
        ))}
      </div>
    </>
  );
}
