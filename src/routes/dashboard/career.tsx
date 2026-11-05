import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Plus, Trash2, Eye, EyeOff, BadgeCheck, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { date, titleCase } from "@/lib/format";
import { Field, inputClass, Loading, PageHeader, Panel, StatusBadge } from "@/components/app/kit";
import { RoleGate, LEARNER } from "@/components/app/role-gate";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/dashboard/career")({
  component: () => (
    <RoleGate roles={LEARNER}>
      <Career />
    </RoleGate>
  ),
});

type ProProfile = {
  id: string;
  headline: string | null;
  bio: string | null;
  location: string | null;
  years_experience: number | null;
  languages: string | null;
  availability: string;
  visible: boolean;
  verification_level: string;
};
type Skill = { id: string; skill: string; level: string };
type Exp = {
  id: string;
  employer_name: string;
  role_title: string;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
};

function Career() {
  const { user, caps, refresh } = useAuth();
  const [pp, setPp] = useState<ProProfile | null | undefined>(undefined);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [exp, setExp] = useState<Exp[]>([]);
  const [busy, setBusy] = useState(false);
  const [showExp, setShowExp] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const [p, s, e] = await Promise.all([
      supabase.from("professional_profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase
        .from("professional_skills")
        .select("id,skill,level")
        .eq("professional_id", user.id)
        .order("created_at"),
      supabase
        .from("work_experience")
        .select("*")
        .eq("professional_id", user.id)
        .order("start_date", { ascending: false }),
    ]);
    setPp((p.data as ProProfile) ?? null);
    setSkills((s.data as Skill[]) ?? []);
    setExp((e.data as Exp[]) ?? []);
  }, [user]);
  useEffect(() => {
    load();
  }, [load]);

  if (pp === undefined || !user) return <Loading />;
  const eligible = !!caps?.can_be_listed;
  const listed = !!pp?.visible;

  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const row = {
      id: user!.id,
      headline: String(f.get("headline")).trim() || null,
      bio: String(f.get("bio")).trim() || null,
      location: String(f.get("location")).trim() || null,
      years_experience: f.get("years") ? Number(f.get("years")) : null,
      languages: String(f.get("languages")).trim() || null,
      availability: String(f.get("availability")),
      updated_at: new Date().toISOString(),
    };
    setBusy(true);
    const { error } = await supabase.from("professional_profiles").upsert(row);
    if (!error && row.headline)
      await supabase.rpc("set_listed", { p_on: listed, p_headline: row.headline });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
    load();
  }

  async function toggleListing(on: boolean) {
    const { error } = await supabase
      .from("professional_profiles")
      .upsert({ id: user!.id, visible: on });
    if (error) return toast.error(error.message.replace(/^.*?: /, ""));
    await supabase.rpc("set_listed", { p_on: on, p_headline: pp?.headline ?? null });
    toast.success(on ? "You are now listed — employers can find you." : "Your profile is hidden.");
    load();
    refresh();
  }

  async function addSkill(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const skill = String(f.get("skill")).trim();
    if (!skill) return;
    const { error } = await supabase
      .from("professional_skills")
      .insert({ professional_id: user!.id, skill, level: String(f.get("level")) });
    if (error)
      return toast.error(error.code === "23505" ? "You already listed that skill." : error.message);
    e.currentTarget.reset();
    load();
  }

  async function addExp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) ?? "").trim() || null;
    const { error } = await supabase.from("work_experience").insert({
      professional_id: user!.id,
      employer_name: v("employer"),
      role_title: v("role"),
      location: v("location"),
      start_date: v("start"),
      end_date: v("end"),
      is_current: f.get("current") === "on",
      description: v("description"),
    });
    if (error) return toast.error(error.message);
    setShowExp(false);
    load();
  }

  return (
    <>
      <PageHeader
        title="Professional profile"
        subtitle="What employers see when they find you in the Kagoma directory."
      />

      <div
        className={`mb-6 flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center ${listed ? "border-emerald-500/40 bg-emerald-500/5" : "border-border bg-card"}`}
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {eligible ? (
            listed ? (
              <Eye className="h-6 w-6" />
            ) : (
              <EyeOff className="h-6 w-6" />
            )
          ) : (
            <Lock className="h-6 w-6" />
          )}
        </div>
        <div className="flex-1">
          <div className="font-semibold">
            {listed ? "Listed in the professional directory" : "Not listed"}
          </div>
          <div className="text-sm text-muted-foreground">
            {eligible
              ? "Employers can see your headline, skills, experience and certificates. Your phone, ID and address are never shown."
              : "You can list your profile once Kagoma has confirmed your identity and you hold a valid Kagoma certificate."}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pp?.verification_level && pp.verification_level !== "none" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary">
              <BadgeCheck className="h-3.5 w-3.5" /> {titleCase(pp.verification_level)}
            </span>
          )}
          <Switch
            checked={listed}
            disabled={!eligible}
            onCheckedChange={toggleListing}
            aria-label="List my profile"
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Panel title="About you">
          <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Headline"
              className="sm:col-span-2"
              hint="e.g. Event security supervisor · 5 years"
            >
              <input
                name="headline"
                defaultValue={pp?.headline ?? ""}
                maxLength={100}
                className={inputClass}
              />
            </Field>
            <Field label="About" className="sm:col-span-2">
              <textarea name="bio" rows={4} defaultValue={pp?.bio ?? ""} className={inputClass} />
            </Field>
            <Field label="Based in">
              <input name="location" defaultValue={pp?.location ?? ""} className={inputClass} />
            </Field>
            <Field label="Years of experience">
              <input
                name="years"
                type="number"
                min={0}
                max={60}
                defaultValue={pp?.years_experience ?? ""}
                className={inputClass}
              />
            </Field>
            <Field label="Languages">
              <input
                name="languages"
                defaultValue={pp?.languages ?? ""}
                placeholder="Kinyarwanda, English…"
                className={inputClass}
              />
            </Field>
            <Field label="Availability">
              <select
                name="availability"
                defaultValue={pp?.availability ?? "available"}
                className={inputClass}
              >
                <option value="available">Available for work</option>
                <option value="not_available">Not available</option>
              </select>
            </Field>
            <div className="sm:col-span-2">
              <button
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save profile
              </button>
            </div>
          </form>
        </Panel>

        <Panel title="Skills">
          <div className="flex flex-wrap gap-2">
            {skills.map((s) => (
              <span
                key={s.id}
                className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-sm"
              >
                {s.skill} <span className="text-xs text-muted-foreground">{s.level}</span>
                <button
                  onClick={async () => {
                    await supabase.from("professional_skills").delete().eq("id", s.id);
                    load();
                  }}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label={`Remove ${s.skill}`}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            ))}
            {!skills.length && (
              <p className="text-sm text-muted-foreground">Add the skills you can prove.</p>
            )}
          </div>
          <form onSubmit={addSkill} className="mt-4 flex gap-2">
            <input name="skill" placeholder="e.g. Access control" className={inputClass} />
            <select name="level" className={`${inputClass} w-36`} defaultValue="competent">
              <option value="basic">Basic</option>
              <option value="competent">Competent</option>
              <option value="advanced">Advanced</option>
            </select>
            <button
              className="rounded-lg bg-primary px-3 text-primary-foreground"
              aria-label="Add skill"
            >
              <Plus className="h-4 w-4" />
            </button>
          </form>
        </Panel>
      </div>

      <Panel
        title="Work experience"
        className="mt-6"
        actions={
          <button
            onClick={() => setShowExp((s) => !s)}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        }
      >
        {showExp && (
          <form
            onSubmit={addExp}
            className="mb-6 grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2"
          >
            <Field label="Employer" required>
              <input name="employer" required className={inputClass} />
            </Field>
            <Field label="Role" required>
              <input name="role" required className={inputClass} />
            </Field>
            <Field label="Start">
              <input name="start" type="date" className={inputClass} />
            </Field>
            <Field label="End">
              <input name="end" type="date" className={inputClass} />
            </Field>
            <Field label="Location">
              <input name="location" className={inputClass} />
            </Field>
            <label className="flex items-center gap-2 self-end pb-2.5 text-sm">
              <input type="checkbox" name="current" /> I work here now
            </label>
            <Field label="What you did" className="sm:col-span-2">
              <textarea name="description" rows={2} className={inputClass} />
            </Field>
            <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground sm:col-span-2">
              Save
            </button>
          </form>
        )}
        {exp.length ? (
          <ol className="space-y-4">
            {exp.map((x) => (
              <li key={x.id} className="flex gap-4 border-l-2 border-primary/50 pl-4">
                <div className="flex-1">
                  <div className="font-semibold">
                    {x.role_title} · {x.employer_name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {date(x.start_date, { month: "short", year: "numeric" })} –{" "}
                    {x.is_current
                      ? "present"
                      : date(x.end_date, { month: "short", year: "numeric" })}
                    {x.location ? ` · ${x.location}` : ""}
                  </div>
                  {x.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{x.description}</p>
                  )}
                </div>
                <button
                  onClick={async () => {
                    await supabase.from("work_experience").delete().eq("id", x.id);
                    load();
                  }}
                  className="self-start text-muted-foreground hover:text-destructive"
                  aria-label="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ol>
        ) : (
          !showExp && <p className="text-sm text-muted-foreground">No experience added yet.</p>
        )}
      </Panel>
      {pp && (
        <p className="mt-4 text-xs text-muted-foreground">
          Status:{" "}
          <StatusBadge
            status={pp.availability === "available" ? "open" : "closed"}
            label={pp.availability === "available" ? "Available" : "Not available"}
          />
        </p>
      )}
    </>
  );
}
