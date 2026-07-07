-- Time-bounded employee ↔ site assignments for punch authorization

CREATE TABLE public.site_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT site_assignments_valid_range CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX idx_site_assignments_employee ON public.site_assignments(employee_id);
CREATE INDEX idx_site_assignments_site ON public.site_assignments(site_id);
CREATE INDEX idx_site_assignments_dates ON public.site_assignments(employee_id, start_date, end_date);

ALTER TABLE public.punches
  ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_punches_site_id ON public.punches(site_id);

ALTER TABLE public.site_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employees_read_own_assignments" ON public.site_assignments
  FOR SELECT
  USING (employee_id = auth.uid() OR public.is_admin());

CREATE POLICY "admins_manage_assignments" ON public.site_assignments
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Backfill open-ended assignments from legacy assigned_site_id
INSERT INTO public.site_assignments (employee_id, site_id, start_date, end_date, notes)
SELECT p.id, p.assigned_site_id, COALESCE(p.created_at::date, CURRENT_DATE), NULL, 'Migrated from assigned site'
FROM public.profiles p
WHERE p.role = 'employee'
  AND p.assigned_site_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.site_assignments sa
    WHERE sa.employee_id = p.id AND sa.site_id = p.assigned_site_id
  );

CREATE OR REPLACE FUNCTION public.compute_punch_flags()
RETURNS TRIGGER AS $$
DECLARE
  v_punch_date DATE;
  v_site_lat NUMERIC;
  v_site_lon NUMERIC;
  v_site_radius INT;
  v_distance NUMERIC;
  v_flags TEXT[] := ARRAY[]::TEXT[];
  v_same_day_check_in TIMESTAMP;
  v_is_active BOOLEAN;
  v_client_flag TEXT;
  v_assignment_count INT := 0;
  v_matched_site UUID;
  v_matched_distance NUMERIC;
  v_rec RECORD;
BEGIN
  v_punch_date := (NEW.server_timestamp AT TIME ZONE 'UTC')::date;

  SELECT is_active INTO v_is_active
  FROM public.profiles WHERE id = NEW.employee_id;

  IF v_is_active IS NOT TRUE THEN
    RAISE EXCEPTION 'Employee account is deactivated';
  END IF;

  SELECT COUNT(*) INTO v_assignment_count
  FROM public.site_assignments sa
  WHERE sa.employee_id = NEW.employee_id
    AND sa.start_date <= v_punch_date
    AND (sa.end_date IS NULL OR sa.end_date >= v_punch_date);

  IF v_assignment_count = 0 THEN
    v_flags := array_append(v_flags, 'no_active_assignment');
  ELSE
    v_matched_site := NULL;
    v_matched_distance := NULL;

    FOR v_rec IN
      SELECT sa.site_id, s.latitude, s.longitude, s.radius_meters
      FROM public.site_assignments sa
      JOIN public.sites s ON s.id = sa.site_id
      WHERE sa.employee_id = NEW.employee_id
        AND sa.start_date <= v_punch_date
        AND (sa.end_date IS NULL OR sa.end_date >= v_punch_date)
    LOOP
      v_distance := 6371000 * ACOS(
        LEAST(1.0, GREATEST(-1.0,
          COS(RADIANS(90 - v_rec.latitude)) * COS(RADIANS(90 - NEW.latitude)) +
          SIN(RADIANS(90 - v_rec.latitude)) * SIN(RADIANS(90 - NEW.latitude)) *
          COS(RADIANS(v_rec.longitude - NEW.longitude))
        ))
      );

      IF v_rec.radius_meters IS NOT NULL AND v_distance <= v_rec.radius_meters THEN
        IF v_matched_distance IS NULL OR v_distance < v_matched_distance THEN
          v_matched_distance := v_distance;
          v_matched_site := v_rec.site_id;
        END IF;
      END IF;
    END LOOP;

    IF v_matched_site IS NOT NULL THEN
      NEW.site_id := v_matched_site;
      NEW.distance_from_site_meters := v_matched_distance;
    ELSE
      -- Nearest assigned site for distance reporting
      SELECT sa.site_id,
        6371000 * ACOS(
          LEAST(1.0, GREATEST(-1.0,
            COS(RADIANS(90 - s.latitude)) * COS(RADIANS(90 - NEW.latitude)) +
            SIN(RADIANS(90 - s.latitude)) * SIN(RADIANS(90 - NEW.latitude)) *
            COS(RADIANS(s.longitude - NEW.longitude))
          ))
        )
      INTO v_matched_site, v_matched_distance
      FROM public.site_assignments sa
      JOIN public.sites s ON s.id = sa.site_id
      WHERE sa.employee_id = NEW.employee_id
        AND sa.start_date <= v_punch_date
        AND (sa.end_date IS NULL OR sa.end_date >= v_punch_date)
      ORDER BY 2 ASC
      LIMIT 1;

      IF v_matched_site IS NOT NULL THEN
        NEW.site_id := v_matched_site;
        NEW.distance_from_site_meters := v_matched_distance;
      END IF;

      v_flags := array_append(v_flags, 'outside_assigned_site');
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

  IF NEW.client_flags IS NOT NULL THEN
    FOREACH v_client_flag IN ARRAY NEW.client_flags LOOP
      IF v_client_flag IS NOT NULL AND v_client_flag <> '' THEN
        v_flags := array_append(v_flags, v_client_flag);
      END IF;
    END LOOP;
  END IF;

  NEW.flag_reasons := v_flags;
  NEW.status := CASE WHEN COALESCE(array_length(v_flags, 1), 0) > 0 THEN 'flagged' ELSE 'auto_approved' END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;