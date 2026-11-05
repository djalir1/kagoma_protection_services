export const rwf = (n: number | string | null | undefined) =>
  n === null || n === undefined || n === ""
    ? "—"
    : `${Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 })} RWF`;

export const date = (d: string | null | undefined, opts?: Intl.DateTimeFormatOptions) =>
  d
    ? new Date(d).toLocaleDateString(
        "en-GB",
        opts ?? { day: "numeric", month: "short", year: "numeric" },
      )
    : "—";

export const dateTime = (d: string | null | undefined) =>
  d
    ? new Date(d).toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export const time = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—";

export const titleCase = (s: string | null | undefined) =>
  (s ?? "").replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

export const initials = (name: string | null | undefined) =>
  (name ?? "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

export const courseCover = (code: string) => `/img/courses/${code}.svg`;

/** Tone used by <StatusBadge>. Anything not listed is neutral. */
export const statusTone: Record<string, "good" | "warn" | "bad" | "info" | "neutral"> = {
  approved: "good",
  valid: "good",
  confirmed: "good",
  completed: "good",
  paid: "good",
  signed: "good",
  accepted: "good",
  pass: "good",
  hired: "good",
  open: "good",
  running: "info",
  in_progress: "info",
  enrolled: "info",
  reviewing: "info",
  assessment: "info",
  quotation: "info",
  deployment: "info",
  sent: "info",
  issued: "info",
  shortlisted: "info",
  planned: "neutral",
  draft: "neutral",
  submitted: "warn",
  pending: "warn",
  requested: "warn",
  new: "warn",
  partial: "warn",
  suspended: "warn",
  standby: "warn",
  rejected: "bad",
  failed: "bad",
  revoked: "bad",
  declined: "bad",
  cancelled: "bad",
  fail: "bad",
  expired: "bad",
  withdrawn: "neutral",
  reported: "good",
  closed: "neutral",
};

export const pipelineStages = [
  "requested",
  "assessment",
  "quotation",
  "approved",
  "deployment",
  "reported",
] as const;
