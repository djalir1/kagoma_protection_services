import { Link } from "@tanstack/react-router";
import { Mail, MapPin, Phone, Shield } from "lucide-react";
import { KagomaLogo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="relative mt-24 border-t border-border/60 bg-[color:var(--onyx)]">
      <div className="hairline" />
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 md:grid-cols-4 md:px-8">
        <div className="md:col-span-2">
          <div className="flex items-center gap-3">
            <KagomaLogo className="h-14 w-14" />
            <div>
              <div className="font-display text-lg font-bold tracking-widest">KAGOMA</div>
              <div className="text-xs uppercase tracking-[0.25em] text-primary">
                Protection Services
              </div>
            </div>
          </div>
          <p className="mt-6 max-w-md text-sm leading-relaxed text-muted-foreground">
            Professional event security, crowd management, and consultancy —
            delivered with discipline, transparency, and operational excellence
            across Rwanda and East Africa.
          </p>
          <div className="mt-6 flex items-center gap-2 text-xs uppercase tracking-widest text-primary">
            <Shield className="h-4 w-4" /> Licensed · Insured · Vetted
          </div>
        </div>

        <div>
          <div className="mb-4 text-xs font-bold uppercase tracking-widest text-primary">
            Navigate
          </div>
          <ul className="space-y-2 text-sm text-foreground/80">
            <li><Link to="/about" className="hover:text-primary">About</Link></li>
            <li><Link to="/services" className="hover:text-primary">Services</Link></li>
            <li><Link to="/industries" className="hover:text-primary">Industries</Link></li>
            <li><Link to="/training" className="hover:text-primary">Training & Development</Link></li>
            <li><Link to="/contact" className="hover:text-primary">Contact</Link></li>
          </ul>
        </div>

        <div>
          <div className="mb-4 text-xs font-bold uppercase tracking-widest text-primary">
            Contact
          </div>
          <ul className="space-y-3 text-sm text-foreground/80">
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 text-primary shrink-0" />
              Kigali, Rwanda
            </li>
            <li className="flex items-start gap-2">
              <Phone className="mt-0.5 h-4 w-4 text-primary shrink-0" />
              <a href="tel:+250" className="hover:text-primary">+250 · Available 24/7</a>
            </li>
            <li className="flex items-start gap-2">
              <Mail className="mt-0.5 h-4 w-4 text-primary shrink-0" />
              <a href="mailto:info@kagoma.rw" className="hover:text-primary">info@kagoma.rw</a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border/40">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground md:flex-row md:px-8">
          <div>© {new Date().getFullYear()} Kagoma Protection Services. All rights reserved.</div>
          <div className="flex gap-6">
            <span>SM749008 · Event Organization</span>
            <span>SK661205 · Security Consultancy</span>
          </div>
        </div>
      </div>
    </footer>
  );
}