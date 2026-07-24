import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/page-hero";
import {
  Landmark, Globe2, Flag, Hotel, Building2, Briefcase, Music4,
  Trophy, GraduationCap, Church, HeartHandshake, LayoutGrid, Cake, PartyPopper,
} from "lucide-react";

export const Route = createFileRoute("/industries")({
  head: () => ({
    meta: [
      { title: "Industries We Serve — KAGOMA Protection Services" },
      { name: "description", content: "Kagoma serves governments, embassies, hotels, corporates, event organizers, universities, NGOs and more." },
      { property: "og:title", content: "Industries We Serve" },
      { property: "og:description", content: "The organizations that trust Kagoma with their security operations." },
    ],
  }),
  component: IndustriesPage,
});

const industries = [
  { icon: Landmark, name: "Government Institutions", desc: "Public sector engagements requiring discretion, accreditation and strict protocol." },
  { icon: Globe2, name: "International Organizations", desc: "Multi-agency events with complex accreditation and diplomatic profiles." },
  { icon: Flag, name: "Embassies & Diplomatic Missions", desc: "Protective coverage aligned with diplomatic protocol and host-country liaison." },
  { icon: Hotel, name: "Hotels & Hospitality", desc: "Guest safety, VIP arrivals, and event support inside hospitality environments." },
  { icon: Building2, name: "Conference & Convention Centres", desc: "Access control, stewarding, and control-room operations at scale." },
  { icon: Briefcase, name: "Corporate Organizations", desc: "Board meetings, product launches, AGMs, and executive events." },
  { icon: Music4, name: "Concert & Festival Organizers", desc: "Crowd safety, pit management, artist protection, and ingress control." },
  { icon: Trophy, name: "Sports Event Organizers", desc: "Match-day operations, spectator flow, and incident coordination." },
  { icon: GraduationCap, name: "Universities & Schools", desc: "Campus events, graduation ceremonies, and awareness training." },
  { icon: Church, name: "Religious Organizations", desc: "Large-gathering safety, ushering, and access control." },
  { icon: HeartHandshake, name: "NGOs", desc: "Community events, fundraisers, and field-team support." },
  { icon: LayoutGrid, name: "Exhibition Organizers", desc: "Booth security, ingress screening, and operations coordination." },
  { icon: Cake, name: "Weddings & Private Events", desc: "Discreet protection with white-glove guest experience." },
  { icon: PartyPopper, name: "Entertainment Venues", desc: "Door supervision, VIP sections, and incident management." },
];

function IndustriesPage() {
  return (
    <>
      <PageHero
        eyebrow="Industries We Serve"
        title={<>Trusted by the organizations that <span className="text-gradient-gold">shape Rwanda.</span></>}
        subtitle="Kagoma Protection Services proudly supports a diverse range of clients — from government and diplomatic missions to festivals and private ceremonies."
      />

      <section className="mx-auto grid max-w-7xl gap-4 px-4 pb-24 md:grid-cols-2 md:px-8 lg:grid-cols-3">
        {industries.map(({ icon: Icon, name, desc }) => (
          <div
            key={name}
            className="group relative overflow-hidden rounded-2xl border border-border bg-card p-7 transition hover:border-primary/60 hover:-translate-y-1"
          >
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/5 blur-2xl opacity-0 transition group-hover:opacity-100" />
            <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 text-primary">
              <Icon className="h-6 w-6" />
            </div>
            <h3 className="relative mt-5 font-display text-lg font-bold">{name}</h3>
            <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
          </div>
        ))}
      </section>
    </>
  );
}