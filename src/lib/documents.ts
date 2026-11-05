export type DocKind =
  | "quotation"
  | "invoice"
  | "receipt"
  | "agreement"
  | "service_order"
  | "nda"
  | "risk_assessment"
  | "post_orders"
  | "incident"
  | "service_report"
  | "employment"
  | "employment_letter"
  | "employee_rules"
  | "code_of_conduct"
  | "warning"
  | "profile";

export type LineItem = { description: string; qty: number; unit_price: number };
export type Section = { heading: string; body: string };
export type DocPayload = {
  intro?: string;
  sections?: Section[];
  items?: LineItem[];
  vat?: boolean;
  notes?: string;
};

export type DocRow = {
  id: string;
  reference: string;
  kind: DocKind;
  title: string;
  party_name: string | null;
  party_org: string | null;
  party_email: string | null;
  party_phone: string | null;
  party_address: string | null;
  payload: DocPayload;
  status: string;
  valid_until: string | null;
  issued_on: string | null;
  amount_rwf: number | null;
  paid_on: string | null;
  related_ref: string | null;
  parent_ref: string | null;
  signed: boolean;
  signed_at: string | null;
  created_at: string;
};

export const MONEY_KINDS: DocKind[] = ["quotation", "invoice", "receipt", "service_order"];

export const KIND_LABEL: Record<DocKind, string> = {
  quotation: "Quotation",
  invoice: "Invoice",
  receipt: "Receipt",
  agreement: "Master Service Agreement",
  service_order: "Service Order",
  nda: "Non-Disclosure Agreement",
  risk_assessment: "Security Risk Assessment",
  post_orders: "Post Orders",
  incident: "Incident Report",
  service_report: "Post-Event Service Report",
  employment: "Employment Contract",
  employment_letter: "Employment Letter",
  employee_rules: "Employee Rules",
  code_of_conduct: "Code of Conduct",
  warning: "Written Warning",
  profile: "Company Profile",
};

const s = (heading: string, body = ""): Section => ({ heading, body });

/** Starter structure for each kind of document. Staff edit everything. */
export function template(kind: DocKind): { title: string; payload: DocPayload } {
  switch (kind) {
    case "quotation":
      return {
        title: "Quotation for security services",
        payload: {
          intro: "Thank you for your enquiry. We are pleased to quote as follows.",
          items: [
            { description: "Security officers (per officer, per day)", qty: 10, unit_price: 25000 },
            { description: "Supervisor (per day)", qty: 1, unit_price: 40000 },
          ],
          vat: false,
          notes: "This quotation is valid for 14 days. A deposit of 30% confirms the booking.",
        },
      };
    case "invoice":
      return {
        title: "Invoice",
        payload: {
          items: [{ description: "Security services", qty: 1, unit_price: 0 }],
          vat: false,
          notes: "Payment due within 14 days of the invoice date.",
        },
      };
    case "receipt":
      return {
        title: "Payment receipt",
        payload: {
          items: [{ description: "Payment received", qty: 1, unit_price: 0 }],
          notes: "Thank you for your payment.",
        },
      };
    case "service_order":
      return {
        title: "Service order",
        payload: {
          intro: "This order is issued under the Master Service Agreement between the parties.",
          items: [{ description: "Event security deployment", qty: 1, unit_price: 0 }],
          sections: [
            s("Deployment", "Date, venue, call time and number of officers."),
            s(
              "Client responsibilities",
              "Access to the venue, accreditation and a single point of contact on the day.",
            ),
          ],
        },
      };
    case "agreement":
      return {
        title: "Master Service Agreement",
        payload: {
          intro:
            "This agreement sets out the terms on which Kagoma Protection Services provides security services to the Client.",
          sections: [
            s(
              "1. Services",
              "Kagoma will provide security personnel and management services as set out in each Service Order.",
            ),
            s(
              "2. Term",
              "This agreement starts on the date of signature and continues until terminated by either party with 30 days' written notice.",
            ),
            s(
              "3. Fees and payment",
              "Fees are set in each Service Order. A deposit is payable before deployment and the balance within 14 days of the event.",
            ),
            s(
              "4. Liability",
              "Kagoma maintains appropriate insurance. Neither party is liable for indirect or consequential loss.",
            ),
            s(
              "5. Confidentiality",
              "Each party keeps the other's confidential information private during and after this agreement.",
            ),
            s(
              "6. Governing law",
              "This agreement is governed by the laws of the Republic of Rwanda.",
            ),
          ],
        },
      };
    case "nda":
      return {
        title: "Non-Disclosure Agreement",
        payload: {
          sections: [
            s(
              "1. Confidential information",
              "All plans, layouts, guest lists, security arrangements and business information shared between the parties.",
            ),
            s(
              "2. Obligations",
              "The receiving party uses confidential information only for the agreed purpose and does not disclose it.",
            ),
            s(
              "3. Duration",
              "These obligations continue for three (3) years after the last disclosure.",
            ),
          ],
        },
      };
    case "risk_assessment":
      return {
        title: "Security risk assessment",
        payload: {
          sections: [
            s("Scope", "Event, venue and date assessed."),
            s("Threats identified"),
            s("Vulnerabilities"),
            s("Risk rating", "Likelihood × impact for each risk."),
            s("Recommended controls"),
            s("Residual risk"),
          ],
        },
      };
    case "post_orders":
      return {
        title: "Post orders",
        payload: {
          sections: [
            s("Post", "Location and hours."),
            s("Duties"),
            s("Access rules"),
            s("Escalation and radio procedure"),
            s("Emergency procedure"),
          ],
        },
      };
    case "incident":
      return {
        title: "Incident report",
        payload: {
          sections: [
            s("When and where"),
            s("What happened"),
            s("People involved"),
            s("Action taken"),
            s("Follow-up required"),
          ],
        },
      };
    case "service_report":
      return {
        title: "Post-event service report",
        payload: {
          sections: [
            s("Deployment summary"),
            s("Incidents"),
            s("Observations"),
            s("Recommendations for next time"),
          ],
        },
      };
    case "employment":
    case "employment_letter":
      return {
        title: kind === "employment" ? "Employment contract" : "Employment letter",
        payload: {
          intro: "We are pleased to confirm your employment with Kagoma Protection Services.",
          sections: [
            s("Position"),
            s("Start date"),
            s("Remuneration"),
            s("Hours of work"),
            s("Probation", "A probation period of three (3) months applies."),
          ],
        },
      };
    case "employee_rules":
      return {
        title: "Employee rules",
        payload: {
          sections: [
            s("Attendance and punctuality"),
            s("Uniform and presentation"),
            s("Conduct on duty"),
            s("Use of force"),
            s("Confidentiality"),
            s("Discipline"),
          ],
        },
      };
    case "code_of_conduct":
      return {
        title: "Code of conduct",
        payload: {
          sections: [
            s("Integrity"),
            s("Respect for every person"),
            s("Discipline and vigilance"),
            s("Confidentiality"),
            s("Reporting concerns"),
          ],
        },
      };
    case "warning":
      return {
        title: "Written warning",
        payload: {
          sections: [
            s("Details of the conduct"),
            s("Expected standard"),
            s("Consequences of repetition"),
            s("Right to respond"),
          ],
        },
      };
    case "profile":
      return {
        title: "Company profile",
        payload: {
          sections: [s("Who we are"), s("What we provide"), s("Training"), s("Leadership")],
        },
      };
  }
}

export function totals(p: DocPayload, vatRate = 18) {
  const sub = (p.items ?? []).reduce(
    (a, i) => a + (Number(i.qty) || 0) * (Number(i.unit_price) || 0),
    0,
  );
  const vat = p.vat ? Math.round((sub * vatRate) / 100) : 0;
  return { sub, vat, total: sub + vat };
}
