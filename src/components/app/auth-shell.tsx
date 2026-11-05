import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldCheck, GraduationCap, BadgeCheck } from "lucide-react";
import { KagomaLogo } from "@/components/logo";
import badge from "@/assets/brand/badge.webp";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden border-r border-border bg-[color:var(--onyx)] lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 bg-radial-gold opacity-60" />
        <Link to="/" className="relative flex items-center gap-3">
          <KagomaLogo className="h-11 w-11" />
          <div className="leading-tight">
            <div className="font-display text-sm font-bold tracking-widest">KAGOMA</div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-primary">
              Protection Services
            </div>
          </div>
        </Link>
        <div className="relative mx-auto my-10 w-56">
          <div className="absolute inset-0 -m-10 rounded-full bg-primary/15 blur-3xl" />
          <div
            className="kps-badge-static relative"
            style={{ "--kps-mask": `url(${badge})` } as React.CSSProperties}
          >
            <img src={badge} alt="" className="w-full" />
            <span className="kps-shine" />
          </div>
        </div>
        <div className="relative space-y-4">
          {[
            {
              icon: GraduationCap,
              t: "Learn",
              d: "20 assessed courses in security, safety and risk management.",
            },
            {
              icon: BadgeCheck,
              t: "Get certified",
              d: "Every certificate carries a number an employer can check.",
            },
            {
              icon: ShieldCheck,
              t: "Work and hire",
              d: "Certified professionals, employers and clients on one platform.",
            },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-semibold">{t}</div>
                <div className="text-sm text-muted-foreground">{d}</div>
              </div>
            </div>
          ))}
        </div>
      </aside>

      <main className="flex flex-col px-4 py-8 sm:px-8">
        <Link to="/" className="flex items-center gap-3 lg:hidden">
          <KagomaLogo className="h-10 w-10" />
          <div className="font-display text-sm font-bold tracking-widest">KAGOMA</div>
        </Link>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <h1 className="font-display text-3xl font-bold">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 text-center text-sm text-muted-foreground">{footer}</div>}
        </div>
        <p className="text-center text-xs text-muted-foreground">
          <Link to="/privacy" className="hover:text-primary">
            Privacy
          </Link>{" "}
          ·{" "}
          <Link to="/terms" className="hover:text-primary">
            Terms
          </Link>{" "}
          ·{" "}
          <Link to="/" className="hover:text-primary">
            Back to website
          </Link>
        </p>
      </main>
    </div>
  );
}
