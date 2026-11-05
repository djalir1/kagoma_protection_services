import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Languages, RefreshCw, Check, Wand2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { titleCase } from "@/lib/format";
import { EmptyState, inputClass, Loading, PageHeader, StatCard, Tabs } from "@/components/app/kit";
import { RoleGate, ADMIN } from "@/components/app/role-gate";

export const Route = createFileRoute("/dashboard/translations")({
  component: () => (
    <RoleGate roles={ADMIN}>
      <Translations />
    </RoleGate>
  ),
});

type Item = {
  id: string;
  source_table: string;
  source_column: string;
  context: string | null;
  english: string | null;
  kinyarwanda: string | null;
  corrected: string | null;
  note: string | null;
  status: string;
};

function Translations() {
  const { profile } = useAuth();
  const [status, setStatus] = useState<"pending" | "corrected" | "ok" | "applied">("pending");
  const [rows, setRows] = useState<Item[] | null>(null);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [r, p] = await Promise.all([
      supabase.from("rw_review").select("*").eq("status", status).order("context").limit(50),
      supabase.rpc("rw_review_progress"),
    ]);
    setRows((r.data as Item[]) ?? []);
    setProgress((p.data as Record<string, number>) ?? {});
  }, [status]);
  useEffect(() => {
    load();
  }, [load]);

  async function build() {
    setBusy(true);
    const { error } = await supabase.rpc("build_rw_review");
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Review list refreshed from the course content");
    load();
  }

  async function apply() {
    setBusy(true);
    const { data, error } = await supabase.rpc("apply_rw_corrections");
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${(data as { applied: number }).applied} correction(s) applied to the courses`);
    load();
  }

  async function mark(it: Item, s: "ok" | "corrected", corrected?: string) {
    const { error } = await supabase
      .from("rw_review")
      .update({
        status: s,
        corrected: corrected ?? it.corrected,
        reviewed_by: profile?.full_name,
        reviewed_on: new Date().toISOString(),
      })
      .eq("id", it.id);
    if (error) return toast.error(error.message);
    setRows((xs) => xs?.filter((x) => x.id !== it.id) ?? null);
  }

  if (!rows) return <Loading />;
  const total = Object.values(progress).reduce((a, b) => a + b, 0);

  return (
    <>
      <PageHeader
        title="Kinyarwanda review"
        subtitle="A native speaker checks each translated text. Corrections are applied to the live courses in one go."
        actions={
          <>
            <button
              onClick={build}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm"
            >
              <RefreshCw className="h-4 w-4" /> Refresh list
            </button>
            <button
              onClick={apply}
              disabled={busy || !progress.corrected}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}{" "}
              Apply {progress.corrected ?? 0} correction(s)
            </button>
          </>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <StatCard label="Texts" value={total} icon={Languages} />
        <StatCard label="Pending" value={progress.pending ?? 0} />
        <StatCard label="Confirmed OK" value={progress.ok ?? 0} />
        <StatCard label="Applied" value={progress.applied ?? 0} />
      </div>
      <Tabs
        value={status}
        onChange={setStatus}
        items={(["pending", "corrected", "ok", "applied"] as const).map((s) => ({
          value: s,
          label: titleCase(s),
          count: progress[s] ?? 0,
        }))}
      />
      {total === 0 ? (
        <EmptyState
          icon={Languages}
          title="The review list is empty"
          hint="Press “Refresh list” to collect every Kinyarwanda text from the courses."
        />
      ) : rows.length ? (
        <div className="space-y-4">
          {rows.map((it) => (
            <ReviewCard
              key={it.id}
              it={it}
              editable={status === "pending" || status === "corrected"}
              onMark={mark}
            />
          ))}
          <p className="text-center text-xs text-muted-foreground">Showing up to 50 at a time.</p>
        </div>
      ) : (
        <EmptyState icon={Check} title="Nothing in this list" />
      )}
    </>
  );
}

function ReviewCard({
  it,
  editable,
  onMark,
}: {
  it: Item;
  editable: boolean;
  onMark: (it: Item, s: "ok" | "corrected", corrected?: string) => void;
}) {
  const [text, setText] = useState(it.corrected ?? it.kinyarwanda ?? "");
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="text-xs text-muted-foreground">
        {it.context} · {titleCase(it.source_table)} {titleCase(it.source_column)}
      </div>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            English
          </div>
          <p className="mt-1 text-sm">{it.english}</p>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-primary">
            Kinyarwanda
          </div>
          {editable ? (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={Math.min(8, Math.ceil(text.length / 70) + 1)}
              className={`${inputClass} mt-1`}
            />
          ) : (
            <p className="mt-1 text-sm">{it.corrected ?? it.kinyarwanda}</p>
          )}
        </div>
      </div>
      {editable && (
        <div className="mt-3 flex justify-end gap-2">
          <button
            onClick={() => onMark(it, "ok")}
            className="rounded-lg border border-border px-3 py-1.5 text-sm"
          >
            It's correct
          </button>
          <button
            onClick={() => onMark(it, "corrected", text)}
            disabled={text === it.kinyarwanda}
            className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-40"
          >
            Save correction
          </button>
        </div>
      )}
    </div>
  );
}
