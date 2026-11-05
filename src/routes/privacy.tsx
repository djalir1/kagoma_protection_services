import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/legal-layout";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Privacy Notice — KAGOMA" }] }),
  component: Privacy,
});

function Privacy() {
  return (
    <LegalLayout
      eyebrow="Legal"
      title="Privacy Notice"
      meta="Effective 11 September 2026 · Version 1.1 · Kigali, Rwanda"
      intro={
        <>
          <p>
            This notice explains how KAGOMA PROTECTIONS SERVICES LTD (“Kagoma”, “we”) collects,
            uses, stores, shares and protects personal data.
          </p>
          <p>
            Kagoma protects personal data in accordance with Law N° 058/2021 of 13 October 2021
            relating to the Protection of Personal Data and Privacy in Rwanda, and other applicable
            laws.
          </p>
        </>
      }
    >
      <section>
        <h2>1. Who is responsible for your data</h2>
        <p>
          KAGOMA PROTECTIONS SERVICES LTD, TIN 156478327, Mushumbamwiza, Rwimbogo, Nyarugunga,
          Kicukiro, Kigali, Rwanda. Write to{" "}
          <a className="text-primary" href="mailto:info@kagomaprotection.com">
            info@kagomaprotection.com
          </a>{" "}
          for any question, request or complaint about your personal data.
        </p>
      </section>
      <section>
        <h2>2. What personal data we collect</h2>
        <p>Depending on how you use Kagoma’s services, we may collect:</p>
        <ul>
          <li>Account details: name, email, phone, password (stored only as a secure hash)</li>
          <li>Identity details for vetting: date of birth, national ID, address</li>
          <li>Learning records: courses, progress, quiz and exam results, certificates</li>
          <li>Payment references for certificate fees and client services</li>
          <li>Work records for events: roles, shifts, hours and amounts</li>
          <li>Messages you send to us or through the platform</li>
        </ul>
        <p>We collect only what is reasonably necessary for the purpose it is used for.</p>
      </section>
      <section>
        <h2>3. Why we use your data</h2>
        <ul>
          {[
            "To create and manage user accounts",
            "To provide training and other Kagoma services",
            "To verify identity and eligibility",
            "To conduct lawful vetting and accreditation",
            "To manage event personnel and assignments",
            "To communicate with users, staff, clients and venues",
            "To monitor course progress and assessments",
            "To issue and verify certificates",
            "To calculate working hours and applicable payments",
            "To maintain operational, accounting and tax records",
            "To protect the security of our systems, personnel and clients",
            "To comply with legal and regulatory obligations",
            "To respond to legitimate requests, complaints or disputes",
          ].map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <p>Kagoma does not sell personal data to advertisers.</p>
      </section>
      <section>
        <h2>4. National ID and other identification</h2>
        <p>
          Identification information is used only for a defined and legitimate purpose: identity
          verification, lawful vetting, accreditation, or a requirement set by a client, a venue or
          the law. It is not used for unrelated purposes.
        </p>
      </section>
      <section>
        <h2>5. Who may receive your data</h2>
        <p>
          <b>Kagoma personnel.</b> Authorised staff see what their role requires. Access is granted
          by role and withdrawn when no longer needed.
        </p>
        <p>
          <b>Clients and venues.</b> If you are assigned to work at a client or venue that needs
          accreditation, Kagoma provides the minimum required: name, identification, phone and
          address. They do not receive your course results, account or payment history.
        </p>
        <p>
          <b>Certificate verification.</b> Someone checking a certificate sees only the holder’s
          name, the course, the certificate number, status and date of issue — never your email,
          phone, ID, address, marks or payments.
        </p>
        <p>
          <b>Employers.</b> If you choose to list a professional profile, employers see your name,
          headline, skills, experience and certificates. Your phone and email are shared only after
          you accept an employer’s message.
        </p>
      </section>
      <section>
        <h2>6. Service providers</h2>
        <p>
          Kagoma uses trusted providers for hosting, email, payment and authentication. They are
          bound by appropriate confidentiality, security and data-protection obligations. Some may
          store data outside Rwanda; Kagoma ensures such transfers comply with Rwandan requirements
          and are safeguarded.
        </p>
      </section>
      <section>
        <h2>7. Payment information</h2>
        <p>
          Kagoma keeps payment references where needed to confirm a payment, issue a certificate or
          keep accounting records. Kagoma never collects your card PIN, mobile-money PIN or any
          payment credential.
        </p>
      </section>
      <section>
        <h2>8. How we protect your data</h2>
        <p>
          Technical and organisational measures protect personal data against unauthorised access,
          disclosure, loss and misuse. Access to records is limited by role. No internet system is
          completely secure, but Kagoma takes reasonable measures to protect what it holds.
        </p>
      </section>
      <section>
        <h2>9. How long we keep it</h2>
        <p>
          Only as long as reasonably necessary for the purpose it was collected for, unless the law
          requires longer.
        </p>
      </section>
      <section>
        <h2>10. Your rights</h2>
        <ul>
          {[
            "Ask what personal data Kagoma holds about you, and for a copy",
            "Ask for inaccurate or incomplete information to be corrected",
            "Ask for deletion where the law allows",
            "Object to, or ask to restrict, certain processing",
            "Withdraw consent where processing is based on consent",
            "Complain about how your data is handled",
          ].map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <p>
          Write to info@kagomaprotection.com. Kagoma responds within the period the law requires,
          and in any case within 30 days.
        </p>
      </section>
      <section>
        <h2>11. Certificate records and account deletion</h2>
        <p>
          Deleting your account does not necessarily delete every connected record. A limited
          certificate record may be kept so that a genuine certificate can still be verified. You
          can ask to be removed from the professional directory at any time.
        </p>
      </section>
      <section>
        <h2>12. Cookies and browser storage</h2>
        <p>
          The site stores only what it needs to work: whether you are signed in, your language and
          your light or dark preference. There is no advertising tracking.
        </p>
      </section>
      <section>
        <h2>13. Children</h2>
        <p>
          Accounts are for adults. Kagoma does not knowingly provide account services to anyone
          under 18.
        </p>
      </section>
      <section>
        <h2>14. Security incidents</h2>
        <p>
          If Kagoma becomes aware of a personal-data incident, it assesses it and takes the measures
          the law requires, including any notification to the authority or to the people affected.
        </p>
      </section>
      <section>
        <h2>15. Changes</h2>
        <p>
          This notice may be updated. Material changes are announced before they take effect where
          required. The latest version is always published here.
        </p>
      </section>
    </LegalLayout>
  );
}
