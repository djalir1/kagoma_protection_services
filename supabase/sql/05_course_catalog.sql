-- ============================================================
-- KAGOMA — Migration 3: Full bilingual course catalogue
-- Run in Supabase -> SQL Editor AFTER 01_schema.sql
-- Safe to re-run (idempotent).
-- ============================================================

-- ---------- Extend the courses table ----------
alter table public.courses add column if not exists title_rw       text;
alter table public.courses add column if not exists description_rw text;
alter table public.courses add column if not exists spec_en        text;
alter table public.courses add column if not exists spec_rw        text;
alter table public.courses add column if not exists track          text
  not null default 'core' check (track in ('core','ep'));
alter table public.courses add column if not exists practical      boolean not null default false;
alter table public.courses add column if not exists sort_order     int     not null default 999;

comment on column public.courses.spec_en   is 'Structure summary, e.g. "6 Modules - 41 Lessons"';
comment on column public.courses.track     is 'core = standalone course; ep = Executive Protection volume';
comment on column public.courses.practical is 'TRUE where practical components need a certified instructor';

-- ---------- Upsert the catalogue ----------
insert into public.courses
  (id, title, description, title_rw, description_rw, spec_en, spec_rw, track, practical, sort_order)
values
  ('KG-101','Event Security Management','Planning, staffing and coordinating security for conferences, concerts and large public events.','Gucunga Umutekano mu Birori','Gutegura, gushyiraho abakozi no guhuza umutekano mu makoferansi, imyidagaduro n''ibindi birori binini.','6 Modules · 41 Lessons','Ibice 6 · Amasomo 41','core',false,10),
  ('KG-102','Crowd Management and Crowd Safety','Controlling density, flow and emergency egress where large numbers of people gather.','Gucunga Imbaga n''Umutekano Wayo','Gucunga ubwinshi, uko abantu banyura n''uko basohoka mu gihe cy''ihutirwa aho imbaga iteranira.','6 Modules · 41 Lessons','Ibice 6 · Amasomo 41','core',false,20),
  ('KG-103','Loss Prevention Management','Identifying and controlling the sources of shrinkage, theft and internal risk.','Imicungire yo Kwirinda Igihombo','Kumenya no kugenzura aho igihombo, ubujura n''ibyago byo imbere biva.','6 Modules · 25 Lessons','Ibice 6 · Amasomo 25','core',false,30),
  ('KG-104','Hospitality Security Management','Security operations tailored to hotels, resorts and guest-facing venues.','Imicungire y''Umutekano mu Bwakiranyi','Imikorere y''umutekano yateguriwe amahoteri n''ahandi hakirwa abashyitsi.','9 Modules · 46 Lessons','Ibice 9 · Amasomo 46','core',false,40),
  ('KG-105','International Security and Risk Management Professional','Cross-border risk frameworks, country assessment and travel risk for international operations.','Umwuga w''Umutekano Mpuzamahanga n''Imicungire y''Ibyago','Uburyo bwo gucunga ibyago hakurya y''imipaka, gusuzuma ibihugu n''ibyago by''ingendo mpuzamahanga.','6 Modules · 41 Lessons','Ibice 6 · Amasomo 41','core',false,50),
  ('KG-106','Executive Protection','Protective principles, intelligence, advance work, operations and professional standards.','Kurinda Abayobozi n''Abantu Bakomeye','Amahame yo kurinda, amakuru, umurimo ubanziriza, ibikorwa n''amabwiriza y''umwuga.','6 Modules · 41 Lessons','Ibice 6 · Amasomo 41','core',true,60),
  ('KG-107','First Aid for Security Professionals','Emergency response, trauma priorities and basic life support for security personnel.','Ubufasha bwa Mbere ku Banyamwuga b''Umutekano','Gutabara mu byihutirwa, ibyibandwaho ku bikomere n''ubufasha bw''ibanze bw''ubuzima.','6 Modules · 41 Lessons','Ibice 6 · Amasomo 41','core',true,70),
  ('KG-108','Advanced Security Guard Course','Advanced access control, patrol, observation, reporting, incident response and supervision.','Isomo Ryisumbuye ry''Umukozi w''Umutekano','Kugenzura abinjira, patrouille, kwitegereza, gutanga raporo, gutabara ibibazo n''ubugenzuzi ku rwego rwisumbuye.','6 Modules · 41 Lessons','Ibice 6 · Amasomo 41','core',true,80),
  ('KG-109','Security Professional Etiquette','Conduct, communication and presentation standards for security staff.','Imyitwarire y''Abanyamwuga b''Umutekano','Imyitwarire, itumanaho n''uko umukozi w''umutekano yigaragaza.','6 Modules · 17 Lessons','Ibice 6 · Amasomo 17','core',false,90),
  ('KG-110','Security Risk Assessment and Security Planning','Threat and vulnerability assessment, risk registers and defensible security programme design.','Isuzuma ry''Ibyago n''Igenamigambi ry''Umutekano','Gusuzuma iterabwoba n''intege nke, urutonde rw''ibyago no gutegura gahunda y''umutekano ishobora kwiregurwa.','6 Modules · 41 Lessons','Ibice 6 · Amasomo 41','core',false,100),
  ('KG-111','Security Operations and Incident Management','Running a security operation, command and control, incident response and after-action review.','Ibikorwa by''Umutekano no Gucunga Ibibazo','Gucunga ibikorwa by''umutekano, ubuyobozi n''igenzura, gutabara ibibazo n''isuzuma nyuma y''igikorwa.','6 Modules · 41 Lessons','Ibice 6 · Amasomo 41','core',false,110),
  ('KG-112','Close Protection / PSD Training Manager','Designing, delivering and safety-controlling close protection and PSD training programmes.','Umuyobozi w''Amahugurwa yo Kurinda Hafi','Gutegura, gutanga no kugenzura umutekano w''amahugurwa yo kurinda hafi n''ay''itsinda ririnda.','8 Modules · 50 Lessons','Ibice 8 · Amasomo 50','core',true,120),
  ('EP-V1','Volume 1 — EP Fundamentals','Doctrine, the protective mindset, layers of protection and the professional ethical standard.','Igitabo cya 1 — Ishingiro rya EP','Inyigisho, imyumvire yo kurinda, inzego zo kurinda n''urwego rw''ubunyangamugayo bw''umwuga.','Domain I · Subjects 1–16','Icyiciro I · Ingingo 1–16','ep',false,130),
  ('EP-V2','Volume 2 — Protective Intelligence','Threat assessment methodology, behavioural indicators and surveillance detection.','Igitabo cya 2 — Amakuru yo Kurinda','Uburyo bwo gusuzuma iterabwoba, ibimenyetso by''imyitwarire no kumenya ugukurikiranwa.','Domain II · Subjects 17–38','Icyiciro II · Ingingo 17–38','ep',false,140),
  ('EP-V3','Volume 3 — Information Security','Reducing the information exposure that removes an adversary''s need to conduct surveillance.','Igitabo cya 3 — Umutekano w''Amakuru','Kugabanya ibigaragara bikuraho ukwinjira kw''umwanzi kwo gukurikirana.','Domain III · Subjects 39–52','Icyiciro III · Ingingo 39–52','ep',false,150),
  ('EP-V4','Volume 4 — Planning','Advance work, route analysis, venue assessment, operations orders and contingency planning.','Igitabo cya 4 — Igenamigambi','Umurimo ubanziriza, isesengura ry''inzira, isuzuma ry''ahantu, amabwiriza y''igikorwa n''ibitunguranye.','Domain IV · Subjects 53–100','Icyiciro IV · Ingingo 53–100','ep',false,160),
  ('EP-V5','Volume 5 — Operations','Formations, movement, incident response and specialist protective situations.','Igitabo cya 5 — Ibikorwa','Imiterere y''itsinda, imigendere, gutabara ibibazo n''imimerere yihariye yo kurinda.','Domain V · Subjects 101–147','Icyiciro V · Ingingo 101–147','ep',true,170),
  ('EP-V6','Volume 6 — Legal','Legal authority, use of force, rules of engagement, liability and reporting obligations.','Igitabo cya 6 — Amategeko','Ububasha bw''amategeko, gukoresha imbaraga, amabwiriza y''ibikorwa, inshingano n''itangwa rya raporo.','Domain VI · Subjects 148–162','Icyiciro VI · Ingingo 148–162','ep',false,180),
  ('EP-V7','Volume 7 — Business and Administrative','Contracts, pricing, procurement, recruitment, training management and quality systems.','Igitabo cya 7 — Ubucuruzi n''Imicungire','Amasezerano, gushyiraho ibiciro, kugura, gushaka abakozi, imicungire y''amahugurwa na sisitemu z''ubwiza.','Domain VII · Subjects 163–177','Icyiciro VII · Ingingo 163–177','ep',false,190),
  ('EP-V8','Volume 8 — EP Leadership','Detail command, decision-making under stress, programme management and professional legacy.','Igitabo cya 8 — Ubuyobozi bwa EP','Kuyobora itsinda, gufata ibyemezo mu gitutu, gucunga gahunda n''umurage w''umwuga.','Domain VIII · Subjects 178–200','Icyiciro VIII · Ingingo 178–200','ep',false,200)
on conflict (id) do update set
  title          = excluded.title,
  description    = excluded.description,
  title_rw       = excluded.title_rw,
  description_rw = excluded.description_rw,
  spec_en        = excluded.spec_en,
  spec_rw        = excluded.spec_rw,
  track          = excluded.track,
  practical      = excluded.practical,
  sort_order     = excluded.sort_order;

-- ---------- Sanity check ----------
-- select track, count(*) from public.courses group by track order by track;
--   expected: core = 12, ep = 8
