-- Hindura "admin@kagomaprotection.com" uyishyiremo email nyayo
-- wakoresheje mu gukora uwo mukozi mu Authentication > Users

update public.profiles
set role = 'admin'
where id = (
  select id from auth.users where email = 'admin@kagomaprotection.com'
);

-- Kugenzura ko byagenze neza (ugomba kubona umurongo umwe ufite role='admin'):
select id, full_name, role from public.profiles;
