import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X, Phone } from "lucide-react";
import { KagomaLogo } from "./logo";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";

const nav = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/services", label: "Services" },
  { to: "/industries", label: "Industries" },
  { to: "/training", label: "Training & Development" },
  { to: "/contact", label: "Contact" },
] as const;

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
        scrolled
          ? "border-b border-border/60 bg-background/85 backdrop-blur-xl"
          : "bg-transparent",
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

        <nav className="hidden lg:flex items-center gap-1">
          {nav.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "relative px-4 py-2 text-sm font-medium tracking-wide transition-colors",
                  active
                    ? "text-primary"
                    : "text-foreground/80 hover:text-primary",
                )}
              >
                {item.label}
                {active && (
                  <span className="absolute inset-x-3 -bottom-0.5 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <a
            href="tel:+250"
            className="hidden md:inline-flex whitespace-nowrap items-center gap-2 rounded-full border border-primary/40 bg-primary/5 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-primary transition hover:bg-primary hover:text-primary-foreground"
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
            className="lg:hidden rounded-md border border-border p-2 text-foreground"
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-border bg-background/95 backdrop-blur-xl">
          <nav className="mx-auto max-w-7xl px-4 py-4 flex flex-col gap-1">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "rounded-md px-4 py-3 text-sm font-medium",
                  pathname === item.to
                    ? "bg-primary/10 text-primary"
                    : "text-foreground/80 hover:bg-muted",
                )}
              >
                {item.label}
              </Link>
            ))}
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