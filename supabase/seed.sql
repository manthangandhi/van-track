-- seed.sql
-- Seed database with test data

-- IMPORTANT: Create auth users FIRST via Supabase Auth UI
-- Steps:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Create 3 users:
--    a) admin@vanhajri.test (password: AdminPass123!) - role: admin
--    b) rajesh@vanhajri.test (password: EmpPass123!) - role: employee
--    c) priya@vanhajri.test (password: EmpPass123!) - role: employee
-- 3. Copy their User IDs (UUIDs) from the Auth table
-- 4. Replace the UUID values below with the actual UUIDs from Supabase Auth
-- 5. Run this seed.sql

-- Test sites (no FK dependencies - safe to insert)
INSERT INTO public.sites (id, name, latitude, longitude, radius_meters)
VALUES 
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'Tadoba Forest Reserve', 20.7533, 80.3203, 500),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'Melghat Tiger Reserve', 21.9000, 77.5500, 1000)
ON CONFLICT (id) DO NOTHING;

-- AFTER creating auth users and getting their UUIDs, uncomment below and replace:
-- User UUID from admin@vanhajri.test, role: admin
-- UPDATE public.profiles 
-- SET role = 'admin', full_name = 'Admin User', phone = '+91-9999999999'
-- WHERE id = 'REPLACE_WITH_ADMIN_UUID'::uuid;

-- User UUID from rajesh@vanhajri.test, role: employee
-- UPDATE public.profiles 
-- SET role = 'employee', full_name = 'Rajesh Kumar', phone = '+91-9000000001',
--     assigned_site_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
--     mandatory_daily_hours = 8
-- WHERE id = 'REPLACE_WITH_RAJESH_UUID'::uuid;

-- User UUID from priya@vanhajri.test, role: employee
-- UPDATE public.profiles 
-- SET role = 'employee', full_name = 'Priya Sharma', phone = '+91-9000000002',
--     assigned_site_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
--     mandatory_daily_hours = 8
-- WHERE id = 'REPLACE_WITH_PRIYA_UUID'::uuid;
