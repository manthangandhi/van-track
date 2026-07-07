-- Face matching support: store reference descriptor, client flags, match score

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS face_descriptor JSONB,
  ADD COLUMN IF NOT EXISTS reference_selfie_enrolled_at TIMESTAMPTZ;

ALTER TABLE public.punches
  ADD COLUMN IF NOT EXISTS client_flags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS face_match_score NUMERIC;

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
  v_client_flag TEXT;
BEGIN
  SELECT is_active INTO v_is_active
  FROM public.profiles WHERE id = NEW.employee_id;

  IF v_is_active IS NOT TRUE THEN
    RAISE EXCEPTION 'Employee account is deactivated';
  END IF;

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