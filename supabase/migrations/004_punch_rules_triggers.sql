-- 004_punch_rules_triggers.sql
-- Add punch validation, flag computation, and geofence logic

-- Trigger: Compute distance from site & add flags
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
      -- Haversine distance calculation
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
  
  -- GPS accuracy flag
  IF NEW.gps_accuracy_meters IS NOT NULL AND NEW.gps_accuracy_meters > 100 THEN
    v_flags := array_append(v_flags, 'poor_gps_accuracy');
  END IF;
  
  -- Device time mismatch flag
  IF ABS(EXTRACT(EPOCH FROM (NEW.server_timestamp - NEW.device_timestamp))) > 600 THEN
    v_flags := array_append(v_flags, 'device_time_mismatch');
  END IF;
  
  -- Synced late flag
  IF NEW.synced_late THEN
    v_flags := array_append(v_flags, 'synced_late');
  END IF;
  
  -- Punch ordering rules
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

DROP TRIGGER IF EXISTS punch_flags_trigger ON public.punches;
CREATE TRIGGER punch_flags_trigger
BEFORE INSERT ON public.punches
FOR EACH ROW EXECUTE FUNCTION public.compute_punch_flags();

-- Constraint: One check-in per employee (prevents duplicate check-ins)
-- Note: Daily uniqueness is enforced via the trigger logic, not DB constraint
CREATE UNIQUE INDEX idx_one_check_in_per_employee
ON public.punches(employee_id, punch_type)
WHERE punch_type = 'check_in' AND status IN ('auto_approved', 'approved');
