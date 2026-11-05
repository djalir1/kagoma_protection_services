import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/legal-layout";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Terms and Conditions — KAGOMA" }] }),
  component: Terms,
});

const SECTIONS: [string, string[]][] = [
  [
    "1. Who you are dealing with",
    [
      "KAGOMA PROTECTIONS SERVICES LTD, a company registered in Rwanda (TIN 156478327), Mushumbamwiza, Rwimbogo, Nyarugunga, Kicukiro, Kigali. Contact: info@kagomaprotection.com · +250 788 225 262.",
    ],
  ],
  [
    "2. Who may use this site",
    [
      "You must be 18 or over to hold an account. Security work is adult work and the courses are written for adults.",
      "The details you give must be your own and true. An account opened with someone else's identity or false details is closed and any certificate issued through it is withdrawn.",
      "Your password is yours to keep. Anything done through your account is treated as done by you.",
    ],
  ],
  [
    "3. Courses",
    [
      "Courses are free to study and free to examine. Kagoma may add, revise or withdraw a course. A certificate already issued remains valid for the course as it stood when issued.",
      "The material is for your own learning. You may not copy it, resell it, or use it to run training under another name.",
    ],
  ],
  [
    "4. Assessment",
    [
      "Module quizzes are practice and are not counted. The final examination needs 70% to pass, with three attempts.",
      "Courses with a practical component are not certified on the written examination alone. A qualified instructor must assess the practical work.",
      "Sitting an examination for someone else, or having someone sit yours, ends the account and withdraws the certificate.",
    ],
  ],
  [
    "5. What a Kagoma certificate is",
    [
      "A certificate records that the named person completed an assessed Kagoma course on the date shown. It carries a unique number anyone can verify on this site.",
      "It is not a state qualification, a licence to practise, or a guarantee of employment, and holders should not present it as one.",
    ],
  ],
  [
    "6. Withdrawing a certificate",
    [
      "Kagoma may withdraw a certificate issued in error, obtained dishonestly, or issued to someone whose vetting is later found false. It then shows as withdrawn on the verification page. The holder is told and may respond in writing.",
    ],
  ],
  [
    "7. Fees and payment",
    [
      "The certificate fee is 25,000 RWF for a core course and 15,000 RWF for an Executive Protection volume. Fees are shown before payment and are payable only after a pass.",
      "A certificate is issued when payment is confirmed, so there is normally nothing to refund. A duplicate charge, or a charge for a certificate not issued, is returned in full.",
    ],
  ],
  [
    "8. Vetting",
    [
      "Kagoma checks the identity and background of learners before a certificate is issued and before anyone is sent to a client. You agree to those checks when you register.",
    ],
  ],
  [
    "9. Working at events",
    [
      "Registering for work does not create employment and does not guarantee any. Where Kagoma calls you to an event, the terms are set out separately and governed by Law N° 66/2018 regulating labour in Rwanda.",
    ],
  ],
  [
    "10. What Kagoma does not provide",
    [
      "Kagoma provides event security management, consulting and training. It does not supply static guarding of premises or close protection officers, which require a Rwanda National Police licence that Kagoma does not hold.",
    ],
  ],
  [
    "11. Acceptable use",
    [
      "You may not try to reach parts of this site not open to you, copy course material for another provider, create accounts for people who have not asked, or use the verification page to harvest information about learners.",
    ],
  ],
  [
    "12. Availability",
    [
      "Kagoma works to keep the site available but cannot promise it is never interrupted. Your progress and certificates are not affected by an interruption.",
    ],
  ],
  [
    "13. Limit of liability",
    [
      "To the extent the law allows, Kagoma's liability is limited to the fees you paid Kagoma in the twelve months before the claim.",
      "Kagoma is not liable for indirect loss such as lost earnings or a job not obtained. Nothing limits liability for death or personal injury caused by Kagoma's negligence.",
    ],
  ],
  [
    "14. Your information",
    ["How Kagoma handles personal data is set out in the Privacy Notice, under Law N° 058/2021."],
  ],
  [
    "15. Changes",
    [
      "These terms may change. A change that materially affects learners is announced on the site before it takes effect.",
    ],
  ],
  [
    "16. Law and disputes",
    [
      "These terms are governed by the laws of Rwanda. A dispute is first raised with Kagoma in writing and the parties try to settle it within 30 days; failing that, it goes to the competent courts in Kigali.",
    ],
  ],
];

function Terms() {
  return (
    <LegalLayout
      eyebrow="Legal"
      title="Terms and Conditions"
      meta="Version in force from 11 September 2026"
      intro={
        <p>
          These terms govern the use of this website and the courses, certificates and services
          offered through it. Using the site means accepting them.
        </p>
      }
    >
      {SECTIONS.map(([h, ps]) => (
        <section key={h}>
          <h2>{h}</h2>
          {ps.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </section>
      ))}
    </LegalLayout>
  );
}
