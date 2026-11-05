# Kagoma Protection Services — User Manual

**One platform for the website, the Kagoma Academy and every dashboard.**
Version 2.0 · November 2026

---

## Contents

1. [How the platform fits together](#1-how-the-platform-fits-together)
2. [The public website](#2-the-public-website)
3. [Accounts, sign-in and dashboards](#3-accounts-sign-in-and-dashboards)
4. [Learners: studying and getting certified](#4-learners-studying-and-getting-certified)
5. [Professionals: being found by employers](#5-professionals-being-found-by-employers)
6. [Employers](#6-employers)
7. [Clients: requesting security](#7-clients-requesting-security)
8. [Staff: the operations desks](#8-staff-the-operations-desks)
9. [Administrators: the academy and administration desks](#9-administrators-the-academy-and-administration-desks)
10. [Certificates and verification](#10-certificates-and-verification)
11. [Payments](#11-payments)
12. [Event work: careers, open shifts and sign-up on the day](#12-event-work-careers-open-shifts-and-sign-up-on-the-day)
13. [Test accounts](#13-test-accounts)
14. [Running the platform](#14-running-the-platform)
15. [Troubleshooting](#15-troubleshooting)

---

## 1. How the platform fits together

There is **one website** and **one database** (Supabase project *Kagoma-site*).

| Part | Address | Who uses it |
| --- | --- | --- |
| Public website | `/`, `/about`, `/services`, `/industries`, `/training`, `/contact`, `/careers`, `/verify`, `/faq` | Everyone |
| Sign in / sign up | `/login`, `/signup` | Everyone with an account |
| Dashboard | `/dashboard` | Every signed-in person — the menu depends on their role |
| Certificate | `/certificate/<number>` | Holders, employers, anyone with the number |
| Event sign-up | `/join/<link>` | Workers registering at an event on the day |

There are **no separate portals**. A person signs in once and Kagoma takes them to the dashboard for their role:

| Role | What the dashboard is for |
| --- | --- |
| **Learner** | Study courses, sit exams, claim certificates, build a professional profile, apply for jobs |
| **Employer** | Find certified professionals, post jobs, message candidates, ask Kagoma to recruit |
| **Client** | Request security for an event and follow it from assessment to report |
| **Staff** | Run service requests, clients & billing, events, the talent pool and documents |
| **Administrator** | Everything staff do, plus vetting, applications, payments, certificates, reports, team, settings and the data explorer |

The old `/admin` address still works — it opens the dashboard.

## 2. The public website

**Menu:** Home · About · Services · Industries · Training & Development ▾ · Contact, plus **Sign in** (or **My dashboard** when signed in) and **Request a Quote**. On phones everything sits under the ☰ button.

- **Home** — the Kagoma badge animation (gold particles gather, the badge turns in and a light sweeps across the eagle), services, proof at scale, six featured courses, who the platform is for, industries, and a request call-to-action. A certificate-check bar sits under the hero.
- **Training & Development** — all 20 courses, searchable and filtered by track (12 Professional, 8 Executive Protection). Each course has a syllabus page with modules, study hours, pass mark, practical requirement, prerequisites and the certificate fee.
- **Verify a certificate** (`/verify`) — type a certificate number, see whether it is valid.
- **Careers** (`/careers`) — join the event talent pool and offer for open shifts.
- **Contact** — the request form. Every enquiry becomes a service request with a reference such as `KPS-SR-2026-00007` and appears on the staff request desk immediately.
- **FAQ, Privacy, Terms** — the policies that apply to learners, workers and clients.

The ☀/☾ button switches light and dark mode; the choice is remembered.

## 3. Accounts, sign-in and dashboards

**Create an account** at `/signup` and choose one of three account types:

- **Learner** — first and last name, date of birth, gender, country, phone, email, password.
- **Employer** — company name, phone, email, password.
- **Client** — organisation (or your name), phone, email, password.

Supabase sends a confirmation email; open the link, then sign in. *Staff and administrator access is never chosen at sign-up — an administrator grants it (section 9).*

**Sign in** at `/login`. **Forgot password** sends a reset link; the link opens `/reset-password`.

**Every dashboard** has the sidebar (☰ on phones), the light/dark switch, a link back to the website, and **Account**, where you edit your details and change your password.

## 4. Learners: studying and getting certified

```
Sign up → Enrol → Study lessons → Practice quizzes → Final exam (70%) → Identity check → Certificate fee → Certificate
```

1. **Course catalogue** — every course is free to study. Press **Enrol**.
2. **My learning** → open a course. The **course player** shows the outline on the left (☰ *Outline* on phones): lessons, a practice quiz after most modules, and the **final exam** at the end. Press **Mark complete & continue** after each lesson — progress is saved automatically. The **Kinyarwanda / English** button switches the whole course.
3. **Practice quizzes** are not counted and can be repeated.
4. **Final exam** — 70% to pass, 3 attempts. The score appears immediately.
5. **Identity check** — Kagoma confirms who you are before a certificate is issued. Fill in your national ID, date of birth and full address under **Account**. Until then a yellow banner shows at the top. Studying is never blocked.
6. **Certificates** — after a pass, the course appears under *Certificates to claim* with the fee (25,000 RWF professional course, 15,000 RWF EP volume). Pay by MoMo (the dial code is shown with your amount filled in) or bank transfer, then press **I have paid — enter the transaction ID**. When Kagoma confirms the payment the certificate is issued automatically.
7. Courses marked **▲ Practical** also need an in-person practical pass, recorded by Kagoma.
8. Some courses advise another first (KG-108 after KG-109, KG-110 after KG-108, KG-112 after KG-106). You can study them in any order; the prerequisite is only checked when the certificate is issued.

**Payments** lists every payment you made and whether it is pending, confirmed or rejected (with the reason).

## 5. Professionals: being found by employers

A professional is a learner who holds a **valid Kagoma certificate** and has **passed the identity check**.

- **Professional profile** — headline, about, experience, languages, availability, skills and work history. The **listing switch** puts you in the directory employers search. It unlocks only when you are eligible, and turns off automatically if your certificate stops being valid.
- **Jobs** — open jobs posted by employers. **Apply** with a short note; track the status; withdraw if you change your mind.
- **Messages** — employers who contacted you. **I'm interested** shares your phone and email with that employer (and theirs with you); **Not now** declines. Your contact details are never shown before you accept.

## 6. Employers

- **Overview** — listed professionals, open jobs, applications received, messages.
- **Find professionals** — the directory of certified, vetted professionals. Open a profile to see skills, experience and certificates (each links to the public verification), then **send a message**.
- **Jobs** — **Post a job**, close or reopen it, and open **Applicants** to see each candidate's headline, note and certificates and move them to *reviewing, shortlisted, hired* or *rejected*.
- **Messages** — your messages and answers. When a professional accepts, their contact details appear.
- **Recruitment requests** — ask Kagoma to supply a team (role, how many, where, when). Staff see these on the request desk.
- **Security requests** — employers can also request event security, like clients.

## 7. Clients: requesting security

- **New request** — the type of service, event or site, date, venue, expected attendance and what you need.
- Every request follows the pipeline **Requested → Assessment → Quotation → Approved → Deployment → Reported**. Open a request to see where it is and every note Kagoma added.
- **Quotations** appear on the overview and inside the request. **Accept** or **Decline** — you cannot change the amount.

## 8. Staff: the operations desks

**Overview** shows what needs attention: new requests, upcoming events, new people in the talent pool and outstanding client balances.

**Service requests**
- Filter by stage, search by reference, client or venue. Open a request to see the client's contact details and the history.
- **Move to** *(next stage)* with an optional note the client sees. **New quotation** (officers, days, amount, valid until, notes) sends it to the client and moves the request to *Quotation*. **Cancel** ends it.
- The **Recruitment requests** tab lists employer requests; change their status in place.

**Clients & billing**
- **Client register** — every client with their master agreement status, order count and amount billed. A ⚠ marks orders without a signed agreement.
- Open a client to **record a master agreement** (`KPS-MSA-…`), **create service orders** (`KPS-SO-…`) with total and deposit, **record payments** (deposit, balance, extra, refund) and **add charges** (overtime, extra staff, equipment…). Balances update instantly.
- **Outstanding balances** lists every order still owed and how long since the event.

**Events**
- **New event** — name, client, venue, dates, call time, hourly rate, staff needed, roles wanted, a note for workers, and *Publish as an open shift*.
- Open an event to run it:
  - **Roster & clock** — **Clock in** / **Clock out** each person at the gate; hours and pay are calculated from the rate. ✎ adjusts hours with a reason. **Add a walk-in** registers someone on the spot.
  - **Offers** — pool members who offered for this event; **Add to roster** (approved people only).
  - **Add from pool** — search approved people by name, phone, ID or role.
  - **Manifest** — names, ID numbers, phones and full addresses for venue accreditation. **Print**.
  - **Payroll** — hours and amounts per person and the total. **Print**.
  - The **sign-up link** at the top lets workers register themselves on the day while the event is *Open* or *Running*.

**Talent pool** — everyone who applied through Careers. **Approve**, put on **Standby** or **Reject** (with a reason). Only approved people can be called to events.

**Documents** — **New document** and choose the kind: quotation, invoice, receipt, master service agreement, service order, NDA, risk assessment, post orders, incident report, service report, employment contract or letter, employee rules, code of conduct, written warning, company profile. Each gets an automatic reference (`KPS-QTN-2026-0001`…), starts from a template, and is fully editable (party, sections, line items with optional VAT, notes). **Sign** adds the managing director's signature; **Print / PDF** gives a letterhead page with the seal.

## 9. Administrators: the academy and administration desks

Administrators see everything staff see, plus:

| Desk | What it does |
| --- | --- |
| **Vetting** | Each pending learner's email, phone, national ID, date of birth and address. **Approve**, **Reject** or **Suspend**. Missing details are flagged. |
| **Applications** | Course applications with the automatic eligibility check. **Approve & enrol** or **Reject**. |
| **Payments** | Learner payments waiting for confirmation. Check the reference against the MoMo or bank statement, then **Confirm** (a fully paid certificate fee issues the certificate) or **Reject** with a reason. *History* lists every payment. |
| **Practical assessments** | Record an in-person assessment (learner, course, assessor, result). A pass releases the certificate when the final exam is already passed. |
| **Certificates** | *Ready to issue* — learners who passed but have no certificate yet; **Issue** by hand. *Register* — every certificate; **Suspend**, **Revoke** (with a reason, audited) or **Reinstate**. |
| **Kinyarwanda review** | **Refresh list** collects every Kinyarwanda text. A reviewer marks each one correct or saves a correction; **Apply corrections** updates the live courses. |
| **Reports** | Learners, enrolments, certificates and confirmed income; enrolments and certificates by course; learners by gender and country. |
| **Team & access** | Give an existing account **Staff** or **Administrator** access with a job title, or remove it. The last administrator cannot be removed. |
| **Company settings** | Company details, signatory, MoMo code and dial string, bank account, VAT, the **signature image** (stored privately), and **course fees** (study fee and certificate fee per course). |
| **Data explorer** | Every table in the database with search, add, edit and delete. Use it for corrections; daily work belongs on the desks, which run the rules and keep the audit trail. |

## 10. Certificates and verification

- Numbers look like `KAGOMA-CERT-2026-000001`. The printable certificate (`/certificate/<number>`) carries the holder, course, issue date, level, the seal, the managing director's signature and a **QR code** that opens the verification page.
- **Verification** shows only name, course, issue date, level and status (valid, suspended, revoked, expired). It never shows contact details, ID numbers, marks or payments.
- Revoking or suspending is immediate on the public page, and every change is recorded in the certificate audit.

## 11. Payments

- **MTN MoMo** merchant code **061457** — the dashboard shows `*182*8*1*061457*<amount>#` with the amount filled in.
- **Bank**: Equity Bank Rwanda PLC, account 4002201404367, KAGOMA PROTECTIONS SERVICES LTD.
- A transaction ID can be used only once. Administrators confirm payments under **Payments**.
- Study and exams are free. To charge a study fee or change a certificate fee, use **Company settings → Course fees**.

## 12. Event work: careers, open shifts and sign-up on the day

- **Careers** (`/careers`) — anyone 18+ joins the talent pool: name, phone, ID, date of birth, full Rwandan address (province → district → sector → cell → village), roles, experience, languages and availability.
- **Open shifts** — published events appear on Careers. A pool member types their phone and presses **I can work**; staff see the offer on the event.
- **On the day** — the event's sign-up link (`/join/…`) lets a worker register with name, phone, ID, role and address; they are added to the roster and the talent pool.

## 13. Test accounts

The database is seeded with test accounts on the `kagoma.test` domain (which cannot receive email) and demo data to try every flow:

| Email | Role | What you will see |
| --- | --- | --- |
| `admin@kagoma.test` | Administrator | Every desk, a pending payment, an application, a vetting request |
| `staff@kagoma.test` | Staff | Requests, clients & billing, an upcoming event with a roster, the talent pool |
| `student@kagoma.test` | Learner (vetted) | Two courses in progress |
| `applicant@kagoma.test` | Learner (identity check pending) | The pending banner and a course application |
| `pro@kagoma.test` | Certified professional, listed | Certificate `KAGOMA-CERT-2026-000001`, a listed profile, a message from an employer |
| `employer@kagoma.test` | Employer | The directory, a posted job, a sent message, a recruitment request |
| `client@kagoma.test` | Client | Two requests, one with a quotation to accept |

All test accounts share one password, which is **not stored in this repository**. It is in `TEST_ACCOUNTS.local.md` on the development machine (git-ignored) and was given to the project owner.

The project owner's own administrator login is `shemaabdul20@gmail.com`.

> **Before launch:** run `supabase/sql/99_remove_test_accounts.sql` in Supabase → SQL Editor. It deletes every `@kagoma.test` account and the demo records. One of the test accounts is an administrator with a shared password — it must not exist on the live site.

## 14. Running the platform

**Development**

```bash
npm install
npx vite dev --port 5180
```

Open `http://localhost:5180`. The app connects to the live Supabase project (public anon key in `src/lib/supabase.ts`; all access is enforced by row-level security in the database).

**Checks**

```bash
npx tsc --noEmit      # type-check
npx eslint src        # lint
npm run build         # production build
```

**Database** — the schema history is in `supabase/sql/` (see `supabase/README.md`). Key protections:

- Users cannot change their own role, vetting status, listing or verification level.
- Learners cannot read answer keys or set their own progress; exams are scored in the database.
- Clients can only accept or decline quotations.
- Database functions are closed to the public except the few the public pages use (certificate verification, syllabus, careers, event sign-up, payment details).

**Code map**

| Folder | Contents |
| --- | --- |
| `src/routes/` | One file per page (`dashboard/…` for the dashboards) |
| `src/components/app/` | Dashboard building blocks: layout kit, course card, payment box, pipeline, data explorer |
| `src/components/dashboards/` | The overview page for each role |
| `src/lib/` | Supabase client, auth/roles, queries, formatting, document templates, Rwanda districts |
| `supabase/sql/` | Database migrations |

**Before going live**
1. Run `99_remove_test_accounts.sql`.
2. In Supabase → Authentication → URL configuration, set the **Site URL** to the live domain (confirmation and reset links use it).
3. Connect your own email service (SMTP) in Supabase; the built-in sender is limited to a few emails per hour.
4. Upload the signature image in **Company settings** and check the company details.

## 15. Troubleshooting

| Problem | What to check |
| --- | --- |
| "That email and password do not match an account" | The account exists and is confirmed (Supabase → Authentication → Users). Use *Forgot your password?* |
| "Please confirm your email first" | Open the confirmation link, or confirm the user in Supabase. |
| "This page is not part of your account" | The page belongs to another role. Staff access is granted under Team & access. |
| A certificate was not issued after passing | Identity check approved? Prerequisite certificate held? Certificate fee fully confirmed? Practical recorded for ▲ courses? The admin *Certificates → Ready to issue* tab lists anyone waiting. |
| A professional cannot switch on their listing | They need an approved identity check and a valid certificate. |
| A pool member cannot be added to an event | Approve them in the talent pool first. |
| The event sign-up link says closed | Set the event status to *Open* or *Running*. |
| Emails do not arrive | Check spam; set up SMTP in Supabase for reliable delivery. |
