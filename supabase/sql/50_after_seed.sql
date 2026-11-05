-- ============================================================
-- KAGOMA — Run straight after 11_seed_course_content.sql
--
-- On a fresh database the schema migrations (12..49) were applied
-- before the course content existed. These are the steps from 23, 28
-- and 41 that work on the content itself, so they run once it is in.
-- Safe to re-run.
-- ============================================================

-- From 23: practice quizzes are ungraded; study hours come from the lessons.
update public.assessments set graded = false, max_attempts = null where kind = 'quiz';
update public.assessments set graded = true where kind = 'final';
update public.courses c set
  study_hours = (select round(coalesce(sum(l.duration_minutes),0)/60.0, 1)
                   from public.lessons l join public.modules m on m.id = l.module_id
                  where m.course_id = c.id)
where c.study_hours is null;

-- From 28: terminology the client keeps in English.
do $$
declare
  pairs text[][] := array[
    ['kwirinda igihombo',   'loss prevention'],
    ['Kwirinda igihombo',   'Loss prevention'],
    ['Kwirinda Igihombo',   'Loss Prevention'],
    ['gahunda yo kurinda',  'protective programme'],
    ['Gahunda yo kurinda',  'Protective programme'],
    ['Gahunda yo Kurinda',  'Protective Programme'],
    ['kurinda hafi',        'close protection'],
    ['Kurinda hafi',        'Close protection'],
    ['Kurinda Hafi',        'Close Protection']
  ];
  i int;
begin
  for i in 1 .. array_length(pairs, 1) loop
    update public.lessons
       set body_rw  = replace(body_rw,  pairs[i][1], pairs[i][2]),
           title_rw = replace(title_rw, pairs[i][1], pairs[i][2])
     where body_rw like '%'||pairs[i][1]||'%' or title_rw like '%'||pairs[i][1]||'%';
    update public.modules
       set title_rw = replace(title_rw, pairs[i][1], pairs[i][2]),
           intro_rw = replace(intro_rw, pairs[i][1], pairs[i][2])
     where title_rw like '%'||pairs[i][1]||'%' or intro_rw like '%'||pairs[i][1]||'%';
    update public.courses
       set title_rw       = replace(title_rw, pairs[i][1], pairs[i][2]),
           description_rw = replace(description_rw, pairs[i][1], pairs[i][2])
     where title_rw like '%'||pairs[i][1]||'%' or description_rw like '%'||pairs[i][1]||'%';
    update public.questions
       set prompt_rw = replace(prompt_rw, pairs[i][1], pairs[i][2])
     where prompt_rw like '%'||pairs[i][1]||'%';
    update public.question_options
       set label_rw = replace(label_rw, pairs[i][1], pairs[i][2])
     where label_rw like '%'||pairs[i][1]||'%';
  end loop;
end $$;

-- From 41: build each course's final exam from its module question bank.
do $$
declare
  c record; a_final uuid; q record; new_q uuid; o record;
  bank int; want int; taken int;
begin
  for c in select id, title from public.courses order by sort_order, id loop
    select id into a_final from public.assessments
     where course_id = c.id and module_id is null and kind = 'final' limit 1;
    if a_final is null then
      insert into public.assessments (course_id, module_id, title, title_rw,
                                      kind, pass_mark, max_attempts, sort_order)
      values (c.id, null, 'Final Assessment — ' || c.title,
              'Ikizamini cya Nyuma — ' || c.title, 'final', 70, 3, 999)
      returning id into a_final;
    end if;
    delete from public.questions where assessment_id = a_final;
    select count(*) into bank
      from public.questions qq join public.assessments aa on aa.id = qq.assessment_id
     where aa.course_id = c.id and aa.kind = 'quiz';
    want := least(greatest((bank * 6) / 10, 12), 35);
    taken := 0;
    for q in
      select sub.* from (
        select qq.*, aa.module_id,
               row_number() over (partition by aa.module_id order by random()) as pick,
               row_number() over (order by random()) as tiebreak
          from public.questions qq join public.assessments aa on aa.id = qq.assessment_id
         where aa.course_id = c.id and aa.kind = 'quiz') sub
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
    update public.assessments set pass_mark = 70, max_attempts = 3 where id = a_final;
  end loop;
end $$;

-- What landed (expect 103 modules, 551 lessons, every course with a final)
select c.id,
       (select count(*) from public.modules m where m.course_id = c.id) as modules,
       (select count(*) from public.lessons l join public.modules m on m.id = l.module_id
         where m.course_id = c.id) as lessons,
       (select count(*) from public.questions q join public.assessments a on a.id = q.assessment_id
         where a.course_id = c.id and a.kind = 'final') as final_questions
from public.courses c order by c.sort_order;
