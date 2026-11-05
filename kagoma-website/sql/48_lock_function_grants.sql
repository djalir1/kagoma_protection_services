-- ============================================================
-- KAGOMA — Migration 48: Close database functions to the public
--
-- Supabase grants EXECUTE on every new public function to anon and
-- authenticated. Several internal helpers (auto_issue_certificate,
-- settle_payment_session, open_payment_session) have no caller check
-- of their own, so a signed-out visitor could issue a certificate or
-- mark a payment paid. Start from nothing and grant back only what
-- each audience uses.
-- ============================================================

do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;

-- Public website (signed out)
grant execute on function public.verify_certificate(text) to anon, authenticated;
grant execute on function public.course_syllabus(text) to anon, authenticated;
grant execute on function public.event_by_token(text) to anon, authenticated;
grant execute on function public.join_event(text,text,text,text,text,text,text,text,text,text) to anon, authenticated;
grant execute on function public.join_work_pool(text,text,text,text,date,text,text,text[],numeric,text,text[],boolean,boolean,boolean,boolean,text,text,text,text) to anon, authenticated;
grant execute on function public.open_shifts() to anon, authenticated;
grant execute on function public.offer_availability(uuid,text,text,text) to anon, authenticated;
grant execute on function public.payment_details() to anon, authenticated;
grant execute on function public.format_address(text,text,text,text,text) to anon, authenticated;

-- Signed-in users: every function that checks the caller itself.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
      and p.prorettype <> 'trigger'::regtype
      and p.proname not in (
        'auto_issue_certificate','open_payment_session','settle_payment_session',
        'refresh_verification_level','handle_new_user',
        'next_certificate_number','next_service_reference')
  loop
    execute format('grant execute on function %s to authenticated', f.sig);
  end loop;
end $$;

-- RLS policies call these.
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_staff(uuid) to anon, authenticated;
grant execute on function public.has_role(text[]) to anon, authenticated;

alter function public.is_admin() set search_path = public;
alter function public.become_professional() set search_path = public;
alter function public.next_certificate_number() set search_path = public;
alter function public.next_service_reference() set search_path = public;
alter function public.next_document_ref(text) set search_path = public;
alter function public.trg_document_ref() set search_path = public;
alter function public.sync_full_name() set search_path = public;
alter function public.format_address(text,text,text,text,text) set search_path = public;

alter default privileges in schema public revoke execute on functions from anon, public;

notify pgrst, 'reload schema';
