import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Building2, AlertTriangle, FileSignature, Receipt, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { date, rwf, titleCase } from "@/lib/format";
import {
  DataList,
  EmptyState,
  Field,
  inputClass,
  Loading,
  PageHeader,
  Panel,
  StatusBadge,
  Tabs,
} from "@/components/app/kit";
import { RoleGate, STAFF } from "@/components/app/role-gate";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/dashboard/clients")({
  component: () => (
    <RoleGate roles={STAFF}>
      <Clients />
    </RoleGate>
  ),
});

type ClientRow = {
  id: string;
  name: string;
  tin: string | null;
  contact: string | null;
  agreement: { ref: string; status: string; signed_on: string | null } | null;
  orders: number;
  orders_unsigned: number;
  last_event: string | null;
  billed: number;
};
type Outstanding = {
  order_id: string;
  reference: string;
  client: string;
  event: string | null;
  event_date: string | null;
  total: number;
  paid: number;
  balance: number;
  days_since_event: number | null;
};

function Clients() {
  const [tab, setTab] = useState<"register" | "outstanding">("register");
  const [rows, setRows] = useState<ClientRow[] | null>(null);
  const [owed, setOwed] = useState<Outstanding[]>([]);
  const [open, setOpen] = useState<ClientRow | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const [r, o] = await Promise.all([
      supabase.rpc("client_register"),
      supabase.rpc("client_outstanding"),
    ]);
    setRows((r.data as ClientRow[]) ?? []);
    setOwed((o.data as Outstanding[]) ?? []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function addClient(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) ?? "").trim() || null;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("clients").insert({
      legal_name: v("legal_name"),
      trading_name: v("trading_name"),
      tin: v("tin"),
      address: v("address"),
      contact_name: v("contact_name"),
      contact_phone: v("contact_phone"),
      contact_email: v("contact_email"),
      created_by: u.user?.id,
    });
    if (error)
      return toast.error(
        error.code === "23505" ? "A client with that name already exists." : error.message,
      );
    toast.success("Client added");
    setAdding(false);
    load();
  }

  if (!rows) return <Loading />;

  return (
    <>
      <PageHeader
        title="Clients & billing"
        subtitle="Master agreements, service orders, deposits and balances. No event is staffed without a signed agreement."
        actions={
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="h-4 w-4" /> Add client
          </button>
        }
      />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: "register", label: "Client register", count: rows.length },
          { value: "outstanding", label: "Outstanding balances", count: owed.length },
        ]}
      />
      {tab === "register" ? (
        <Panel bodyClassName="p-0 md:p-2">
          <DataList
            rows={rows}
            rowKey={(r) => r.id}
            onRowClick={setOpen}
            empty={
              <div className="p-5">
                <EmptyState icon={Building2} title="No clients yet" />
              </div>
            }
            columns={[
              {
                key: "n",
                label: "Client",
                render: (r) => (
                  <div>
                    <div className="font-semibold">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.contact}</div>
                  </div>
                ),
              },
              { key: "t", label: "TIN", render: (r) => r.tin ?? "—", hideOnMobile: true },
              {
                key: "a",
                label: "Agreement",
                render: (r) =>
                  r.agreement ? (
                    <StatusBadge
                      status={r.agreement.status}
                      label={`${r.agreement.ref} · ${r.agreement.status}`}
                    />
                  ) : (
                    <span className="text-xs text-amber-500">None on file</span>
                  ),
              },
              {
                key: "o",
                label: "Orders",
                render: (r) => (
                  <span>
                    {r.orders}
                    {r.orders_unsigned > 0 && (
                      <AlertTriangle className="ml-1 inline h-3.5 w-3.5 text-amber-500" />
                    )}
                  </span>
                ),
              },
              { key: "b", label: "Billed", render: (r) => rwf(r.billed) },
            ]}
          />
        </Panel>
      ) : (
        <Panel bodyClassName="p-0 md:p-2">
          <DataList
            rows={owed}
            rowKey={(r) => r.order_id}
            empty={
              <div className="p-5">
                <EmptyState icon={Receipt} title="Nothing outstanding" />
              </div>
            }
            columns={[
              {
                key: "r",
                label: "Order",
                render: (r) => <span className="font-mono text-xs">{r.reference}</span>,
              },
              { key: "c", label: "Client", render: (r) => r.client },
              {
                key: "e",
                label: "Event",
                render: (r) => `${r.event ?? ""} · ${date(r.event_date)}`,
                hideOnMobile: true,
              },
              { key: "t", label: "Total", render: (r) => rwf(r.total), hideOnMobile: true },
              { key: "p", label: "Paid", render: (r) => rwf(r.paid) },
              {
                key: "b",
                label: "Balance",
                render: (r) => <span className="font-semibold text-accent">{rwf(r.balance)}</span>,
              },
              {
                key: "d",
                label: "Days since",
                render: (r) =>
                  r.days_since_event && r.days_since_event > 0 ? r.days_since_event : "—",
              },
            ]}
          />
        </Panel>
      )}

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add a client</DialogTitle>
          </DialogHeader>
          <form onSubmit={addClient} className="grid gap-3 sm:grid-cols-2">
            <Field label="Legal name" required className="sm:col-span-2">
              <input name="legal_name" required className={inputClass} />
            </Field>
            <Field label="Trading name">
              <input name="trading_name" className={inputClass} />
            </Field>
            <Field label="TIN">
              <input name="tin" className={inputClass} />
            </Field>
            <Field label="Address" className="sm:col-span-2">
              <input name="address" className={inputClass} />
            </Field>
            <Field label="Contact person">
              <input name="contact_name" className={inputClass} />
            </Field>
            <Field label="Contact phone">
              <input name="contact_phone" className={inputClass} />
            </Field>
            <Field label="Contact email" className="sm:col-span-2">
              <input name="contact_email" type="email" className={inputClass} />
            </Field>
            <button className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground sm:col-span-2">
              Save client
            </button>
          </form>
        </DialogContent>
      </Dialog>

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          {open && <ClientDetail client={open} onChanged={load} />}
        </SheetContent>
      </Sheet>
    </>
  );
}

type Agreement = {
  id: string;
  reference: string;
  status: string;
  starts_on: string | null;
  signed_on: string | null;
  signed_by_client: string | null;
};
type Order = {
  id: string;
  reference: string;
  event_name: string | null;
  venue: string | null;
  event_date: string | null;
  staff_count: number | null;
  total_rwf: number | null;
  deposit_rwf: number | null;
  status: string;
  agreement_id: string | null;
};
type Balance = {
  order_total: number;
  agreed_extras: number;
  pending_extras: number;
  paid: number;
  balance: number;
  deposit_required: number;
  deposit_paid: number;
  deposit_settled: boolean;
};

function ClientDetail({ client, onChanged }: { client: ClientRow; onChanged: () => void }) {
  const [agr, setAgr] = useState<Agreement[]>([]);
  const [orders, setOrders] = useState<(Order & { bal?: Balance })[] | null>(null);
  const [form, setForm] = useState<"agreement" | "order" | null>(null);
  const [payFor, setPayFor] = useState<Order | null>(null);
  const [chargeFor, setChargeFor] = useState<Order | null>(null);

  const load = useCallback(async () => {
    const [a, o] = await Promise.all([
      supabase
        .from("agreements")
        .select("*")
        .eq("client_id", client.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("service_orders")
        .select("*")
        .eq("client_id", client.id)
        .order("event_date", { ascending: false }),
    ]);
    setAgr((a.data as Agreement[]) ?? []);
    const os = (o.data as Order[]) ?? [];
    const bals = await Promise.all(os.map((x) => supabase.rpc("so_balance", { p_order: x.id })));
    setOrders(os.map((x, i) => ({ ...x, bal: bals[i]!.data as Balance })));
  }, [client.id]);
  useEffect(() => {
    load();
  }, [load]);

  const done = () => {
    setForm(null);
    setPayFor(null);
    setChargeFor(null);
    load();
    onChanged();
  };

  async function saveAgreement(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const { data, error } = await supabase.rpc("record_agreement", {
      p_client: client.id,
      p_reference: String(f.get("reference")),
      p_starts: String(f.get("starts")) || null,
      p_status: String(f.get("status")),
      p_signed_on: String(f.get("signed_on")) || null,
      p_signed_by: String(f.get("signed_by")) || null,
    });
    const r = data as { ok: boolean; reason?: string } | null;
    if (error || !r?.ok)
      return toast.error(
        r?.reason === "need_signed_date"
          ? "Enter the date it was signed."
          : (error?.message ?? "Could not save"),
      );
    toast.success("Agreement saved");
    done();
  }

  async function saveOrder(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const n = (k: string) => (f.get(k) ? Number(f.get(k)) : null);
    const { data, error } = await supabase.rpc("record_service_order", {
      p_client: client.id,
      p_reference: String(f.get("reference")),
      p_agreement: String(f.get("agreement")) || null,
      p_event_name: String(f.get("event")) || null,
      p_venue: String(f.get("venue")) || null,
      p_date: String(f.get("date")) || null,
      p_staff: n("staff"),
      p_total: n("total"),
      p_deposit: n("deposit"),
      p_status: String(f.get("status")),
    });
    if (error) return toast.error(error.message);
    const w = (data as { warning?: string }).warning;
    if (w) toast.warning(w);
    else toast.success("Service order saved");
    done();
  }

  async function pay(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!payFor) return;
    const f = new FormData(e.currentTarget);
    const { error } = await supabase.rpc("record_client_payment", {
      p_order: payFor.id,
      p_amount: Number(f.get("amount")),
      p_purpose: String(f.get("purpose")),
      p_method: String(f.get("method")),
      p_reference: String(f.get("reference")) || null,
      p_received: String(f.get("received")) || null,
      p_note: null,
    });
    if (error) return toast.error(error.message);
    toast.success("Payment recorded");
    done();
  }

  async function charge(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!chargeFor) return;
    const f = new FormData(e.currentTarget);
    const { error } = await supabase.rpc("add_so_charge", {
      p_order: chargeFor.id,
      p_kind: String(f.get("kind")),
      p_amount: Number(f.get("amount")),
      p_description: String(f.get("description")) || null,
      p_hours: f.get("hours") ? Number(f.get("hours")) : null,
      p_rate: null,
      p_agreed: f.get("agreed") === "on",
    });
    if (error) return toast.error(error.message);
    toast.success("Charge added");
    done();
  }

  const year = new Date().getFullYear();

  return (
    <>
      <SheetHeader>
        <SheetTitle className="font-display text-xl">{client.name}</SheetTitle>
      </SheetHeader>
      <div className="mt-4 space-y-6 text-sm">
        <div className="text-muted-foreground">
          {client.contact}
          {client.tin ? ` · TIN ${client.tin}` : ""}
        </div>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
              Master agreements
            </h3>
            <button
              onClick={() => setForm(form === "agreement" ? null : "agreement")}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
            >
              <FileSignature className="h-3.5 w-3.5" /> Record
            </button>
          </div>
          {form === "agreement" && (
            <form
              onSubmit={saveAgreement}
              className="mb-3 grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2"
            >
              <Field label="Reference" required>
                <input
                  name="reference"
                  required
                  defaultValue={`KPS-MSA-${year}-`}
                  className={inputClass}
                />
              </Field>
              <Field label="Status">
                <select name="status" className={inputClass}>
                  {["draft", "sent", "signed", "expired", "terminated"].map((s) => (
                    <option key={s} value={s}>
                      {titleCase(s)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Starts">
                <input name="starts" type="date" className={inputClass} />
              </Field>
              <Field label="Signed on">
                <input name="signed_on" type="date" className={inputClass} />
              </Field>
              <Field label="Signed for the client by" className="sm:col-span-2">
                <input name="signed_by" className={inputClass} />
              </Field>
              <button className="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground sm:col-span-2">
                Save agreement
              </button>
            </form>
          )}
          {agr.length ? (
            agr.map((a) => (
              <div
                key={a.id}
                className="mb-2 flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div>
                  <div className="font-mono text-xs">{a.reference}</div>
                  <div className="text-xs text-muted-foreground">
                    {a.signed_on
                      ? `Signed ${date(a.signed_on)} by ${a.signed_by_client ?? "—"}`
                      : `Starts ${date(a.starts_on)}`}
                  </div>
                </div>
                <StatusBadge status={a.status} />
              </div>
            ))
          ) : (
            <p className="text-amber-500">No master agreement on file.</p>
          )}
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
              Service orders
            </h3>
            <button
              onClick={() => setForm(form === "order" ? null : "order")}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
            >
              <Plus className="h-3.5 w-3.5" /> New order
            </button>
          </div>
          {form === "order" && (
            <form
              onSubmit={saveOrder}
              className="mb-3 grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2"
            >
              <Field label="Reference" required>
                <input
                  name="reference"
                  required
                  defaultValue={`KPS-SO-${year}-`}
                  className={inputClass}
                />
              </Field>
              <Field label="Under agreement">
                <select name="agreement" className={inputClass}>
                  <option value="">None</option>
                  {agr.map((a) => (
                    <option key={a.id} value={a.reference}>
                      {a.reference} ({a.status})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Event">
                <input name="event" className={inputClass} />
              </Field>
              <Field label="Venue">
                <input name="venue" className={inputClass} />
              </Field>
              <Field label="Date">
                <input name="date" type="date" className={inputClass} />
              </Field>
              <Field label="Staff">
                <input name="staff" type="number" min={1} className={inputClass} />
              </Field>
              <Field label="Total (RWF)">
                <input name="total" type="number" min={0} className={inputClass} />
              </Field>
              <Field label="Deposit required (RWF)">
                <input name="deposit" type="number" min={0} className={inputClass} />
              </Field>
              <Field label="Status" className="sm:col-span-2">
                <select name="status" className={inputClass}>
                  {["draft", "sent", "approved", "delivered", "invoiced", "paid", "cancelled"].map(
                    (s) => (
                      <option key={s} value={s}>
                        {titleCase(s)}
                      </option>
                    ),
                  )}
                </select>
              </Field>
              <button className="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground sm:col-span-2">
                Save order
              </button>
            </form>
          )}
          {!orders ? (
            <Loading />
          ) : orders.length ? (
            <div className="space-y-3">
              {orders.map((o) => (
                <div key={o.id} className="rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-mono text-xs text-muted-foreground">{o.reference}</div>
                      <div className="font-semibold">{o.event_name ?? "Service order"}</div>
                      <div className="text-xs text-muted-foreground">
                        {o.venue} · {date(o.event_date)} · {o.staff_count ?? "—"} staff
                      </div>
                    </div>
                    <StatusBadge status={o.status} />
                  </div>
                  {o.bal && (
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <Mini k="Order" v={rwf(o.bal.order_total)} />
                      <Mini k="Extras agreed" v={rwf(o.bal.agreed_extras)} />
                      <Mini k="Paid" v={rwf(o.bal.paid)} />
                      <Mini k="Balance" v={rwf(o.bal.balance)} strong />
                    </div>
                  )}
                  {o.bal && !o.bal.deposit_settled && (
                    <p className="mt-2 text-xs text-amber-500">
                      Deposit outstanding: {rwf(o.bal.deposit_required - o.bal.deposit_paid)}
                    </p>
                  )}
                  {!o.agreement_id && (
                    <p className="mt-2 text-xs text-amber-500">
                      Not linked to a signed master agreement.
                    </p>
                  )}
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => setPayFor(o)}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                    >
                      Record payment
                    </button>
                    <button
                      onClick={() => setChargeFor(o)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs"
                    >
                      Add charge
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No service orders yet.</p>
          )}
        </section>
      </div>

      <Dialog open={!!payFor} onOpenChange={(o) => !o && setPayFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record a payment · {payFor?.reference}</DialogTitle>
          </DialogHeader>
          <form onSubmit={pay} className="grid gap-3 sm:grid-cols-2">
            <Field label="Amount (RWF)" required>
              <input name="amount" type="number" required className={inputClass} />
            </Field>
            <Field label="For">
              <select name="purpose" className={inputClass}>
                <option value="deposit">Deposit</option>
                <option value="balance">Balance</option>
                <option value="extra">Extra charges</option>
                <option value="refund">Refund</option>
              </select>
            </Field>
            <Field label="Method">
              <select name="method" className={inputClass}>
                <option value="bank">Bank</option>
                <option value="momo">MoMo</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
              </select>
            </Field>
            <Field label="Received">
              <input
                name="received"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                className={inputClass}
              />
            </Field>
            <Field label="Reference" className="sm:col-span-2">
              <input name="reference" className={inputClass} />
            </Field>
            <SubmitButton label="Save payment" />
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!chargeFor} onOpenChange={(o) => !o && setChargeFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a charge · {chargeFor?.reference}</DialogTitle>
          </DialogHeader>
          <form onSubmit={charge} className="grid gap-3 sm:grid-cols-2">
            <Field label="Kind">
              <select name="kind" className={inputClass}>
                {[
                  "overtime",
                  "early_start",
                  "late_finish",
                  "waiting",
                  "extra_staff",
                  "equipment",
                  "other",
                ].map((k) => (
                  <option key={k} value={k}>
                    {titleCase(k)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Amount (RWF)" required>
              <input name="amount" type="number" min={0} required className={inputClass} />
            </Field>
            <Field label="Hours">
              <input name="hours" type="number" step="0.5" className={inputClass} />
            </Field>
            <Field label="Description">
              <input name="description" className={inputClass} />
            </Field>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" name="agreed" /> The client has agreed to this charge
            </label>
            <SubmitButton label="Add charge" />
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

const Mini = ({ k, v, strong }: { k: string; v: string; strong?: boolean }) => (
  <div className="rounded-lg bg-muted/50 p-2">
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
    <div className={strong ? "font-semibold text-accent" : "font-semibold"}>{v}</div>
  </div>
);

function SubmitButton({ label }: { label: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      onClick={() => {
        setBusy(true);
        setTimeout(() => setBusy(false), 1500);
      }}
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground sm:col-span-2"
    >
      {busy && <Loader2 className="h-4 w-4 animate-spin" />} {label}
    </button>
  );
}
