import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X, Phone, ChevronDown } from "lucide-react";
import { KagomaLogo } from "./logo";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";

type SubLink = { href: string; label: string; desc?: string };
type NavItem = { to: string; label: string; children?: SubLink[] };

const trainingLinks: SubLink[] = [
  { href: "/training", label: "Courses", desc: "All 20 courses and certificate checks" },
  { href: "/academy/student.html", label: "Student Portal", desc: "Enrol, study and sit exams" },
  {
    href: "/academy/certificates.html",
    label: "Certificate Register",
    desc: "Verify a Kagoma certificate",
  },
  {
    href: "/academy/work.html",
    label: "Apply for Work",
    desc: "Join the talent pool and see open shifts",
  },
];

const portalLinks: SubLink[] = [
  { href: "/academy/student.html", label: "Student" },
  { href: "/academy/professional.html", label: "Professional" },
  { href: "/academy/employer.html", label: "Employer" },
  { href: "/academy/client.html", label: "Client" },
  { href: "/academy/office.html", label: "Staff Office" },
  { href: "/academy/staffing.html", label: "Event Desk" },
  { href: "/admin", label: "Admin" },
];

const nav: NavItem[] = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/services", label: "Services" },
  { to: "/industries", label: "Industries" },
  { to: "/training", label: "Training & Development", children: trainingLinks },
  { to: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled ? "border-b border-border/60 bg-background/85 backdrop-blur-xl" : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 md:px-8">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="relative">
            <KagomaLogo className="h-11 w-11 transition-transform group-hover:scale-105" />
            <span className="pointer-events-none absolute inset-0 rounded-full bg-primary/20 blur-xl opacity-0 transition group-hover:opacity-100" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-sm font-bold tracking-widest text-foreground">
              KAGOMA
            </div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-primary">
              Protection Services
            </div>
          </div>
        </Link>

        <nav className="hidden xl:flex items-center gap-1">
          {nav.map((item) => {
            const active = pathname === item.to;
            const link = (
              <Link
                to={item.to}
                className={cn(
                  "relative inline-flex items-center gap-1 px-4 py-2 text-sm font-medium tracking-wide transition-colors",
                  active ? "text-primary" : "text-foreground/80 hover:text-primary",
                )}
              >
                {item.label}
                {item.children && <ChevronDown className="h-3.5 w-3.5 opacity-70" />}
                {active && (
                  <span className="absolute inset-x-3 -bottom-0.5 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
                )}
              </Link>
            );
            return item.children ? (
              <Dropdown key={item.to} trigger={link} links={item.children} />
            ) : (
              <span key={item.to}>{link}</span>
            );
          })}
          <Dropdown
            trigger={
              <button className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium tracking-wide text-foreground/80 transition-colors hover:text-primary">
                Portals <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              </button>
            }
            links={portalLinks}
            align="right"
          />
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <a
            href="tel:+250"
            className="hidden 2xl:inline-flex whitespace-nowrap items-center gap-2 rounded-full border border-primary/40 bg-primary/5 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-primary transition hover:bg-primary hover:text-primary-foreground"
          >
            <Phone className="h-3.5 w-3.5" /> 24/7 Ops
          </a>
          <Link
            to="/contact"
            className="hidden md:inline-flex whitespace-nowrap items-center rounded-full bg-gradient-to-r from-accent to-accent/80 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-accent-foreground shadow-lg shadow-accent/30 transition hover:brightness-110"
          >
            Request a Quote
          </Link>
          <button
            onClick={() => setOpen((v) => !v)}
            className="xl:hidden rounded-md border border-border p-2 text-foreground"
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="xl:hidden border-t border-border bg-background/95 backdrop-blur-xl">
          <nav className="mx-auto max-w-7xl px-4 py-4 flex flex-col gap-1">
            {nav.map((item) => (
              <div key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    "block rounded-md px-4 py-3 text-sm font-medium",
                    pathname === item.to
                      ? "bg-primary/10 text-primary"
                      : "text-foreground/80 hover:bg-muted",
                  )}
                >
                  {item.label}
                </Link>
                {item.children && (
                  <div className="ml-4 border-l border-border pl-2">
                    {item.children.slice(1).map((c) => (
                      <a
                        key={c.href}
                        href={c.href}
                        className="block rounded-md px-4 py-2 text-sm text-foreground/70 hover:bg-muted"
                      >
                        {c.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="mt-2 px-4 pt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Portals
            </div>
            <div className="grid grid-cols-2 gap-1">
              {portalLinks.map((c) => (
                <a
                  key={c.href}
                  href={c.href}
                  className="rounded-md px-4 py-2 text-sm text-foreground/80 hover:bg-muted"
                >
                  {c.label}
                </a>
              ))}
            </div>
            <Link
              to="/contact"
              className="mt-2 rounded-md bg-accent px-4 py-3 text-center text-sm font-bold uppercase tracking-widest text-accent-foreground"
            >
              Request a Quote
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
function Dropdown({
  trigger,
  links,
  align = "left",
}: {
  trigger: React.ReactNode;
  links: SubLink[];
  align?: "left" | "right";
}) {
  return (
    <div className="group relative">
      {trigger}
      <div
        className={cn(
          "invisible absolute top-full z-50 min-w-60 pt-2 opacity-0 transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100",
          align === "right" ? "right-0" : "left-0",
        )}
      >
        <div className="rounded-xl border border-border bg-popover p-2 shadow-xl">
          {links.map((l) => (
            <a
              key={l.href + l.label}
              href={l.href}
              className="block rounded-lg px-3 py-2 text-sm text-foreground/85 transition hover:bg-muted hover:text-primary"
            >
              <div className="font-medium">{l.label}</div>
              {l.desc && <div className="text-xs text-muted-foreground">{l.desc}</div>}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
