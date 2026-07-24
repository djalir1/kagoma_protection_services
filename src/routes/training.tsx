import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero } from "@/components/page-hero";
import {
  GraduationCap, Clock, Users, Award, ArrowRight, Search, CheckCircle2,
} from "lucide-react";
import trainingImg from "@/assets/training.jpg";

export const Route = createFileRoute("/training")({
  head: () => ({
    meta: [
      { title: "Training & Development — KAGOMA Protection Services" },
      { name: "description", content: "Certified security training courses: awareness, event security, crowd management, stewarding, customer service, and emergency preparedness." },
      { property: "og:title", content: "Kagoma Training & Development" },
      { property: "og:description", content: "Professional security courses delivered by experienced practitioners." },
    ],
  }),
  component: TrainingPage,
});

type Course = {
  code: string;
  title: string;
  category: "Foundational" | "Operational" | "Leadership" | "Safety";
  duration: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  desc: string;
  outcomes: string[];
};

const courses: Course[] = [
  {
    code: "KPS-101",
    title: "Security Awareness Training",
    category: "Foundational",
    duration: "2 days",
    level: "Beginner",
    desc: "Core principles of security thinking for staff, ushers, and support teams — from threat recognition to reporting procedures.",
    outcomes: ["Threat awareness", "Reporting protocols", "Situational judgement", "Communication basics"],
  },
  {
    code: "KPS-201",
    title: "Event Security Training",
    category: "Operational",
    duration: "5 days",
    level: "Intermediate",
    desc: "End-to-end event security: from advance planning and briefings to deployment, incident handling, and post-event review.",
    outcomes: ["Deployment planning", "Access control", "Radio discipline", "Incident handling"],
  },
  {
    code: "KPS-210",
    title: "Crowd Management Training",
    category: "Operational",
    duration: "3 days",
    level: "Intermediate",
    desc: "Crowd dynamics, density management, and safe evacuation — combining theory with tabletop and live scenario exercises.",
    outcomes: ["Crowd dynamics", "Flow design", "Pit management", "Evacuation drills"],
  },
  {
    code: "KPS-215",
    title: "Steward Training",
    category: "Operational",
    duration: "3 days",
    level: "Beginner",
    desc: "Front-line stewarding built on customer-service excellence, safe intervention, and clear communication protocols.",
    outcomes: ["Ticket & access checks", "Conflict de-escalation", "First-response basics", "Guest experience"],
  },
  {
    code: "KPS-220",
    title: "Customer Service Training",
    category: "Foundational",
    duration: "2 days",
    level: "Beginner",
    desc: "Service standards for security teams operating in hospitality, corporate, and diplomatic environments.",
    outcomes: ["Guest interaction", "Protocol basics", "Complaint handling", "Professional presence"],
  },
  {
    code: "KPS-301",
    title: "Emergency Preparedness Training",
    category: "Safety",
    duration: "4 days",
    level: "Advanced",
    desc: "Emergency planning, incident command, medical coordination, and crisis communication for supervisors and coordinators.",
    outcomes: ["Incident command", "Evacuation planning", "Medical liaison", "Crisis communications"],
  },
  {
    code: "KPS-310",
    title: "Door Supervisor Certification",
    category: "Operational",
    duration: "4 days",
    level: "Intermediate",
    desc: "Professional door supervision covering search procedures, conflict management, licensing awareness, and duty of care.",
    outcomes: ["Search & screening", "Refusal protocols", "Legal awareness", "Conflict management"],
  },
  {
    code: "KPS-401",
    title: "Security Supervisor Leadership",
    category: "Leadership",
    duration: "5 days",
    level: "Advanced",
    desc: "Leadership program for supervisors and team leaders — briefings, deployment, reporting, and after-action reviews.",
    outcomes: ["Team leadership", "Deployment planning", "Reporting & documentation", "Performance review"],
  },
  {
    code: "KPS-410",
    title: "Control Room Operations",
    category: "Leadership",
    duration: "3 days",
    level: "Advanced",
    desc: "Live operations from the control room — CCTV monitoring, incident dispatch, and interagency coordination.",
    outcomes: ["CCTV discipline", "Incident dispatch", "Log-keeping", "Interagency liaison"],
  },
];

const categories = ["All", "Foundational", "Operational", "Leadership", "Safety"] as const;

const levelColor: Record<Course["level"], string> = {
  Beginner: "bg-primary/15 text-primary border-primary/40",
  Intermediate: "bg-accent/15 text-accent border-accent/40",
  Advanced: "bg-destructive/15 text-destructive border-destructive/40",
};

function TrainingPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<(typeof categories)[number]>("All");

  const filtered = courses.filter((c) => {
    const matchCat = cat === "All" || c.category === cat;
    const matchQ =
      q === "" ||
      c.title.toLowerCase().includes(q.toLowerCase()) ||
      c.desc.toLowerCase().includes(q.toLowerCase()) ||
      c.code.toLowerCase().includes(q.toLowerCase());
    return matchCat && matchQ;
  });

  return (
    <>
      <PageHero
        eyebrow="Training & Development"
        title={<>Certified courses that build <span className="text-gradient-gold">professional standards.</span></>}
        subtitle="Our training programs equip officers, stewards, and event operations staff with the discipline, awareness, and skills required to perform at the highest level."
      />

      {/* Highlight */}
      <section className="mx-auto grid max-w-7xl gap-8 px-4 pb-12 md:grid-cols-3 md:px-8">
        {[
          { icon: GraduationCap, k: "9+", v: "Active courses" },
          { icon: Users, k: "500+", v: "Personnel capacity" },
          { icon: Award, k: "100%", v: "Practitioner-led" },
        ].map(({ icon: Icon, k, v }) => (
          <div key={v} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-7 w-7" />
            </div>
            <div>
              <div className="font-display text-3xl font-bold">{k}</div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">{v}</div>
            </div>
          </div>
        ))}
      </section>

      {/* Feature image */}
      <section className="mx-auto max-w-7xl px-4 pb-16 md:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-border">
          <img src={trainingImg} alt="Training session" className="h-64 w-full object-cover md:h-80" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/50 to-transparent" />
          <div className="absolute inset-0 flex items-center p-8 md:p-14">
            <div className="max-w-lg">
              <div className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Learn from practitioners</div>
              <h2 className="mt-3 text-3xl font-bold md:text-4xl">Training rooted in real operations.</h2>
              <p className="mt-3 text-muted-foreground">
                Every course is designed and delivered by professionals who
                operate these standards on live deployments.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search courses..."
              className="w-full rounded-lg border border-border bg-background/60 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={
                  "rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-widest transition " +
                  (cat === c
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-foreground/80 hover:border-primary/60 hover:text-primary")
                }
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Courses */}
      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-12 md:grid-cols-2 md:px-8 lg:grid-cols-3">
        {filtered.map((c) => (
          <article
            key={c.code}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 transition hover:border-primary/60 hover:-translate-y-1"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent opacity-0 transition group-hover:opacity-100" />
            <div className="flex items-center justify-between">
              <span className="font-display text-xs text-primary">{c.code}</span>
              <span className={"rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest " + levelColor[c.level]}>
                {c.level}
              </span>
            </div>
            <h3 className="mt-3 font-display text-xl font-bold leading-tight">{c.title}</h3>
            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {c.duration}</span>
              <span>·</span>
              <span>{c.category}</span>
            </div>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
            <ul className="mt-5 space-y-1.5">
              {c.outcomes.map((o) => (
                <li key={o} className="flex items-start gap-2 text-xs text-foreground/85">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-primary shrink-0" />
                  {o}
                </li>
              ))}
            </ul>
            <Link
              to="/contact"
              className="mt-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary hover:gap-3 transition-all"
            >
              Enrol / enquire <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </article>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
            No courses match your search.
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-24 md:px-8">
        <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-[color:var(--onyx)] to-[color:var(--ink)] p-10 md:p-16">
          <div className="grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-center">
            <div>
              <h2 className="text-3xl font-bold md:text-4xl">In-house corporate training</h2>
              <p className="mt-4 max-w-xl text-muted-foreground">
                We deliver tailored programs on-site for hotels, corporates,
                embassies, and event organizations. Contact us to co-design a
                curriculum for your team.
              </p>
            </div>
            <div className="flex md:justify-end">
              <Link to="/contact" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-accent to-accent/80 px-7 py-3.5 text-sm font-bold uppercase tracking-widest text-accent-foreground shadow-lg shadow-accent/30 hover:brightness-110 transition">
                Request curriculum <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}