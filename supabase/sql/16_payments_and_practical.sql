-- ============================================================
-- KAGOMA — Migration 14: Course fees, payments, practical assessment
--
--   Enrol -> Pay -> Learn -> Final exam -> Practical -> Certificate
--
-- Run AFTER 01..15. Safe to re-run.
-- ============================================================

-- ---------- 1. What a course costs ----------
alter table public.courses add column if not exists fee_rwf numeric(12,2);
alter table public.courses add column if not exists fee_note text;

comment on column public.courses.fee_rwf is 'Course fee in RWF. NULL means not for sale yet.';


-- ---------- 2. Payments ----------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id  text references public.courses(id) on delete set null,
  amount_rwf numeric(12,2) not null check (amount_rwf > 0),
  method text not null default 'momo'
    check (method in ('momo','airtel','bank','cash','other')),
  reference text,                       -- the MoMo transaction id, or a receipt no
  payer_phone text,
  status text not null default 'confirmed'
    check (status in ('pending','confirmed','failed','refunded')),
  note text,
  recorded_by uuid references public.profiles(id),
  paid_on date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists payments_student_idx on public.payments(student_id);
create index if not exists payments_course_idx  on public.payments(course_id);
create unique index if not exists payments_ref_uniq
  on public.payments(reference) where reference is not null;

alter table public.payments enable row level security;

-- A learner sees their own receipts; only staff record or change them.
drop policy if exists "payments_own_read" on public.payments;
create policy "payments_own_read" on public.payments
  for select using (auth.uid() = student_id or public.is_admin());
drop policy if exists "payments_admin_write" on public.payments;
create policy "payments_admin_write" on public.payments
  for all using (public.is_admin()) with check (public.is_admin());


-- ---------- 3. How much is still owed ----------
create or replace function public.balance_for(p_student uuid, p_course text)
returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce((select fee_rwf from public.courses where id = p_course), 0)
       - coalesce((select sum(amount_rwf) from public.payments
                   where student_id = p_student and course_id = p_course
                     and status = 'confirmed'), 0);
$$;
grant execute on function public.balance_for(uuid,text) to authenticated;


-- ---------- 4. Practical assessment ----------
-- Five courses state plainly that their practical elements must be
-- delivered and assessed by a certified instructor. Until now nothing
-- recorded that, so a First Aid certificate could be issued on the
-- written exam alone. This closes that.
create table if not exists public.practical_assessments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id  text not null references public.courses(id) on delete cascade,
  assessor_name text not null,
  assessor_qualification text,
  assessed_on date not null default current_date,
  result text not null default 'pass' check (result in ('pass','fail','partial')),
  components jsonb not null default '[]'::jsonb,   -- what was actually tested
  notes text,
  recorded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists prac_student_idx on public.practical_assessments(student_id, course_id);
alter table public.practical_assessments enable row level security;

drop policy if exists "prac_own_read" on public.practical_assessments;
create policy "prac_own_read" on public.practical_assessments
  for select using (auth.uid() = student_id or public.is_admin());
drop policy if exists "prac_admin_write" on public.practical_assessments;
create policy "prac_admin_write" on public.practical_assessments
  for all using (public.is_admin()) with check (public.is_admin());


-- ---------- 5. A practical course needs the practical pass ----------
create or replace function public.practical_ok(p_student uuid, p_course text)
returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when coalesce((select practical from public.courses where id = p_course), false) = false
      then true                                  -- course has no practical element
    else exists (select 1 from public.practical_assessments
                 where student_id = p_student and course_id = p_course
                   and result = 'pass')
  end;
$$;
grant execute on function public.practical_ok(uuid,text) to authenticated;

-- The automatic issue on passing the final exam must respect it.
create or replace function public.auto_issue_certificate(
  p_student uuid, p_course text, p_score int
) returns text
language plpgsql security definer set search_path = public as $$
declare v_num text; v_tok text; v_sname text; v_cname text;
begin
  if exists (select 1 from public.certificates
             where student_id = p_student and course_id = p_course
               and status <> 'revoked') then
    return null;
  end if;

  -- a course with a practical element is not complete without it
  if not public.practical_ok(p_student, p_course) then
    return null;
  end if;

  select full_name into v_sname from public.profiles where id = p_student;
  select title     into v_cname from public.courses  where id = p_course;
  if v_cname is null then return null; end if;

  v_num := public.next_certificate_number();
  v_tok := encode(gen_random_bytes(16),'hex');

  insert into public.certificates
    (id, student_id, course_id, student_name, course_name,
     issue_date, certificate_number, verify_token, status, level, final_score)
  values
    (v_num, p_student, p_course, coalesce(v_sname,'(no name)'), v_cname,
     current_date, v_num, v_tok, 'valid', 'certified', p_score);

  return v_num;
end; $$;

-- Recording a practical pass can be the last piece, so issue then too.
create or replace function public.trg_practical_recorded()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_best int; v_num text;
begin
  if new.result <> 'pass' then return new; end if;

  select max(at.score_pct) into v_best
  from public.assessment_attempts at
  join public.assessments a on a.id = at.assessment_id
  where at.student_id = new.student_id and a.course_id = new.course_id
    and a.kind = 'final' and at.passed;

  if v_best is null then return new; end if;      -- final exam still outstanding

  v_num := public.auto_issue_certificate(new.student_id, new.course_id, v_best);
  if v_num is not null then
    update public.enrollments
       set status='completed', progress=greatest(coalesce(progress,0),100)
     where student_id=new.student_id and course_id=new.course_id;
  end if;
  return new;
end; $$;

drop trigger if exists trg_practical_recorded on public.practical_assessments;
create trigger trg_practical_recorded
after insert or update on public.practical_assessments
for each row execute function public.trg_practical_recorded();


-- ---------- 6. Sanity checks ----------
-- select id, title, practical, fee_rwf from public.courses order by sort_order;
-- select public.practical_ok('<student-uuid>','KG-107');


-- ---------- 7. Starting fees ----------
-- Adjust these to your own pricing; this only sets a starting point.
update public.courses set fee_rwf = 60000  where id in ('KG-109');
update public.courses set fee_rwf = 120000 where id in ('KG-103','KG-107');
update public.courses set fee_rwf = 150000 where id in ('KG-101','KG-102','KG-108','KG-110','KG-111');
update public.courses set fee_rwf = 180000 where id in ('KG-104','KG-105');
update public.courses set fee_rwf = 250000 where id in ('KG-106','KG-112');
update public.courses set fee_rwf = 90000  where track = 'ep';

-- select id, title, practical, fee_rwf from public.courses order by sort_order;
