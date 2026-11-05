import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  Award,
  Clock,
  ArrowRight,
  GraduationCap,
  ShieldCheck,
  Briefcase,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  fetchClaims,
  fetchMyCertificates,
  fetchMyEnrollments,
  type Certificate,
  type CertificateClaim,
  type Enrollment,
} from "@/lib/queries";
import { courseCover, rwf, date } from "@/lib/format";
import {
  EmptyState,
  Loading,
  PageHeader,
  Panel,
  ProgressBar,
  StatCard,
  StatusBadge,
} from "@/components/app/kit";

export function LearnerHome() {
  const { user, profile, caps } = useAuth();
  const [enr, setEnr] = useState<Enrollment[] | null>(null);
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [claims, setClaims] = useState<CertificateClaim[]>([]);

  useEffect(() => {
    if (!user) return;
    Promise.all([fetchMyEnrollments(user.id), fetchMyCertificates(user.id), fetchClaims()]).then(
      ([e, c, cl]) => {
        setEnr(e);
        setCerts(c);
        setClaims(cl.filter((x) => !x.issued));
      },
    );
  }, [user]);

  if (!enr) return <Loading />;
  const active = enr.filter((e) => e.status !== "completed");
  const next = active[0];

  return (
    <>
      <PageHeader
        eyebrow="Learner dashboard"
        title={`Hello, ${profile?.first_name || profile?.full_name?.split(" ").slice(-1)[0] || "there"}`}
        subtitle="Pick up where you left off, or start a new course."
        actions={
          <Link
            to="/dashboard/catalog"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <GraduationCap className="h-4 w-4" /> Browse courses
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Courses in progress" value={active.length} icon={BookOpen} />
        <StatCard label="Completed" value={enr.length - active.length} icon={GraduationCap} />
        <StatCard
          label="Certificates"
          value={certs.filter((c) => c.status === "valid").length}
          icon={Award}
        />
        <StatCard
          label="Identity check"
          value={<StatusBadge status={profile?.vetting_status} />}
          icon={ShieldCheck}
          hint={
            profile?.vetting_status === "approved"
              ? "Confirmed by Kagoma"
              : "Needed before a certificate"
          }
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          {next ? (
            <div className="overflow-hidden rounded-2xl border border-primary/30 bg-card">
              <div className="grid sm:grid-cols-[220px_1fr]">
                <img
                  src={courseCover(next.course_id)}
                  alt=""
                  className="aspect-video h-full w-full object-cover object-right sm:aspect-auto"
                />
                <div className="p-6">
                  <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">
                    Continue learning
                  </div>
                  <h2 className="mt-2 font-display text-xl font-bold">{next.courses?.title}</h2>
                  <div className="mt-4 flex items-center gap-3">
                    <ProgressBar value={next.progress} />
                    <span className="text-sm font-semibold">{next.progress}%</span>
                  </div>
                  <Link
                    to="/dashboard/learn/$courseId"
                    params={{ courseId: next.course_id }}
                    className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
                  >
                    Resume <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={BookOpen}
              title="You are not studying a course yet"
              hint="All 20 courses are open to study. Choose one to begin."
              action={
                <Link
                  to="/dashboard/catalog"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                >
                  Open the catalogue
                </Link>
              }
            />
          )}

          {enr.length > 0 && (
            <Panel
              title="My courses"
              actions={
                <Link to="/dashboard/learning" className="text-xs text-primary">
                  See all
                </Link>
              }
            >
              <div className="space-y-4">
                {enr.slice(0, 5).map((e) => (
                  <Link
                    key={e.id}
                    to="/dashboard/learn/$courseId"
                    params={{ courseId: e.course_id }}
                    className="flex items-center gap-4 rounded-xl p-2 transition hover:bg-muted/60"
                  >
                    <img
                      src={courseCover(e.course_id)}
                      alt=""
                      className="h-12 w-20 shrink-0 rounded-lg object-cover object-right"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{e.courses?.title}</div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <ProgressBar value={e.progress} className="h-1.5" />
                        <span className="w-9 text-right text-xs text-muted-foreground">
                          {e.progress}%
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={e.status} />
                  </Link>
                ))}
              </div>
            </Panel>
          )}
        </div>

        <div className="space-y-6">
          {claims.length > 0 && (
            <Panel title="Certificates to claim">
              <div className="space-y-3">
                {claims.map((c) => (
                  <div key={c.course_id} className="rounded-xl border border-border p-3">
                    <div className="text-sm font-semibold">{c.course}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Passed with {c.score}% · fee {rwf(c.fee)} · paid {rwf(c.paid)}
                      {c.pending > 0 && ` · ${rwf(c.pending)} awaiting confirmation`}
                    </div>
                  </div>
                ))}
                <Link
                  to="/dashboard/certificates"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
                >
                  Claim certificates <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </Panel>
          )}

          <Panel title="Latest certificates">
            {certs.length ? (
              <div className="space-y-3">
                {certs.slice(0, 3).map((c) => (
                  <Link
                    key={c.id}
                    to="/certificate/$ref"
                    params={{ ref: c.certificate_number }}
                    className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-muted/60"
                  >
                    <Award className="h-8 w-8 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{c.course_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.certificate_number} · {date(c.issue_date)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Pass a final exam to earn your first certificate.
              </p>
            )}
          </Panel>

          <Panel title="Your career">
            <p className="text-sm text-muted-foreground">
              {caps?.can_be_listed
                ? caps.listed
                  ? "Your professional profile is listed — employers can find you."
                  : "You are eligible to list a professional profile so employers can find you."
                : "Once you hold a valid certificate and your identity is confirmed, you can list a professional profile for employers."}
            </p>
            <Link
              to="/dashboard/career"
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary"
            >
              <Briefcase className="h-4 w-4" /> Professional profile
            </Link>
          </Panel>

          <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            Lessons save your progress automatically. Practice quizzes are ungraded; the final exam
            needs 70% and allows 3 attempts.
          </div>
        </div>
      </div>
    </>
  );
}
