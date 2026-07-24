import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero } from "@/components/page-hero";
import {
  ShieldCheck, Users, Siren, GraduationCap, ClipboardList,
  Radio, DoorOpen, Star, ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Services — KAGOMA Protection Services" },
      { name: "description", content: "Event security, crowd management, security consultancy, emergency response, and training services." },
      { property: "og:title", content: "Kagoma Service Portfolio" },
      { property: "og:description", content: "A complete portfolio of security, event, emergency, and training services." },
    ],
  }),
  component: ServicesPage,
});

const portfolio = [
  {
    icon: ShieldCheck,
    code: "01",
    title: "Security Services",
    items: [
      "Event Security Management",
      "Security Consultancy",
      "Security Risk Assessment",
      "Event Safety Planning",
      "Security Operations Coordination",
    ],
  },
  {
    icon: Users,
    code: "02",
    title: "Event Support Services",
    items: [
      "Crowd Management",
      "Stewarding Services",
      "Protocol Services",
      "Professional Ushers",
      "Door Supervisors (Bouncers)",
      "Access Control",
      "Queue Management",
      "VIP Guest Management",
      "Event Operations Support",
    ],
  },
  {
    icon: Siren,
    code: "03",
    title: "Emergency & Safety",
    items: [
      "Emergency Response Planning",
      "Incident Management",
      "Evacuation Planning",
      "Fire Safety Coordination",
      "Medical Response Coordination",
      "Crisis Management Support",
    ],
  },
  {
    icon: GraduationCap,
    code: "04",
    title: "Training & Advisory",
    items: [
      "Security Awareness Training",
      "Event Security Training",
      "Crowd Management Training",
      "Steward Training",
      "Customer Service Training",
      "Emergency Preparedness Training",
    ],
  },
];

const eventOps = [
  "Event Operations Management", "Event Security Management", "Event Planning Support",
  "Venue Operations Coordination", "Event Logistics Coordination", "Staff Coordination",
  "Crowd Management", "Stewarding Services", "Protocol & Ushers Services",
  "Access Control Management", "Event Safety Coordination",
];

const consultancy = [
  "Security Risk Assessment", "Event Security Planning", "Security Audits",
  "Security Surveys", "Emergency Response Planning", "Business Continuity Planning",
  "Crisis Management Support", "Security Policies & Procedures", "Security Training",
  "Operational Reviews",
];

const contract = [
  { icon: Users, label: "Contract Event Security Personnel" },
  { icon: Star, label: "Event Security Deployment" },
  { icon: ShieldCheck, label: "Security Supervisors" },
  { icon: ClipboardList, label: "Event Operations Staff" },
  { icon: Radio, label: "Control Room Operations" },
  { icon: DoorOpen, label: "Access Control Teams" },
  { icon: Users, label: "Crowd Safety Teams" },
  { icon: Star, label: "VIP Support Teams" },
  { icon: Siren, label: "Emergency Response Teams" },
];

function ServicesPage() {
  return (
    <>
      <PageHero
        eyebrow="Our Service Portfolio"
        title={<>A complete portfolio of <span className="text-gradient-gold">protection.</span></>}
        subtitle="From advance planning to on-the-ground execution, Kagoma delivers integrated operational and security solutions across the full lifecycle of your event or organization."
      />

      <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-16 md:grid-cols-2 md:px-8">
        {portfolio.map(({ icon: Icon, code, title, items }) => (
          <div key={title} className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 transition hover:border-primary/60">
            <div className="flex items-start justify-between">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 text-primary">
                <Icon className="h-7 w-7" />
              </div>
              <div className="font-display text-4xl font-bold text-primary/20">{code}</div>
            </div>
            <h3 className="mt-6 font-display text-2xl font-bold">{title}</h3>
            <ul className="mt-5 space-y-2">
              {items.map((it) => (
                <li key={it} className="flex items-start gap-2 text-sm text-foreground/85">
                  <ArrowRight className="mt-0.5 h-4 w-4 text-primary shrink-0" />
                  {it}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {/* Event Organization Detail */}
      <section className="border-y border-border/60 bg-[color:var(--onyx)] py-20">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 md:px-8 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Business Activity · SM749008</div>
            <h2 className="mt-3 text-4xl font-bold md:text-5xl">
              Event Organization <br /> & <span className="text-gradient-gold">Management</span>
            </h2>
            <p className="mt-6 text-muted-foreground leading-relaxed">
              Professional event organization support, operations coordination,
              and safety management for conferences, conventions, exhibitions,
              concerts, festivals, sporting events, corporate functions, and
              private events.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {eventOps.map((it, i) => (
              <div key={it} className="flex items-center gap-3 rounded-xl border border-border bg-background/60 p-4">
                <span className="font-display text-xs text-primary">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-sm">{it}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Consultancy */}
      <section className="mx-auto grid max-w-7xl gap-12 px-4 py-24 md:px-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="grid gap-2 sm:grid-cols-2">
          {consultancy.map((it, i) => (
            <div key={it} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
              <span className="font-display text-xs text-primary">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-sm">{it}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Business Activity · SK661205</div>
          <h2 className="mt-3 text-4xl font-bold md:text-5xl">
            Security <br /> <span className="text-gradient-gold">Consultancy</span>
          </h2>
          <p className="mt-6 text-muted-foreground leading-relaxed">
            Strategic advisory built on structured methodology and international
            standards. We help clients understand risks, harden operations, and
            respond decisively when circumstances change.
          </p>
        </div>
      </section>

      {/* Contract Operations */}
      <section className="border-t border-border/60 bg-[color:var(--onyx)] py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Operational Support</div>
          <h2 className="mt-3 text-4xl font-bold md:text-5xl">
            Contract-based <span className="text-gradient-gold">event security.</span>
          </h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            We support clients through professional security operations and
            contract-based event security services — deployed at the scale your
            engagement demands.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {contract.map(({ icon: Icon, label }) => (
              <div key={label} className="group flex items-center gap-4 rounded-xl border border-border bg-background/60 p-5 transition hover:border-primary/60 hover:-translate-y-0.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="text-sm font-semibold">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 md:px-8">
        <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-[color:var(--onyx)] to-[color:var(--ink)] p-12 text-center">
          <h2 className="text-3xl font-bold md:text-4xl">
            Not sure where to start?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Book a discovery call — we'll assess your requirements and propose
            a tailored plan within 48 hours.
          </p>
          <Link to="/contact" className="mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-accent to-accent/80 px-7 py-3.5 text-sm font-bold uppercase tracking-widest text-accent-foreground shadow-lg shadow-accent/30 hover:brightness-110 transition">
            Start the conversation <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}