import { useEffect, useState } from "react";
import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { LogOut, Menu, X, ExternalLink, Clock } from "lucide-react";
import { useAuth, roleLabel } from "@/lib/auth";
import { navFor } from "@/components/app/nav";
import { KagomaLogo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Loading } from "@/components/app/kit";
import { Toaster } from "@/components/ui/sonner";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — KAGOMA" }, { name: "robots", content: "noindex" }] }),
  component: DashboardLayout,
});

function DashboardLayout() {
  const { ready, session, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (ready && !session && pathname.startsWith("/dashboard"))
      navigate({ to: "/login", search: { next: pathname }, replace: true });
  }, [ready, session, pathname, navigate]);

  useEffect(() => setOpen(false), [pathname]);

  if (!ready || !session || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loading label="Opening your dashboard…" />
      </div>
    );
  }

  const groups = navFor(profile.role);
  const isActive = (to: string, exact?: boolean) =>
    exact
      ? pathname === to || pathname === `${to}/`
      : pathname === to || pathname.startsWith(`${to}/`);

  const sidebar = (
    <div className="flex h-full flex-col">
      <Link to="/" className="flex items-center gap-3 border-b border-border px-5 py-4">
        <KagomaLogo className="h-9 w-9" />
        <div className="leading-tight">
          <div className="font-display text-sm font-bold tracking-widest">KAGOMA</div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-primary">
            {roleLabel[profile.role]}
          </div>
        </div>
      </Link>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {groups.map((g, i) => (
          <div key={i} className={cn(i > 0 && "mt-5")}>
            {g.label && (
              <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                {g.label}
              </div>
            )}
            {g.items.map(({ to, label, icon: Icon, exact }) => (
              <Link
                key={to}
                to={to as never}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                  isActive(to, exact)
                    ? "bg-primary/15 font-semibold text-primary"
                    : "text-foreground/75 hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-xs font-bold text-primary-foreground">
            {initials(profile.full_name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">
              {profile.full_name || "Your account"}
            </div>
            <div className="truncate text-xs text-muted-foreground">{session.user.email}</div>
          </div>
        </div>
        <button
          onClick={async () => {
            await signOut();
            navigate({ to: "/login", replace: true });
          }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition hover:border-primary/60 hover:text-primary"
        >
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster richColors position="top-right" />
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-card/80 backdrop-blur lg:block">
        {sidebar}
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85%] border-r border-border bg-card">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-4 rounded-md p-1.5 text-muted-foreground hover:bg-muted"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="no-print sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur md:px-8">
          <button
            onClick={() => setOpen(true)}
            className="rounded-md border border-border p-2 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
            Welcome,{" "}
            <span className="font-semibold text-foreground">
              {profile.full_name?.split(" ").slice(-1)[0] || "back"}
            </span>
          </div>
          <Link
            to="/"
            className="hidden items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/60 hover:text-primary sm:inline-flex"
          >
            Website <ExternalLink className="h-3 w-3" />
          </Link>
          <ThemeToggle />
        </header>

        {(profile.role === "student" || profile.role === "professional") &&
          profile.vetting_status === "pending" && (
            <div className="no-print flex items-start gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm md:px-8">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <span>
                <b>Your identity check is pending.</b> You can study now. Kagoma confirms your
                details before a certificate can be issued — complete your{" "}
                <Link to="/dashboard/account" className="underline">
                  account details
                </Link>{" "}
                to speed this up.
              </span>
            </div>
          )}

        <main className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
