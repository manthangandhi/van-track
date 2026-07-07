-- 005_storage_bucket.sql
-- Storage bucket setup instructions and policies

/*
  NOTE: Storage buckets must be created via the Supabase Dashboard or CLI.
  
  In Supabase Dashboard:
  1. Go to Storage
  2. Create new bucket named: punch-photos
  3. Make it PRIVATE
  4. Set up policies below

  For Supabase CLI:
  supabase storage buckets create punch-photos --public false
*/

-- Storage policies
-- Allow employees to upload to their own folder
INSERT INTO storage.buckets (id, name, public) VALUES ('punch-photos', 'punch-photos', false) ON CONFLICT DO NOTHING;

-- Policy: employees can upload to their folder
CREATE POLICY "employees_upload_punch_photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'punch-photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: employees can read their own uploads
CREATE POLICY "employees_read_own_punch_photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'punch-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: admins can read all punch photos
CREATE POLICY "admins_read_all_punch_photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'punch-photos'
  AND public.is_admin()
);

-- Policy: admins can upload reference selfies for employees
CREATE POLICY "admins_upload_punch_photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'punch-photos'
  AND public.is_admin()
);
