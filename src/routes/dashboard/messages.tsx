import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare, Check, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { dateTime } from "@/lib/format";
import { EmptyState, Loading, PageHeader, StatusBadge } from "@/components/app/kit";
import { RoleGate } from "@/components/app/role-gate";

export const Route = createFileRoute("/dashboard/messages")({
  component: () => (
    <RoleGate roles={["student", "professional", "employer"]}>
      <Messages />
    </RoleGate>
  ),
});

type Msg = {
  id: string;
  subject: string | null;
  message: string;
  status: string;
  created_at: string;
  direction: "sent" | "received";
  employer: string;
  professional: string;
  contact: { phone: string | null; email: string | null } | null;
};

function Messages() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<Msg[] | null>(null);
  const load = useCallback(() => {
    supabase.rpc("my_messages").then(({ data }) => setRows((data as Msg[]) ?? []));
  }, []);
  useEffect(load, [load]);

  async function answer(m: Msg, status: "accepted" | "declined" | "read") {
    const { error } = await supabase.from("employer_contacts").update({ status }).eq("id", m.id);
    if (error) return toast.error(error.message);
    if (status !== "read")
      toast.success(
        status === "accepted" ? "The employer will see that you are interested." : "Declined",
      );
    load();
  }

  if (!rows) return <Loading />;
  const employer = profile?.role === "employer";

  return (
    <>
      <PageHeader
        title="Messages"
        subtitle={
          employer
            ? "Messages you sent to professionals and their answers."
            : "Employers who contacted you through Kagoma."
        }
      />
      {rows.length ? (
        <div className="space-y-3">
          {rows.map((m) => (
            <div key={m.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-xs text-muted-foreground">
                    {m.direction === "sent" ? `To ${m.professional}` : `From ${m.employer}`} ·{" "}
                    {dateTime(m.created_at)}
                  </div>
                  <div className="mt-0.5 font-semibold">{m.subject || "(no subject)"}</div>
                </div>
                <StatusBadge status={m.status} />
              </div>
              <p className="mt-3 whitespace-pre-line text-sm text-foreground/85">{m.message}</p>
              {m.direction === "received" && (m.status === "sent" || m.status === "read") && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => answer(m, "accepted")}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
                  >
                    <Check className="h-4 w-4" /> I'm interested
                  </button>
                  <button
                    onClick={() => answer(m, "declined")}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <X className="h-4 w-4" /> Not now
                  </button>
                </div>
              )}
              {m.status === "accepted" && m.contact && (
                <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm">
                  <div className="text-xs font-semibold uppercase tracking-wider text-primary">
                    {m.direction === "sent"
                      ? `${m.professional} accepted — contact details`
                      : "Employer contact details"}
                  </div>
                  <div className="mt-1">
                    {m.contact.phone && (
                      <a href={`tel:${m.contact.phone}`} className="mr-4 hover:text-primary">
                        {m.contact.phone}
                      </a>
                    )}
                    {m.contact.email && (
                      <a href={`mailto:${m.contact.email}`} className="hover:text-primary">
                        {m.contact.email}
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={MessageSquare}
          title="No messages yet"
          hint={
            employer
              ? "Contact a professional from the directory."
              : "List your professional profile so employers can contact you."
          }
        />
      )}
    </>
  );
}
