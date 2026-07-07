-- Full-app audit triggers: profiles, sites, assignments, punch inserts

CREATE OR REPLACE FUNCTION public.audit_profiles()
RETURNS TRIGGER AS $$
DECLARE
  v_changes JSONB := '{}'::jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.write_audit_log(
      'profile.created',
      'profile',
      NEW.id,
      jsonb_build_object(
        'full_name', NEW.full_name,
        'role', NEW.role,
        'is_active', NEW.is_active
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.full_name IS DISTINCT FROM NEW.full_name THEN
      v_changes := v_changes || jsonb_build_object('full_name', jsonb_build_object('old', OLD.full_name, 'new', NEW.full_name));
    END IF;
    IF OLD.role IS DISTINCT FROM NEW.role THEN
      v_changes := v_changes || jsonb_build_object('role', jsonb_build_object('old', OLD.role, 'new', NEW.role));
    END IF;
    IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
      v_changes := v_changes || jsonb_build_object('is_active', jsonb_build_object('old', OLD.is_active, 'new', NEW.is_active));
    END IF;
    IF OLD.assigned_site_id IS DISTINCT FROM NEW.assigned_site_id THEN
      v_changes := v_changes || jsonb_build_object('assigned_site_id', jsonb_build_object('old', OLD.assigned_site_id, 'new', NEW.assigned_site_id));
    END IF;
    IF OLD.mandatory_daily_hours IS DISTINCT FROM NEW.mandatory_daily_hours THEN
      v_changes := v_changes || jsonb_build_object('mandatory_daily_hours', jsonb_build_object('old', OLD.mandatory_daily_hours, 'new', NEW.mandatory_daily_hours));
    END IF;
    IF OLD.phone IS DISTINCT FROM NEW.phone THEN
      v_changes := v_changes || jsonb_build_object('phone', jsonb_build_object('old', OLD.phone, 'new', NEW.phone));
    END IF;
    IF OLD.reference_selfie_url IS DISTINCT FROM NEW.reference_selfie_url THEN
      v_changes := v_changes || jsonb_build_object('reference_selfie_updated', true);
    END IF;
    IF v_changes <> '{}'::jsonb THEN
      PERFORM public.write_audit_log(
        'profile.updated',
        'profile',
        NEW.id,
        jsonb_build_object('profile_id', NEW.id, 'changes', v_changes)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_audit_profiles
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_profiles();

CREATE OR REPLACE FUNCTION public.audit_sites()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.write_audit_log(
      'site.created',
      'site',
      NEW.id,
      jsonb_build_object('name', NEW.name, 'latitude', NEW.latitude, 'longitude', NEW.longitude, 'radius_meters', NEW.radius_meters, 'is_active', NEW.is_active)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.write_audit_log(
      'site.updated',
      'site',
      NEW.id,
      jsonb_build_object(
        'name', NEW.name,
        'latitude', NEW.latitude,
        'longitude', NEW.longitude,
        'radius_meters', NEW.radius_meters,
        'is_active', NEW.is_active
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.write_audit_log(
      'site.deleted',
      'site',
      OLD.id,
      jsonb_build_object('name', OLD.name)
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_audit_sites
  AFTER INSERT OR UPDATE OR DELETE ON public.sites
  FOR EACH ROW EXECUTE FUNCTION public.audit_sites();

CREATE OR REPLACE FUNCTION public.audit_site_assignments()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.write_audit_log(
      'assignment.created',
      'assignment',
      NEW.id,
      jsonb_build_object(
        'employee_id', NEW.employee_id,
        'site_id', NEW.site_id,
        'start_date', NEW.start_date,
        'end_date', NEW.end_date
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.write_audit_log(
      'assignment.updated',
      'assignment',
      NEW.id,
      jsonb_build_object(
        'employee_id', NEW.employee_id,
        'site_id', NEW.site_id,
        'start_date', NEW.start_date,
        'end_date', NEW.end_date
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.write_audit_log(
      'assignment.deleted',
      'assignment',
      OLD.id,
      jsonb_build_object(
        'employee_id', OLD.employee_id,
        'site_id', OLD.site_id,
        'start_date', OLD.start_date,
        'end_date', OLD.end_date
      )
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_audit_site_assignments
  AFTER INSERT OR UPDATE OR DELETE ON public.site_assignments
  FOR EACH ROW EXECUTE FUNCTION public.audit_site_assignments();

CREATE OR REPLACE FUNCTION public.audit_punch_insert()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.write_audit_log(
    'punch.recorded',
    'punch',
    NEW.id,
    jsonb_build_object(
      'employee_id', NEW.employee_id,
      'punch_type', NEW.punch_type,
      'status', NEW.status,
      'site_id', NEW.site_id,
      'flag_reasons', NEW.flag_reasons,
      'synced_late', NEW.synced_late
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_audit_punch_insert
  AFTER INSERT ON public.punches
  FOR EACH ROW EXECUTE FUNCTION public.audit_punch_insert();