import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, FileText, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { date, rwf } from "@/lib/format";
import {
  KIND_LABEL,
  MONEY_KINDS,
  template,
  totals,
  type DocKind,
  type DocRow,
} from "@/lib/documents";
import {
  DataList,
  EmptyState,
  inputClass,
  Loading,
  PageHeader,
  Panel,
  StatusBadge,
} from "@/components/app/kit";
import { RoleGate, STAFF } from "@/components/app/role-gate";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/dashboard/documents/")({
  component: () => (
    <RoleGate roles={STAFF}>
      <Documents />
    </RoleGate>
  ),
});

const GROUPS: { label: string; kinds: DocKind[] }[] = [
  { label: "Sales & billing", kinds: ["quotation", "invoice", "receipt"] },
  { label: "Contracts", kinds: ["agreement", "service_order", "nda"] },
  { label: "Operations", kinds: ["risk_assessment", "post_orders", "incident", "service_report"] },
  {
    label: "People",
    kinds: ["employment", "employment_letter", "employee_rules", "code_of_conduct", "warning"],
  },
  { label: "Company", kinds: ["profile"] },
];

function Documents() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<DocRow[] | null>(null);
  const [kind, setKind] = useState<string>("");
  const [q, setQ] = useState("");
  const [picking, setPicking] = useState(false);

  const load = useCallback(() => {
    supabase
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setRows((data as DocRow[]) ?? []));
  }, []);
  useEffect(load, [load]);

  const list = useMemo(
    () =>
      (rows ?? []).filter(
        (r) =>
          (!kind || r.kind === kind) &&
          (!q ||
            `${r.reference} ${r.title} ${r.party_name} ${r.party_org}`
              .toLowerCase()
              .includes(q.toLowerCase())),
      ),
    [rows, kind, q],
  );

  async function create(k: DocKind) {
    const t = template(k);
    const { data, error } = await supabase
      .from("documents")
      .insert({
        kind: k,
        title: t.title,
        payload: t.payload,
        reference: "",
        created_by: user?.id,
        issued_on: new Date().toISOString().slice(0, 10),
      })
      .select("id")
      .single();
    if (error) return toast.error(error.message);
    navigate({
      to: "/dashboard/documents/$docId",
      params: { docId: data.id },
      search: { edit: true },
    });
  }

  if (!rows) return <Loading />;

  return (
    <>
      <PageHeader
        title="Documents"
        subtitle="Quotations, invoices, agreements, operational and HR documents — numbered, printable and signed."
        actions={
          <button
            onClick={() => setPicking(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="h-4 w-4" /> New document
          </button>
        }
      />
      <div className="mb-4 flex flex-col gap-3 md:flex-row">
        <div className="relative md:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Reference, title, party…"
            className={`${inputClass} pl-9`}
          />
        </div>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className={`${inputClass} md:w-64`}
        >
          <option value="">All kinds</option>
          {Object.entries(KIND_LABEL).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <Panel bodyClassName="p-0 md:p-2">
        <DataList
          rows={list}
          rowKey={(r) => r.id}
          onRowClick={(r) =>
            navigate({ to: "/dashboard/documents/$docId", params: { docId: r.id }, search: {} })
          }
          empty={
            <div className="p-5">
              <EmptyState icon={FileText} title="No documents yet" />
            </div>
          }
          columns={[
            {
              key: "r",
              label: "Reference",
              render: (r) => <span className="font-mono text-xs">{r.reference}</span>,
            },
            { key: "k", label: "Kind", render: (r) => KIND_LABEL[r.kind], hideOnMobile: true },
            {
              key: "t",
              label: "Title / party",
              render: (r) => (
                <div>
                  <div className="font-semibold">{r.title}</div>
                  <div className="text-xs text-muted-foreground">{r.party_org || r.party_name}</div>
                </div>
              ),
            },
            {
              key: "a",
              label: "Amount",
              render: (r) => (MONEY_KINDS.includes(r.kind) ? rwf(totals(r.payload).total) : "—"),
              hideOnMobile: true,
            },
            { key: "d", label: "Date", render: (r) => date(r.issued_on ?? r.created_at) },
            {
              key: "s",
              label: "Status",
              render: (r) => (
                <div className="flex items-center gap-1.5">
                  <StatusBadge status={r.status} />
                  {r.signed && <StatusBadge status="signed" />}
                </div>
              ),
            },
          ]}
        />
      </Panel>

      <Dialog open={picking} onOpenChange={setPicking}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>What do you want to create?</DialogTitle>
          </DialogHeader>
          <div className="grid gap-5 sm:grid-cols-2">
            {GROUPS.map((g) => (
              <div key={g.label}>
                <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                  {g.label}
                </div>
                <div className="space-y-1">
                  {g.kinds.map((k) => (
                    <button
                      key={k}
                      onClick={() => create(k)}
                      className="flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-left text-sm transition hover:border-primary/60 hover:bg-primary/5"
                    >
                      <FileText className="h-4 w-4 text-primary" /> {KIND_LABEL[k]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
