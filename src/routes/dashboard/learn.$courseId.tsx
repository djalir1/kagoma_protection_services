import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Clock,
  GraduationCap,
  Languages,
  Loader2,
  Menu,
  Trophy,
  X,
  XCircle,
  Award,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { EmptyState, Loading, ProgressBar } from "@/components/app/kit";
import { RoleGate, LEARNER } from "@/components/app/role-gate";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/learn/$courseId")({
  component: () => (
    <RoleGate roles={[...LEARNER, "admin"]}>
      <Player />
    </RoleGate>
  ),
});

type Lesson = {
  id: string;
  module_id: string;
  number: string;
  title: string;
  title_rw: string | null;
  body: string | null;
  body_rw: string | null;
  duration_minutes: number | null;
  sort_order: number;
};
type Module = {
  id: string;
  number: number;
  title: string;
  title_rw: string | null;
  intro: string | null;
  intro_rw: string | null;
  sort_order: number;
};
type Assessment = {
  id: string;
  module_id: string | null;
  title: string;
  title_rw: string | null;
  kind: "quiz" | "final" | "practice";
  pass_mark: number;
  max_attempts: number | null;
};
type Attempt = {
  assessment_id: string;
  attempt_no: number;
  score_pct: number;
  passed: boolean;
  submitted_at: string;
};
type Item =
  | { type: "lesson"; lesson: Lesson; module: Module }
  | { type: "quiz"; assessment: Assessment; module: Module | null };

function Player() {
  const { courseId } = Route.useParams();
  const { user, profile } = useAuth();
  const [lang, setLang] = useState<"en" | "rw">(() =>
    typeof window !== "undefined" && localStorage.getItem("kagoma-lang") === "rw" ? "rw" : "en",
  );
  const [state, setState] = useState<"loading" | "not_enrolled" | "ready">("loading");
  const [course, setCourse] = useState<{ title: string; title_rw: string | null } | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  const t = (en: string | null | undefined, rw: string | null | undefined) =>
    lang === "rw" && rw ? rw : (en ?? "");

  const load = useCallback(async () => {
    if (!user) return;
    const [c, enr] = await Promise.all([
      supabase.from("courses").select("title,title_rw").eq("id", courseId).maybeSingle(),
      supabase
        .from("enrollments")
        .select("id")
        .eq("student_id", user.id)
        .eq("course_id", courseId)
        .maybeSingle(),
    ]);
    setCourse(c.data);
    if (!enr.data && profile?.role !== "admin") {
      setState("not_enrolled");
      return;
    }
    const mods = await supabase
      .from("modules")
      .select("*")
      .eq("course_id", courseId)
      .order("sort_order");
    const modIds = (mods.data ?? []).map((m) => m.id);
    const [les, ass, lp, att] = await Promise.all([
      modIds.length
        ? supabase.from("lessons").select("*").in("module_id", modIds).order("sort_order")
        : { data: [] },
      supabase.from("assessments").select("*").eq("course_id", courseId).order("sort_order"),
      supabase.from("lesson_progress").select("lesson_id,completed").eq("student_id", user.id),
      supabase
        .from("assessment_attempts")
        .select("assessment_id,attempt_no,score_pct,passed,submitted_at")
        .eq("student_id", user.id),
    ]);
    setModules((mods.data as Module[]) ?? []);
    setLessons((les.data as Lesson[]) ?? []);
    setAssessments((ass.data as Assessment[]) ?? []);
    setDone(new Set((lp.data ?? []).filter((p) => p.completed).map((p) => p.lesson_id)));
    setAttempts((att.data as Attempt[]) ?? []);
    setState("ready");
  }, [user, courseId, profile?.role]);

  useEffect(() => {
    load();
  }, [load]);

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    for (const m of modules) {
      for (const l of lessons.filter((x) => x.module_id === m.id))
        out.push({ type: "lesson", lesson: l, module: m });
      const q = assessments.find((a) => a.module_id === m.id);
      if (q) out.push({ type: "quiz", assessment: q, module: m });
    }
    const final = assessments.find((a) => a.kind === "final");
    if (final) out.push({ type: "quiz", assessment: final, module: null });
    return out;
  }, [modules, lessons, assessments]);

  const keyOf = (i: Item) => (i.type === "lesson" ? i.lesson.id : i.assessment.id);

  // resume at the first lesson not yet done
  useEffect(() => {
    if (state !== "ready" || current || !items.length) return;
    const firstOpen = items.find((i) => i.type === "lesson" && !done.has(i.lesson.id));
    setCurrent(keyOf(firstOpen ?? items[0]));
  }, [state, items, done, current]);

  useEffect(() => {
    localStorage.setItem("kagoma-lang", lang);
  }, [lang]);

  if (state === "loading") return <Loading label="Opening course…" />;

  if (state === "not_enrolled") {
    return (
      <EmptyState
        icon={GraduationCap}
        title={course ? `Enrol to study ${course.title}` : "Course not found"}
        hint="Enrolling is free. You can study at your own pace and sit the final exam when you are ready."
        action={
          course && (
            <button
              disabled={enrolling}
              onClick={async () => {
                setEnrolling(true);
                const { data, error } = await supabase.rpc("enrol_in_course", {
                  p_course: courseId,
                });
                setEnrolling(false);
                if (error || !(data as { ok: boolean }).ok)
                  return toast.error("Could not enrol you on this course.");
                toast.success("You are enrolled. Good luck!");
                load();
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              {enrolling && <Loader2 className="h-4 w-4 animate-spin" />} Enrol now
            </button>
          )
        }
      />
    );
  }

  if (!items.length) {
    return (
      <EmptyState title="This course has no content loaded yet" hint="Please check back soon." />
    );
  }

  const idx = Math.max(
    0,
    items.findIndex((i) => keyOf(i) === current),
  );
  const item = items[idx]!;
  const pct = lessons.length
    ? Math.round((lessons.filter((l) => done.has(l.id)).length / lessons.length) * 100)
    : 0;
  const go = (i: number) => {
    const n = items[i];
    if (n) {
      setCurrent(keyOf(n));
      setOutlineOpen(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const markDone = async (lessonId: string) => {
    if (!user) return;
    setDone((s) => new Set(s).add(lessonId));
    const { error } = await supabase.from("lesson_progress").upsert(
      {
        student_id: user.id,
        lesson_id: lessonId,
        completed: true,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "student_id,lesson_id" },
    );
    if (error) toast.error("Your progress could not be saved. Check your connection.");
  };

  const outline = (
    <div className="space-y-4">
      {modules.map((m) => {
        const ml = items.filter((i) => i.module?.id === m.id);
        return (
          <div key={m.id}>
            <div className="px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              Module {m.number}
            </div>
            <div className="px-2 pb-1 text-sm font-semibold leading-snug">
              {t(m.title, m.title_rw)}
            </div>
            {ml.map((i) => {
              const k = keyOf(i);
              const isDone =
                i.type === "lesson"
                  ? done.has(i.lesson.id)
                  : attempts.some((a) => a.assessment_id === i.assessment.id && a.passed);
              return (
                <button
                  key={k}
                  onClick={() => go(items.indexOf(i))}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition",
                    k === current
                      ? "bg-primary/15 text-primary"
                      : "text-foreground/75 hover:bg-muted",
                  )}
                >
                  {isDone ? (
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  ) : i.type === "quiz" ? (
                    <ClipboardCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  )}
                  <span>
                    {i.type === "lesson"
                      ? `${i.lesson.number} ${t(i.lesson.title, i.lesson.title_rw)}`
                      : "Practice quiz"}
                  </span>
                </button>
              );
            })}
          </div>
        );
      })}
      {items.some((i) => i.type === "quiz" && !i.module) && (
        <button
          onClick={() => go(items.length - 1)}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm font-semibold transition",
            item.type === "quiz" && !item.module
              ? "border-primary bg-primary/15 text-primary"
              : "border-border hover:border-primary/50",
          )}
        >
          <Trophy className="h-4 w-4 text-primary" /> Final exam
        </button>
      )}
    </div>
  );

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Link
          to="/dashboard/learning"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> My learning
        </Link>
        <div className="flex-1" />
        <button
          onClick={() => setLang((l) => (l === "en" ? "rw" : "en"))}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold"
        >
          <Languages className="h-3.5 w-3.5" /> {lang === "en" ? "Kinyarwanda" : "English"}
        </button>
        <button
          onClick={() => setOutlineOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold lg:hidden"
        >
          <Menu className="h-3.5 w-3.5" /> Outline
        </button>
      </div>

      <div className="mb-6 rounded-2xl border border-border bg-card p-5">
        <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">
          {courseId}
        </div>
        <h1 className="mt-1 font-display text-xl font-bold md:text-2xl">
          {t(course?.title, course?.title_rw)}
        </h1>
        <div className="mt-3 flex items-center gap-3">
          <ProgressBar value={pct} />
          <span className="text-sm font-semibold">{pct}%</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="hidden max-h-[calc(100vh-8rem)] overflow-y-auto rounded-2xl border border-border bg-card p-3 lg:sticky lg:top-24 lg:block">
          {outline}
        </aside>

        {outlineOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/60" onClick={() => setOutlineOpen(false)} />
            <div className="absolute inset-y-0 right-0 w-80 max-w-[90%] overflow-y-auto border-l border-border bg-card p-4">
              <button
                onClick={() => setOutlineOpen(false)}
                className="mb-3 rounded-md p-1 hover:bg-muted"
                aria-label="Close outline"
              >
                <X className="h-5 w-5" />
              </button>
              {outline}
            </div>
          </div>
        )}

        <div className="min-w-0">
          {item.type === "lesson" ? (
            <article className="rounded-2xl border border-border bg-card p-6 md:p-10">
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Module {item.module.number} · {t(item.module.title, item.module.title_rw)}
              </div>
              <h2 className="mt-2 font-display text-2xl font-bold md:text-3xl">
                {item.lesson.number} {t(item.lesson.title, item.lesson.title_rw)}
              </h2>
              {item.lesson.duration_minutes && (
                <div className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> {item.lesson.duration_minutes} min
                </div>
              )}
              <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-foreground/90">
                {t(item.lesson.body, item.lesson.body_rw)
                  .split(/\n+/)
                  .filter((p) => p.trim())
                  .map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
              </div>
              <div className="mt-10 flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
                <button
                  disabled={idx === 0}
                  onClick={() => go(idx - 1)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm disabled:opacity-40"
                >
                  <ArrowLeft className="h-4 w-4" /> Previous
                </button>
                <button
                  onClick={async () => {
                    await markDone(item.lesson.id);
                    go(idx + 1);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
                >
                  {done.has(item.lesson.id) ? "Next" : "Mark complete & continue"}{" "}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </article>
          ) : (
            <Quiz
              key={item.assessment.id}
              assessment={item.assessment}
              lang={lang}
              attempts={attempts.filter((a) => a.assessment_id === item.assessment.id)}
              lessonsDone={pct}
              onSubmitted={(a) => setAttempts((x) => [...x, a])}
              onNext={idx < items.length - 1 ? () => go(idx + 1) : undefined}
            />
          )}
        </div>
      </div>
    </div>
  );
}

type QPayload = {
  id: string;
  title: string;
  title_rw: string | null;
  kind: string;
  pass_mark: number;
  questions: {
    id: string;
    number: number;
    kind: string;
    prompt: string;
    prompt_rw: string | null;
    scenario: string | null;
    scenario_rw: string | null;
    options: { id: string; label: string; label_rw: string | null }[];
  }[];
};

function Quiz({
  assessment,
  lang,
  attempts,
  lessonsDone,
  onSubmitted,
  onNext,
}: {
  assessment: Assessment;
  lang: "en" | "rw";
  attempts: Attempt[];
  lessonsDone: number;
  onSubmitted: (a: Attempt) => void;
  onNext?: () => void;
}) {
  const [q, setQ] = useState<QPayload | null>(null);
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    score_pct: number;
    passed: boolean;
    pass_mark: number;
  } | null>(null);
  const t = (en: string | null | undefined, rw: string | null | undefined) =>
    lang === "rw" && rw ? rw : (en ?? "");
  const isFinal = assessment.kind === "final";
  const used = attempts.length;
  const left = assessment.max_attempts ? assessment.max_attempts - used : null;
  const best = attempts.reduce((m, a) => Math.max(m, a.score_pct ?? 0), 0);
  const passed = attempts.some((a) => a.passed);

  async function start() {
    const { data, error } = await supabase.rpc("get_assessment", { p_assessment: assessment.id });
    if (error) return toast.error(error.message);
    setQ(data as QPayload);
    setAnswers({});
    setResult(null);
    setStarted(true);
  }

  async function submit() {
    if (!q) return;
    const missing = q.questions.filter((x) => !answers[x.id]).length;
    if (missing && !confirmSubmit(missing)) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("submit_assessment", {
      p_assessment: assessment.id,
      p_answers: answers,
    });
    setBusy(false);
    if (error)
      return toast.error(
        error.message.includes("attempts")
          ? "You have no attempts left for this exam."
          : error.message,
      );
    const r = data as { score_pct: number; passed: boolean; pass_mark: number; attempt_no: number };
    setResult(r);
    setStarted(false);
    onSubmitted({
      assessment_id: assessment.id,
      attempt_no: r.attempt_no,
      score_pct: r.score_pct,
      passed: r.passed,
      submitted_at: new Date().toISOString(),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (started && q) {
    const answered = Object.keys(answers).length;
    return (
      <div className="rounded-2xl border border-border bg-card p-6 md:p-10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl font-bold">{t(q.title, q.title_rw)}</h2>
          <span className="text-sm text-muted-foreground">
            {answered} / {q.questions.length} answered
          </span>
        </div>
        <ProgressBar value={(answered / Math.max(1, q.questions.length)) * 100} className="mt-3" />
        <ol className="mt-8 space-y-8">
          {q.questions.map((x, i) => (
            <li key={x.id}>
              {x.scenario && (
                <p className="mb-3 rounded-lg bg-muted/60 p-3 text-sm italic">
                  {t(x.scenario, x.scenario_rw)}
                </p>
              )}
              <div className="font-semibold">
                {i + 1}. {t(x.prompt, x.prompt_rw)}
              </div>
              <div className="mt-3 grid gap-2">
                {x.options.map((o) => (
                  <label
                    key={o.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm transition",
                      answers[x.id] === o.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/40",
                    )}
                  >
                    <input
                      type="radio"
                      name={x.id}
                      checked={answers[x.id] === o.id}
                      onChange={() => setAnswers((a) => ({ ...a, [x.id]: o.id }))}
                      className="mt-0.5 accent-[var(--gold)]"
                    />
                    {t(o.label, o.label_rw)}
                  </label>
                ))}
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-10 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:justify-end">
          <button
            onClick={() => setStarted(false)}
            className="rounded-lg border border-border px-4 py-2.5 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Submit answers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 md:p-10">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl",
            isFinal ? "bg-accent/15 text-accent" : "bg-primary/10 text-primary",
          )}
        >
          {isFinal ? <Trophy className="h-6 w-6" /> : <ClipboardCheck className="h-6 w-6" />}
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {isFinal ? "Final exam" : "Practice quiz"}
          </div>
          <h2 className="font-display text-xl font-bold">
            {t(assessment.title, assessment.title_rw)}
          </h2>
        </div>
      </div>

      {result && (
        <div
          className={cn(
            "mt-6 flex items-start gap-3 rounded-xl border p-4",
            result.passed
              ? "border-emerald-500/40 bg-emerald-500/10"
              : "border-destructive/40 bg-destructive/10",
          )}
        >
          {result.passed ? (
            <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-500" />
          ) : (
            <XCircle className="h-6 w-6 shrink-0 text-destructive" />
          )}
          <div>
            <div className="font-display text-2xl font-bold">{result.score_pct}%</div>
            <div className="text-sm">
              {result.passed
                ? isFinal
                  ? "You passed the final exam. Your certificate is ready to claim."
                  : "Well done — you passed this quiz."
                : `The pass mark is ${result.pass_mark}%. Review the module and try again.`}
            </div>
            {result.passed && isFinal && (
              <Link
                to="/dashboard/certificates"
                className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary"
              >
                <Award className="h-4 w-4" /> Claim your certificate
              </Link>
            )}
          </div>
        </div>
      )}

      <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
        <li>• Pass mark: {assessment.pass_mark}%</li>
        <li>
          •{" "}
          {assessment.max_attempts
            ? `${left} of ${assessment.max_attempts} attempts left`
            : "Unlimited attempts — this quiz is for practice and does not count"}
        </li>
        {used > 0 && <li>• Best score so far: {best}%</li>}
        {isFinal && lessonsDone < 100 && (
          <li className="text-amber-500">
            • You have completed {lessonsDone}% of the lessons. Finish them before the exam for the
            best result.
          </li>
        )}
      </ul>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        {isFinal && passed ? (
          <Link
            to="/dashboard/certificates"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <Award className="h-4 w-4" /> Go to certificates
          </Link>
        ) : (
          <button
            onClick={start}
            disabled={left !== null && left <= 0}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {used ? "Try again" : isFinal ? "Start the final exam" : "Start quiz"}
          </button>
        )}
        {onNext && (
          <button
            onClick={onNext}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm"
          >
            Continue <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function confirmSubmit(missing: number) {
  return window.confirm(
    `${missing} question(s) are unanswered and will be marked wrong. Submit anyway?`,
  );
}
