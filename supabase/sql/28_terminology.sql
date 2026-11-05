-- ============================================================
-- KAGOMA — Migration 26: Trade terms stay in English
--
-- A learner will hear "loss prevention" and "close protection" on
-- site, in a tender document and in a job advert. Teaching them a
-- Kinyarwanda phrase they will never hear again does not help them.
--
-- Only terms with no settled Kinyarwanda equivalent are switched.
-- Words that are ordinary Kinyarwanda and well understood are left
-- exactly as they are:
--
--   itumanaho          — standard, in daily use
--   ubufasha bwa mbere — what the Red Cross uses in Rwanda
--   patrouille         — said this way on Rwandan sites every day
--   isuzuma, igenzura  — ordinary words, used correctly
--
-- Run AFTER 01..27. Safe to re-run.
-- ============================================================

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
  n int;
begin
  for i in 1 .. array_length(pairs, 1) loop
    update public.lessons
       set body_rw  = replace(body_rw,  pairs[i][1], pairs[i][2]),
           title_rw = replace(title_rw, pairs[i][1], pairs[i][2])
     where body_rw like '%'||pairs[i][1]||'%'
        or title_rw like '%'||pairs[i][1]||'%';
    get diagnostics n = row_count;

    update public.modules
       set title_rw = replace(title_rw, pairs[i][1], pairs[i][2]),
           intro_rw = replace(intro_rw, pairs[i][1], pairs[i][2])
     where title_rw like '%'||pairs[i][1]||'%'
        or intro_rw like '%'||pairs[i][1]||'%';

    update public.courses
       set title_rw       = replace(title_rw, pairs[i][1], pairs[i][2]),
           description_rw = replace(description_rw, pairs[i][1], pairs[i][2])
     where title_rw like '%'||pairs[i][1]||'%'
        or description_rw like '%'||pairs[i][1]||'%';

    update public.questions
       set prompt_rw = replace(prompt_rw, pairs[i][1], pairs[i][2])
     where prompt_rw like '%'||pairs[i][1]||'%';

    update public.question_options
       set label_rw = replace(label_rw, pairs[i][1], pairs[i][2])
     where label_rw like '%'||pairs[i][1]||'%';

    raise notice '% -> %  (% lessons)', pairs[i][1], pairs[i][2], n;
  end loop;
end $$;


-- ---------- Check what is left ----------
select 'kwirinda igihombo' as term, count(*) as still_there
  from public.lessons where body_rw ilike '%kwirinda igihombo%'
union all
select 'gahunda yo kurinda', count(*)
  from public.lessons where body_rw ilike '%gahunda yo kurinda%'
union all
select 'kurinda hafi', count(*)
  from public.lessons where body_rw ilike '%kurinda hafi%';
-- All three should read 0.
