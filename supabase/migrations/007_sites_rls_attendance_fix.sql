-- 007_sites_rls_attendance_fix.sql
-- Sites RLS, attendance_days midday payroll rule, inactive employee punch block

-- Sites RLS (employees need read access for geofence; admins manage)
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_sites" ON public.sites;
CREATE POLICY "authenticated_read_sites" ON public.sites
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "admins_manage_sites" ON public.sites;
CREATE POLICY "admins_manage_sites" ON public.sites
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admins can upload reference selfies / enrollment photos for employees
DROP POLICY IF EXISTS "admins_upload_punch_photos" ON storage.objects;
CREATE POLICY "admins_upload_punch_photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'punch-photos'
  AND public.is_admin()
);

-- Block deactivated employees from punching
CREATE OR REPLACE FUNCTION public.compute_punch_flags()
RETURNS TRIGGER AS $$
DECLARE
  v_site_id UUID;
  v_site_lat NUMERIC;
  v_site_lon NUMERIC;
  v_site_radius INT;
  v_distance NUMERIC;
  v_flags TEXT[] := ARRAY[]::TEXT[];
  v_same_day_check_in TIMESTAMP;
  v_is_active BOOLEAN;
BEGIN
  SELECT is_active INTO v_is_active
  FROM public.profiles WHERE id = NEW.employee_id;

  IF v_is_active IS NOT TRUE THEN
    RAISE EXCEPTION 'Employee account is deactivated';
  END IF;

  -- Get assigned site
  SELECT assigned_site_id INTO v_site_id
  FROM public.profiles WHERE id = NEW.employee_id;

  IF v_site_id IS NOT NULL THEN
    SELECT latitude, longitude, radius_meters
    INTO v_site_lat, v_site_lon, v_site_radius
    FROM public.sites WHERE id = v_site_id;

    IF v_site_lat IS NOT NULL THEN
      v_distance := 6371000 * ACOS(
        LEAST(1.0, GREATEST(-1.0,
          COS(RADIANS(90 - v_site_lat)) * COS(RADIANS(90 - NEW.latitude)) +
          SIN(RADIANS(90 - v_site_lat)) * SIN(RADIANS(90 - NEW.latitude)) * COS(RADIANS(v_site_lon - NEW.longitude))
        ))
      );

      NEW.distance_from_site_meters := v_distance;

      IF v_distance > v_site_radius THEN
        v_flags := array_append(v_flags, 'outside_geofence');
      END IF;
    END IF;
  END IF;

  IF NEW.gps_accuracy_meters IS NOT NULL AND NEW.gps_accuracy_meters > 100 THEN
    v_flags := array_append(v_flags, 'poor_gps_accuracy');
  END IF;

  IF ABS(EXTRACT(EPOCH FROM (NEW.server_timestamp - NEW.device_timestamp))) > 600 THEN
    v_flags := array_append(v_flags, 'device_time_mismatch');
  END IF;

  IF NEW.synced_late THEN
    v_flags := array_append(v_flags, 'synced_late');
  END IF;

  IF NEW.punch_type = 'midday' OR NEW.punch_type = 'check_out' THEN
    SELECT server_timestamp INTO v_same_day_check_in FROM public.punches
    WHERE employee_id = NEW.employee_id
      AND punch_type = 'check_in'
      AND server_timestamp >= DATE_TRUNC('day', NEW.server_timestamp)
      AND server_timestamp < DATE_TRUNC('day', NEW.server_timestamp) + INTERVAL '1 day'
      AND status IN ('auto_approved', 'approved')
    LIMIT 1;

    IF v_same_day_check_in IS NULL THEN
      v_flags := array_append(v_flags, 'no_check_in');
    END IF;
  END IF;

  NEW.flag_reasons := v_flags;
  NEW.status := CASE WHEN COALESCE(array_length(v_flags, 1), 0) > 0 THEN 'flagged' ELSE 'auto_approved' END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attendance view: hours only count with midday punch; missing_midday day flag
CREATE OR REPLACE VIEW public.attendance_days AS
SELECT
  p.employee_id,
  DATE(p.server_timestamp) AS work_date,
  MAX(CASE WHEN p.punch_type = 'check_in' THEN p.server_timestamp END) AS check_in_time,
  MAX(CASE WHEN p.punch_type = 'midday' THEN p.server_timestamp END) AS midday_time,
  MAX(CASE WHEN p.punch_type = 'check_out' THEN p.server_timestamp END) AS check_out_time,
  CASE
    WHEN MAX(CASE WHEN p.punch_type = 'midday' THEN p.server_timestamp END) IS NOT NULL
      AND MAX(CASE WHEN p.punch_type = 'check_in' THEN p.server_timestamp END) IS NOT NULL
      AND MAX(CASE WHEN p.punch_type = 'check_out' THEN p.server_timestamp END) IS NOT NULL
    THEN EXTRACT(EPOCH FROM (
      MAX(CASE WHEN p.punch_type = 'check_out' THEN p.server_timestamp END) -
      MAX(CASE WHEN p.punch_type = 'check_in' THEN p.server_timestamp END)
    )) / 3600.0
    ELSE 0
  END AS hours_worked,
  CASE
    WHEN MAX(CASE WHEN p.punch_type = 'check_in' THEN p.server_timestamp END) IS NULL THEN 'absent'
    WHEN MAX(CASE WHEN p.punch_type = 'midday' THEN p.server_timestamp END) IS NULL
      AND MAX(CASE WHEN p.punch_type = 'check_out' THEN p.server_timestamp END) IS NOT NULL THEN 'short'
    WHEN MAX(CASE WHEN p.punch_type = 'midday' THEN p.server_timestamp END) IS NULL THEN 'pending'
    WHEN MAX(CASE WHEN p.punch_type = 'check_out' THEN p.server_timestamp END) IS NULL THEN 'pending'
    WHEN (
      EXTRACT(EPOCH FROM (
        MAX(CASE WHEN p.punch_type = 'check_out' THEN p.server_timestamp END) -
        MAX(CASE WHEN p.punch_type = 'check_in' THEN p.server_timestamp END)
      )) / 3600.0
    ) >= (SELECT mandatory_daily_hours FROM public.profiles WHERE id = p.employee_id) THEN 'full'
    WHEN (
      EXTRACT(EPOCH FROM (
        MAX(CASE WHEN p.punch_type = 'check_out' THEN p.server_timestamp END) -
        MAX(CASE WHEN p.punch_type = 'check_in' THEN p.server_timestamp END)
      )) / 3600.0
    ) >= (SELECT mandatory_daily_hours FROM public.profiles WHERE id = p.employee_id) * 0.5 THEN 'half'
    ELSE 'short'
  END AS day_status,
  CASE
    WHEN MAX(CASE WHEN p.punch_type = 'check_in' THEN p.server_timestamp END) IS NOT NULL
      AND MAX(CASE WHEN p.punch_type = 'midday' THEN p.server_timestamp END) IS NULL
      AND MAX(CASE WHEN p.punch_type = 'check_out' THEN p.server_timestamp END) IS NOT NULL
    THEN ARRAY['missing_midday']::TEXT[]
    ELSE '{}'::TEXT[]
  END AS day_flag_reasons
FROM public.punches p
WHERE p.status IN ('auto_approved', 'approved')
GROUP BY p.employee_id, DATE(p.server_timestamp);

ALTER VIEW public.attendance_days SET (security_barrier = on);