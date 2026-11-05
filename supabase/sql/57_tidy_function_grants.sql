-- KAGOMA — Migration 57: tidy function grants flagged by the Supabase security advisor
alter function public.from_api() set search_path = public;
-- trigger functions fire without EXECUTE; nobody should call this one directly
revoke execute on function public.trg_service_reference() from public, anon, authenticated;
