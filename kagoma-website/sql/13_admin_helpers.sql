-- ============================================================
-- KAGOMA — Migration 11: Admin helpers
--   Who is eligible for a certificate, and who already has one.
-- Run AFTER 01..12. Safe to re-run.
-- ============================================================

-- ---------- 1. Learners eligible for a certificate ----------
-- A learner qualifies when they have PASSED the course's final
-- assessment. Where a course has no final assessment yet, 100%
-- lesson progress counts instead, so the desk is never blocked.
create or replace function public.admin_eligible(p_course text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Staff only'; end if;

  return coalesce((
    select jsonb_agg(x order by x->>'full_name')
    from (
      select jsonb_build_object(
        'student_id',   e.student_id,
        'full_name',    coalesce(p.full_name,'(no name)'),
        'course_id',    e.course_id,
        'course_title', c.title,
        'progress',     coalesce(e.progress,0),
        'best_score',   fs.best,
        'has_final',    (fs.total_finals > 0),
        'already',      exists (
                          select 1 from public.certificates ct
                          where ct.student_id = e.student_id
                            and ct.course_id  = e.course_id
                            and ct.status <> 'revoked')
      ) as x
      from public.enrollments e
      join public.profiles p on p.id = e.student_id
      join public.courses  c on c.id = e.course_id
      cross join lateral (
        select count(a.id) filter (where a.kind='final')            as total_finals,
               max(at.score_pct) filter (where at.passed)           as best
        from public.assessments a
        left join public.assessment_attempts at
          on at.assessment_id = a.id and at.student_id = e.student_id
        where a.course_id = e.course_id and a.kind = 'final'
      ) fs
      where (p_course is null or e.course_id = p_course)
        and (
          fs.best is not null                                   -- passed the final
          or (fs.total_finals = 0 and coalesce(e.progress,0) >= 100)
        )
    ) s
  ), '[]'::jsonb);
end; $$;
revoke all on function public.admin_eligible(text) from public;
grant execute on function public.admin_eligible(text) to authenticated;


-- ---------- 2. Recently issued certificates ----------
create or replace function public.admin_certificates(p_limit int default 50)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Staff only'; end if;

  return coalesce((
    select jsonb_agg(x order by x->>'issue_date' desc)
    from (
      select jsonb_build_object(
        'id', ct.id,
        'certificate_number', ct.certificate_number,
        'student_name', ct.student_name,
        'course_name',  ct.course_name,
        'issue_date',   ct.issue_date,
        'expiry_date',  ct.expiry_date,
        'status',       ct.status,
        'level',        ct.level,
        'final_score',  ct.final_score
      ) as x
      from public.certificates ct
      order by ct.issue_date desc, ct.certificate_number desc
      limit greatest(1, least(p_limit, 200))
    ) s
  ), '[]'::jsonb);
end; $$;
revoke all on function public.admin_certificates(int) from public;
grant execute on function public.admin_certificates(int) to authenticated;


-- ---------- 3. Open service requests for the desk ----------
create or replace function public.admin_requests(p_limit int default 50)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Staff only'; end if;

  return coalesce((
    select jsonb_agg(x order by x->>'created_at' desc)
    from (
      select jsonb_build_object(
        'id', r.id,
        'reference', r.reference,
        'client_name', r.client_name,
        'email', r.email,
        'event_name', r.event_name,
        'service_type', r.service_type,
        'location', r.location,
        'event_date', r.event_date,
        'status', r.status,
        'created_at', r.created_at
      ) as x
      from public.service_requests r
      order by r.created_at desc
      limit greatest(1, least(p_limit, 200))
    ) s
  ), '[]'::jsonb);
end; $$;
revoke all on function public.admin_requests(int) from public;
grant execute on function public.admin_requests(int) to authenticated;

-- ---------- Sanity checks ----------
-- select public.admin_overview();
-- select public.admin_eligible(null);
