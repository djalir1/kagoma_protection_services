-- ============================================================
-- KAGOMA — Migration 7: Certificate lifecycle + public verification
--
--   COURSE COMPLETED -> CERTIFICATE GENERATED
--        -> KAGOMA-CERT-2026-000125 -> QR -> Employer verifies
--
--   Status: valid -> suspended -> revoked
--   Levels: Kagoma Trained / Certified / Verified Professional
--
-- Run AFTER 01..08. Safe to re-run.
-- ============================================================

-- ---------- 1. Extend the certificates table ----------
alter table public.certificates add column if not exists certificate_number text;
alter table public.certificates add column if not exists status text
  not null default 'valid' check (status in ('valid','suspended','revoked'));
alter table public.certificates add column if not exists expiry_date date;
alter table public.certificates add column if not exists verify_token text;
alter table public.certificates add column if not exists level text
  not null default 'certified' check (level in ('trained','certified','verified'));
alter table public.certificates add column if not exists final_score int;
alter table public.certificates add column if not exists revoked_reason text;
alter table public.certificates add column if not exists revoked_at timestamptz;

create unique index if not exists certificates_number_uniq
  on public.certificates(certificate_number) where certificate_number is not null;
create unique index if not exists certificates_token_uniq
  on public.certificates(verify_token) where verify_token is not null;

comment on column public.certificates.level is
  'trained = took the course; certified = passed assessment; verified = credentials checked by Kagoma';

-- ---------- 2. Human-readable sequential number ----------
create sequence if not exists public.certificate_seq start 1;

create or replace function public.next_certificate_number()
returns text language sql volatile as $$
  select 'KAGOMA-CERT-' || to_char(now(),'YYYY') || '-' ||
         lpad(nextval('public.certificate_seq')::text, 6, '0');
$$;

-- Backfill any legacy rows so every certificate is verifiable.
update public.certificates
   set certificate_number = public.next_certificate_number()
 where certificate_number is null;

update public.certificates
   set verify_token = encode(gen_random_bytes(16),'hex')
 where verify_token is null;


-- ---------- 3. Issue a certificate (staff only) ----------
create or replace function public.issue_certificate(
  p_student uuid,
  p_course  text,
  p_level   text default 'certified',
  p_expiry  date default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_num text; v_tok text; v_id text;
  v_sname text; v_cname text; v_score int;
begin
  if not public.is_admin() then raise exception 'Only staff may issue certificates'; end if;

  select full_name into v_sname from public.profiles where id = p_student;
  select title     into v_cname from public.courses  where id = p_course;
  if v_sname is null or v_cname is null then raise exception 'Unknown student or course'; end if;

  -- best final-exam score, if there is one
  select max(a.score_pct) into v_score
  from public.assessment_attempts a
  join public.assessments s on s.id = a.assessment_id
  where a.student_id = p_student and s.course_id = p_course
    and s.kind = 'final' and a.passed;

  v_num := public.next_certificate_number();
  v_tok := encode(gen_random_bytes(16),'hex');
  v_id  := v_num;

  insert into public.certificates
    (id, student_id, course_id, student_name, course_name,
     issue_date, issued_by, certificate_number, verify_token,
     status, level, expiry_date, final_score)
  values
    (v_id, p_student, p_course, v_sname, v_cname,
     current_date, auth.uid(), v_num, v_tok,
     'valid', p_level, p_expiry, v_score);

  return jsonb_build_object('certificate_number', v_num, 'verify_token', v_tok);
end; $$;
revoke all on function public.issue_certificate(uuid,text,text,date) from public;
grant execute on function public.issue_certificate(uuid,text,text,date) to authenticated;


-- ---------- 4. Change status (suspend / revoke / reinstate) ----------
create table if not exists public.certificate_audit (
  id uuid primary key default gen_random_uuid(),
  certificate_id text not null references public.certificates(id) on delete cascade,
  action text not null,
  old_status text,
  new_status text,
  reason text,
  actor uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists cert_audit_idx on public.certificate_audit(certificate_id, created_at desc);
alter table public.certificate_audit enable row level security;

drop policy if exists "cert_audit_read" on public.certificate_audit;
create policy "cert_audit_read" on public.certificate_audit
  for select using (public.is_admin());

create or replace function public.set_certificate_status(
  p_cert text, p_status text, p_reason text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare v_old text;
begin
  if not public.is_admin() then raise exception 'Only staff may change certificate status'; end if;
  if p_status not in ('valid','suspended','revoked') then raise exception 'Bad status'; end if;

  select status into v_old from public.certificates where id = p_cert;
  if v_old is null then raise exception 'No such certificate'; end if;

  update public.certificates
     set status = p_status,
         revoked_reason = case when p_status = 'revoked' then p_reason else null end,
         revoked_at     = case when p_status = 'revoked' then now() else null end
   where id = p_cert;

  insert into public.certificate_audit
    (certificate_id, action, old_status, new_status, reason, actor)
  values (p_cert, 'status_change', v_old, p_status, p_reason, auth.uid());
end; $$;
revoke all on function public.set_certificate_status(text,text,text) from public;
grant execute on function public.set_certificate_status(text,text,text) to authenticated;


-- ---------- 5. PUBLIC verification (no login, no private data) ----------
-- Returns only what an employer is entitled to see. Never the student's
-- email, id, score breakdown or any other personal detail.
create or replace function public.verify_certificate(p_ref text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare c record;
begin
  select certificate_number, student_name, course_name,
         issue_date, expiry_date, status, level
    into c
  from public.certificates
  where certificate_number = upper(trim(p_ref))
     or verify_token = lower(trim(p_ref))
     or id = trim(p_ref)
  limit 1;

  if c is null then
    return jsonb_build_object('found', false);
  end if;

  return jsonb_build_object(
    'found', true,
    'certificate_number', c.certificate_number,
    'holder',  c.student_name,
    'course',  c.course_name,
    'issued',  c.issue_date,
    'expires', c.expiry_date,
    'level',   c.level,
    'status',  case
                 when c.status <> 'valid' then c.status
                 when c.expiry_date is not null and c.expiry_date < current_date then 'expired'
                 else 'valid'
               end
  );
end; $$;
revoke all on function public.verify_certificate(text) from public;
grant execute on function public.verify_certificate(text) to anon, authenticated;


-- ---------- 6. Verification badge on a professional profile ----------
alter table public.professional_profiles add column if not exists verification_level text
  not null default 'none' check (verification_level in ('none','trained','certified','verified'));

-- Derived from the certificates actually held.
create or replace function public.refresh_verification_level(p_pro uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_level text := 'none';
begin
  if exists (select 1 from public.certificates
             where student_id = p_pro and status = 'valid' and level = 'verified')
  then v_level := 'verified';
  elsif exists (select 1 from public.certificates
                where student_id = p_pro and status = 'valid' and level = 'certified')
  then v_level := 'certified';
  elsif exists (select 1 from public.certificates
                where student_id = p_pro and status = 'valid')
  then v_level := 'trained';
  end if;

  update public.professional_profiles
     set verification_level = v_level where id = p_pro;
end; $$;

create or replace function public.trg_refresh_level()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.refresh_verification_level(coalesce(new.student_id, old.student_id));
  return coalesce(new, old);
end; $$;

drop trigger if exists trg_cert_level on public.certificates;
create trigger trg_cert_level
after insert or update or delete on public.certificates
for each row execute function public.trg_refresh_level();


-- ---------- 7. Sanity checks ----------
-- select public.verify_certificate('KAGOMA-CERT-2026-000001');
-- select certificate_number, status, level from public.certificates limit 5;
