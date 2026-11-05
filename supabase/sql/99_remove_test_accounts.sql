-- ============================================================
-- KAGOMA — Remove the test accounts and demo data before going live
--
-- The seeded test logins (…@kagoma.test) share one published password and
-- one of them is an administrator. Run this in Supabase > SQL Editor
-- before real users join. Real accounts are not touched.
-- ============================================================

-- demo records that are not linked to a test account
delete from public.service_requests where email in ('bookings@inyange.test') or requested_by in
  (select id from auth.users where email like '%@kagoma.test');
delete from public.work_pool where phone in ('+250 788 300 001','+250 788 300 002','+250 788 300 003');
delete from public.events where name = 'Kigali Jazz Night' and client_name = 'Inyange Concerts';
delete from public.clients where legal_name = 'Serena Hotel Kigali Ltd';
delete from public.certificates where student_id in (select id from auth.users where email like '%@kagoma.test');

-- the accounts themselves (profiles and everything owned by them cascade)
delete from auth.users where email like '%@kagoma.test';
