import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero } from "@/components/page-hero";
import {
  GraduationCap,
  Users,
  Award,
  ArrowRight,
  Search,
  BadgeCheck,
  XCircle,
  Loader2,
  BookOpen,
  Briefcase,
  Building2,
  UserRound,
  ShieldCheck,
  FileCheck2,
} from "lucide-react";
import trainingImg from "@/assets/training.jpg";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/training")({
  head: () => ({
    meta: [
      { title: "Training & Development — KAGOMA Protection Services" },
      {
        name: "description",
        content:
          "Kagoma Professional Training Courses: 20 structured courses in security, safety and risk management, including the 8-volume Executive Protection programme. Study online, sit assessments and earn verifiable certificates.",
      },
      { property: "og:title", content: "Kagoma Training & Development" },
      {
        property: "og:description",
        content: "Professional education in security, safety and risk management.",
      },
    ],
  }),
  component: TrainingPage,
});

// The academy platform (student portal, course player, certificates)
// is served from /academy.
const ACADEMY = "/academy";

type Course = {
  code: string;
  track: "core" | "ep";
  practical: boolean;
  title: string;
  desc: string;
  scope: string;
};

const courses: Course[] = [
  {
    code: "KG-101",
    track: "core",
    practical: false,
    title: "Event Security Management",
    desc: "Planning, staffing and coordinating security for conferences, concerts and large public events.",
    scope: "6 Modules · 41 Lessons",
  },
  {
    code: "KG-102",
    track: "core",
    practical: false,
    title: "Crowd Management and Crowd Safety",
    desc: "Controlling density, flow and emergency egress where large numbers of people gather.",
    scope: "6 Modules · 41 Lessons",
  },
  {
    code: "KG-103",
    track: "core",
    practical: false,
    title: "Loss Prevention Management",
    desc: "Identifying and controlling the sources of shrinkage, theft and internal risk.",
    scope: "6 Modules · 25 Lessons",
  },
  {
    code: "KG-104",
    track: "core",
    practical: false,
    title: "Hospitality Security Management",
    desc: "Security operations tailored to hotels, resorts and guest-facing venues.",
    scope: "9 Modules · 46 Lessons",
  },
  {
    code: "KG-105",
    track: "core",
    practical: false,
    title: "International Security and Risk Management Professional",
    desc: "Cross-border risk frameworks, country assessment and travel risk for international operations.",
    scope: "6 Modules · 41 Lessons",
  },
  {
    code: "KG-106",
    track: "core",
    practical: true,
    title: "Executive Protection",
    desc: "Protective principles, intelligence, advance work, operations and professional standards.",
    scope: "6 Modules · 41 Lessons",
  },
  {
    code: "KG-107",
    track: "core",
    practical: true,
    title: "First Aid for Security Professionals",
    desc: "Emergency response, trauma priorities and basic life support for security personnel.",
    scope: "6 Modules · 41 Lessons",
  },
  {
    code: "KG-108",
    track: "core",
    practical: true,
    title: "Advanced Security Guard Course",
    desc: "Advanced access control, patrol, observation, reporting, incident response and supervision.",
    scope: "6 Modules · 41 Lessons",
  },
  {
    code: "KG-109",
    track: "core",
    practical: false,
    title: "Security Professional Etiquette",
    desc: "Conduct, communication and presentation standards for security staff.",
    scope: "6 Modules · 17 Lessons",
  },
  {
    code: "KG-110",
    track: "core",
    practical: false,
    title: "Security Risk Assessment and Security Planning",
    desc: "Threat and vulnerability assessment, risk registers and defensible security programme design.",
    scope: "6 Modules · 41 Lessons",
  },
  {
    code: "KG-111",
    track: "core",
    practical: false,
    title: "Security Operations and Incident Management",
    desc: "Running a security operation, command and control, incident response and after-action review.",
    scope: "6 Modules · 41 Lessons",
  },
  {
    code: "KG-112",
    track: "core",
    practical: true,
    title: "Close Protection / PSD Training Manager",
    desc: "Designing, delivering and safety-controlling close protection and PSD training programmes.",
    scope: "8 Modules · 50 Lessons",
  },
  {
    code: "EP-V1",
    track: "ep",
    practical: false,
    title: "Volume 1 — EP Fundamentals",
    desc: "Doctrine, the protective mindset, layers of protection and the professional ethical standard.",
    scope: "Domain I · Subjects 1–16",
  },
  {
    code: "EP-V2",
    track: "ep",
    practical: false,
    title: "Volume 2 — Protective Intelligence",
    desc: "Threat assessment methodology, behavioural indicators and surveillance detection.",
    scope: "Domain II · Subjects 17–38",
  },
  {
    code: "EP-V3",
    track: "ep",
    practical: false,
    title: "Volume 3 — Information Security",
    desc: "Reducing the information exposure that removes an adversary's need to conduct surveillance.",
    scope: "Domain III · Subjects 39–52",
  },
  {
    code: "EP-V4",
    track: "ep",
    practical: false,
    title: "Volume 4 — Planning",
    desc: "Advance work, route analysis, venue assessment, operations orders and contingency planning.",
    scope: "Domain IV · Subjects 53–100",
  },
  {
    code: "EP-V5",
    track: "ep",
    practical: true,
    title: "Volume 5 — Operations",
    desc: "Formations, movement, incident response and specialist protective situations.",
    scope: "Domain V · Subjects 101–147",
  },
  {
    code: "EP-V6",
    track: "ep",
    practical: false,
    title: "Volume 6 — Legal",
    desc: "Legal authority, use of force, rules of engagement, liability and reporting obligations.",
    scope: "Domain VI · Subjects 148–162",
  },
  {
    code: "EP-V7",
    track: "ep",
    practical: false,
    title: "Volume 7 — Business and Administrative",
    desc: "Contracts, pricing, procurement, recruitment, training management and quality systems.",
    scope: "Domain VII · Subjects 163–177",
  },
  {
    code: "EP-V8",
    track: "ep",
    practical: false,
    title: "Volume 8 — EP Leadership",
    desc: "Detail command, decision-making under stress, programme management and professional legacy.",
    scope: "Domain VIII · Subjects 178–200",
  },
];

const tracks = [
  { id: "all", label: "All courses" },
  { id: "core", label: "Professional courses" },
  { id: "ep", label: "Executive Protection" },
] as const;

const portals = [
  {
    href: `${ACADEMY}/student.html`,
    icon: GraduationCap,
    title: "Student Portal",
    desc: "Enrol, study lessons, sit module quizzes and final assessments.",
  },
  {
    href: `${ACADEMY}/certificates.html`,
    icon: FileCheck2,
    title: "Certificates",
    desc: "Public register of Kagoma certificates and their status.",
  },
  {
    href: `${ACADEMY}/professional.html`,
    icon: UserRound,
    title: "Professional Portal",
    desc: "Build your profile, list your skills and get hired.",
  },
  {
    href: `${ACADEMY}/employer.html`,
    icon: Building2,
    title: "Employer Portal",
    desc: "Find certified, vetted security professionals.",
  },
  {
    href: `${ACADEMY}/client.html`,
    icon: Briefcase,
    title: "Client Portal",
    desc: "Follow your service requests, quotations and payments.",
  },
  {
    href: `${ACADEMY}/work.html`,
    icon: Users,
    title: "Apply for Work",
    desc: "Join the Kagoma talent pool for events and shifts.",
  },
];

function TrainingPage() {
  const [q, setQ] = useState("");
  const [track, setTrack] = useState<(typeof tracks)[number]["id"]>("all");

  const filtered = courses.filter((c) => {
    const s = q.toLowerCase();
    return (
      (track === "all" || c.track === track) &&
      (s === "" ||
        c.title.toLowerCase().includes(s) ||
        c.desc.toLowerCase().includes(s) ||
        c.code.toLowerCase().includes(s))
    );
  });

  return (
    <>
      <PageHero
        eyebrow="Training & Development"
        title={
          <>
            Professional education in security,{" "}
            <span className="text-gradient-gold">safety &amp; risk management.</span>
          </>
        }
        subtitle="Kagoma Professional Training Courses provides structured professional courses designed to develop practical knowledge, operational competence and professional standards in security, safety and risk management."
      />

      {/* Highlight */}
      <section className="mx-auto grid max-w-7xl gap-8 px-4 pb-12 md:grid-cols-3 md:px-8">
        {[
          { icon: GraduationCap, k: "20", v: "Structured courses" },
          { icon: BookOpen, k: "550+", v: "Bilingual lessons (EN · RW)" },
          { icon: Award, k: "100%", v: "Verifiable certificates" },
        ].map(({ icon: Icon, k, v }) => (
          <div
            key={v}
            className="flex items-center gap-4 rounded-2xl border border-border bg-card p-6"
          >
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
          <img
            src={trainingImg}
            alt="Training session"
            className="h-64 w-full object-cover md:h-80"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/50 to-transparent" />
          <div className="absolute inset-0 flex items-center p-8 md:p-14">
            <div className="max-w-lg">
              <div className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
                Study online · assessed in person
              </div>
              <h2 className="mt-3 text-3xl font-bold md:text-4xl">
                Learn at your pace. Prove it on the ground.
              </h2>
              <p className="mt-3 text-muted-foreground">
                Theory is studied online through the student portal, with quizzes after every module
                and a final assessment. Practical components are delivered and assessed separately
                by certified instructors.
              </p>
              <a
                href={`${ACADEMY}/student.html`}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-accent to-accent/80 px-6 py-3 text-xs font-bold uppercase tracking-widest text-accent-foreground shadow-lg shadow-accent/30 transition hover:brightness-110"
              >
                Enrol as a student <ArrowRight className="h-4 w-4" />
              </a>
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
            {tracks.map((t) => (
              <button
                key={t.id}
                onClick={() => setTrack(t.id)}
                className={
                  "rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-widest transition " +
                  (track === t.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-foreground/80 hover:border-primary/60 hover:text-primary")
                }
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Courses */}
      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-12 md:grid-cols-2 md:px-8 lg:grid-cols-3">
        {filtered.map((c) => (
          <a
            key={c.code}
            href={`${ACADEMY}/student.html`}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-1 hover:border-primary/60"
          >
            <img
              src={`${ACADEMY}/img/courses/${c.code}.svg`}
              alt=""
              width={480}
              height={270}
              loading="lazy"
              className="aspect-video w-full object-cover"
            />
            <div className="flex flex-1 flex-col p-6">
              <div className="flex items-center justify-between">
                <span className="font-display text-xs text-primary">{c.code}</span>
                <span className="rounded-full border border-border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {c.track === "ep" ? "Executive Protection" : "Professional"}
                </span>
              </div>
              <h3 className="mt-3 font-display text-lg font-bold leading-tight">
                {c.title}
                {c.practical && (
                  <span className="ml-1.5 text-accent" title="Includes a practical component">
                    ▲
                  </span>
                )}
              </h3>
              <div className="mt-2 text-xs text-muted-foreground">{c.scope}</div>
              <p className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">{c.desc}</p>
              <span className="mt-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary transition-all group-hover:gap-3">
                Enrol <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </a>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
            No courses match your search.
          </div>
        )}
        <p className="col-span-full text-xs text-muted-foreground">
          <span className="text-accent">▲</span> Practical components are delivered and assessed
          separately by certified instructors.
        </p>
      </section>

      {/* Verify a certificate */}
      <section className="mx-auto max-w-7xl px-4 pb-16 md:px-8">
        <VerifyCertificate />
      </section>

      {/* Portals */}
      <section className="mx-auto max-w-7xl px-4 pb-16 md:px-8">
        <div className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
          The Kagoma platform
        </div>
        <h2 className="mt-3 text-3xl font-bold md:text-4xl">One account, every desk.</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {portals.map(({ href, icon: Icon, title, desc }) => (
            <a
              key={title}
              href={href}
              className="group flex gap-4 rounded-2xl border border-border bg-card p-6 transition hover:border-primary/60"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold group-hover:text-primary">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-24 md:px-8">
        <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-[color:var(--onyx)] to-[color:var(--ink)] p-10 md:p-16">
          <div className="grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-center">
            <div>
              <h2 className="text-3xl font-bold md:text-4xl">In-house corporate training</h2>
              <p className="mt-4 max-w-xl text-muted-foreground">
                We deliver tailored programs on-site for hotels, corporates, embassies, and event
                organizations. Contact us to co-design a curriculum or request the course brochure.
              </p>
            </div>
            <div className="flex md:justify-end">
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-accent to-accent/80 px-7 py-3.5 text-sm font-bold uppercase tracking-widest text-accent-foreground shadow-lg shadow-accent/30 hover:brightness-110 transition"
              >
                Request brochure <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

type VerifyResult = {
  found: boolean;
  status?: string;
  holder?: string;
  course?: string;
  issued?: string;
};

function VerifyCertificate() {
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    if (!ref.trim()) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("verify_certificate", { p_ref: ref.trim() });
    setResult(error || !data ? { found: false } : (data as VerifyResult));
    setBusy(false);
  }

  const ok = result?.found && result.status === "valid";

  return (
    <div className="rounded-3xl border border-border bg-card p-8 md:p-10">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Check a Kagoma certificate</h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter the certificate number printed on the document.
      </p>
      <form onSubmit={check} className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          placeholder="KAGOMA-CERT-2026-000125"
          autoComplete="off"
          className="w-full rounded-lg border border-border bg-background/60 px-4 py-3 font-mono text-sm outline-none focus:border-primary sm:max-w-md"
        />
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-xs font-bold uppercase tracking-widest text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Check
        </button>
      </form>
      {result && (
        <div
          className={
            "mt-5 flex items-start gap-3 rounded-xl border p-4 text-sm " +
            (ok ? "border-primary/40 bg-primary/10" : "border-destructive/40 bg-destructive/10")
          }
        >
          {ok ? (
            <BadgeCheck className="h-5 w-5 shrink-0 text-primary" />
          ) : (
            <XCircle className="h-5 w-5 shrink-0 text-destructive" />
          )}
          <span>
            {result.found ? (
              <>
                {result.holder} — {result.course}
                {result.issued ? `, ${result.issued}` : ""}
                {!ok && ` · ${String(result.status).toUpperCase()}`}
              </>
            ) : (
              "No certificate with that number is on the Kagoma register."
            )}
          </span>
        </div>
      )}
      <a
        href={`${ACADEMY}/certificates.html`}
        className="mt-5 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary hover:gap-3 transition-all"
      >
        Open the certificate register <ArrowRight className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
