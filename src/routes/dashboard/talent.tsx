import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Search, ShieldCheck, MapPin, Award, Loader2, Send, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { date, initials, titleCase } from "@/lib/format";
import { EmptyState, Field, inputClass, Loading, PageHeader } from "@/components/app/kit";
import { RoleGate } from "@/components/app/role-gate";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type Search = { id?: string };

export const Route = createFileRoute("/dashboard/talent")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    id: typeof s.id === "string" ? s.id : undefined,
  }),
  component: () => (
    <RoleGate roles={["employer", "admin", "staff"]}>
      <Talent />
    </RoleGate>
  ),
});

type Pro = {
  id: string;
  name: string;
  headline: string | null;
  district: string | null;
  available: boolean;
  certificates: number;
  since: string;
};

function Talent() {
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const [pros, setPros] = useState<Pro[] | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    supabase.rpc("professional_directory", {}).then(({ data }) => setPros((data as Pro[]) ?? []));
  }, []);

  const list = useMemo(
    () =>
      (pros ?? []).filter(
        (p) =>
          !q || `${p.name} ${p.headline} ${p.district}`.toLowerCase().includes(q.toLowerCase()),
      ),
    [pros, q],
  );

  if (!pros) return <Loading />;

  return (
    <>
      <PageHeader
        title="Find professionals"
        subtitle="Every listed professional holds a valid Kagoma certificate and has passed an identity check."
      />
      <div className="relative mb-5 md:w-96">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, skill or district…"
          className={`${inputClass} pl-9`}
        />
      </div>
      {list.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => (
            <button
              key={p.id}
              onClick={() => navigate({ to: "/dashboard/talent", search: { id: p.id } })}
              className="rounded-2xl border border-border bg-card p-5 text-left transition hover:-translate-y-0.5 hover:border-primary/60"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent font-bold text-primary-foreground">
                  {initials(p.name)}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-semibold">{p.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {p.headline || "Security professional"}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 text-primary">
                  <ShieldCheck className="h-3.5 w-3.5" /> Verified
                </span>
                <span className="inline-flex items-center gap-1">
                  <Award className="h-3.5 w-3.5" /> {p.certificates} certificate(s)
                </span>
                {p.district && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {p.district}
                  </span>
                )}
              </div>
              <div
                className={`mt-3 text-xs font-semibold ${p.available ? "text-emerald-500" : "text-muted-foreground"}`}
              >
                {p.available ? "Available for work" : "Not available"}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState icon={Users} title="No professionals match" hint="Try a different search." />
      )}

      <Sheet
        open={!!id}
        onOpenChange={(o) => !o && navigate({ to: "/dashboard/talent", search: {} })}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {id && <ProDetail id={id} pro={pros.find((p) => p.id === id)} />}
        </SheetContent>
      </Sheet>
    </>
  );
}

function ProDetail({ id, pro }: { id: string; pro?: Pro }) {
  const { user, profile } = useAuth();
  const [d, setD] = useState<{
    pp: {
      headline: string | null;
      bio: string | null;
      location: string | null;
      years_experience: number | null;
      languages: string | null;
      verification_level: string;
    } | null;
    skills: { skill: string; level: string }[];
    exp: {
      id: string;
      role_title: string;
      employer_name: string;
      start_date: string | null;
      end_date: string | null;
      is_current: boolean;
      description: string | null;
    }[];
    certs: { certificate_number: string; course_name: string; issue_date: string }[];
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    setD(null);
    setSent(false);
    Promise.all([
      supabase.from("professional_profiles").select("*").eq("id", id).maybeSingle(),
      supabase.from("professional_skills").select("skill,level").eq("professional_id", id),
      supabase
        .from("work_experience")
        .select("*")
        .eq("professional_id", id)
        .order("start_date", { ascending: false }),
      supabase
        .from("certificates")
        .select("certificate_number,course_name,issue_date")
        .eq("student_id", id)
        .eq("status", "valid"),
    ]).then(([pp, s, e, c]) =>
      setD({ pp: pp.data, skills: s.data ?? [], exp: e.data ?? [], certs: c.data ?? [] }),
    );
  }, [id]);

  async function contact(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const f = new FormData(ev.currentTarget);
    setBusy(true);
    const { error } = await supabase.from("employer_contacts").insert({
      employer_id: user!.id,
      professional_id: id,
      subject: String(f.get("subject")).trim() || null,
      message: String(f.get("message")).trim(),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setSent(true);
    toast.success("Message sent");
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle className="font-display text-xl">{pro?.name ?? "Professional"}</SheetTitle>
      </SheetHeader>
      {!d ? (
        <Loading />
      ) : (
        <div className="mt-4 space-y-6 text-sm">
          <div>
            <div className="text-muted-foreground">{d.pp?.headline || pro?.headline}</div>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
              {d.pp?.location && <span>{d.pp.location}</span>}
              {d.pp?.years_experience != null && (
                <span>{d.pp.years_experience} years' experience</span>
              )}
              {d.pp?.languages && <span>{d.pp.languages}</span>}
              {d.pp?.verification_level && (
                <span className="font-semibold text-primary">
                  {titleCase(d.pp.verification_level)}
                </span>
              )}
            </div>
            {d.pp?.bio && <p className="mt-3 leading-relaxed">{d.pp.bio}</p>}
          </div>

          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">
              Certificates
            </h3>
            <div className="space-y-2">
              {d.certs.map((c) => (
                <Link
                  key={c.certificate_number}
                  to="/verify"
                  search={{ ref: c.certificate_number }}
                  className="flex items-center gap-2 rounded-lg border border-border p-2.5 hover:border-primary/50"
                >
                  <Award className="h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{c.course_name}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">
                      {c.certificate_number} · {date(c.issue_date)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {d.skills.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">
                Skills
              </h3>
              <div className="flex flex-wrap gap-2">
                {d.skills.map((s) => (
                  <span key={s.skill} className="rounded-full border border-border px-3 py-1">
                    {s.skill} <span className="text-xs text-muted-foreground">· {s.level}</span>
                  </span>
                ))}
              </div>
            </section>
          )}

          {d.exp.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">
                Experience
              </h3>
              <ol className="space-y-3">
                {d.exp.map((x) => (
                  <li key={x.id} className="border-l-2 border-primary/50 pl-3">
                    <div className="font-semibold">
                      {x.role_title} · {x.employer_name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {date(x.start_date, { month: "short", year: "numeric" })} –{" "}
                      {x.is_current
                        ? "present"
                        : date(x.end_date, { month: "short", year: "numeric" })}
                    </div>
                    {x.description && <p className="mt-1 text-muted-foreground">{x.description}</p>}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {profile?.role === "employer" && (
            <section className="rounded-xl border border-border p-4">
              <h3 className="mb-3 font-semibold">Contact {pro?.name?.split(" ").slice(-1)[0]}</h3>
              {sent ? (
                <p className="text-muted-foreground">
                  Sent. You will see their answer under Messages; contact details are shared when
                  they accept.
                </p>
              ) : (
                <form onSubmit={contact} className="space-y-3">
                  <Field label="Subject">
                    <input
                      name="subject"
                      className={inputClass}
                      placeholder="e.g. Supervisor role in Kigali"
                    />
                  </Field>
                  <Field label="Message" required>
                    <textarea name="message" rows={4} required className={inputClass} />
                  </Field>
                  <button
                    disabled={busy}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-semibold text-primary-foreground"
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}{" "}
                    Send message
                  </button>
                </form>
              )}
            </section>
          )}
        </div>
      )}
    </>
  );
}
