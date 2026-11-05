import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  GraduationCap,
  BookOpen,
  Award,
  ArrowRight,
  Search,
  ShieldCheck,
  Languages,
  Smartphone,
  BadgeCheck,
} from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { CourseCard } from "@/components/app/course-card";
import { useAuth } from "@/lib/auth";
import { fetchCourses, type Course } from "@/lib/queries";
import { Loading } from "@/components/app/kit";
import trainingImg from "@/assets/training.jpg";

export const Route = createFileRoute("/training/")({
  head: () => ({
    meta: [
      { title: "Training & Development — KAGOMA Protection Services" },
      {
        name: "description",
        content:
          "20 assessed courses in security, safety and risk management, including the 8-volume Executive Protection programme. Free to study, bilingual, with verifiable certificates.",
      },
      { property: "og:title", content: "Kagoma Training & Development" },
    ],
  }),
  component: TrainingPage,
});

const tracks = [
  { id: "all", label: "All courses" },
  { id: "core", label: "Professional courses" },
  { id: "ep", label: "Executive Protection" },
] as const;

function TrainingPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [q, setQ] = useState("");
  const [track, setTrack] = useState<(typeof tracks)[number]["id"]>("all");
  const [ref, setRef] = useState("");

  useEffect(() => {
    fetchCourses()
      .then(setCourses)
      .catch(() => setCourses([]));
  }, []);

  const list = useMemo(
    () =>
      (courses ?? []).filter(
        (c) =>
          (track === "all" || c.track === track) &&
          (!q || `${c.id} ${c.title} ${c.description}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [courses, track, q],
  );

  return (
    <>
      <PageHero
        eyebrow="Training & Development"
        title={
          <>
            Professional education in security,{" "}
            <span className="text-gradient-gold">safety & risk management.</span>
          </>
        }
        subtitle="Structured courses that build practical knowledge, operational competence and professional standards. Study online for free — pay only for the certificate once you pass."
      >
        <div className="flex flex-wrap gap-3">
          <Link
            to={session ? "/dashboard/catalog" : "/signup"}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-accent to-accent/80 px-7 py-3.5 text-sm font-bold uppercase tracking-widest text-accent-foreground shadow-lg shadow-accent/30"
          >
            {session ? "Go to my courses" : "Start learning free"}{" "}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/verify"
            className="inline-flex items-center gap-2 rounded-full border border-primary/40 px-7 py-3.5 text-sm font-bold uppercase tracking-widest text-primary"
          >
            Verify a certificate
          </Link>
        </div>
      </PageHero>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 pb-12 sm:grid-cols-2 md:px-8 lg:grid-cols-4">
        {[
          { icon: GraduationCap, k: "20", v: "Assessed courses" },
          { icon: BookOpen, k: "550+", v: "Lessons" },
          { icon: Languages, k: "EN · RW", v: "Every lesson, both languages" },
          { icon: Award, k: "70%", v: "Pass mark · 3 attempts" },
        ].map(({ icon: Icon, k, v }) => (
          <div
            key={v}
            className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <div className="font-display text-2xl font-bold">{k}</div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">{v}</div>
            </div>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search courses…"
              className="w-full rounded-lg border border-border bg-background/60 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {tracks.map((t) => (
              <button
                key={t.id}
                onClick={() => setTrack(t.id)}
                className={`rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-widest transition ${track === t.id ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground/80 hover:border-primary/60 hover:text-primary"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        {!courses ? (
          <Loading />
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {list.map((c) => (
              <Link
                key={c.id}
                to="/training/$courseId"
                params={{ courseId: c.id }}
                className="block"
              >
                <CourseCard
                  course={c}
                  footer={
                    <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
                      View syllabus <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  }
                />
              </Link>
            ))}
            {!list.length && (
              <p className="col-span-full rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
                No courses match your search.
              </p>
            )}
          </div>
        )}
        <p className="mt-4 text-xs text-muted-foreground">
          <span className="text-accent">▲ Practical</span> components are delivered and assessed in
          person by certified instructors.
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 md:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-border">
          <img
            src={trainingImg}
            alt="Training session"
            className="h-80 w-full object-cover md:h-96"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/20" />
          <div className="absolute inset-0 flex items-center p-6 md:p-14">
            <div className="grid max-w-3xl gap-6 sm:grid-cols-2">
              {[
                {
                  icon: Smartphone,
                  t: "Study anywhere",
                  d: "Text lessons that open on a phone and a slow connection.",
                },
                {
                  icon: BookOpen,
                  t: "Practice as you go",
                  d: "An ungraded quiz after every module.",
                },
                {
                  icon: Award,
                  t: "Sit the final",
                  d: "70% to pass, three attempts, no charge to sit.",
                },
                {
                  icon: BadgeCheck,
                  t: "Get a checkable certificate",
                  d: "Pay the certificate fee after passing. Employers verify it in seconds.",
                },
              ].map(({ icon: Icon, t, d }) => (
                <div key={t} className="flex gap-3">
                  <Icon className="h-6 w-6 shrink-0 text-primary" />
                  <div>
                    <div className="font-semibold">{t}</div>
                    <div className="text-sm text-muted-foreground">{d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-24 md:px-8 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-8">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">Check a certificate</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter the number printed on a Kagoma certificate.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (ref.trim()) navigate({ to: "/verify", search: { ref: ref.trim() } });
            }}
            className="mt-5 flex flex-col gap-3 sm:flex-row"
          >
            <input
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder="KAGOMA-CERT-2026-000125"
              className="w-full rounded-lg border border-border bg-background/60 px-4 py-3 font-mono text-sm outline-none focus:border-primary"
            />
            <button className="rounded-lg bg-primary px-6 py-3 text-xs font-bold uppercase tracking-widest text-primary-foreground">
              Check
            </button>
          </form>
        </div>
        <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-[color:var(--onyx)] to-[color:var(--ink)] p-8">
          <h2 className="text-2xl font-bold">In-house corporate training</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Tailored programmes on-site for hotels, corporates, embassies and event organisations.
          </p>
          <Link
            to="/contact"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-accent to-accent/80 px-6 py-3 text-xs font-bold uppercase tracking-widest text-accent-foreground"
          >
            Request a curriculum <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
