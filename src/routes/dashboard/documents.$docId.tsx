import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Pencil, Printer, PenLine, Plus, Trash2, Loader2, Eye } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { date, rwf, titleCase } from "@/lib/format";
import {
  KIND_LABEL,
  MONEY_KINDS,
  totals,
  type DocPayload,
  type DocRow,
  type LineItem,
  type Section,
} from "@/lib/documents";
import { Field, inputClass, Loading, StatusBadge } from "@/components/app/kit";
import { RoleGate, STAFF } from "@/components/app/role-gate";
import { KagomaLogo } from "@/components/logo";
import seal from "@/assets/brand/seal.webp";

type Search = { edit?: boolean };

export const Route = createFileRoute("/dashboard/documents/$docId")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    edit: s.edit === true || s.edit === "true" ? true : undefined,
  }),
  component: () => (
    <RoleGate roles={STAFF}>
      <DocumentPage />
    </RoleGate>
  ),
});

export type Company = {
  legal_name: string;
  trading_name: string;
  tin: string | null;
  address_line: string | null;
  phone_1: string | null;
  phone_2: string | null;
  email: string | null;
  website: string | null;
  vat_registered: boolean;
  vat_rate: number;
  momo_code: string | null;
  bank_name: string | null;
  bank_account: string | null;
  bank_account_name: string | null;
  director_name: string | null;
  director_title: string | null;
  director_postnominals: string | null;
};

function DocumentPage() {
  const { docId } = Route.useParams();
  const { edit } = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [doc, setDoc] = useState<DocRow | null>(null);
  const [co, setCo] = useState<Company | null>(null);
  const [sig, setSig] = useState<{
    data: string | null;
    name: string;
    title: string;
    post: string;
  } | null>(null);

  const load = useCallback(async () => {
    const [d, c, s] = await Promise.all([
      supabase.from("documents").select("*").eq("id", docId).maybeSingle(),
      supabase.from("company_settings").select("*").eq("id", 1).maybeSingle(),
      supabase.rpc("get_signature"),
    ]);
    setDoc(d.data as DocRow);
    setCo(c.data as Company);
    setSig(s.data as typeof sig);
  }, [docId]);
  useEffect(() => {
    load();
  }, [load]);

  if (!doc || !co) return <Loading />;

  async function patch(p: Partial<DocRow>) {
    const { error } = await supabase.from("documents").update(p).eq("id", docId);
    if (error) return toast.error(error.message);
    load();
  }

  return (
    <div>
      <div className="no-print mb-5 flex flex-wrap items-center gap-2">
        <Link
          to="/dashboard/documents"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Documents
        </Link>
        <div className="flex-1" />
        <select
          value={doc.status}
          onChange={(e) => patch({ status: e.target.value })}
          className={`${inputClass} w-36 py-1.5`}
        >
          {["draft", "issued", "signed", "declined", "expired", "cancelled"].map((s) => (
            <option key={s} value={s}>
              {titleCase(s)}
            </option>
          ))}
        </select>
        {edit ? (
          <button
            onClick={() =>
              navigate({ to: "/dashboard/documents/$docId", params: { docId }, search: {} })
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm"
          >
            <Eye className="h-4 w-4" /> Preview
          </button>
        ) : (
          <button
            onClick={() =>
              navigate({
                to: "/dashboard/documents/$docId",
                params: { docId },
                search: { edit: true },
              })
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm"
          >
            <Pencil className="h-4 w-4" /> Edit
          </button>
        )}
        {!doc.signed ? (
          <button
            onClick={() => {
              if (!sig?.data) return toast.error("Upload the signature in Company settings first.");
              patch({
                signed: true,
                signed_at: new Date().toISOString(),
                ...({ signed_by: user?.id } as object),
              } as Partial<DocRow>);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/50 px-3 py-2 text-sm text-primary"
          >
            <PenLine className="h-4 w-4" /> Sign
          </button>
        ) : (
          <button
            onClick={() => patch({ signed: false, signed_at: null })}
            className="rounded-lg border border-border px-3 py-2 text-sm"
          >
            Remove signature
          </button>
        )}
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Printer className="h-4 w-4" /> Print / PDF
        </button>
      </div>

      {edit ? (
        <Editor
          doc={doc}
          onSaved={() => {
            load();
            navigate({ to: "/dashboard/documents/$docId", params: { docId }, search: {} });
          }}
        />
      ) : (
        <Sheet doc={doc} co={co} sig={doc.signed ? sig : null} />
      )}
    </div>
  );
}

function Editor({ doc, onSaved }: { doc: DocRow; onSaved: () => void }) {
  const [p, setP] = useState<DocPayload>(doc.payload ?? {});
  const [busy, setBusy] = useState(false);
  const money = MONEY_KINDS.includes(doc.kind);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) ?? "").trim() || null;
    setBusy(true);
    const { error } = await supabase
      .from("documents")
      .update({
        title: v("title"),
        party_name: v("party_name"),
        party_org: v("party_org"),
        party_email: v("party_email"),
        party_phone: v("party_phone"),
        party_address: v("party_address"),
        issued_on: v("issued_on"),
        valid_until: v("valid_until"),
        related_ref: v("related_ref"),
        parent_ref: v("parent_ref"),
        amount_rwf: money ? totals(p).total : null,
        payload: p,
      })
      .eq("id", doc.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    onSaved();
  }

  const setItem = (i: number, k: keyof LineItem, val: string) =>
    setP((x) => ({
      ...x,
      items: (x.items ?? []).map((it, j) =>
        j === i ? { ...it, [k]: k === "description" ? val : Number(val) } : it,
      ),
    }));
  const setSection = (i: number, k: keyof Section, val: string) =>
    setP((x) => ({
      ...x,
      sections: (x.sections ?? []).map((it, j) => (j === i ? { ...it, [k]: val } : it)),
    }));

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="font-mono text-xs text-muted-foreground">
            {doc.reference} · {KIND_LABEL[doc.kind]}
          </div>
          <StatusBadge status={doc.status} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Title" className="sm:col-span-2 lg:col-span-3">
            <input name="title" defaultValue={doc.title} className={inputClass} />
          </Field>
          <Field label="Addressed to (person)">
            <input name="party_name" defaultValue={doc.party_name ?? ""} className={inputClass} />
          </Field>
          <Field label="Organisation">
            <input name="party_org" defaultValue={doc.party_org ?? ""} className={inputClass} />
          </Field>
          <Field label="Email">
            <input name="party_email" defaultValue={doc.party_email ?? ""} className={inputClass} />
          </Field>
          <Field label="Phone">
            <input name="party_phone" defaultValue={doc.party_phone ?? ""} className={inputClass} />
          </Field>
          <Field label="Address" className="lg:col-span-2">
            <input
              name="party_address"
              defaultValue={doc.party_address ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Date">
            <input
              name="issued_on"
              type="date"
              defaultValue={doc.issued_on ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Valid until">
            <input
              name="valid_until"
              type="date"
              defaultValue={doc.valid_until ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Related reference" hint="e.g. the request or invoice this relates to">
            <input name="related_ref" defaultValue={doc.related_ref ?? ""} className={inputClass} />
          </Field>
          {doc.kind === "service_order" && (
            <Field label="Master agreement reference">
              <input name="parent_ref" defaultValue={doc.parent_ref ?? ""} className={inputClass} />
            </Field>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <Field label="Opening paragraph">
          <textarea
            rows={2}
            value={p.intro ?? ""}
            onChange={(e) => setP({ ...p, intro: e.target.value })}
            className={inputClass}
          />
        </Field>

        {money && (
          <div className="mt-5">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Line items
            </div>
            <div className="space-y-2">
              {(p.items ?? []).map((it, i) => (
                <div key={i} className="grid grid-cols-[1fr_70px_120px_32px] gap-2">
                  <input
                    value={it.description}
                    onChange={(e) => setItem(i, "description", e.target.value)}
                    className={inputClass}
                    placeholder="Description"
                  />
                  <input
                    type="number"
                    value={it.qty}
                    onChange={(e) => setItem(i, "qty", e.target.value)}
                    className={inputClass}
                  />
                  <input
                    type="number"
                    value={it.unit_price}
                    onChange={(e) => setItem(i, "unit_price", e.target.value)}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setP({ ...p, items: (p.items ?? []).filter((_, j) => j !== i) })}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Remove line"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() =>
                  setP({
                    ...p,
                    items: [...(p.items ?? []), { description: "", qty: 1, unit_price: 0 }],
                  })
                }
                className="inline-flex items-center gap-1 text-sm text-primary"
              >
                <Plus className="h-4 w-4" /> Add line
              </button>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!p.vat}
                  onChange={(e) => setP({ ...p, vat: e.target.checked })}
                />{" "}
                Add VAT (18%)
              </label>
              <div className="font-semibold">Total {rwf(totals(p).total)}</div>
            </div>
          </div>
        )}

        <div className="mt-6">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Sections
          </div>
          <div className="space-y-3">
            {(p.sections ?? []).map((s, i) => (
              <div key={i} className="rounded-xl border border-border p-3">
                <div className="flex gap-2">
                  <input
                    value={s.heading}
                    onChange={(e) => setSection(i, "heading", e.target.value)}
                    className={`${inputClass} font-semibold`}
                    placeholder="Heading"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setP({ ...p, sections: (p.sections ?? []).filter((_, j) => j !== i) })
                    }
                    className="px-2 text-muted-foreground hover:text-destructive"
                    aria-label="Remove section"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={s.body}
                  onChange={(e) => setSection(i, "body", e.target.value)}
                  className={`${inputClass} mt-2`}
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              setP({ ...p, sections: [...(p.sections ?? []), { heading: "", body: "" }] })
            }
            className="mt-2 inline-flex items-center gap-1 text-sm text-primary"
          >
            <Plus className="h-4 w-4" /> Add section
          </button>
        </div>

        <Field label="Closing notes" className="mt-5">
          <textarea
            rows={2}
            value={p.notes ?? ""}
            onChange={(e) => setP({ ...p, notes: e.target.value })}
            className={inputClass}
          />
        </Field>
      </div>

      <button
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save document
      </button>
    </form>
  );
}

export function Sheet({
  doc,
  co,
  sig,
}: {
  doc: DocRow;
  co: Company;
  sig: { data: string | null; name: string; title: string; post: string } | null;
}) {
  const p = doc.payload ?? {};
  const money = MONEY_KINDS.includes(doc.kind);
  const t = totals(p, Number(co.vat_rate) || 18);
  return (
    <article className="print-sheet mx-auto max-w-[210mm] bg-white p-8 text-[13px] leading-relaxed text-neutral-900 shadow-xl md:p-12">
      <header className="flex flex-col gap-4 border-b-2 border-[#c9a227] pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <KagomaLogo className="h-16 w-16" />
          <div>
            <div className="font-display text-lg font-bold tracking-wide">{co.legal_name}</div>
            <div className="text-[11px] text-neutral-600">{co.address_line}</div>
            <div className="text-[11px] text-neutral-600">
              TIN {co.tin} · {co.phone_1} · {co.email}
            </div>
          </div>
        </div>
        <div className="text-left sm:text-right">
          <div className="font-display text-xl font-bold uppercase tracking-wider text-[#8a6f10]">
            {KIND_LABEL[doc.kind]}
          </div>
          <div className="font-mono text-xs">{doc.reference}</div>
          <div className="text-xs text-neutral-600">
            Date:{" "}
            {date(doc.issued_on ?? doc.created_at, {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </div>
          {doc.valid_until && (
            <div className="text-xs text-neutral-600">Valid until: {date(doc.valid_until)}</div>
          )}
          {doc.parent_ref && (
            <div className="text-xs text-neutral-600">Under: {doc.parent_ref}</div>
          )}
        </div>
      </header>

      {(doc.party_name || doc.party_org) && (
        <section className="mt-6">
          <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
            {money ? "Bill to" : "To"}
          </div>
          <div className="font-semibold">{doc.party_org}</div>
          <div>{doc.party_name}</div>
          <div className="text-neutral-600">
            {[doc.party_address, doc.party_phone, doc.party_email].filter(Boolean).join(" · ")}
          </div>
        </section>
      )}

      <h1 className="mt-6 font-display text-xl font-bold">{doc.title}</h1>
      {p.intro && <p className="mt-3">{p.intro}</p>}

      {money && (p.items?.length ?? 0) > 0 && (
        <table className="mt-5 w-full border-collapse text-[12px]">
          <thead>
            <tr className="bg-neutral-100 text-left">
              <th className="border border-neutral-300 px-2 py-1.5">Description</th>
              <th className="border border-neutral-300 px-2 py-1.5 text-right">Qty</th>
              <th className="border border-neutral-300 px-2 py-1.5 text-right">Unit (RWF)</th>
              <th className="border border-neutral-300 px-2 py-1.5 text-right">Amount (RWF)</th>
            </tr>
          </thead>
          <tbody>
            {p.items!.map((i, k) => (
              <tr key={k}>
                <td className="border border-neutral-300 px-2 py-1.5">{i.description}</td>
                <td className="border border-neutral-300 px-2 py-1.5 text-right">{i.qty}</td>
                <td className="border border-neutral-300 px-2 py-1.5 text-right">
                  {Number(i.unit_price).toLocaleString()}
                </td>
                <td className="border border-neutral-300 px-2 py-1.5 text-right">
                  {(i.qty * i.unit_price).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="px-2 py-1 text-right">
                Subtotal
              </td>
              <td className="px-2 py-1 text-right">{t.sub.toLocaleString()}</td>
            </tr>
            {p.vat && (
              <tr>
                <td colSpan={3} className="px-2 py-1 text-right">
                  VAT {co.vat_rate}%
                </td>
                <td className="px-2 py-1 text-right">{t.vat.toLocaleString()}</td>
              </tr>
            )}
            <tr className="font-bold">
              <td colSpan={3} className="px-2 py-1.5 text-right">
                Total
              </td>
              <td className="border-t-2 border-neutral-800 px-2 py-1.5 text-right">
                {rwf(t.total)}
              </td>
            </tr>
          </tfoot>
        </table>
      )}

      {(p.sections ?? []).map((s, i) => (
        <section key={i} className="mt-5">
          {s.heading && <h2 className="font-semibold">{s.heading}</h2>}
          {s.body && <p className="mt-1 whitespace-pre-line">{s.body}</p>}
        </section>
      ))}

      {p.notes && <p className="mt-6 rounded bg-neutral-50 p-3 text-[12px]">{p.notes}</p>}

      {money && doc.kind !== "receipt" && (
        <p className="mt-4 text-[11px] text-neutral-600">
          Pay by MTN MoMo code {co.momo_code} or bank transfer to {co.bank_name}, account{" "}
          {co.bank_account} ({co.bank_account_name}). Quote {doc.reference}.
        </p>
      )}

      <footer className="mt-12 flex items-end justify-between gap-6">
        <div>
          {sig?.data ? (
            <img src={sig.data} alt="Signature" className="h-16 object-contain" />
          ) : (
            <div className="h-16" />
          )}
          <div className="mt-1 border-t border-neutral-400 pt-1 text-[12px]">
            <div className="font-semibold">
              {co.director_name}{" "}
              <span className="font-normal text-neutral-500">{co.director_postnominals}</span>
            </div>
            <div className="text-neutral-600">
              {co.director_title}, for {co.trading_name}
            </div>
          </div>
        </div>
        <img
          src={seal}
          alt=""
          className={`h-24 w-24 object-contain ${sig ? "opacity-90" : "opacity-25"}`}
        />
      </footer>
    </article>
  );
}
