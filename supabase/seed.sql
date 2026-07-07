-- seed.sql
-- VanTrack demo data (run AFTER all migrations and truncate.sql).
--
-- Creates auth users, sites, assignments, punches, leave, holidays, and
-- org privacy settings. Dates are relative to CURRENT_DATE so the demo
-- stays fresh without editing.
--
-- Login credentials:
--   admin@vantrack.test  / AdminPass123!
--   raj@vantrack.test    / EmpPass123!
--   priya@vantrack.test  / EmpPass123!

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Fixed demo UUIDs ────────────────────────────────────────────────────────
-- Users
--   admin  11111111-1111-1111-1111-111111111111
--   raj    22222222-2222-2222-2222-222222222222
--   priya  33333333-3333-3333-3333-333333333333
-- Sites
--   tadoba   aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
--   melghat  bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb

-- ── Auth users (trigger auto-creates bare profiles) ───────────────────────
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  is_super_admin
)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'admin@vantrack.test',
    crypt('AdminPass123!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Admin User"}',
    NOW(),
    NOW(),
    '',
    false
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'raj@vantrack.test',
    crypt('EmpPass123!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Rajesh Kumar"}',
    NOW(),
    NOW(),
    '',
    false
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'priya@vantrack.test',
    crypt('EmpPass123!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Priya Sharma"}',
    NOW(),
    NOW(),
    '',
    false
  )
ON CONFLICT (id) DO UPDATE SET
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = COALESCE(auth.users.email_confirmed_at, EXCLUDED.email_confirmed_at),
  updated_at = NOW();

INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    '{"sub":"11111111-1111-1111-1111-111111111111","email":"admin@vantrack.test"}'::jsonb,
    'email',
    '11111111-1111-1111-1111-111111111111',
    NOW(),
    NOW(),
    NOW()
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    '{"sub":"22222222-2222-2222-2222-222222222222","email":"raj@vantrack.test"}'::jsonb,
    'email',
    '22222222-2222-2222-2222-222222222222',
    NOW(),
    NOW(),
    NOW()
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    '33333333-3333-3333-3333-333333333333',
    '{"sub":"33333333-3333-3333-3333-333333333333","email":"priya@vantrack.test"}'::jsonb,
    'email',
    '33333333-3333-3333-3333-333333333333',
    NOW(),
    NOW(),
    NOW()
  )
ON CONFLICT (provider, provider_id) DO NOTHING;

-- ── Sites ─────────────────────────────────────────────────────────────────
INSERT INTO public.sites (id, name, latitude, longitude, radius_meters, is_active)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tadoba Forest Reserve', 20.7533, 80.3203, 500, true),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Melghat Tiger Reserve', 21.9000, 77.5500, 1000, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  radius_meters = EXCLUDED.radius_meters,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- ── Profiles ──────────────────────────────────────────────────────────────
UPDATE public.profiles SET
  full_name = 'Admin User',
  phone = '+91-9999999999',
  role = 'admin',
  assigned_site_id = NULL,
  mandatory_daily_hours = 8,
  is_active = true,
  privacy_consent_at = NOW(),
  privacy_consent_version = '1.0',
  legal_hold = false,
  updated_at = NOW()
WHERE id = '11111111-1111-1111-1111-111111111111';

UPDATE public.profiles SET
  full_name = 'Rajesh Kumar',
  phone = '+91-9000000001',
  role = 'employee',
  assigned_site_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  mandatory_daily_hours = 8,
  is_active = true,
  privacy_consent_at = NOW(),
  privacy_consent_version = '1.0',
  legal_hold = false,
  updated_at = NOW()
WHERE id = '22222222-2222-2222-2222-222222222222';

UPDATE public.profiles SET
  full_name = 'Priya Sharma',
  phone = '+91-9000000002',
  role = 'employee',
  assigned_site_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  mandatory_daily_hours = 8,
  is_active = true,
  privacy_consent_at = NOW(),
  privacy_consent_version = '1.0',
  legal_hold = false,
  updated_at = NOW()
WHERE id = '33333333-3333-3333-3333-333333333333';

-- ── Site assignments ──────────────────────────────────────────────────────
INSERT INTO public.site_assignments (id, employee_id, site_id, start_date, end_date, notes, created_by)
VALUES
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '22222222-2222-2222-2222-222222222222',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    CURRENT_DATE - 90,
    NULL,
    'Primary Tadoba field team',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '33333333-3333-3333-3333-333333333333',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    CURRENT_DATE - 60,
    NULL,
    'Melghat monitoring rotation',
    '11111111-1111-1111-1111-111111111111'
  )
ON CONFLICT (id) DO NOTHING;

-- ── Org privacy settings ──────────────────────────────────────────────────
INSERT INTO public.org_settings (
  id,
  photo_retention_days,
  privacy_policy_version,
  data_controller_name,
  data_controller_email,
  updated_by
)
VALUES (
  1,
  365,
  '1.0',
  'VanTrack Forestry Operations',
  'privacy@vantrack.test',
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE SET
  photo_retention_days = EXCLUDED.photo_retention_days,
  privacy_policy_version = EXCLUDED.privacy_policy_version,
  data_controller_name = EXCLUDED.data_controller_name,
  data_controller_email = EXCLUDED.data_controller_email,
  updated_by = EXCLUDED.updated_by,
  updated_at = NOW();

-- ── Holidays ──────────────────────────────────────────────────────────────
INSERT INTO public.holidays (id, holiday_date, name, site_id, created_by)
VALUES
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    date_trunc('month', CURRENT_DATE)::date + 25,
    'Field operations break',
    NULL,
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    CURRENT_DATE - 10,
    'Tadoba site maintenance',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111'
  )
ON CONFLICT (id) DO NOTHING;

-- ── Leave requests ────────────────────────────────────────────────────────
-- Priya: approved leave spanning today (visible on Admin Today + timesheets)
INSERT INTO public.leave_requests (
  id,
  employee_id,
  start_date,
  end_date,
  leave_type,
  reason,
  status,
  admin_comment,
  reviewed_by,
  reviewed_at
)
VALUES
  (
    '10101010-1010-1010-1010-101010101010',
    '33333333-3333-3333-3333-333333333333',
    CURRENT_DATE - 1,
    CURRENT_DATE + 1,
    'annual',
    'Family visit — demo approved leave',
    'approved',
    'Approved for demo dataset',
    '11111111-1111-1111-1111-111111111111',
    NOW() - INTERVAL '2 days'
  ),
  (
    '20202020-2020-2020-2020-202020202020',
    '22222222-2222-2222-2222-222222222222',
    CURRENT_DATE + 7,
    CURRENT_DATE + 9,
    'sick',
    'Medical follow-up',
    'pending',
    NULL,
    NULL,
    NULL
  )
ON CONFLICT (id) DO NOTHING;

-- ── Attendance punches (last 14 days + today) ─────────────────────────────
DO $$
DECLARE
  v_raj UUID := '22222222-2222-2222-2222-222222222222';
  v_priya UUID := '33333333-3333-3333-3333-333333333333';
  v_tadoba UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_melghat UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  v_day DATE;
  v_check_in TIMESTAMPTZ;
  v_midday TIMESTAMPTZ;
  v_check_out TIMESTAMPTZ;
  v_i INT;
  v_on_leave BOOLEAN;
BEGIN
  FOR v_i IN 1..14 LOOP
    v_day := CURRENT_DATE - v_i;

    -- Raj: full day at Tadoba (skip yesterday — flagged punch added below)
    IF v_i <> 1 THEN
      v_check_in := (v_day::timestamp + TIME '08:00:00') AT TIME ZONE 'Asia/Kolkata';
      v_midday := (v_day::timestamp + TIME '13:00:00') AT TIME ZONE 'Asia/Kolkata';
      v_check_out := (v_day::timestamp + TIME '17:00:00') AT TIME ZONE 'Asia/Kolkata';

      INSERT INTO public.punches (
        employee_id, punch_type, photo_url, latitude, longitude,
        gps_accuracy_meters, device_timestamp, server_timestamp, synced_late, site_id
      ) VALUES
        (v_raj, 'check_in', 'seed/demo.jpg', 20.7533, 80.3203, 12, v_check_in, v_check_in, false, v_tadoba),
        (v_raj, 'midday', 'seed/demo.jpg', 20.7534, 80.3204, 15, v_midday, v_midday, false, v_tadoba),
        (v_raj, 'check_out', 'seed/demo.jpg', 20.7532, 80.3202, 10, v_check_out, v_check_out, false, v_tadoba);
    END IF;

    -- Priya: skip days covered by approved leave (yesterday .. tomorrow)
    v_on_leave := v_day BETWEEN (CURRENT_DATE - 1) AND (CURRENT_DATE + 1);
    IF NOT v_on_leave THEN
      v_check_in := (v_day::timestamp + TIME '08:15:00') AT TIME ZONE 'Asia/Kolkata';
      v_midday := (v_day::timestamp + TIME '13:10:00') AT TIME ZONE 'Asia/Kolkata';
      v_check_out := (v_day::timestamp + TIME '17:05:00') AT TIME ZONE 'Asia/Kolkata';

      INSERT INTO public.punches (
        employee_id, punch_type, photo_url, latitude, longitude,
        gps_accuracy_meters, device_timestamp, server_timestamp, synced_late, site_id
      ) VALUES
        (v_priya, 'check_in', 'seed/demo.jpg', 21.9000, 77.5500, 18, v_check_in, v_check_in, false, v_melghat),
        (v_priya, 'midday', 'seed/demo.jpg', 21.9001, 77.5501, 20, v_midday, v_midday, false, v_melghat),
        (v_priya, 'check_out', 'seed/demo.jpg', 21.8999, 77.5499, 14, v_check_out, v_check_out, false, v_melghat);
    END IF;
  END LOOP;

  -- Raj today: checked in only (midday/checkout still open)
  v_check_in := (CURRENT_DATE::timestamp + TIME '08:05:00') AT TIME ZONE 'Asia/Kolkata';
  INSERT INTO public.punches (
    employee_id, punch_type, photo_url, latitude, longitude,
    gps_accuracy_meters, device_timestamp, server_timestamp, synced_late, site_id
  ) VALUES (
    v_raj, 'check_in', 'seed/demo.jpg', 20.7533, 80.3203, 11,
    v_check_in, v_check_in, false, v_tadoba
  );

  -- Flagged punch for review queue: Raj yesterday, far outside geofence
  v_day := CURRENT_DATE - 1;
  v_check_in := (v_day::timestamp + TIME '09:30:00') AT TIME ZONE 'Asia/Kolkata';
  INSERT INTO public.punches (
    employee_id, punch_type, photo_url, latitude, longitude,
    gps_accuracy_meters, device_timestamp, server_timestamp, synced_late, site_id,
    status, flag_reasons
  ) VALUES (
    v_raj, 'check_in', 'seed/demo-flagged.jpg', 19.0760, 72.8777, 250,
    v_check_in, v_check_in, true, v_tadoba,
    'flagged', ARRAY['outside_assigned_site', 'poor_gps_accuracy', 'synced_late']
  );
END $$;