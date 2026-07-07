-- 006_fix_rls_recursion.sql
-- Fix infinite RLS recursion when policies query profiles from within profiles policies.
-- Run this if you already applied migrations 001-005.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- profiles policies
DROP POLICY IF EXISTS "employees_read_own_profile" ON public.profiles;
CREATE POLICY "employees_read_own_profile" ON public.profiles
  FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "admins_all" ON public.profiles;
CREATE POLICY "admins_all" ON public.profiles
  FOR ALL
  USING (public.is_admin());

-- punches policies
DROP POLICY IF EXISTS "employees_read_own_punches" ON public.punches;
CREATE POLICY "employees_read_own_punches" ON public.punches
  FOR SELECT
  USING (employee_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "admins_all_punches" ON public.punches;
CREATE POLICY "admins_all_punches" ON public.punches
  FOR ALL
  USING (public.is_admin());

-- storage policies
DROP POLICY IF EXISTS "admins_read_all_punch_photos" ON storage.objects;
CREATE POLICY "admins_read_all_punch_photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'punch-photos'
  AND public.is_admin()
);