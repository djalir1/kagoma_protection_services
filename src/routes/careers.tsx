import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarDays,
  MapPin,
  Users,
  CheckCircle2,
  Loader2,
  GraduationCap,
  Briefcase,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { date } from "@/lib/format";
import { PageHero } from "@/components/page-hero";
import { Field, inputClass } from "@/components/app/kit";
import { AddressFields } from "@/components/app/address-fields";
import { ROLES } from "@/routes/dashboard/events.index";

export const Route = createFileRoute("/careers")({
  head: () => ({
    meta: [
      { title: "Careers & event work — KAGOMA" },
      {
        name: "description",
        content:
          "Join the Kagoma talent pool for event stewarding, ushering and security work in Rwanda.",
      },
    ],
  }),
  component: Careers,
});

type Shift = {
  id: string;
  name: string;
  venue: string | null;
  starts_on: string;
  call_time: string | null;
  roles: string[];
  note: string | null;
  needed: number | null;
  offered: number;
};

function Careers() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    supabase.rpc("open_shifts").then(({ data }) => setShifts((data as Shift[]) ?? []));
  }, []);

  async function apply(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) ?? "").trim() || null;
    setBusy(true);
    const { data, error } = await supabase.rpc("join_work_pool", {
      p_name: v("name"),
      p_phone: v("phone"),
      p_email: v("email"),
      p_nid: v("nid"),
      p_dob: v("dob"),
      p_gender: v("gender"),
      p_district: v("district"),
      p_roles: f.getAll("roles").map(String),
      p_years: f.get("years") ? Number(f.get("years")) : null,
      p_note: v("note"),
      p_languages: f.getAll("languages").map(String),
      p_weekdays: f.get("weekdays") === "on",
      p_weekends: f.get("weekends") === "on",
      p_nights: f.get("nights") === "on",
      p_transport: f.get("transport") === "on",
      p_province: v("province"),
      p_sector: v("sector"),
      p_cell: v("cell"),
      p_village: v("village"),
    });
    setBusy(false);
    const r = data as { ok: boolean; reason?: string; already?: boolean } | null;
    if (error || !r?.ok)
      return toast.error(
        r?.reason === "underage"
          ? "You must be 18 or older to work at events."
          : "We could not save your application. Check your name and phone.",
      );
    setDone(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <>
      <PageHero
        eyebrow="Careers"
        title={
          <>
            Work Rwanda's biggest events <span className="text-gradient-gold">with Kagoma.</span>
          </>
        }
        subtitle="Stewards, ushers, accreditation and security officers. Apply once, get screened, and we call you when an event needs you."
      />

      {done && (
        <section className="mx-auto max-w-3xl px-4 pb-10 md:px-8">
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-6">
            <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-500" />
            <div>
              <div className="font-display text-lg font-bold">You're in the talent pool</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Kagoma will check your details. Once approved, you can offer to work any open shift
                below with your phone number.
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 pb-16 md:px-8">
        <div className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Open shifts</div>
        <h2 className="mt-2 text-3xl font-bold">Events looking for people</h2>
        {shifts.length ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {shifts.map((s) => (
              <ShiftCard key={s.id} s={s} />
            ))}
          </div>
        ) : (
          <p className="mt-4 text-muted-foreground">
            No open shifts right now. Join the pool below and we'll call you when one opens.
          </p>
        )}
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 pb-24 md:px-8 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-5">
          <div className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
            How it works
          </div>
          <h2 className="text-3xl font-bold">Join the talent pool</h2>
          {[
            {
              icon: Briefcase,
              t: "Apply once",
              d: "Tell us who you are, where you live and what roles you can do.",
            },
            {
              icon: CheckCircle2,
              t: "Get screened",
              d: "Kagoma checks your details before you are sent to a client.",
            },
            {
              icon: CalendarDays,
              t: "Get called",
              d: "Offer for open shifts, or we call you. Clock in at the gate; your hours are recorded.",
            },
            {
              icon: GraduationCap,
              t: "Rise to the top",
              d: "People holding a Kagoma certificate are called first. Study is free.",
            },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold">{t}</div>
                <div className="text-sm text-muted-foreground">{d}</div>
              </div>
            </div>
          ))}
          <Link
            to="/training"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
          >
            Browse free courses →
          </Link>
        </div>

        <form
          onSubmit={apply}
          className="grid gap-4 rounded-2xl border border-border bg-card p-6 sm:grid-cols-2 md:p-8"
        >
          <Field label="Full name" required>
            <input name="name" required className={inputClass} />
          </Field>
          <Field label="Phone" required>
            <input name="phone" type="tel" required placeholder="+250 7…" className={inputClass} />
          </Field>
          <Field label="Email">
            <input name="email" type="email" className={inputClass} />
          </Field>
          <Field label="National ID">
            <input name="nid" className={inputClass} />
          </Field>
          <Field label="Date of birth" hint="You must be 18 or over.">
            <input name="dob" type="date" className={inputClass} />
          </Field>
          <Field label="Gender">
            <select name="gender" className={inputClass} defaultValue="">
              <option value="">Prefer not to say</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </Field>
          <AddressFields />
          <div className="sm:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Roles you can do
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {ROLES.map((r) => (
                <label
                  key={r}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 py-1 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/10"
                >
                  <input type="checkbox" name="roles" value={r} className="accent-[var(--gold)]" />{" "}
                  {r}
                </label>
              ))}
            </div>
          </div>
          <Field label="Years of experience">
            <input name="years" type="number" min={0} step="0.5" className={inputClass} />
          </Field>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Languages
            </span>
            <div className="mt-2 flex flex-wrap gap-3 text-sm">
              {["Kinyarwanda", "English", "French", "Swahili"].map((l) => (
                <label key={l} className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    name="languages"
                    value={l}
                    defaultChecked={l === "Kinyarwanda"}
                  />{" "}
                  {l}
                </label>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Availability
            </span>
            <div className="mt-2 flex flex-wrap gap-4 text-sm">
              <label className="inline-flex items-center gap-1.5">
                <input type="checkbox" name="weekdays" defaultChecked /> Weekdays
              </label>
              <label className="inline-flex items-center gap-1.5">
                <input type="checkbox" name="weekends" defaultChecked /> Weekends
              </label>
              <label className="inline-flex items-center gap-1.5">
                <input type="checkbox" name="nights" /> Nights
              </label>
              <label className="inline-flex items-center gap-1.5">
                <input type="checkbox" name="transport" /> I have my own transport
              </label>
            </div>
          </div>
          <Field label="Experience (optional)" className="sm:col-span-2">
            <textarea
              name="note"
              rows={3}
              className={inputClass}
              placeholder="Events you have worked, roles, references…"
            />
          </Field>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            Registering does not create employment. See the{" "}
            <Link to="/privacy" className="text-primary">
              privacy notice
            </Link>{" "}
            for how your details are used.
          </p>
          <button
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-accent to-accent/80 px-7 py-3.5 text-sm font-bold uppercase tracking-widest text-accent-foreground sm:col-span-2 sm:w-max"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Apply to the talent pool
          </button>
        </form>
      </section>
    </>
  );
}

function ShiftCard({ s }: { s: Shift }) {
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function offer(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data } = await supabase.rpc("offer_availability", {
      p_event: s.id,
      p_phone: phone.trim(),
      p_name: null,
      p_note: null,
    });
    setBusy(false);
    const r = data as { ok: boolean; reason?: string; name?: string } | null;
    setMsg(
      r?.ok
        ? { ok: true, text: `Thanks ${r.name} — Kagoma will confirm if you are on the roster.` }
        : {
            ok: false,
            text:
              r?.reason === "not_registered"
                ? "That phone is not in the talent pool yet. Apply below first."
                : "This shift is no longer open.",
          },
    );
  }
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-5">
      <h3 className="font-display text-lg font-bold">{s.name}</h3>
      <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />{" "}
          {date(s.starts_on, { weekday: "short", day: "numeric", month: "short" })}
          {s.call_time && (
            <>
              <Clock className="ml-2 h-4 w-4 text-primary" /> {s.call_time.slice(0, 5)}
            </>
          )}
        </div>
        {s.venue && (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" /> {s.venue}
          </div>
        )}
        {s.needed && (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> {s.needed} people needed
          </div>
        )}
      </div>
      {s.roles?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {s.roles.map((r) => (
            <span key={r} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary">
              {r}
            </span>
          ))}
        </div>
      )}
      {s.note && <p className="mt-3 text-sm">{s.note}</p>}
      <form onSubmit={offer} className="mt-4 flex gap-2">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          placeholder="Your phone number"
          className={`${inputClass} py-2`}
        />
        <button
          disabled={busy}
          className="shrink-0 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "I can work"}
        </button>
      </form>
      {msg && (
        <p className={`mt-2 text-xs ${msg.ok ? "text-emerald-500" : "text-destructive"}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
