import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, MapPin, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { date } from "@/lib/format";
import { Field, inputClass, Loading } from "@/components/app/kit";
import { AddressFields } from "@/components/app/address-fields";
import { KagomaLogo } from "@/components/logo";
import { ROLES } from "@/routes/dashboard/events.index";

export const Route = createFileRoute("/join/$token")({
  head: () => ({
    meta: [{ title: "Event sign-up — KAGOMA" }, { name: "robots", content: "noindex" }],
  }),
  component: JoinEvent,
});

type Ev = {
  id: string;
  name: string;
  client: string | null;
  venue: string | null;
  starts_on: string;
  call_time: string | null;
  status: string;
  open: boolean;
};

function JoinEvent() {
  const { token } = Route.useParams();
  const [ev, setEv] = useState<Ev | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase
      .rpc("event_by_token", { p_token: token })
      .then(({ data }) => setEv((data as Ev) ?? null));
  }, [token]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) ?? "").trim() || null;
    setBusy(true);
    setError("");
    const { data, error } = await supabase.rpc("join_event", {
      p_token: token,
      p_name: v("name"),
      p_phone: v("phone"),
      p_nid: v("nid"),
      p_role: v("role"),
      p_province: v("province"),
      p_district: v("district"),
      p_sector: v("sector"),
      p_cell: v("cell"),
      p_village: v("village"),
    });
    setBusy(false);
    const r = data as { ok: boolean; reason?: string; already?: boolean } | null;
    if (error || !r?.ok)
      return setError(
        r?.reason === "not_open"
          ? "Sign-up for this event is closed."
          : "Enter your full name and phone number.",
      );
    setDone(
      r.already
        ? "Your details are updated."
        : "You are registered. Show your ID at the gate to be clocked in.",
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 pb-24 pt-28">
      <div className="mb-6 flex items-center gap-3">
        <KagomaLogo className="h-10 w-10" />
        <div className="font-display text-sm font-bold tracking-widest">KAGOMA · Event sign-up</div>
      </div>
      {ev === undefined ? (
        <Loading />
      ) : !ev ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <XCircle className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="mt-3 font-display text-xl font-bold">This sign-up link is not valid</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ask the Kagoma supervisor for the correct link.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-primary/30 bg-card p-6">
            <h1 className="font-display text-2xl font-bold">{ev.name}</h1>
            <div className="mt-3 space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />{" "}
                {date(ev.starts_on, { weekday: "long", day: "numeric", month: "long" })}
                {ev.call_time ? ` · call ${ev.call_time.slice(0, 5)}` : ""}
              </div>
              {ev.venue && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" /> {ev.venue}
                </div>
              )}
            </div>
          </div>
          {done ? (
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-6">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-500" />
              <div>
                <div className="font-semibold">{done}</div>
                <Link to="/careers" className="mt-2 inline-block text-sm text-primary">
                  Join the talent pool for future events →
                </Link>
              </div>
            </div>
          ) : !ev.open ? (
            <p className="mt-6 rounded-xl bg-muted p-4 text-sm">
              Sign-up for this event is not open.
            </p>
          ) : (
            <form
              onSubmit={submit}
              className="mt-6 grid gap-4 rounded-2xl border border-border bg-card p-6 sm:grid-cols-2"
            >
              <Field label="Full name (as on your ID)" required className="sm:col-span-2">
                <input name="name" required className={inputClass} />
              </Field>
              <Field label="Phone" required>
                <input name="phone" type="tel" required className={inputClass} />
              </Field>
              <Field label="National ID" required>
                <input name="nid" required className={inputClass} />
              </Field>
              <Field label="Role" className="sm:col-span-2">
                <select name="role" className={inputClass}>
                  {ROLES.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </Field>
              <AddressFields required />
              {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
              <button
                disabled={busy}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-bold uppercase tracking-widest text-primary-foreground sm:col-span-2"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Register for this event
              </button>
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Your ID and address are shared only with the venue for accreditation.
              </p>
            </form>
          )}
        </>
      )}
    </div>
  );
}
