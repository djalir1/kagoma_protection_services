import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck, Users, Radio, Siren, ClipboardCheck, GraduationCap,
  ArrowRight, CheckCircle2, Star, Building2, Trophy, ChevronRight,
} from "lucide-react";
import { KagomaLogo } from "@/components/logo";
import heroImg from "@/assets/hero.jpg";
import eventsImg from "@/assets/events.jpg";
import controlImg from "@/assets/control.jpg";
import vipImg from "@/assets/vip.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KAGOMA Protection Services — Event Security & Consultancy" },
      { name: "description", content: "Trusted event security, crowd management, and consultancy across Rwanda and East Africa. Discipline. Vigilance. Excellence." },
      { property: "og:title", content: "KAGOMA Protection Services" },
      { property: "og:description", content: "Professional event security and consultancy — delivered with discipline and operational excellence." },
    ],
  }),
  component: Home,
});

const highlights = [
  { icon: ShieldCheck, title: "Event Security", desc: "End-to-end security for concerts, festivals, sports, and corporate events." },
  { icon: Users, title: "Crowd Management", desc: "Stewarding, queue control, and safe flow across venues of every size." },
  { icon: Radio, title: "Control Room Ops", desc: "Live coordination, incident dispatch, and integrated communications." },
  { icon: Siren, title: "Emergency Response", desc: "Evacuation, medical, and crisis protocols ready before the doors open." },
  { icon: ClipboardCheck, title: "Security Consultancy", desc: "Risk assessments, audits, and business continuity plans." },
  { icon: GraduationCap, title: "Training & Development", desc: "Certified programs for officers, stewards, and event operations staff." },
];

const stats = [
  { k: "30+", v: "Officers deployed at KCC" },
  { k: "2", v: "Major Heineken events (May 2026)" },
  { k: "10+", v: "Industries served" },
  { k: "24/7", v: "Operations coverage" },
];

function Home() {
  return (
    <>
      <section className="relative -mt-20 overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImg} alt="" className="h-full w-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/70 to-background" />
          <div className="absolute inset-0 bg-radial-gold" />
        </div>

        <div className="relative mx-auto flex min-h-[100svh] max-w-7xl flex-col justify-center px-4 pt-32 pb-24 md:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/5 px-4 py-1.5 text-xs uppercase tracking-[0.25em] text-primary backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-accent" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              Trusted Security · Rwanda · East Africa
            </div>

            <h1 className="mt-6 text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl lg:text-8xl">
              <span className="text-foreground">Security that</span>
              <br />
              <span className="text-gradient-gold">safeguards success.</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              KAGOMA Protection Services delivers integrated event security,
              crowd management, and consultancy — built on advance planning,
              risk reduction, and disciplined operational leadership.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                to="/contact"
                className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-accent to-accent/80 px-7 py-3.5 text-sm font-bold uppercase tracking-widest text-accent-foreground shadow-2xl shadow-accent/40 transition hover:brightness-110"
              >
                Secure your event
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </Link>
              <Link
                to="/services"
                className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-background/30 px-7 py-3.5 text-sm font-bold uppercase tracking-widest text-primary backdrop-blur transition hover:bg-primary hover:text-primary-foreground"
              >
                Explore services
              </Link>
            </div>

            <div className="mt-14 grid max-w-2xl grid-cols-2 gap-6 border-t border-border/60 pt-8 md:grid-cols-4">
              {stats.map((s) => (
                <div key={s.v}>
                  <div className="font-display text-3xl font-bold text-primary">{s.k}</div>
                  <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">{s.v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="pointer-events-none absolute right-8 top-1/2 hidden -translate-y-1/2 lg:block">
            <div className="relative">
              <div className="absolute inset-0 -m-8 rounded-full bg-primary/10 blur-3xl" />
              <KagomaLogo className="relative h-72 w-72 drop-shadow-[0_20px_50px_rgba(200,30,30,0.35)]" />
            </div>
          </div>
        </div>

        <div className="relative border-y border-border/50 bg-[color:var(--onyx)]/60 backdrop-blur">
          <div className="flex overflow-hidden">
            <div className="flex shrink-0 animate-marquee gap-16 whitespace-nowrap py-4 pr-16 font-display text-sm uppercase tracking-[0.35em] text-muted-foreground">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex gap-16">
                  <span>Integrity</span><span className="text-primary">✦</span>
                  <span>Professionalism</span><span className="text-primary">✦</span>
                  <span>Discipline</span><span className="text-primary">✦</span>
                  <span>Vigilance</span><span className="text-primary">✦</span>
                  <span>Accountability</span><span className="text-primary">✦</span>
                  <span>Respect</span><span className="text-primary">✦</span>
                  <span>Excellence</span><span className="text-primary">✦</span>
                  <span>Teamwork</span><span className="text-primary">✦</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-24 md:px-8">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Capabilities</div>
            <h2 className="mt-3 max-w-2xl text-4xl font-bold leading-tight md:text-5xl">
              Every stage of your event — <span className="text-gradient-gold">covered.</span>
            </h2>
          </div>
          <Link to="/services" className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-primary hover:gap-3 transition-all">
            All services <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {highlights.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-8 transition-all hover:border-primary/60 hover:-translate-y-1"
            >
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/5 blur-2xl transition-opacity group-hover:bg-accent/10" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 text-primary">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="relative mt-6 text-xl font-bold">{title}</h3>
              <p className="relative mt-3 text-sm leading-relaxed text-muted-foreground">{desc}</p>
              <div className="relative mt-6 h-px w-full bg-gradient-to-r from-primary/40 to-transparent" />
            </div>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden bg-[color:var(--onyx)] py-24">
        <div className="mx-auto grid max-w-7xl gap-16 px-4 lg:grid-cols-2 md:px-8">
          <div className="relative">
            <img src={eventsImg} alt="Large event crowd" className="rounded-2xl object-cover shield-shadow" loading="lazy" />
            <div className="absolute -bottom-6 -right-6 hidden rounded-xl border border-primary/40 bg-background/95 p-5 backdrop-blur md:block">
              <Trophy className="h-6 w-6 text-primary" />
              <div className="mt-2 font-display text-2xl font-bold">Heineken Rwanda</div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Strictly Soul · UCL Final · KCC</div>
            </div>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Proven at scale</div>
            <h2 className="mt-3 text-4xl font-bold leading-tight md:text-5xl">
              Trusted at Rwanda's <span className="text-gradient-gold">largest venues.</span>
            </h2>
            <p className="mt-6 text-base leading-relaxed text-muted-foreground">
              In May 2026, Kagoma deployed 30 security personnel across two
              high-profile events at the Kigali Convention Centre — the
              Strictly Soul concert and the UEFA Champions League Final Watch
              Event — both delivered for Heineken Rwanda. Zero-incident
              operations. Uncompromising standards.
            </p>
            <ul className="mt-8 space-y-3">
              {[
                "Advance risk assessment for every venue",
                "Integrated stewarding, access control and VIP support",
                "Live control room with incident coordination",
                "Post-event evaluation and reporting",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3 text-sm text-foreground/90">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary shrink-0" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-24 md:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Why KAGOMA</div>
            <h2 className="mt-3 text-4xl font-bold md:text-5xl">
              Security is preparation, <br /> not just presence.
            </h2>
            <p className="mt-6 max-w-xl text-muted-foreground">
              Our culture is built on proactive security management — identifying
              risks early, implementing mitigation, and monitoring operations
              continuously to safeguard both safety and the success of every engagement.
            </p>
            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              {[
                { t: "Event Security Expertise", d: "Concerts, festivals, sports, conferences, corporate & private events." },
                { t: "Comprehensive Solutions", d: "Planning, risk assessment, deployment, supervision, post-event review." },
                { t: "Highly Trained Personnel", d: "Continuous training in customer service, emergency response, and conflict management." },
                { t: "Client-Centered Approach", d: "Plans tailored to venue, audience profile, and identified risks." },
              ].map((x) => (
                <div key={x.t} className="border-l-2 border-primary/60 pl-4">
                  <div className="font-display text-lg font-bold">{x.t}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{x.d}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <img src={controlImg} alt="Control room" className="col-span-2 rounded-2xl object-cover shield-shadow" loading="lazy" />
            <img src={vipImg} alt="VIP protection" className="rounded-2xl object-cover" loading="lazy" />
            <div className="rounded-2xl border border-primary/40 bg-gradient-to-br from-accent/20 to-primary/10 p-6">
              <Star className="h-6 w-6 text-primary" />
              <div className="mt-3 font-display text-lg font-bold leading-tight">
                "A trusted partner for high-stakes operations."
              </div>
              <div className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">
                — Managing Director, Cyubahiro Elyse Honore
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border/60 bg-[color:var(--onyx)]/50 py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Industries</div>
              <h2 className="mt-3 text-3xl font-bold md:text-4xl">
                Serving the organizations that <span className="text-gradient-gold">shape Rwanda.</span>
              </h2>
            </div>
            <Link to="/industries" className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-primary hover:gap-3 transition-all">
              See all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap gap-2">
            {[
              "Government", "Embassies & Diplomatic Missions", "International Organizations",
              "Hotels & Hospitality", "Conference Centres", "Corporate", "Concert Organizers",
              "Sports Events", "Universities", "Religious Organizations", "NGOs", "Exhibitions",
              "Weddings & Private Events", "Entertainment Venues",
            ].map((tag) => (
              <span key={tag} className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-4 py-2 text-sm text-foreground/85 backdrop-blur transition hover:border-primary/60 hover:text-primary">
                <Building2 className="h-3.5 w-3.5 text-primary" /> {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-24 md:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-[color:var(--onyx)] via-[color:var(--ink)] to-[color:var(--onyx)] p-12 md:p-20">
          <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative grid gap-10 md:grid-cols-[1.4fr_1fr] md:items-center">
            <div>
              <h2 className="text-4xl font-bold leading-tight md:text-5xl">
                Ready to <span className="text-gradient-gold">safeguard</span> your next event?
              </h2>
              <p className="mt-5 max-w-lg text-muted-foreground">
                Talk to our team about a tailored security plan — from a single
                private event to multi-day festivals and government engagements.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Link to="/contact" className="rounded-full bg-gradient-to-r from-accent to-accent/80 px-7 py-4 text-center text-sm font-bold uppercase tracking-widest text-accent-foreground shadow-2xl shadow-accent/30 hover:brightness-110 transition">
                Request a consultation
              </Link>
              <a href="tel:+250" className="rounded-full border border-primary/50 px-7 py-4 text-center text-sm font-bold uppercase tracking-widest text-primary hover:bg-primary hover:text-primary-foreground transition">
                Call operations line
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}