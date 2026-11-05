-- ============================================================
-- KAGOMA — Migration 5: Professional marketplace
--   Skills · Work experience · Jobs · Applications · Employer contacts
-- Run AFTER 01, 04, 06. Safe to re-run.
-- ============================================================

-- ---------- 1. PROFESSIONAL SKILLS ----------
create table if not exists public.professional_skills (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.profiles(id) on delete cascade,
  skill text not null,
  level text not null default 'competent'
    check (level in ('basic','competent','advanced')),
  created_at timestamptz not null default now(),
  unique (professional_id, skill)
);
create index if not exists prof_skills_pro_idx on public.professional_skills(professional_id);
alter table public.professional_skills enable row level security;

drop policy if exists "skills_select" on public.professional_skills;
create policy "skills_select" on public.professional_skills
  for select using (
    auth.uid() = professional_id
    or public.is_admin()
    or exists (select 1 from public.professional_profiles p
               where p.id = professional_id and p.visible = true and auth.uid() is not null)
  );
drop policy if exists "skills_write_own" on public.professional_skills;
create policy "skills_write_own" on public.professional_skills
  for all using (auth.uid() = professional_id) with check (auth.uid() = professional_id);


-- ---------- 2. WORK EXPERIENCE ----------
create table if not exists public.work_experience (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.profiles(id) on delete cascade,
  employer_name text not null,
  role_title text not null,
  location text,
  start_date date,
  end_date date,
  is_current boolean not null default false,
  description text,
  created_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);
create index if not exists work_exp_pro_idx on public.work_experience(professional_id);
alter table public.work_experience enable row level security;

drop policy if exists "workexp_select" on public.work_experience;
create policy "workexp_select" on public.work_experience
  for select using (
    auth.uid() = professional_id
    or public.is_admin()
    or exists (select 1 from public.professional_profiles p
               where p.id = professional_id and p.visible = true and auth.uid() is not null)
  );
drop policy if exists "workexp_write_own" on public.work_experience;
create policy "workexp_write_own" on public.work_experience
  for all using (auth.uid() = professional_id) with check (auth.uid() = professional_id);


-- ---------- 3. JOB POSTINGS (employer -> market) ----------
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  location text,
  employment_type text not null default 'full_time'
    check (employment_type in ('full_time','part_time','contract','event')),
  positions int not null default 1 check (positions > 0),
  closes_on date,
  status text not null default 'open' check (status in ('open','closed','filled')),
  created_at timestamptz not null default now()
);
create index if not exists jobs_employer_idx on public.jobs(employer_id);
create index if not exists jobs_status_idx on public.jobs(status);
alter table public.jobs enable row level security;

-- Any signed-in user may browse open jobs; the employer manages their own.
drop policy if exists "jobs_select" on public.jobs;
create policy "jobs_select" on public.jobs
  for select using (
    (status = 'open' and auth.uid() is not null)
    or auth.uid() = employer_id
    or public.is_admin()
  );
drop policy if exists "jobs_write_own" on public.jobs;
create policy "jobs_write_own" on public.jobs
  for all using (auth.uid() = employer_id) with check (auth.uid() = employer_id);


-- ---------- 4. JOB APPLICATIONS (professional -> job) ----------
create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  professional_id uuid not null references public.profiles(id) on delete cascade,
  cover_note text,
  status text not null default 'submitted'
    check (status in ('submitted','reviewing','shortlisted','rejected','hired','withdrawn')),
  created_at timestamptz not null default now(),
  unique (job_id, professional_id)
);
create index if not exists job_apps_job_idx on public.job_applications(job_id);
create index if not exists job_apps_pro_idx on public.job_applications(professional_id);
alter table public.job_applications enable row level security;

-- The applicant sees their own; the hiring employer sees applications to their jobs.
drop policy if exists "job_apps_select" on public.job_applications;
create policy "job_apps_select" on public.job_applications
  for select using (
    auth.uid() = professional_id
    or public.is_admin()
    or exists (select 1 from public.jobs j
               where j.id = job_id and j.employer_id = auth.uid())
  );
drop policy if exists "job_apps_insert_own" on public.job_applications;
create policy "job_apps_insert_own" on public.job_applications
  for insert with check (auth.uid() = professional_id);
-- Applicant may withdraw; employer may move it through the hiring stages.
drop policy if exists "job_apps_update" on public.job_applications;
create policy "job_apps_update" on public.job_applications
  for update using (
    auth.uid() = professional_id
    or exists (select 1 from public.jobs j
               where j.id = job_id and j.employer_id = auth.uid())
    or public.is_admin()
  );


-- ---------- 5. EMPLOYER CONTACTS (employer -> a named professional) ----------
create table if not exists public.employer_contacts (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.profiles(id) on delete cascade,
  professional_id uuid not null references public.profiles(id) on delete cascade,
  subject text,
  message text not null,
  status text not null default 'sent'
    check (status in ('sent','read','accepted','declined')),
  created_at timestamptz not null default now()
);
create index if not exists emp_contacts_pro_idx on public.employer_contacts(professional_id);
create index if not exists emp_contacts_emp_idx on public.employer_contacts(employer_id);
alter table public.employer_contacts enable row level security;

drop policy if exists "emp_contacts_select" on public.employer_contacts;
create policy "emp_contacts_select" on public.employer_contacts
  for select using (
    auth.uid() = employer_id or auth.uid() = professional_id or public.is_admin()
  );
-- An employer may only write to a professional who has published their profile.
drop policy if exists "emp_contacts_insert" on public.employer_contacts;
create policy "emp_contacts_insert" on public.employer_contacts
  for insert with check (
    auth.uid() = employer_id
    and exists (select 1 from public.professional_profiles p
                where p.id = professional_id and p.visible = true)
  );
-- The professional answers (accept/decline); the employer cannot change the reply.
drop policy if exists "emp_contacts_update" on public.employer_contacts;
create policy "emp_contacts_update" on public.employer_contacts
  for update using (auth.uid() = professional_id or public.is_admin());


-- ---------- 6. Sanity checks ----------
-- select count(*) from public.jobs where status='open';
-- select status, count(*) from public.job_applications group by status;
