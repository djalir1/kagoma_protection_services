import type { ReactNode } from "react";
import { PageHero } from "@/components/page-hero";

export function LegalLayout({
  eyebrow,
  title,
  meta,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  meta?: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <PageHero eyebrow={eyebrow} title={title} subtitle={meta} />
      <article className="mx-auto max-w-3xl px-4 pb-24 md:px-8">
        {intro && <div className="mb-10 space-y-3 text-lg text-muted-foreground">{intro}</div>}
        <div className="space-y-10 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_li]:leading-relaxed [&_p]:leading-relaxed [&_p]:text-foreground/85 [&_section]:space-y-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_ul]:text-foreground/85">
          {children}
        </div>
      </article>
    </>
  );
}
