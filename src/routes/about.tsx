import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/page-hero";
import { Compass, Eye, Target, HeartHandshake, Trophy } from "lucide-react";
import venueImg from "@/assets/venue.jpg";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — KAGOMA Protection Services" },
      {
        name: "description",
        content:
          "Kagoma Protection Services delivers strategic security solutions through advance planning, risk reduction and operational leadership.",
      },
      { property: "og:title", content: "About Kagoma Protection Services" },
      {
        property: "og:description",
        content: "Our mission, vision and values — and the events that built our reputation.",
      },
    ],
  }),
  component: AboutPage,
});

const values = [
  "Integrity",
  "Professionalism",
  "Discipline",
  "Vigilance",
  "Accountability",
  "Respect",
  "Excellence",
  "Teamwork",
  "Customer Satisfaction",
  "Continuous Learning",
];

function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="Who We Are"
        title={
          <>
            Security built on <span className="text-gradient-gold">preparation.</span>
          </>
        }
        subtitle="Kagoma Protection Services supports a diverse range of organizations through strategic security solutions that enable them to operate without disruption, in an orderly manner, and safely."
      />

      <section className="mx-auto grid max-w-7xl gap-16 px-4 py-16 md:px-8 lg:grid-cols-2">
        <div className="space-y-6 text-muted-foreground leading-relaxed">
          <p>
            We work closely with our clients to understand their objectives, identify potential
            risks, and put in place security strategies that strengthen safety while preserving a
            positive experience for guests, staff, and all stakeholders involved.
          </p>
          <p>
            Genuine security requires preparation, prevention, communication, and the ability to
            respond quickly when circumstances change. Our culture is built on proactive security
            management, where risks are identified early, mitigation measures are implemented, and
            operations are continuously monitored.
          </p>
        </div>
        <div className="rounded-2xl border border-primary/30 bg-card p-8">
          <Trophy className="h-6 w-6 text-primary" />
          <h3 className="mt-4 font-display text-2xl font-bold">Our Promise</h3>
          <p className="mt-4 text-muted-foreground">
            Every client deserves professional security services, delivered with discipline,
            transparency, and operational excellence. We are committed to building lasting
            partnerships founded on trust, reliability, and visible results.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-24 md:grid-cols-2 md:px-8">
        {[
          {
            icon: Target,
            title: "Our Mission",
            body: "To provide innovative, professional, and reliable security solutions that protect lives, property, events, and organizational reputation through well-trained personnel, high standards of operation, and continuous improvement.",
          },
          {
            icon: Eye,
            title: "Our Vision",
            body: "To be the most trusted company in the provision of event security and security consultancy services in Rwanda and East Africa.",
          },
        ].map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-2xl border border-border bg-card p-10">
            <Icon className="h-8 w-8 text-primary" />
            <h3 className="mt-6 font-display text-3xl font-bold">{title}</h3>
            <p className="mt-4 text-muted-foreground leading-relaxed">{body}</p>
          </div>
        ))}
      </section>

      <section className="bg-[color:var(--onyx)] py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
            Our Core Values
          </div>
          <h2 className="mt-3 text-4xl font-bold md:text-5xl">
            The <span className="text-gradient-gold">standards</span> we live by.
          </h2>
          <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-5">
            {values.map((v, i) => (
              <div
                key={v}
                className="group relative overflow-hidden rounded-xl border border-border bg-background/60 p-6 text-center transition hover:border-primary/60"
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent opacity-0 transition group-hover:opacity-100" />
                <div className="font-display text-xs text-primary">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="mt-2 font-display text-lg font-bold">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-12 px-4 py-24 md:px-8 lg:grid-cols-2 lg:items-center">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
            Company History
          </div>
          <h2 className="mt-3 text-4xl font-bold md:text-5xl">
            Built to fill a <span className="text-gradient-gold">professional gap.</span>
          </h2>
          <div className="mt-6 space-y-4 text-muted-foreground leading-relaxed">
            <p>
              Kagoma Protection Services was established to fill a gap in Rwanda's market for
              professional-standard event security, using structured planning approaches, risk
              management, and adherence to international standards.
            </p>
            <p>
              From its earliest days, the company focused on building a strong foundation of
              well-trained, properly prepared, and professionally disciplined staff. Under the
              leadership of Managing Director{" "}
              <span className="text-primary font-semibold">Cyubahiro Elyse Honore</span>, Kagoma has
              taken significant steps in delivering services for major events and high-profile
              clients such as Heineken Rwanda, deploying 30 security personnel across two closely
              watched events in May 2026: the Strictly Soul concert and the UEFA Champions League
              Final Watch Event, both held at the Kigali Convention Centre (KCC).
            </p>
            <p>
              These two large-scale events demonstrated Kagoma's capacity to manage large crowds,
              prevent incidents, and provide reliable security — experiences that reinforced our
              position as a trusted company in Rwanda.
            </p>
          </div>
          <div className="mt-8 flex items-center gap-4 rounded-xl border border-primary/30 bg-primary/5 p-5">
            <HeartHandshake className="h-8 w-8 text-primary shrink-0" />
            <div>
              <div className="font-display text-lg font-bold">Client-partner mindset</div>
              <div className="text-sm text-muted-foreground">
                Trust, reliability, visible results.
              </div>
            </div>
          </div>
        </div>
        <div className="relative">
          <img
            src={venueImg}
            alt="Kigali Convention Centre at night"
            className="rounded-2xl shield-shadow"
            loading="lazy"
          />
          <div className="absolute -bottom-6 left-6 rounded-xl border border-primary/40 bg-background/95 p-4 backdrop-blur">
            <Compass className="h-5 w-5 text-primary" />
            <div className="mt-2 font-display text-lg font-bold">Kigali Convention Centre</div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              Flagship venue operations
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
