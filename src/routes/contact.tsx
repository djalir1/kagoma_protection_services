import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/page-hero";
import { Mail, MapPin, Phone, Send, CheckCircle2, Clock } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — KAGOMA Protection Services" },
      { name: "description", content: "Get in touch with Kagoma Protection Services for event security, consultancy, and training." },
      { property: "og:title", content: "Contact Kagoma Protection Services" },
      { property: "og:description", content: "Book a consultation or request a proposal." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [sent, setSent] = useState(false);

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title={<>Let's plan your <span className="text-gradient-gold">operation.</span></>}
        subtitle="Tell us about your event or requirement. Our team will respond within 24 hours with next steps."
      />

      <section className="mx-auto grid max-w-7xl gap-10 px-4 pb-24 md:px-8 lg:grid-cols-[1fr_1.3fr]">
        <div className="space-y-4">
          {[
            { icon: Phone, title: "Phone", value: "+250 · Available 24/7", href: "tel:+250" },
            { icon: Mail, title: "Email", value: "info@kagoma.rw", href: "mailto:info@kagoma.rw" },
            { icon: MapPin, title: "Head Office", value: "Kigali, Rwanda" },
            { icon: Clock, title: "Operations", value: "24/7 · Ready for deployment" },
          ].map(({ icon: Icon, title, value, href }) => {
            const content = (
              <>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">{title}</div>
                  <div className="mt-1 font-semibold">{value}</div>
                </div>
              </>
            );
            const cls = "flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition hover:border-primary/60";
            return href ? (
              <a key={title} href={href} className={cls}>{content}</a>
            ) : (
              <div key={title} className={cls}>{content}</div>
            );
          })}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSent(true);
          }}
          className="rounded-2xl border border-border bg-card p-8"
        >
          {sent ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="mt-6 font-display text-2xl font-bold">Message received</h3>
              <p className="mt-2 max-w-sm text-muted-foreground">
                Thank you. Our team will get back to you within 24 hours to discuss next steps.
              </p>
            </div>
          ) : (
            <>
              <h2 className="font-display text-2xl font-bold">Request a consultation</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                We treat every enquiry with discretion and professionalism.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field label="Full name" name="name" required />
                <Field label="Organization" name="org" />
                <Field label="Email" type="email" name="email" required />
                <Field label="Phone" name="phone" />
                <Field label="Event / Engagement type" name="type" placeholder="Concert, corporate, private, consultancy..." />
                <Field label="Preferred date" type="date" name="date" />
              </div>

              <div className="mt-4">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Tell us about your requirements
                </label>
                <textarea
                  name="message"
                  rows={5}
                  required
                  className="mt-2 w-full rounded-lg border border-border bg-background/60 p-3 text-sm outline-none focus:border-primary"
                  placeholder="Venue, expected attendance, dates, specific concerns..."
                />
              </div>

              <button
                type="submit"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-accent to-accent/80 px-7 py-3.5 text-sm font-bold uppercase tracking-widest text-accent-foreground shadow-lg shadow-accent/30 hover:brightness-110 transition sm:w-auto"
              >
                Send request <Send className="h-4 w-4" />
              </button>
            </>
          )}
        </form>
      </section>
    </>
  );
}

function Field({
  label, name, type = "text", required, placeholder,
}: {
  label: string; name: string; type?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}{required && <span className="text-accent"> *</span>}
      </span>
      <input
        type={type}
        name={name}
        required={required}
        placeholder={placeholder}
        className="mt-2 w-full rounded-lg border border-border bg-background/60 p-3 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}