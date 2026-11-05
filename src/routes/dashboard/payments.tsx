import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Wallet, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { date, rwf, titleCase } from "@/lib/format";
import {
  DataList,
  EmptyState,
  Loading,
  PageHeader,
  Panel,
  StatusBadge,
  Tabs,
} from "@/components/app/kit";
import { RoleGate } from "@/components/app/role-gate";

export const Route = createFileRoute("/dashboard/payments")({
  component: PaymentsPage,
});

type Payment = {
  id: string;
  course_id: string | null;
  amount_rwf: number;
  method: string;
  reference: string | null;
  status: string;
  purpose: string;
  paid_on: string;
  rejected_reason: string | null;
  created_at: string;
  courses?: { title: string } | null;
  profiles?: { full_name: string | null } | null;
};

function PaymentsPage() {
  const { profile } = useAuth();
  if (profile?.role === "admin") return <AdminPayments />;
  return (
    <RoleGate roles={["student", "professional"]}>
      <MyPayments />
    </RoleGate>
  );
}

function MyPayments() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Payment[] | null>(null);
  useEffect(() => {
    if (!user) return;
    supabase
      .from("payments")
      .select("*, courses(title)")
      .eq("student_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setRows((data as Payment[]) ?? []));
  }, [user]);
  if (!rows) return <Loading />;
  return (
    <>
      <PageHeader
        title="Payments"
        subtitle="Payments you have made to Kagoma, and their confirmation status."
      />
      <Panel bodyClassName="p-0 md:p-2">
        <DataList
          rows={rows}
          rowKey={(r) => r.id}
          empty={
            <div className="p-5">
              <EmptyState
                icon={Wallet}
                title="No payments yet"
                hint="Study is free. You pay only the certificate fee after passing a final exam."
              />
            </div>
          }
          columns={[
            { key: "d", label: "Date", render: (r) => date(r.paid_on) },
            {
              key: "c",
              label: "For",
              render: (r) => `${titleCase(r.purpose)} · ${r.courses?.title ?? r.course_id ?? ""}`,
            },
            {
              key: "a",
              label: "Amount",
              render: (r) => <span className="font-semibold">{rwf(r.amount_rwf)}</span>,
            },
            { key: "m", label: "Method", render: (r) => titleCase(r.method), hideOnMobile: true },
            {
              key: "r",
              label: "Reference",
              render: (r) => <span className="font-mono text-xs">{r.reference ?? "—"}</span>,
              hideOnMobile: true,
            },
            {
              key: "s",
              label: "Status",
              render: (r) => (
                <div className="text-right md:text-left">
                  <StatusBadge status={r.status} />
                  {r.rejected_reason && (
                    <div className="mt-1 text-xs text-destructive">{r.rejected_reason}</div>
                  )}
                </div>
              ),
            },
          ]}
        />
      </Panel>
    </>
  );
}

type Pending = {
  id: string;
  full_name: string;
  phone: string | null;
  course: string | null;
  amount: number;
  method: string;
  reference: string | null;
  paid_on: string;
};

function AdminPayments() {
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const [pending, setPending] = useState<Pending[] | null>(null);
  const [all, setAll] = useState<Payment[]>([]);

  const load = useCallback(async () => {
    const [p, a] = await Promise.all([
      supabase.rpc("admin_pending_payments"),
      supabase
        .from("payments")
        .select("*, courses(title), profiles!payments_student_id_fkey(full_name)")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
    setPending((p.data as Pending[]) ?? []);
    setAll((a.data as Payment[]) ?? []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function decide(id: string, decision: "confirmed" | "failed") {
    let note: string | null = null;
    if (decision === "failed") {
      note = window.prompt("Why is this payment rejected? The learner will see this.");
      if (!note) return;
    }
    const { error } = await supabase.rpc("confirm_payment", {
      p_payment: id,
      p_decision: decision,
      p_note: note,
    });
    if (error) return toast.error(error.message);
    toast.success(
      decision === "confirmed"
        ? "Payment confirmed — certificate issued if fully paid."
        : "Payment rejected",
    );
    load();
  }

  if (!pending) return <Loading />;

  return (
    <>
      <PageHeader
        title="Payments"
        subtitle="Check each reference against the MoMo or bank statement before confirming."
      />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: "pending", label: "To confirm", count: pending.length },
          { value: "all", label: "History" },
        ]}
      />
      <Panel bodyClassName="p-0 md:p-2">
        {tab === "pending" ? (
          <DataList
            rows={pending}
            rowKey={(r) => r.id}
            empty={
              <div className="p-5">
                <EmptyState icon={CheckCircle2} title="All payments are confirmed" />
              </div>
            }
            columns={[
              {
                key: "n",
                label: "Learner",
                render: (r) => (
                  <div>
                    <div className="font-semibold">{r.full_name}</div>
                    <div className="text-xs text-muted-foreground">{r.phone}</div>
                  </div>
                ),
              },
              { key: "c", label: "Course", render: (r) => r.course ?? "—" },
              {
                key: "a",
                label: "Amount",
                render: (r) => <span className="font-semibold">{rwf(r.amount)}</span>,
              },
              {
                key: "r",
                label: "Reference",
                render: (r) => (
                  <span className="font-mono text-xs">
                    {titleCase(r.method)} · {r.reference}
                  </span>
                ),
              },
              { key: "d", label: "Paid", render: (r) => date(r.paid_on), hideOnMobile: true },
              {
                key: "x",
                label: "",
                className: "text-right",
                render: (r) => (
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={() => decide(r.id, "confirmed")}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => decide(r.id, "failed")}
                      className="rounded-lg border border-destructive/40 px-3 py-1.5 text-xs text-destructive"
                    >
                      Reject
                    </button>
                  </div>
                ),
              },
            ]}
          />
        ) : (
          <DataList
            rows={all}
            rowKey={(r) => r.id}
            columns={[
              { key: "d", label: "Date", render: (r) => date(r.paid_on) },
              { key: "n", label: "Learner", render: (r) => r.profiles?.full_name ?? "—" },
              {
                key: "c",
                label: "For",
                render: (r) => `${titleCase(r.purpose)} · ${r.courses?.title ?? ""}`,
                hideOnMobile: true,
              },
              { key: "a", label: "Amount", render: (r) => rwf(r.amount_rwf) },
              {
                key: "r",
                label: "Reference",
                render: (r) => <span className="font-mono text-xs">{r.reference}</span>,
                hideOnMobile: true,
              },
              { key: "s", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
            ]}
          />
        )}
      </Panel>
    </>
  );
}
