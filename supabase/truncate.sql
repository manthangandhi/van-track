-- truncate.sql
-- Wipe all VanTrack application data for a clean demo reset.
--
-- Run in Supabase SQL Editor (service role / postgres).
-- Recommended order: truncate.sql → seed.sql
--
-- WARNING: Deletes all @vantrack.test auth users and every row in public
-- app tables. Schema, migrations, RLS, and triggers are untouched.
-- Storage objects in the punch-photos bucket are NOT deleted — clear those
-- manually in Dashboard → Storage if needed.

BEGIN;

-- Child tables first; CASCADE clears remaining FK-linked rows in one pass.
TRUNCATE TABLE
  public.audit_log,
  public.data_erasure_requests,
  public.leave_requests,
  public.holidays,
  public.punches,
  public.site_assignments,
  public.profiles,
  public.sites,
  public.org_settings
RESTART IDENTITY CASCADE;

-- Remove demo auth users (profiles cascade via ON DELETE CASCADE on auth.users).
DELETE FROM auth.identities
WHERE user_id IN (
  SELECT id FROM auth.users
  WHERE email IN (
    'admin@vantrack.test',
    'raj@vantrack.test',
    'priya@vantrack.test',
    'user1@vantrack.test',
    'user2@vantrack.test',
    'user3@vantrack.test'
  )
);

DELETE FROM auth.users
WHERE email IN (
  'admin@vantrack.test',
  'raj@vantrack.test',
  'priya@vantrack.test',
  'user1@vantrack.test',
  'user2@vantrack.test',
  'user3@vantrack.test'
);

-- Restore singleton org settings row (migration 015).
INSERT INTO public.org_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

COMMIT;