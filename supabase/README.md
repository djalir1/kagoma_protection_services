# Kagoma database (Supabase project "Kagoma-site")

The SQL files in `sql/` are the history of the schema, applied in number order.
They are already applied to the live project — they are kept here as the record
and to rebuild a fresh project.

| Files | What they add |
| --- | --- |
| 01–10 | Profiles, roles, courses, enrolments, lessons, assessments, certificates, client pipeline |
| 11 | Course content: 103 modules, 551 lessons, quizzes (1.6 MB, load once) |
| 12–46 | Vetting, payments, practicals, office documents, event staffing, talent pool, staff access, clients & billing |
| 47 | Admin data explorer helpers and admin CRUD on every table |
| 48 | Database functions closed to the public; only the intended ones are reopened |
| 49 | Every service request gets a `KPS-SR-YYYY-NNNNN` reference |
| 50 | Steps that act on course content (run after 11): quiz flags, study hours, terminology, final exams |
| 53 | Security guards: users cannot change their own role, vetting or verification level |
| 51–52, 54–56 | Applied to the live project only (see Supabase → Database → Migrations): test accounts and demo data, hiring helpers (`job_applicants`, `my_messages`), staff access to the request desk |
| 99 | **Run before launch**: removes the `@kagoma.test` accounts and demo data |

Differences between the files and what is live, fixed while applying:

- `gen_random_bytes` is called as `extensions.gen_random_bytes` (Supabase keeps pgcrypto in `extensions`).
- 33 and 36 created older overloads of `join_work_pool` / `join_event`; only the final versions exist.
- 37's `event_manifest` used a window function inside an aggregate; it is computed in a sub-query.
- 43's `eligibility()` dropped the `eligible` field that course approval relies on; the live
  version keeps `eligible` and `reasons` and adds the caller check from 43.

The seeded test accounts (`…@kagoma.test`) are listed in `USER_MANUAL.md`. Their shared password is
kept out of the repository — see `TEST_ACCOUNTS.local.md` on the developer machine, or ask the admin.
