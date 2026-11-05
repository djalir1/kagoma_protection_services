import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, MapPin, Phone, CheckCircle2, Clock } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { useAuth } from "@/lib/auth";
import { RequestForm } from "@/routes/dashboard/requests";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — KAGOMA Protection Services" },
      {
        name: "description",
        content:
          "Request event security, a risk assessment or corporate training from Kagoma Protection Services.",
      },
      { property: "og:title", content: "Contact Kagoma Protection Services" },
    ],
  }),
  component: ContactPage,
});

const CONTACTS = [
  { icon: Phone, title: "Phone", value: "+250 788 225 262", href: "tel:+250788225262" },
  { icon: Phone, title: "Operations", value: "+250 798 005 444", href: "tel:+250798005444" },
  {
    icon: Mail,
    title: "Email",
    value: "info@kagomaprotection.com",
    href: "mailto:info@kagomaprotection.com",
  },
  { icon: MapPin, title: "Office", value: "Nyarugunga, Kicukiro, Kigali, Rwanda" },
  { icon: Clock, title: "Operations desk", value: "24/7 · Ready for deployment" },
];

function ContactPage() {
  const { session, user } = useAuth();
  const [sent, setSent] = useState(false);

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title={
          <>
            Let's plan your <span className="text-gradient-gold">operation.</span>
          </>
        }
        subtitle="Tell us about your event or requirement. Our team responds within 24 hours with next steps."
      />
      <section className="mx-auto grid max-w-7xl gap-10 px-4 pb-24 md:px-8 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-4">
          {CONTACTS.map(({ icon: Icon, title, value, href }) => {
            const content = (
              <>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">
                    {title}
                  </div>
                  <div className="mt-1 break-words font-semibold">{value}</div>
                </div>
              </>
            );
            const cls =
              "flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition hover:border-primary/60";
            return href ? (
              <a key={title} href={href} className={cls}>
                {content}
              </a>
            ) : (
              <div key={title} className={cls}>
                {content}
              </div>
            );
          })}
          {!session && (
            <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
              <Link to="/signup" search={{ type: "client" }} className="font-semibold text-primary">
                Create a client account
              </Link>{" "}
              to follow your request through assessment, quotation and deployment, and accept
              quotations online.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
          {sent ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="mt-6 font-display text-2xl font-bold">Request received</h3>
              <p className="mt-2 max-w-sm text-muted-foreground">
                Thank you. Our team will contact you within 24 hours.
              </p>
              {session && (
                <Link
                  to="/dashboard/requests"
                  className="mt-6 rounded-full bg-primary px-6 py-2.5 text-sm font-bold uppercase tracking-widest text-primary-foreground"
                >
                  Track it in your dashboard
                </Link>
              )}
            </div>
          ) : (
            <>
              <h2 className="font-display text-2xl font-bold">
                Request security or a consultation
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Every enquiry is treated with discretion.
              </p>
              <div className="mt-6">
                <RequestForm requestedBy={user?.id} onDone={() => setSent(true)} />
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
