-- ============================================================
-- KAGOMA — Migration 10: Close the certificate data leak
--
-- Before: "certificates_public_read ... using (true)" exposed EVERY
-- column of EVERY certificate to anonymous visitors — student_id,
-- final_score, verify_token, revoked_reason — and allowed the whole
-- table to be enumerated.
--
-- After: public verification happens only through verify_certificate(),
-- which returns the six fields an employer is entitled to see and
-- computes the real status (valid / expired / suspended / revoked).
--
-- Run AFTER 01..11. Safe to re-run.
-- ============================================================

drop policy if exists "certificates_public_read" on public.certificates;

-- The holder sees their own certificates in the student/professional portal.
drop policy if exists "certificates_own_read" on public.certificates;
create policy "certificates_own_read" on public.certificates
  for select using (auth.uid() = student_id);

-- Staff see everything.
drop policy if exists "certificates_admin_read" on public.certificates;
create policy "certificates_admin_read" on public.certificates
  for select using (public.is_admin());

-- A signed-in employer may see the qualifications of a professional who
-- has published their profile — course and status only matter here, and
-- the employer search already relies on this.
drop policy if exists "certificates_employer_read" on public.certificates;
create policy "certificates_employer_read" on public.certificates
  for select using (
    auth.uid() is not null
    and exists (
      select 1 from public.professional_profiles p
      where p.id = certificates.student_id and p.visible = true
    )
  );

-- Anonymous visitors: no direct table access at all.
-- verify_certificate() is SECURITY DEFINER and already granted to anon.

-- ---------- Verify the lock actually holds ----------
-- Run these as an anonymous session:
--   select * from public.certificates;                  -- expect: 0 rows
--   select public.verify_certificate('KAGOMA-CERT-2026-000001');  -- expect: data
