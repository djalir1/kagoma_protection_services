import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X, ChevronDown, LogIn, LayoutDashboard } from "lucide-react";
import { KagomaLogo } from "./logo";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";
import { useAuth } from "@/lib/auth";

type SubLink = { href: string; label: string; desc?: string };
type NavItem = { to: string; label: string; children?: SubLink[] };

const trainingLinks: SubLink[] = [
  { href: "/training", label: "Courses", desc: "20 assessed courses, free to study" },
  { href: "/verify", label: "Verify a certificate", desc: "Check any Kagoma certificate number" },
  {
    href: "/careers",
    label: "Careers & event work",
    desc: "Join the talent pool, see open shifts",
  },
  { href: "/faq", label: "FAQ", desc: "Studying, exams, certificates, payments" },
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
  const { session } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  const isActive = (to: string) =>
    to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled || open
          ? "border-b border-border/60 bg-background/90 backdrop-blur-xl"
          : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 md:px-8">
        <Link to="/" className="group flex items-center gap-3">
          <KagomaLogo className="h-11 w-11 transition-transform group-hover:scale-105" />
          <div className="leading-tight">
            <div className="font-display text-sm font-bold tracking-widest text-foreground">
              KAGOMA
            </div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-primary">
              Protection Services
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 xl:flex">
          {nav.map((item) => {
            const link = (
              <Link
                to={item.to as never}
                className={cn(
                  "relative inline-flex items-center gap-1 px-3.5 py-2 text-sm font-medium tracking-wide transition-colors",
                  isActive(item.to) ? "text-primary" : "text-foreground/80 hover:text-primary",
                )}
              >
                {item.label}
                {item.children && <ChevronDown className="h-3.5 w-3.5 opacity-70" />}
                {isActive(item.to) && (
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
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <Link
            to={session ? "/dashboard" : "/login"}
            className="hidden items-center gap-2 whitespace-nowrap rounded-full border border-primary/40 bg-primary/5 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-primary transition hover:bg-primary hover:text-primary-foreground sm:inline-flex"
          >
            {session ? (
              <LayoutDashboard className="h-3.5 w-3.5" />
            ) : (
              <LogIn className="h-3.5 w-3.5" />
            )}
            {session ? "My dashboard" : "Sign in"}
          </Link>
          <Link
            to="/contact"
            className="hidden whitespace-nowrap rounded-full bg-gradient-to-r from-accent to-accent/80 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-accent-foreground shadow-lg shadow-accent/30 transition hover:brightness-110 md:inline-flex"
          >
            Request a Quote
          </Link>
          <button
            onClick={() => setOpen((v) => !v)}
            className="rounded-md border border-border p-2 text-foreground xl:hidden"
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="max-h-[calc(100svh-5rem)] overflow-y-auto border-t border-border bg-background/95 backdrop-blur-xl xl:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4">
            {nav.map((item) => (
              <div key={item.to}>
                <Link
                  to={item.to as never}
                  className={cn(
                    "block rounded-md px-4 py-3 text-sm font-medium",
                    isActive(item.to)
                      ? "bg-primary/10 text-primary"
                      : "text-foreground/80 hover:bg-muted",
                  )}
                >
                  {item.label}
                </Link>
                {item.children && (
                  <div className="ml-4 border-l border-border pl-2">
                    {item.children.slice(1).map((c) => (
                      <Link
                        key={c.href}
                        to={c.href as never}
                        className="block rounded-md px-4 py-2 text-sm text-foreground/70 hover:bg-muted"
                      >
                        {c.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link
                to={session ? "/dashboard" : "/login"}
                className="rounded-md border border-primary/40 px-4 py-3 text-center text-sm font-bold uppercase tracking-widest text-primary"
              >
                {session ? "Dashboard" : "Sign in"}
              </Link>
              <Link
                to="/contact"
                className="rounded-md bg-accent px-4 py-3 text-center text-sm font-bold uppercase tracking-widest text-accent-foreground"
              >
                Get a quote
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

function Dropdown({ trigger, links }: { trigger: React.ReactNode; links: SubLink[] }) {
  return (
    <div className="group relative">
      {trigger}
      <div className="invisible absolute left-0 top-full z-50 min-w-64 pt-2 opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
        <div className="rounded-xl border border-border bg-popover p-2 shadow-xl">
          {links.map((l) => (
            <Link
              key={l.href}
              to={l.href as never}
              className="block rounded-lg px-3 py-2 text-sm text-foreground/85 transition hover:bg-muted hover:text-primary"
            >
              <div className="font-medium">{l.label}</div>
              {l.desc && <div className="text-xs text-muted-foreground">{l.desc}</div>}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
