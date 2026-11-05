import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";
import {
  LayoutDashboard,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Search,
  Database,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Lock,
  Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { KagomaLogo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — KAGOMA Protection Services" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

type Column = {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: boolean;
  has_default: boolean;
  is_primary: boolean;
  ordinal: number;
};
type Row = Record<string, unknown>;

const PAGE_SIZE = 25;

// Tables grouped the way the business thinks about them. Anything not
// listed still appears under "Other".
const GROUPS: { label: string; tables: string[] }[] = [
  {
    label: "People",
    tables: [
      "profiles",
      "professional_profiles",
      "professional_skills",
      "work_experience",
      "policy_acknowledgements",
    ],
  },
  {
    label: "Training",
    tables: [
      "courses",
      "course_prerequisites",
      "modules",
      "lessons",
      "assessments",
      "questions",
      "question_options",
      "enrollments",
      "lesson_progress",
      "assessment_attempts",
      "practical_assessments",
      "course_applications",
      "rw_review",
    ],
  },
  { label: "Certificates", tables: ["certificates", "certificate_audit", "company_signature"] },
  {
    label: "Clients & sales",
    tables: [
      "service_requests",
      "clients",
      "quotations",
      "service_orders",
      "service_stages",
      "so_charges",
      "agreements",
      "client_payments",
      "employer_requests",
      "employer_contacts",
    ],
  },
  { label: "Payments", tables: ["payments", "payment_sessions"] },
  {
    label: "Staffing & jobs",
    tables: [
      "events",
      "event_staff",
      "event_interest",
      "shifts",
      "work_pool",
      "jobs",
      "job_applications",
    ],
  },
  { label: "Office", tables: ["documents", "company_settings", "email_outbox"] },
];

function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setIsAdmin(null);
      return;
    }
    supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data }) => setIsAdmin(data?.role === "admin"));
  }, [session]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster richColors position="top-right" />
      {!ready || (session && isAdmin === null) ? (
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : !session ? (
        <LoginScreen />
      ) : !isAdmin ? (
        <NotAdmin email={session.user.email ?? ""} />
      ) : (
        <Dashboard email={session.user.email ?? ""} />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- login */

function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setError(error.message);
    setBusy(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-xl"
      >
        <div className="flex flex-col items-center text-center">
          <KagomaLogo className="h-14 w-14" />
          <h1 className="mt-4 font-display text-xl font-bold tracking-widest">KAGOMA ADMIN</h1>
          <p className="mt-1 text-xs uppercase tracking-[0.25em] text-primary">Restricted access</p>
        </div>
        <div className="mt-8 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}{" "}
            Sign in
          </Button>
        </div>
        <Link
          to="/"
          className="mt-6 block text-center text-xs text-muted-foreground hover:text-primary"
        >
          ← Back to website
        </Link>
      </form>
    </div>
  );
}

function NotAdmin({ email }: { email: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-sm rounded-2xl border border-border bg-card p-8 text-center">
        <h1 className="text-lg font-bold">Not an administrator</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {email} is signed in but does not have admin access.
        </p>
        <Button className="mt-6" variant="outline" onClick={() => supabase.auth.signOut()}>
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ dashboard */

function Dashboard({ email }: { email: string }) {
  const [columns, setColumns] = useState<Column[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [active, setActive] = useState<string | null>(null);
  const [loadError, setLoadError] = useState("");

  const loadMeta = useCallback(async () => {
    const [cols, cnt] = await Promise.all([
      supabase.rpc("admin_table_columns"),
      supabase.rpc("admin_table_counts"),
    ]);
    if (cols.error) {
      setLoadError(cols.error.message);
      return;
    }
    setColumns((cols.data ?? []) as Column[]);
    const c: Record<string, number> = {};
    for (const r of (cnt.data ?? []) as { table_name: string; row_count: number }[])
      c[r.table_name] = Number(r.row_count);
    setCounts(c);
  }, []);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  const tables = useMemo(() => {
    const m = new Map<string, Column[]>();
    for (const c of columns) {
      if (!m.has(c.table_name)) m.set(c.table_name, []);
      m.get(c.table_name)!.push(c);
    }
    return m;
  }, [columns]);

  const groups = useMemo(() => {
    const seen = new Set<string>();
    const out = GROUPS.map((g) => {
      const ts = g.tables.filter((t) => tables.has(t));
      ts.forEach((t) => seen.add(t));
      return { label: g.label, tables: ts };
    }).filter((g) => g.tables.length);
    const rest = [...tables.keys()].filter((t) => !seen.has(t)).sort();
    if (rest.length) out.push({ label: "Other", tables: rest });
    return out;
  }, [tables]);

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card/60 md:flex">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <KagomaLogo className="h-9 w-9" />
          <div className="leading-tight">
            <div className="font-display text-sm font-bold tracking-widest">KAGOMA</div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-primary">Admin</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 text-sm">
          <SideItem active={active === null} onClick={() => setActive(null)}>
            <LayoutDashboard className="h-4 w-4" /> Overview
          </SideItem>
          {groups.map((g) => (
            <div key={g.label} className="mt-5">
              <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                {g.label}
              </div>
              {g.tables.map((t) => (
                <SideItem key={t} active={active === t} onClick={() => setActive(t)}>
                  <span className="truncate">{pretty(t)}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {counts[t] ?? ""}
                  </span>
                </SideItem>
              ))}
            </div>
          ))}
        </nav>
        <div className="border-t border-border p-4 text-xs">
          <div className="truncate text-muted-foreground">{email}</div>
          <Button
            size="sm"
            variant="outline"
            className="mt-3 w-full"
            onClick={() => supabase.auth.signOut()}
          >
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        {/* mobile table picker */}
        <div className="flex items-center gap-2 border-b border-border p-3 md:hidden">
          <select
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={active ?? ""}
            onChange={(e) => setActive(e.target.value || null)}
          >
            <option value="">Overview</option>
            {groups
              .flatMap((g) => g.tables)
              .map((t) => (
                <option key={t} value={t}>
                  {pretty(t)}
                </option>
              ))}
          </select>
          <Button
            size="icon"
            variant="outline"
            onClick={() => supabase.auth.signOut()}
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>

        {loadError ? (
          <div className="m-6 rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-sm">
            <b>The database is not ready.</b> {loadError}
            <p className="mt-2 text-muted-foreground">
              Run the migrations in <code>kagoma-website/sql</code> (01 → 47) on the Supabase
              project.
            </p>
          </div>
        ) : active && tables.has(active) ? (
          <TableManager
            key={active}
            table={active}
            columns={tables.get(active)!}
            onChanged={loadMeta}
          />
        ) : (
          <Overview groups={groups} counts={counts} onOpen={setActive} />
        )}
      </main>
    </div>
  );
}

function SideItem({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left transition",
        active ? "bg-primary/15 text-primary" : "text-foreground/80 hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

function Overview({
  groups,
  counts,
  onOpen,
}: {
  groups: { label: string; tables: string[] }[];
  counts: Record<string, number>;
  onOpen: (t: string) => void;
}) {
  const highlights = [
    "profiles",
    "enrollments",
    "certificates",
    "service_requests",
    "payments",
    "course_applications",
  ];
  return (
    <div className="p-6 md:p-10">
      <h1 className="font-display text-2xl font-bold">Overview</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Everything stored in the Kagoma database. Open any table to add, edit or delete records.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {highlights
          .filter((t) => t in counts)
          .map((t) => (
            <button
              key={t}
              onClick={() => onOpen(t)}
              className="rounded-2xl border border-border bg-card p-5 text-left transition hover:border-primary/60"
            >
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                {pretty(t)}
              </div>
              <div className="mt-2 font-display text-3xl font-bold">{counts[t]}</div>
            </button>
          ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <a
          href="/academy/admin.html"
          className="inline-flex items-center gap-2 rounded-full border border-primary/40 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-primary hover:bg-primary hover:text-primary-foreground"
        >
          Academy console <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <a
          href="/academy/office.html"
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold uppercase tracking-widest hover:border-primary/60"
        >
          Office desk <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {groups.map((g) => (
        <section key={g.label} className="mt-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            {g.label}
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {g.tables.map((t) => (
              <button
                key={t}
                onClick={() => onOpen(t)}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left text-sm transition hover:border-primary/60"
              >
                <Database className="h-4 w-4 text-primary" />
                <span className="truncate">{pretty(t)}</span>
                <span className="ml-auto text-xs text-muted-foreground">{counts[t] ?? 0}</span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/* --------------------------------------------------------- table CRUD */

function TableManager({
  table,
  columns,
  onChanged,
}: {
  table: string;
  columns: Column[];
  onChanged: () => void;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);

  const pk = columns.filter((c) => c.is_primary).map((c) => c.column_name);
  const orderCol =
    columns.find((c) => c.column_name === "created_at")?.column_name ??
    columns.find((c) => c.column_name === "sort_order")?.column_name ??
    pk[0] ??
    columns[0]?.column_name;
  const textCols = columns
    .filter((c) => ["text", "character varying"].includes(c.data_type))
    .map((c) => c.column_name);
  const shownCols = columns.slice(0, 8);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase.from(table).select("*", { count: "exact" });
    if (q.trim() && textCols.length) {
      const term = q.trim().replace(/[%,()]/g, " ");
      query = query.or(textCols.map((c) => `${c}.ilike.%${term}%`).join(","));
    }
    if (orderCol)
      query = query.order(orderCol, { ascending: orderCol === "sort_order", nullsFirst: false });
    const { data, error, count } = await query.range(
      page * PAGE_SIZE,
      page * PAGE_SIZE + PAGE_SIZE - 1,
    );
    if (error) toast.error(error.message);
    setRows((data ?? []) as Row[]);
    setTotal(count ?? 0);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, page, q, orderCol]);

  useEffect(() => {
    load();
  }, [load]);

  function matchPk<T extends { eq: (c: string, v: unknown) => T }>(qb: T, row: Row): T {
    let b = qb;
    for (const k of pk) b = b.eq(k, row[k]);
    return b;
  }

  async function save(values: Row) {
    if (editing === "new") {
      const { error } = await supabase.from(table).insert(values);
      if (error) return toast.error(error.message);
      toast.success("Record created");
    } else if (editing) {
      const { error } = await matchPk(supabase.from(table).update(values), editing);
      if (error) return toast.error(error.message);
      toast.success("Record updated");
    }
    setEditing(null);
    load();
    onChanged();
  }

  async function remove() {
    if (!deleting) return;
    const { error } = await matchPk(supabase.from(table).delete(), deleting);
    if (error) toast.error(error.message);
    else toast.success("Record deleted");
    setDeleting(null);
    load();
    onChanged();
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">{pretty(table)}</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            <code>{table}</code> · {total} records · {columns.length} columns
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="w-60 pl-9"
              placeholder="Search…"
              value={q}
              onChange={(e) => {
                setPage(0);
                setQ(e.target.value);
              }}
              disabled={!textCols.length}
            />
          </div>
          <Button variant="outline" size="icon" onClick={load} aria-label="Refresh">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
          <Button onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4" /> New
          </Button>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {shownCols.map((c) => (
                <TableHead
                  key={c.column_name}
                  className="whitespace-nowrap text-xs uppercase tracking-wider"
                >
                  {c.column_name}
                </TableHead>
              ))}
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={pk.map((k) => String(r[k])).join("|") || i}>
                {shownCols.map((c) => (
                  <TableCell
                    key={c.column_name}
                    className="max-w-[240px] truncate text-xs"
                    title={display(r[c.column_name])}
                  >
                    {display(r[c.column_name])}
                  </TableCell>
                ))}
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditing(r)}
                      aria-label="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeleting(r)}
                      aria-label="Delete"
                      disabled={!pk.length}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && !loading && (
              <TableRow>
                <TableCell
                  colSpan={shownCols.length + 1}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  No records.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex items-center justify-end gap-3 text-xs text-muted-foreground">
        Page {page + 1} of {pages}
        <Button
          size="icon"
          variant="outline"
          disabled={page === 0}
          onClick={() => setPage((p) => p - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          disabled={page + 1 >= pages}
          onClick={() => setPage((p) => p + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {editing && (
        <RecordForm
          table={table}
          columns={columns}
          row={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this record?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes it from <code>{table}</code>. Records that depend on it may
              be deleted too.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={remove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type FieldKind = "bool" | "number" | "date" | "datetime" | "json" | "longtext" | "text";

function kindOf(c: Column): FieldKind {
  const t = c.data_type;
  if (t === "boolean") return "bool";
  if (["integer", "bigint", "smallint", "numeric", "real", "double precision"].includes(t))
    return "number";
  if (t === "date") return "date";
  if (t.startsWith("timestamp")) return "datetime";
  if (t === "json" || t === "jsonb" || t === "ARRAY") return "json";
  if (
    t === "text" &&
    /(description|details|body|content|notes|message|text|summary|address)/.test(c.column_name)
  )
    return "longtext";
  return "text";
}

function toInput(v: unknown, kind: FieldKind): string | boolean {
  if (kind === "bool") return v === true;
  if (v === null || v === undefined) return "";
  if (kind === "json") return JSON.stringify(v, null, 2);
  if (kind === "datetime") {
    const d = new Date(String(v));
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  return String(v);
}

function RecordForm({
  table,
  columns,
  row,
  onClose,
  onSave,
}: {
  table: string;
  columns: Column[];
  row: Row | null;
  onClose: () => void;
  onSave: (v: Row) => Promise<unknown>;
}) {
  const [values, setValues] = useState<Record<string, string | boolean>>(() => {
    const v: Record<string, string | boolean> = {};
    for (const c of columns)
      v[c.column_name] = toInput(row ? row[c.column_name] : undefined, kindOf(c));
    return v;
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const out: Row = {};
    for (const c of columns) {
      const kind = kindOf(c);
      const raw = values[c.column_name];
      const original = row ? toInput(row[c.column_name], kind) : undefined;
      if (row && raw === original) continue; // unchanged
      if (kind === "bool") {
        out[c.column_name] = raw === true;
        continue;
      }
      const s = String(raw ?? "");
      if (s === "") {
        if (!row && c.has_default) continue; // let the database fill it
        out[c.column_name] = null;
        continue;
      }
      try {
        if (kind === "number") out[c.column_name] = Number(s);
        else if (kind === "json") out[c.column_name] = JSON.parse(s);
        else if (kind === "datetime") out[c.column_name] = new Date(s).toISOString();
        else out[c.column_name] = s;
      } catch {
        setErr(`${c.column_name}: invalid JSON`);
        return;
      }
    }
    if (row && !Object.keys(out).length) {
      onClose();
      return;
    }
    setBusy(true);
    await onSave(out);
    setBusy(false);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{row ? "Edit record" : "New record"}</DialogTitle>
          <DialogDescription>
            <code>{table}</code> — fields left blank use the database default.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          {columns.map((c) => {
            const kind = kindOf(c);
            const id = `f_${c.column_name}`;
            const v = values[c.column_name];
            const set = (nv: string | boolean) => setValues((p) => ({ ...p, [c.column_name]: nv }));
            const label = (
              <Label htmlFor={id} className="text-xs">
                {c.column_name}
                <span className="ml-1 font-normal text-muted-foreground">
                  {c.data_type}
                  {c.is_primary ? " · key" : ""}
                  {!c.is_nullable && !c.has_default ? " · required" : ""}
                </span>
              </Label>
            );
            if (kind === "bool")
              return (
                <div key={c.column_name} className="flex items-center gap-2 sm:col-span-2">
                  <Checkbox id={id} checked={v === true} onCheckedChange={(x) => set(x === true)} />
                  {label}
                </div>
              );
            const wide = kind === "json" || kind === "longtext";
            return (
              <div key={c.column_name} className={cn("space-y-1.5", wide && "sm:col-span-2")}>
                {label}
                {wide ? (
                  <Textarea
                    id={id}
                    rows={kind === "json" ? 5 : 4}
                    className={kind === "json" ? "font-mono text-xs" : ""}
                    value={String(v)}
                    onChange={(e) => set(e.target.value)}
                  />
                ) : (
                  <Input
                    id={id}
                    type={
                      kind === "number"
                        ? "number"
                        : kind === "date"
                          ? "date"
                          : kind === "datetime"
                            ? "datetime-local"
                            : "text"
                    }
                    step={kind === "number" ? "any" : undefined}
                    value={String(v)}
                    onChange={(e) => set(e.target.value)}
                  />
                )}
              </div>
            );
          })}
          {err && <p className="text-sm text-destructive sm:col-span-2">{err}</p>}
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------- helpers */

function pretty(t: string) {
  return t.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function display(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
