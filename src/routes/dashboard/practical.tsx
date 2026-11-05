import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Hammer } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { date } from "@/lib/format";
import {
  DataList,
  EmptyState,
  Field,
  inputClass,
  Loading,
  PageHeader,
  Panel,
  StatusBadge,
} from "@/components/app/kit";
import { RoleGate, ADMIN } from "@/components/app/role-gate";

export const Route = createFileRoute("/dashboard/practical")({
  component: () => (
    <RoleGate roles={ADMIN}>
      <Practical />
    </RoleGate>
  ),
});

type Row = {
  id: string;
  assessor_name: string;
  assessor_qualification: string | null;
  assessed_on: string;
  result: string;
  notes: string | null;
  profiles: { full_name: string } | null;
  courses: { id: string; title: string } | null;
};
type Candidate = {
  student_id: string;
  course_id: string;
  profiles: { full_name: string } | null;
  courses: { title: string; practical: boolean } | null;
};

function Practical() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [cands, setCands] = useState<Candidate[]>([]);
  const [show, setShow] = useState(false);

  const load = useCallback(async () => {
    const [r, c] = await Promise.all([
      supabase
        .from("practical_assessments")
        .select("*, profiles!practical_assessments_student_id_fkey(full_name), courses(id,title)")
        .order("assessed_on", { ascending: false }),
      supabase
        .from("enrollments")
        .select("student_id, course_id, profiles(full_name), courses!inner(title, practical)")
        .eq("courses.practical", true),
    ]);
    setRows((r.data as Row[]) ?? []);
    setCands((c.data as unknown as Candidate[]) ?? []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function record(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const [student_id, course_id] = String(f.get("who")).split("|");
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("practical_assessments").insert({
      student_id,
      course_id,
      assessor_name: String(f.get("assessor")).trim(),
      assessor_qualification: String(f.get("qualification")).trim() || null,
      assessed_on: String(f.get("on")),
      result: String(f.get("result")),
      notes: String(f.get("notes")).trim() || null,
      recorded_by: u.user?.id,
    });
    if (error) return toast.error(error.message);
    toast.success(
      "Practical recorded. A pass releases the certificate if the final exam is passed.",
    );
    setShow(false);
    load();
  }

  if (!rows) return <Loading />;

  return (
    <>
      <PageHeader
        title="Practical assessments"
        subtitle="Courses marked ▲ need a practical pass, assessed in person by a certified instructor, before the certificate is issued."
        actions={
          <button
            onClick={() => setShow((s) => !s)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="h-4 w-4" /> Record assessment
          </button>
        }
      />
      {show && (
        <Panel title="Record a practical assessment" className="mb-6">
          <form onSubmit={record} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Learner and course" required className="lg:col-span-2">
              <select name="who" required className={inputClass}>
                {cands.map((c) => (
                  <option key={c.student_id + c.course_id} value={`${c.student_id}|${c.course_id}`}>
                    {c.profiles?.full_name} — {c.course_id} {c.courses?.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date">
              <input
                name="on"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
                className={inputClass}
              />
            </Field>
            <Field label="Assessor" required>
              <input name="assessor" required className={inputClass} />
            </Field>
            <Field label="Assessor qualification">
              <input name="qualification" className={inputClass} />
            </Field>
            <Field label="Result">
              <select name="result" className={inputClass}>
                <option value="pass">Pass</option>
                <option value="partial">Partial</option>
                <option value="fail">Fail</option>
              </select>
            </Field>
            <Field label="Notes" className="sm:col-span-2 lg:col-span-3">
              <textarea name="notes" rows={2} className={inputClass} />
            </Field>
            <button className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
              Save
            </button>
          </form>
          {!cands.length && (
            <p className="mt-3 text-sm text-muted-foreground">
              No learner is enrolled on a practical course yet.
            </p>
          )}
        </Panel>
      )}
      <Panel bodyClassName="p-0 md:p-2">
        <DataList
          rows={rows}
          rowKey={(r) => r.id}
          empty={
            <div className="p-5">
              <EmptyState icon={Hammer} title="No practical assessments recorded" />
            </div>
          }
          columns={[
            { key: "d", label: "Date", render: (r) => date(r.assessed_on) },
            {
              key: "n",
              label: "Learner",
              render: (r) => <span className="font-semibold">{r.profiles?.full_name}</span>,
            },
            {
              key: "c",
              label: "Course",
              render: (r) => `${r.courses?.id} · ${r.courses?.title}`,
              hideOnMobile: true,
            },
            { key: "a", label: "Assessor", render: (r) => r.assessor_name },
            { key: "r", label: "Result", render: (r) => <StatusBadge status={r.result} /> },
          ]}
        />
      </Panel>
    </>
  );
}
