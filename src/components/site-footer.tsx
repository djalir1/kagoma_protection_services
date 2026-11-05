import { Link } from "@tanstack/react-router";
import { Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import { KagomaLogo } from "./logo";

const cols: { title: string; links: [string, string][] }[] = [
  {
    title: "Company",
    links: [
      ["/about", "About"],
      ["/services", "Services"],
      ["/industries", "Industries"],
      ["/contact", "Contact"],
    ],
  },
  {
    title: "Academy",
    links: [
      ["/training", "Courses"],
      ["/verify", "Verify a certificate"],
      ["/careers", "Careers & event work"],
      ["/faq", "FAQ"],
    ],
  },
  {
    title: "Account",
    links: [
      ["/login", "Sign in"],
      ["/signup", "Create an account"],
      ["/privacy", "Privacy"],
      ["/terms", "Terms"],
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative mt-24 border-t border-border/60 bg-[color:var(--onyx)]">
      <div className="hairline" />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:grid-cols-2 md:px-8 lg:grid-cols-[1.6fr_1fr_1fr_1fr_1.3fr]">
        <div>
          <div className="flex items-center gap-3">
            <KagomaLogo className="h-14 w-14" />
            <div>
              <div className="font-display text-lg font-bold tracking-widest">KAGOMA</div>
              <div className="text-xs uppercase tracking-[0.25em] text-primary">
                Protection Services
              </div>
            </div>
          </div>
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Event security management, security risk consultancy and assessed professional training
            — delivered with discipline across Rwanda.
          </p>
          <div className="mt-6 flex items-center gap-2 text-xs uppercase tracking-widest text-primary">
            <ShieldCheck className="h-4 w-4" /> Discipline · Vigilance · Protection
          </div>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <div className="mb-4 text-xs font-bold uppercase tracking-widest text-primary">
              {c.title}
            </div>
            <ul className="space-y-2 text-sm text-foreground/80">
              {c.links.map(([to, label]) => (
                <li key={to}>
                  <Link to={to as never} className="hover:text-primary">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <div className="mb-4 text-xs font-bold uppercase tracking-widest text-primary">
            Contact
          </div>
          <ul className="space-y-3 text-sm text-foreground/80">
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Nyarugunga, Kicukiro,
              Kigali, Rwanda
            </li>
            <li className="flex items-start gap-2">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{" "}
              <a href="tel:+250788225262" className="hover:text-primary">
                +250 788 225 262
              </a>
            </li>
            <li className="flex items-start gap-2">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{" "}
              <a href="mailto:info@kagomaprotection.com" className="break-all hover:text-primary">
                info@kagomaprotection.com
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/40">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-center text-xs text-muted-foreground md:flex-row md:px-8 md:text-left">
          <div>© {new Date().getFullYear()} KAGOMA PROTECTIONS SERVICES LTD · TIN 156478327</div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-1">
            <span>SN823001 · Event organisation</span>
            <span>SM749008 · Security consulting</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
