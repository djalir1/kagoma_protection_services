import type { ReactNode } from "react";
import { Clock, Triangle } from "lucide-react";
import { courseCover } from "@/lib/format";
import type { Course } from "@/lib/queries";

export function CourseCard({
  course,
  footer,
  onClick,
}: {
  course: Course;
  footer?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <article
      onClick={onClick}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-1 hover:border-primary/60"
    >
      <div className="relative">
        <img
          src={courseCover(course.id)}
          alt=""
          width={480}
          height={270}
          loading="lazy"
          className="aspect-video w-full object-cover"
        />
        <span className="absolute left-3 top-3 rounded-full bg-background/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-primary backdrop-blur">
          {course.track === "ep" ? "Executive Protection" : "Professional"}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-display text-primary">{course.id}</span>
          {course.study_hours ? (
            <span className="inline-flex items-center gap-1">
              · <Clock className="h-3 w-3" /> {course.study_hours} h
            </span>
          ) : null}
          {course.practical && (
            <span
              className="inline-flex items-center gap-1 text-accent"
              title="Includes a practical assessment"
            >
              · <Triangle className="h-3 w-3 fill-current" /> Practical
            </span>
          )}
        </div>
        <h3 className="mt-2 font-display text-lg font-bold leading-tight">{course.title}</h3>
        <p className="mt-2 line-clamp-3 flex-1 text-sm text-muted-foreground">
          {course.description}
        </p>
        {course.spec_en && (
          <div className="mt-3 text-xs text-muted-foreground">{course.spec_en}</div>
        )}
        {footer && <div className="mt-4">{footer}</div>}
      </div>
    </article>
  );
}
