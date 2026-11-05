import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero } from "@/components/page-hero";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "Frequently asked questions — KAGOMA" },
      {
        name: "description",
        content:
          "Studying, exams, certificates, payments and working with Kagoma Protection Services.",
      },
    ],
  }),
  component: Faq,
});

const FAQ: { group: string; items: [string, string[]][] }[] = [
  {
    group: "Studying with Kagoma",
    items: [
      [
        "Is it free to study?",
        [
          "Yes. Every course is open and every lesson is free to read. You may also sit the final examination at no charge, as many times as the attempt limit allows.",
          "What is paid for is the certificate: 25,000 RWF for a core course and 15,000 RWF for an Executive Protection volume. You pay only if you pass and want the certificate.",
        ],
      ],
      [
        "Do I need experience or qualifications to start?",
        [
          "No. You need to be 18 or over, and a phone or a computer.",
          "Some courses advise completing another one first. That is advice, not a barrier: you may study anything in any order. It matters only when a certificate is issued.",
        ],
      ],
      [
        "How long does a course take?",
        [
          "It depends on the course and on you. A course carries between 14 and 50 lessons across 2 to 9 modules. Most learners finish a core course in two to four weeks of evening study.",
          "There is no deadline. The course does not close and your progress is kept.",
        ],
      ],
      [
        "Can I study on my phone?",
        [
          "Yes, and most people do. Every page works on a phone, and lessons are text so they open on a slow connection.",
        ],
      ],
      [
        "Is it in Kinyarwanda or English?",
        [
          "Both. Every lesson, question and answer exists in the two languages, and you switch at any point without losing your place.",
        ],
      ],
    ],
  },
  {
    group: "Examinations and certificates",
    items: [
      [
        "How am I assessed?",
        [
          "Each module ends with a practice quiz: unlimited attempts, not counted, there so you know whether the module landed.",
          "The course ends with a final examination drawn from the whole syllabus. That one counts: 70% to pass, three attempts.",
        ],
      ],
      [
        "What happens if I fail?",
        [
          "You may sit the final examination three times. Between attempts the modules stay open, so you can go back to the parts you had not yet taken in.",
        ],
      ],
      [
        "Some courses mention a practical component. What is that?",
        [
          "Certain courses — first aid, executive protection, close protection training management — cannot be certified on a written paper alone. A qualified instructor has to watch you do it.",
          "For those courses the certificate is issued after the practical assessment as well. The course page tells you which ones these are.",
        ],
      ],
      [
        "Is the certificate recognised?",
        [
          "Kagoma is a company registered in Rwanda and the certificate is issued by Kagoma. It records that you completed an assessed course with us.",
          "It is not a state qualification and we do not claim it is. What it carries that most certificates do not is a number an employer can check in three seconds.",
        ],
      ],
      [
        "How does an employer verify my certificate?",
        [
          "Every certificate carries a unique number and a QR code. An employer scans the code or types the number on our verification page and sees the holder, the course and the date.",
          "A withdrawn certificate shows as withdrawn. A number that was never issued shows as not found.",
        ],
      ],
      [
        "Can a certificate be withdrawn?",
        [
          "Yes. If a certificate was issued in error or obtained dishonestly, Kagoma withdraws it and the verification page says so from that moment. It is the reason an employer can trust the ones that are still valid.",
        ],
      ],
    ],
  },
  {
    group: "Paying",
    items: [
      [
        "How do I pay for a certificate?",
        [
          "By MTN MoMo or Airtel Money, or by bank transfer. Pay to the Kagoma MoMo code shown in your dashboard, enter the transaction ID, and the office confirms it — your certificate is then issued automatically.",
        ],
      ],
      [
        "When do I pay?",
        [
          "After you pass. You will not be asked for money to study, to sit the examination, or to retake it.",
        ],
      ],
      [
        "Can I get a refund?",
        [
          "A certificate is issued the moment payment is confirmed, so there is normally nothing to refund. If you were charged twice, or for a certificate that was never issued, write to us and we return it.",
        ],
      ],
    ],
  },
  {
    group: "Working with Kagoma",
    items: [
      [
        "Does Kagoma provide security guards?",
        [
          "No. Kagoma manages the security of events, advises on security risk, and trains security personnel.",
          "Static guarding of premises and close protection officers require a Rwanda National Police licence that Kagoma does not hold. We teach those subjects; we do not sell the deployment.",
        ],
      ],
      [
        "I want to work at Kagoma events. How?",
        [
          "Fill in the form on the Careers page. Kagoma checks your details, and once approved you are on the list we call when an event comes up. You can also register at the gate on the day with the event's sign-up link.",
        ],
      ],
      [
        "Do I have to study with Kagoma to work at an event?",
        [
          "No. But people who hold a Kagoma certificate rise to the top of the list, because we already know what they have been taught.",
        ],
      ],
      [
        "Can employers find me?",
        [
          "Once you have been vetted and hold a valid certificate, a switch on your professional profile puts you in the directory employers search. It is your choice, and you can turn it off at any time.",
        ],
      ],
    ],
  },
];

function Faq() {
  return (
    <>
      <PageHero
        eyebrow="Help"
        title="Frequently asked questions"
        subtitle="Studying, exams, certificates, payments and working with Kagoma."
      />
      <section className="mx-auto max-w-3xl space-y-12 px-4 pb-24 md:px-8">
        {FAQ.map((g) => (
          <div key={g.group}>
            <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-primary">
              {g.group}
            </h2>
            <Accordion
              type="single"
              collapsible
              className="rounded-2xl border border-border bg-card px-5"
            >
              {g.items.map(([q, a]) => (
                <AccordionItem key={q} value={q}>
                  <AccordionTrigger className="text-left font-semibold">{q}</AccordionTrigger>
                  <AccordionContent className="space-y-3 text-muted-foreground">
                    {a.map((p) => (
                      <p key={p}>{p}</p>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ))}
        <div className="rounded-2xl border border-primary/30 bg-card p-6 text-center">
          <div className="font-display text-lg font-bold">Still have a question?</div>
          <Link
            to="/contact"
            className="mt-3 inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-bold uppercase tracking-widest text-primary-foreground"
          >
            Contact us
          </Link>
        </div>
      </section>
    </>
  );
}
