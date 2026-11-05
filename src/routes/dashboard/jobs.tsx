import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Briefcase, MapPin, Plus, Loader2, CalendarClock, Users, Award } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { date, titleCase } from "@/lib/format";
import {
  EmptyState,
  Field,
  inputClass,
  Loading,
  PageHeader,
  Panel,
  StatusBadge,
  Tabs,
} from "@/components/app/kit";
import { RoleGate } from "@/components/app/role-gate";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/dashboard/jobs")({
  component: JobsPage,
});

type Job = {
  id: string;
  employer_id: string;
  title: string;
  description: string | null;
  location: string | null;
  employment_type: string;
  positions: number;
  closes_on: string | null;
  status: string;
  created_at: string;
};

function JobsPage() {
  const { profile } = useAuth();
  if (profile?.role === "employer") return <EmployerJobs />;
  return (
    <RoleGate roles={["student", "professional"]}>
      <LearnerJobs />
    </RoleGate>
  );
}

function LearnerJobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [apps, setApps] = useState<
    { id: string; job_id: string; status: string; created_at: string }[]
  >([]);
  const [tab, setTab] = useState<"open" | "mine">("open");
  const [applyTo, setApplyTo] = useState<Job | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const [j, a] = await Promise.all([
      supabase.from("jobs").select("*").order("created_at", { ascending: false }),
      supabase
        .from("job_applications")
        .select("id,job_id,status,created_at")
        .eq("professional_id", user.id),
    ]);
    setJobs((j.data as Job[]) ?? []);
    setApps(a.data ?? []);
  }, [user]);
  useEffect(() => {
    load();
  }, [load]);

  if (!jobs) return <Loading />;
  const applied = new Map(apps.map((a) => [a.job_id, a]));
  const list =
    tab === "open"
      ? jobs.filter((j) => j.status === "open")
      : jobs.filter((j) => applied.has(j.id));

  async function apply(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!applyTo) return;
    const note = String(new FormData(e.currentTarget).get("note")).trim();
    setBusy(true);
    const { error } = await supabase
      .from("job_applications")
      .insert({ job_id: applyTo.id, professional_id: user!.id, cover_note: note || null });
    setBusy(false);
    if (error)
      return toast.error(
        error.code === "23505" ? "You already applied for this job." : error.message,
      );
    toast.success("Application sent");
    setApplyTo(null);
    load();
  }

  return (
    <>
      <PageHeader title="Jobs" subtitle="Security roles posted by employers on Kagoma." />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          {
            value: "open",
            label: "Open jobs",
            count: jobs.filter((j) => j.status === "open").length,
          },
          { value: "mine", label: "My applications", count: apps.length },
        ]}
      />
      {list.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((j) => {
            const a = applied.get(j.id);
            return (
              <div
                key={j.id}
                className="flex flex-col rounded-2xl border border-border bg-card p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-lg font-bold">{j.title}</h3>
                  {a ? <StatusBadge status={a.status} /> : <StatusBadge status={j.status} />}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {j.location || "Rwanda"}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Briefcase className="h-3 w-3" /> {titleCase(j.employment_type)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3 w-3" /> {j.positions} position(s)
                  </span>
                  {j.closes_on && (
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="h-3 w-3" /> Closes {date(j.closes_on)}
                    </span>
                  )}
                </div>
                <p className="mt-3 flex-1 text-sm text-muted-foreground">{j.description}</p>
                <div className="mt-4">
                  {a ? (
                    a.status !== "withdrawn" &&
                    a.status !== "hired" &&
                    a.status !== "rejected" && (
                      <button
                        onClick={async () => {
                          await supabase
                            .from("job_applications")
                            .update({ status: "withdrawn" })
                            .eq("id", a.id);
                          load();
                        }}
                        className="rounded-lg border border-border px-3 py-2 text-sm"
                      >
                        Withdraw application
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => setApplyTo(j)}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                    >
                      Apply
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Briefcase}
          title={tab === "open" ? "No open jobs right now" : "You have not applied for a job yet"}
          hint="Keep your professional profile up to date — employers also contact listed professionals directly."
        />
      )}

      <Dialog open={!!applyTo} onOpenChange={(o) => !o && setApplyTo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply: {applyTo?.title}</DialogTitle>
          </DialogHeader>
          <form onSubmit={apply} className="space-y-4">
            <Field
              label="Short note to the employer"
              hint="Your name, headline and certificates are shared with the application."
            >
              <textarea
                name="note"
                rows={4}
                className={inputClass}
                placeholder="Why you are a good fit…"
              />
            </Field>
            <button
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Send application
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

type Applicant = {
  id: string;
  name: string;
  headline: string | null;
  cover_note: string | null;
  status: string;
  created_at: string;
  certificates: { number: string; course: string }[];
};

function EmployerJobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState<Job | null>(null);
  const [applicants, setApplicants] = useState<Applicant[] | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("jobs")
      .select("*")
      .eq("employer_id", user.id)
      .order("created_at", { ascending: false });
    setJobs((data as Job[]) ?? []);
  }, [user]);
  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!open) return;
    setApplicants(null);
    supabase
      .rpc("job_applicants", { p_job: open.id })
      .then(({ data }) => setApplicants((data as Applicant[]) ?? []));
  }, [open]);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) ?? "").trim() || null;
    const { error } = await supabase.from("jobs").insert({
      employer_id: user!.id,
      title: v("title"),
      description: v("description"),
      location: v("location"),
      employment_type: v("type"),
      positions: Number(f.get("positions") || 1),
      closes_on: v("closes"),
    });
    if (error) return toast.error(error.message);
    toast.success("Job posted");
    setCreating(false);
    load();
  }

  async function setAppStatus(a: Applicant, status: string) {
    const { error } = await supabase.from("job_applications").update({ status }).eq("id", a.id);
    if (error) return toast.error(error.message);
    setApplicants((xs) => xs?.map((x) => (x.id === a.id ? { ...x, status } : x)) ?? null);
  }

  if (!jobs) return <Loading />;

  return (
    <>
      <PageHeader
        title="Jobs"
        subtitle="Post roles for Kagoma-certified professionals."
        actions={
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="h-4 w-4" /> Post a job
          </button>
        }
      />
      {jobs.length ? (
        <div className="space-y-3">
          {jobs.map((j) => (
            <div
              key={j.id}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 md:flex-row md:items-center"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-bold">{j.title}</h3>
                  <StatusBadge status={j.status} />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {j.location} · {titleCase(j.employment_type)} · {j.positions} position(s) · posted{" "}
                  {date(j.created_at)}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setOpen(j)}
                  className="rounded-lg border border-border px-3 py-2 text-sm"
                >
                  Applicants
                </button>
                {j.status === "open" ? (
                  <button
                    onClick={async () => {
                      await supabase.from("jobs").update({ status: "closed" }).eq("id", j.id);
                      load();
                    }}
                    className="rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    Close
                  </button>
                ) : (
                  <button
                    onClick={async () => {
                      await supabase.from("jobs").update({ status: "open" }).eq("id", j.id);
                      load();
                    }}
                    className="rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    Reopen
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Briefcase}
          title="You have not posted a job"
          hint="Certified professionals on Kagoma can apply directly."
        />
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Post a job</DialogTitle>
          </DialogHeader>
          <form onSubmit={create} className="grid gap-3 sm:grid-cols-2">
            <Field label="Title" required className="sm:col-span-2">
              <input name="title" required className={inputClass} />
            </Field>
            <Field label="Location">
              <input name="location" defaultValue="Kigali" className={inputClass} />
            </Field>
            <Field label="Type">
              <select name="type" className={inputClass}>
                <option value="full_time">Full time</option>
                <option value="part_time">Part time</option>
                <option value="contract">Contract</option>
                <option value="event">Event</option>
              </select>
            </Field>
            <Field label="Positions">
              <input
                name="positions"
                type="number"
                min={1}
                defaultValue={1}
                className={inputClass}
              />
            </Field>
            <Field label="Closes on">
              <input name="closes" type="date" className={inputClass} />
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <textarea name="description" rows={4} className={inputClass} />
            </Field>
            <button className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground sm:col-span-2">
              Post job
            </button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Applicants · {open?.title}</DialogTitle>
          </DialogHeader>
          {!applicants ? (
            <Loading />
          ) : applicants.length ? (
            <div className="space-y-3">
              {applicants.map((a) => (
                <Panel key={a.id} title={a.name} actions={<StatusBadge status={a.status} />}>
                  {a.headline && <div className="text-sm text-muted-foreground">{a.headline}</div>}
                  {a.cover_note && (
                    <p className="mt-2 rounded-lg bg-muted/60 p-3 text-sm">{a.cover_note}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {a.certificates.map((c) => (
                      <span
                        key={c.number}
                        className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary"
                      >
                        <Award className="h-3 w-3" /> {c.course}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {["reviewing", "shortlisted", "hired", "rejected"].map((s) => (
                      <button
                        key={s}
                        onClick={() => setAppStatus(a, s)}
                        disabled={a.status === s}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs disabled:opacity-40"
                      >
                        {titleCase(s)}
                      </button>
                    ))}
                  </div>
                </Panel>
              ))}
            </div>
          ) : (
            <EmptyState title="No applications yet" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
