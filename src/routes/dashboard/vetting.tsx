import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, ShieldCheck, Phone, Mail, IdCard, MapPin, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { date, titleCase } from "@/lib/format";
import { EmptyState, Loading, PageHeader, StatusBadge } from "@/components/app/kit";
import { RoleGate, ADMIN } from "@/components/app/role-gate";

export const Route = createFileRoute("/dashboard/vetting")({
  component: () => (
    <RoleGate roles={ADMIN}>
      <Vetting />
    </RoleGate>
  ),
});

type Applicant = {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  phone: string | null;
  email: string;
  district: string | null;
  sector: string | null;
  national_id: string | null;
  country: string | null;
  gender: string | null;
  role: string;
  status: string;
  joined: string;
};

function Vetting() {
  const [rows, setRows] = useState<Applicant[] | null>(null);
  const load = useCallback(() => {
    supabase.rpc("admin_vetting_queue").then(({ data }) => setRows((data as Applicant[]) ?? []));
  }, []);
  useEffect(load, [load]);

  async function decide(a: Applicant, status: "approved" | "rejected" | "suspended") {
    let note: string | null = null;
    if (status !== "approved") {
      note = window.prompt(`Reason (${status}) — shown to staff only:`);
      if (note === null) return;
    }
    const { error } = await supabase.rpc("set_vetting", {
      p_student: a.id,
      p_status: status,
      p_note: note,
    });
    if (error) return toast.error(error.message);
    toast.success(`${a.full_name}: ${status}`);
    load();
  }

  if (!rows) return <Loading />;

  return (
    <>
      <PageHeader
        title="Identity checks"
        subtitle="Confirm each learner is who they say they are before their certificates can be issued. Study is never blocked."
      />
      {rows.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((a) => {
            const missing = [
              !a.national_id && "national ID",
              !a.date_of_birth && "date of birth",
              !a.phone && "phone",
            ].filter(Boolean);
            return (
              <div key={a.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-display text-lg font-bold">
                      {a.full_name || "(no name)"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Joined {date(a.joined)} · {titleCase(a.role)}
                    </div>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
                <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                  <Row icon={Mail} v={a.email} />
                  <Row icon={Phone} v={a.phone} />
                  <Row icon={IdCard} v={a.national_id} />
                  <Row
                    icon={CalendarDays}
                    v={
                      a.date_of_birth
                        ? `${date(a.date_of_birth)} (${age(a.date_of_birth)} yrs)`
                        : null
                    }
                  />
                  <Row
                    icon={MapPin}
                    v={[a.sector, a.district, a.country].filter(Boolean).join(", ") || null}
                  />
                </dl>
                {missing.length > 0 && (
                  <p className="mt-3 text-xs text-amber-500">Missing: {missing.join(", ")}</p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => decide(a, "approved")}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                  >
                    <ShieldCheck className="h-4 w-4" /> Approve
                  </button>
                  <button
                    onClick={() => decide(a, "rejected")}
                    className="rounded-lg border border-destructive/40 px-4 py-2 text-sm text-destructive"
                  >
                    Reject
                  </button>
                  {a.status !== "suspended" && (
                    <button
                      onClick={() => decide(a, "suspended")}
                      className="rounded-lg border border-border px-4 py-2 text-sm"
                    >
                      Suspend
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={CheckCircle2} title="Nobody is waiting for a check" />
      )}
    </>
  );
}

const age = (dob: string) => Math.floor((Date.now() - new Date(dob).getTime()) / 3.15576e10);

function Row({ icon: Icon, v }: { icon: typeof Mail; v: string | null }) {
  return (
    <div className={`flex items-center gap-2 ${v ? "" : "text-muted-foreground/60"}`}>
      <Icon className="h-4 w-4 shrink-0 text-primary" />{" "}
      <span className="truncate">{v || "Not provided"}</span>
    </div>
  );
}
