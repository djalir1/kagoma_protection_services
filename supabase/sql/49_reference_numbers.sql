-- ============================================================
-- KAGOMA — Migration 49: Every security request gets a reference
--
-- next_service_reference() existed but nothing called it on insert,
-- so requests from the website arrived without a KPS-SR number.
-- ============================================================

create or replace function public.trg_service_reference()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.reference is null or new.reference = '' then
    new.reference := public.next_service_reference();
  end if;
  return new;
end; $$;
drop trigger if exists trg_service_reference on public.service_requests;
create trigger trg_service_reference
before insert on public.service_requests
for each row execute function public.trg_service_reference();
