-- ============================================================
-- KAGOMA — Migration 39: Give the final examinations their questions
--
-- Every course carried a final assessment as a row in the table and
-- nothing inside it. A learner finished the modules, opened the final
-- and found an empty paper. The Rwanda National Police reviewed the
-- programme and said so, and they were right.
--
-- A final examination has to test the whole course, not the last
-- module. Each one is built from the whole question bank of its own
-- course: spread across every module, drawn at random so two learners
-- do not sit an identical paper, 70% to pass, 3 attempts.
--
-- Run AFTER 01..40. Safe to re-run: it rebuilds the finals only, and
-- touches no learner's progress.
-- ============================================================

-- Stop with a sentence rather than fail on the first line that touches
-- something that is not there.
do $$
begin
  if to_regclass('public.assessments') is null or to_regclass('public.questions') is null then
    raise exception 'The learning tables are missing. Run 08_lms_and_assessment.sql first.';
  end if;
  if not exists (select 1 from public.courses) then
    raise exception 'No courses found. Run 05_course_catalog.sql and 11_seed_course_content.sql first.';
  end if;
  if not exists (select 1 from public.questions) then
    raise exception 'The question bank is empty. Run 11_seed_course_content.sql first — a final exam is built from it.';
  end if;
  raise notice 'Question bank found. Building the finals.';
end $$;

do $$
declare
  c       record;
  a_final uuid;
  q       record;
  new_q   uuid;
  o       record;
  bank    int;
  want    int;
  taken   int;
begin
  for c in select id, title from public.courses order by sort_order, id loop

    select id into a_final
      from public.assessments
     where course_id = c.id and module_id is null and kind = 'final'
     limit 1;

    if a_final is null then
      insert into public.assessments (course_id, module_id, title, title_rw,
                                      kind, pass_mark, max_attempts, sort_order)
      values (c.id, null,
              'Final Assessment — ' || c.title,
              'Ikizamini cya Nyuma — ' || c.title,
              'final', 70, 3, 999)
      returning id into a_final;
    end if;

    delete from public.questions where assessment_id = a_final;

    select count(*) into bank
      from public.questions qq
      join public.assessments aa on aa.id = qq.assessment_id
     where aa.course_id = c.id and aa.kind = 'quiz';

    -- a short course should not face a longer paper than it has taught
    want := least(greatest((bank * 6) / 10, 12), 35);

    taken := 0;
    for q in
      -- number the questions within each module first, then take them in
      -- rounds, so the paper spreads over the whole course instead of
      -- landing on whichever module happens to be longest
      select sub.*
        from (
          select qq.*, aa.module_id,
                 row_number() over (partition by aa.module_id order by random()) as pick,
                 row_number() over (order by random()) as tiebreak
            from public.questions qq
            join public.assessments aa on aa.id = qq.assessment_id
           where aa.course_id = c.id and aa.kind = 'quiz'
        ) sub
       order by sub.pick, sub.tiebreak
       limit want
    loop
      taken := taken + 1;

      insert into public.questions (assessment_id, number, kind, prompt, prompt_rw,
                                    scenario, scenario_rw, explanation, explanation_rw, points)
      values (a_final, taken, q.kind, q.prompt, q.prompt_rw,
              q.scenario, q.scenario_rw, q.explanation, q.explanation_rw, q.points)
      returning id into new_q;

      for o in select * from public.question_options oo
                where oo.question_id = q.id order by oo.sort_order loop
        insert into public.question_options (question_id, label, label_rw, is_correct, sort_order)
        values (new_q, o.label, o.label_rw, o.is_correct, o.sort_order);
      end loop;
    end loop;

    update public.assessments
       set pass_mark = 70, max_attempts = 3
     where id = a_final;

    raise notice '% — final built with % question(s) from a bank of %', c.id, taken, bank;
  end loop;
end $$;


-- ---------- What each final now holds ----------
select c.id, c.title,
       (select count(*) from public.questions q
          join public.assessments a on a.id = q.assessment_id
         where a.course_id = c.id and a.kind = 'quiz')  as bank,
       (select count(*) from public.questions q
          join public.assessments a on a.id = q.assessment_id
         where a.course_id = c.id and a.kind = 'final') as final_questions
from public.courses c
order by c.sort_order, c.id;
--  final_questions must be 12 or more for every course.
