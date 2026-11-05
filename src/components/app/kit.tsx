import type { ComponentType, ReactNode } from "react";
import { Loader2, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { statusTone, titleCase } from "@/lib/format";

export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">
            {eyebrow}
          </div>
        )}
        <h1 className="mt-1 font-display text-2xl font-bold md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "default",
  onClick,
}: {
  label: string;
  value: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  hint?: ReactNode;
  tone?: "default" | "gold" | "red";
  onClick?: () => void;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border bg-card p-5 text-left transition",
        onClick && "hover:-translate-y-0.5 hover:border-primary/60",
      )}
    >
      <div
        className={cn(
          "absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl",
          tone === "red" ? "bg-accent/15" : "bg-primary/10",
        )}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {label}
          </div>
          <div className="mt-2 font-display text-3xl font-bold">{value}</div>
          {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
        </div>
        {Icon && (
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              tone === "red" ? "bg-accent/15 text-accent" : "bg-primary/10 text-primary",
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </Comp>
  );
}

export function Panel({
  title,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-border bg-card", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3.5">
          {title && <h2 className="font-display text-base font-bold">{title}</h2>}
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

const toneClass = {
  good: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  warn: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  bad: "border-destructive/40 bg-destructive/10 text-destructive",
  info: "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  neutral: "border-border bg-muted text-muted-foreground",
};

export function StatusBadge({ status, label }: { status?: string | null; label?: string }) {
  const tone = statusTone[status ?? ""] ?? "neutral";
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        toneClass[tone],
      )}
    >
      {label ?? titleCase(status ?? "—")}
    </span>
  );
}

export function EmptyState({
  title,
  hint,
  icon: Icon = Inbox,
  action,
}: {
  title: string;
  hint?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-12 text-center">
      <Icon className="h-8 w-8 text-muted-foreground/60" />
      <div className="mt-3 font-semibold">{title}</div>
      {hint && <div className="mt-1 max-w-sm text-sm text-muted-foreground">{hint}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Loading({ label = "Loading…", className }: { label?: string; className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground",
        className,
      )}
    >
      <Loader2 className="h-4 w-4 animate-spin text-primary" /> {label}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
  className,
  required,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
  required?: boolean;
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
        {required && <span className="text-accent"> *</span>}
      </span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-input bg-background/60 px-3 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60";

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
        style={{ width: `${v}%` }}
      />
    </div>
  );
}

/** A responsive table: real table on md+, stacked cards on phones. */
export function DataList<T>({
  rows,
  columns,
  rowKey,
  empty,
  onRowClick,
}: {
  rows: T[];
  columns: {
    key: string;
    label: string;
    render: (r: T) => ReactNode;
    className?: string;
    hideOnMobile?: boolean;
  }[];
  rowKey: (r: T) => string;
  empty?: ReactNode;
  onRowClick?: (r: T) => void;
}) {
  if (!rows.length) return <>{empty ?? <EmptyState title="Nothing here yet" />}</>;
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              {columns.map((c) => (
                <th key={c.key} className={cn("px-3 py-2.5 font-semibold", c.className)}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={rowKey(r)}
                onClick={onRowClick ? () => onRowClick(r) : undefined}
                className={cn(
                  "border-b border-border/60 last:border-0",
                  onRowClick && "cursor-pointer transition hover:bg-muted/50",
                )}
              >
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-3 py-3 align-middle", c.className)}>
                    {c.render(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-3 md:hidden">
        {rows.map((r) => (
          <div
            key={rowKey(r)}
            onClick={onRowClick ? () => onRowClick(r) : undefined}
            className={cn("rounded-xl border border-border p-4", onRowClick && "cursor-pointer")}
          >
            {columns
              .filter((c) => !c.hideOnMobile)
              .map((c) => (
                <div key={c.key} className="flex items-start justify-between gap-3 py-1 text-sm">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">
                    {c.label}
                  </span>
                  <span className="text-right">{c.render(r)}</span>
                </div>
              ))}
          </div>
        ))}
      </div>
    </>
  );
}

export function Tabs<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { value: T; label: string; count?: number }[];
}) {
  return (
    <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1">
      {items.map((i) => (
        <button
          key={i.value}
          onClick={() => onChange(i.value)}
          className={cn(
            "inline-flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition",
            value === i.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {i.label}
          {i.count !== undefined && (
            <span
              className={cn(
                "rounded-full px-1.5 text-[10px] font-bold",
                value === i.value ? "bg-primary-foreground/20" : "bg-muted",
              )}
            >
              {i.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
