import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Clock,
  GraduationCap,
  Award,
  Triangle,
  BookOpen,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { courseCover, rwf } from "@/lib/format";
import { Loading } from "@/components/app/kit";

export const Route = createFileRoute("/training/$courseId")({
  head: ({ params }) => ({ meta: [{ title: `${params.courseId} — Kagoma Training` }] }),
  component: CoursePage,
});

type Syllabus = {
  id: string;
  title: string;
  overview: string | null;
  requirements: string | null;
  study_hours: number | null;
  self_paced: boolean;
  practical: boolean;
  min_age: number | null;
  spec: string | null;
  pass_mark: number;
  final_attempts: number | null;
  prerequisites: { id: string; title: string }[];
  units: { number: number; title: string; intro: string | null; lessons: number }[];
};

function CoursePage() {
  const { courseId } = Route.useParams();
  const { session } = useAuth();
  const [s, setS] = useState<Syllabus | null | undefined>(undefined);
  const [fee, setFee] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .rpc("course_syllabus", { p_course: courseId })
      .then(({ data }) => setS((data as Syllabus) ?? null));
    supabase
      .from("courses")
      .select("certificate_fee_rwf")
      .eq("id", courseId)
      .maybeSingle()
      .then(({ data }) => setFee(data?.certificate_fee_rwf ?? null));
  }, [courseId]);

  if (s === undefined)
    return (
      <div className="pt-32">
        <Loading />
      </div>
    );
  if (!s) {
    return (
      <div className="mx-auto max-w-xl px-4 pt-40 text-center">
        <h1 className="font-display text-3xl font-bold">Course not found</h1>
        <Link to="/training" className="mt-4 inline-block text-primary">
          See all courses
        </Link>
      </div>
    );
  }

  const lessons = s.units.reduce((a, u) => a + u.lessons, 0);
  const cta = session
    ? { to: "/dashboard/learn/$courseId" as const, label: "Start learning" }
    : { to: "/signup" as const, label: "Create a free account" };

  return (
    <>
      <section className="relative -mt-20 overflow-hidden pt-28 md:pt-36">
        <div className="absolute inset-0 bg-radial-gold opacity-60" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 pb-12 md:px-8 lg:grid-cols-[1.3fr_1fr] lg:items-center">
          <div>
            <Link
              to="/training"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" /> All courses
            </Link>
            <div className="mt-4 font-display text-sm text-primary">{s.id}</div>
            <h1 className="mt-2 text-4xl font-bold leading-tight md:text-5xl">{s.title}</h1>
            <p className="mt-5 max-w-2xl text-lg text-muted-foreground">{s.overview}</p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              {[
                { icon: BookOpen, t: `${s.units.length} modules · ${lessons} lessons` },
                { icon: Clock, t: `${s.study_hours ?? "—"} hours of study` },
                {
                  icon: Award,
                  t: `Pass mark ${s.pass_mark}%${s.final_attempts ? ` · ${s.final_attempts} attempts` : ""}`,
                },
                ...(s.practical ? [{ icon: Triangle, t: "Practical assessment" }] : []),
              ].map(({ icon: Icon, t }) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5"
                >
                  <Icon className="h-4 w-4 text-primary" /> {t}
                </span>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to={cta.to}
                params={{ courseId: s.id }}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-accent to-accent/80 px-7 py-3.5 text-sm font-bold uppercase tracking-widest text-accent-foreground shadow-lg shadow-accent/30"
              >
                {cta.label} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <img
            src={courseCover(s.id)}
            alt=""
            className="w-full rounded-3xl border border-border shadow-2xl"
          />
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 pb-24 md:px-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <h2 className="text-2xl font-bold">Syllabus</h2>
          <ol className="mt-6 space-y-3">
            {s.units.map((u) => (
              <li key={u.number} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">
                      Module {u.number}
                    </div>
                    <h3 className="mt-1 font-display text-lg font-bold">{u.title}</h3>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {u.lessons} lessons
                  </span>
                </div>
                {u.intro && <p className="mt-2 text-sm text-muted-foreground">{u.intro}</p>}
              </li>
            ))}
          </ol>
        </div>
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-display text-lg font-bold">How it works</h3>
            <ul className="mt-4 space-y-3 text-sm">
              {[
                "Study online at your own pace — free",
                "Practice quiz after every module (ungraded)",
                `Final exam: ${s.pass_mark}% to pass`,
                s.practical ? "Practical assessed in person by a certified instructor" : null,
                `Certificate fee after passing: ${fee ? rwf(fee) : "none"}`,
                "A certificate number any employer can check",
              ]
                .filter(Boolean)
                .map((t) => (
                  <li key={t} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {t}
                  </li>
                ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 text-sm">
            <h3 className="font-display text-lg font-bold">Entry requirements</h3>
            <p className="mt-2 text-muted-foreground">{s.requirements}</p>
            {s.min_age && (
              <p className="mt-2 text-muted-foreground">
                Minimum age for certification: {s.min_age}.
              </p>
            )}
            {s.prerequisites.length > 0 && (
              <div className="mt-3">
                <div className="font-semibold">Complete first:</div>
                {s.prerequisites.map((p) => (
                  <Link
                    key={p.id}
                    to="/training/$courseId"
                    params={{ courseId: p.id }}
                    className="mt-1 block text-primary hover:underline"
                  >
                    <GraduationCap className="mr-1 inline h-4 w-4" /> {p.id} · {p.title}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </aside>
      </section>
    </>
  );
}
