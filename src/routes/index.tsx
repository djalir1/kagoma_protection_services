import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ShieldCheck,
  Users,
  Radio,
  Siren,
  ClipboardCheck,
  GraduationCap,
  ArrowRight,
  CheckCircle2,
  Building2,
  Trophy,
  ChevronRight,
  BadgeCheck,
  Briefcase,
  UserRound,
  Search,
} from "lucide-react";
import { EagleBadge } from "@/components/eagle-badge";
import { CourseCard } from "@/components/app/course-card";
import { fetchCourses, type Course } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import heroImg from "@/assets/hero.jpg";
import eventsImg from "@/assets/events.jpg";
import controlImg from "@/assets/control.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KAGOMA Protection Services — Event Security, Training & Consultancy" },
      {
        name: "description",
        content:
          "Event security management, security risk consultancy and assessed professional training in Rwanda. Every Kagoma certificate carries a number an employer can check.",
      },
      { property: "og:title", content: "KAGOMA Protection Services" },
      {
        property: "og:description",
        content: "Protection, training and a certificate an employer can check.",
      },
    ],
  }),
  component: Home,
});

const capabilities = [
  {
    icon: ShieldCheck,
    title: "Event Security Management",
    desc: "Planning, staffing and supervising security for concerts, conferences, sports and corporate events.",
  },
  {
    icon: Users,
    title: "Crowd Management",
    desc: "Stewarding, queue control, density and safe egress at venues of every size.",
  },
  {
    icon: Radio,
    title: "Control Room Operations",
    desc: "Live coordination, incident dispatch and integrated radio communications.",
  },
  {
    icon: Siren,
    title: "Emergency Preparedness",
    desc: "Evacuation, medical and crisis protocols in place before the doors open.",
  },
  {
    icon: ClipboardCheck,
    title: "Security Risk Consultancy",
    desc: "Threat and vulnerability assessments, audits and defensible security plans.",
  },
  {
    icon: GraduationCap,
    title: "Training & Certification",
    desc: "20 assessed courses, bilingual, with certificates any employer can verify.",
  },
];

const audiences = [
  {
    icon: GraduationCap,
    title: "Learners",
    desc: "Study 20 courses free, sit the final exam and earn a numbered certificate.",
    cta: "Start learning",
    to: "/signup",
    search: { type: "student" as const },
  },
  {
    icon: BadgeCheck,
    title: "Professionals",
    desc: "Certified and vetted? List your profile so employers can find and contact you.",
    cta: "Build your profile",
    to: "/signup",
    search: { type: "student" as const },
  },
  {
    icon: Building2,
    title: "Employers",
    desc: "Search identity-checked, certified security professionals and post jobs.",
    cta: "Hire talent",
    to: "/signup",
    search: { type: "employer" as const },
  },
  {
    icon: Briefcase,
    title: "Clients",
    desc: "Request security for your event and follow it from assessment to final report.",
    cta: "Request security",
    to: "/signup",
    search: { type: "client" as const },
  },
];

function Home() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [ref, setRef] = useState("");

  useEffect(() => {
    fetchCourses()
      .then((c) => setCourses(c.slice(0, 6)))
      .catch(() => {});
  }, []);

  return (
    <>
      <section className="relative -mt-20 overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImg} alt="" className="h-full w-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/80 to-background" />
          <div className="absolute inset-0 bg-radial-gold" />
        </div>

        <div className="relative mx-auto grid min-h-[100svh] max-w-7xl items-center gap-10 px-4 pb-16 pt-32 md:px-8 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/5 px-4 py-1.5 text-[11px] uppercase tracking-[0.25em] text-primary backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-accent" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              Discipline · Vigilance · Protection
            </div>
            <h1 className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl xl:text-7xl">
              Protection, training
              <br />
              and a certificate
              <br />
              <span className="text-gradient-gold">an employer can check.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Kagoma Protection Services plans and runs the security of events across Rwanda,
              advises on security risk, and trains the officers who do the work.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                to="/contact"
                className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-accent to-accent/80 px-7 py-3.5 text-sm font-bold uppercase tracking-widest text-accent-foreground shadow-2xl shadow-accent/40 transition hover:brightness-110"
              >
                Secure your event{" "}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </Link>
              <Link
                to="/training"
                className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-background/30 px-7 py-3.5 text-sm font-bold uppercase tracking-widest text-primary backdrop-blur transition hover:bg-primary hover:text-primary-foreground"
              >
                Explore courses
              </Link>
            </div>
            <div className="mt-12 grid max-w-xl grid-cols-3 gap-6 border-t border-border/60 pt-8">
              {[
                { k: "30", v: "Officers deployed at KCC" },
                { k: "20", v: "Assessed courses" },
                { k: "24/7", v: "Operations desk" },
              ].map((s) => (
                <div key={s.v}>
                  <div className="font-display text-3xl font-bold text-primary">{s.k}</div>
                  <div className="mt-1 text-[11px] uppercase tracking-widest text-muted-foreground">
                    {s.v}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <EagleBadge className="mx-auto h-[360px] w-full max-w-md sm:h-[460px] lg:h-[560px]" />
        </div>

        <div className="relative border-y border-border/50 bg-[color:var(--onyx)]/60 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 md:flex-row md:items-center md:px-8">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-5 w-5 text-primary" /> Check a Kagoma certificate
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (ref.trim()) navigate({ to: "/verify", search: { ref: ref.trim() } });
              }}
              className="flex flex-1 gap-2 md:max-w-xl md:ml-auto"
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={ref}
                  onChange={(e) => setRef(e.target.value)}
                  placeholder="KAGOMA-CERT-2026-000125"
                  className="w-full rounded-full border border-border bg-background/70 py-2.5 pl-9 pr-4 font-mono text-sm outline-none focus:border-primary"
                />
              </div>
              <button className="rounded-full bg-primary px-5 text-xs font-bold uppercase tracking-widest text-primary-foreground">
                Check
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-24 md:px-8">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
              What we do
            </div>
            <h2 className="mt-3 max-w-2xl text-4xl font-bold leading-tight md:text-5xl">
              Every stage of your event — <span className="text-gradient-gold">covered.</span>
            </h2>
          </div>
          <Link
            to="/services"
            className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-primary transition-all hover:gap-3"
          >
            All services <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {capabilities.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-8 transition-all hover:-translate-y-1 hover:border-primary/60"
            >
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/5 blur-2xl transition-opacity group-hover:bg-accent/10" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 text-primary">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="relative mt-6 text-xl font-bold">{title}</h3>
              <p className="relative mt-3 text-sm leading-relaxed text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          Kagoma manages event security, consults and trains. Static guarding of premises and
          close-protection deployment require a Rwanda National Police licence and are not offered.
        </p>
      </section>

      <section className="relative overflow-hidden bg-[color:var(--onyx)] py-24">
        <div className="mx-auto grid max-w-7xl gap-16 px-4 md:px-8 lg:grid-cols-2">
          <div className="relative">
            <img
              src={eventsImg}
              alt="Large event crowd"
              className="rounded-2xl object-cover shield-shadow"
              loading="lazy"
            />
            <div className="absolute -bottom-6 -right-2 hidden rounded-xl border border-primary/40 bg-background/95 p-5 backdrop-blur sm:block md:-right-6">
              <Trophy className="h-6 w-6 text-primary" />
              <div className="mt-2 font-display text-2xl font-bold">Heineken Rwanda</div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                Strictly Soul · UCL Final · KCC
              </div>
            </div>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
              Proven at scale
            </div>
            <h2 className="mt-3 text-4xl font-bold leading-tight md:text-5xl">
              Trusted at Rwanda's <span className="text-gradient-gold">largest venues.</span>
            </h2>
            <p className="mt-6 leading-relaxed text-muted-foreground">
              In May 2026 Kagoma deployed 30 security personnel across two high-profile events at
              the Kigali Convention Centre — the Strictly Soul concert and the UEFA Champions League
              Final watch event — both for Heineken Rwanda.
            </p>
            <ul className="mt-8 space-y-3">
              {[
                "Advance risk assessment for every venue",
                "Integrated stewarding, access control and VIP guest management",
                "Live control room with incident coordination",
                "Post-event report for the client",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3 text-sm text-foreground/90">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" /> {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-24 md:px-8">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
              Kagoma Academy
            </div>
            <h2 className="mt-3 max-w-2xl text-4xl font-bold leading-tight md:text-5xl">
              Learn free. <span className="text-gradient-gold">Get certified.</span>
            </h2>
            <p className="mt-4 max-w-xl text-muted-foreground">
              Bilingual courses in security, safety and risk management. Pay only for the
              certificate, once you pass.
            </p>
          </div>
          <Link
            to="/training"
            className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-primary transition-all hover:gap-3"
          >
            All 20 courses <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <Link key={c.id} to="/training/$courseId" params={{ courseId: c.id }} className="block">
              <CourseCard course={c} />
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-border/60 bg-[color:var(--onyx)]/50 py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="text-center">
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
              One platform
            </div>
            <h2 className="mx-auto mt-3 max-w-3xl text-4xl font-bold leading-tight md:text-5xl">
              One account. <span className="text-gradient-gold">Your dashboard.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Sign up once and Kagoma takes you to the dashboard for what you do — learning, hiring
              or buying security.
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {audiences.map(({ icon: Icon, title, desc, cta, to, search }) => (
              <div
                key={title}
                className="flex flex-col rounded-2xl border border-border bg-card p-6 transition hover:border-primary/60"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 font-display text-xl font-bold">{title}</h3>
                <p className="mt-2 flex-1 text-sm text-muted-foreground">{desc}</p>
                <Link
                  to={session ? "/dashboard" : to}
                  search={session ? undefined : search}
                  className="mt-5 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary"
                >
                  {session ? "Open dashboard" : cta} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/careers"
              className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-semibold hover:border-primary/60"
            >
              <UserRound className="h-4 w-4 text-primary" /> Looking for event work? Join the talent
              pool
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-24 md:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
              Industries
            </div>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">
              Serving the organisations that{" "}
              <span className="text-gradient-gold">shape Rwanda.</span>
            </h2>
            <div className="mt-8 flex flex-wrap gap-2">
              {[
                "Government",
                "Embassies",
                "International organisations",
                "Hotels & hospitality",
                "Conference centres",
                "Corporate",
                "Concert organisers",
                "Sports events",
                "Universities",
                "Religious organisations",
                "NGOs",
                "Exhibitions",
                "Weddings & private events",
              ].map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-4 py-2 text-sm text-foreground/85"
                >
                  <Building2 className="h-3.5 w-3.5 text-primary" /> {tag}
                </span>
              ))}
            </div>
            <Link
              to="/industries"
              className="mt-8 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-primary"
            >
              See how we serve each <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <img
            src={controlImg}
            alt="Control room"
            className="rounded-2xl object-cover shield-shadow"
            loading="lazy"
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-24 md:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-[color:var(--onyx)] via-[color:var(--ink)] to-[color:var(--onyx)] p-10 md:p-20">
          <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative grid gap-10 md:grid-cols-[1.4fr_1fr] md:items-center">
            <div>
              <h2 className="text-4xl font-bold leading-tight md:text-5xl">
                Ready to <span className="text-gradient-gold">secure</span> your next event?
              </h2>
              <p className="mt-5 max-w-lg text-muted-foreground">
                Tell us about your event. We assess it, quote, deploy and report — and you follow
                every step in your client dashboard.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Link
                to="/contact"
                className="rounded-full bg-gradient-to-r from-accent to-accent/80 px-7 py-4 text-center text-sm font-bold uppercase tracking-widest text-accent-foreground shadow-2xl shadow-accent/30 transition hover:brightness-110"
              >
                Request security
              </Link>
              <a
                href="tel:+250788225262"
                className="rounded-full border border-primary/50 px-7 py-4 text-center text-sm font-bold uppercase tracking-widest text-primary transition hover:bg-primary hover:text-primary-foreground"
              >
                +250 788 225 262
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
