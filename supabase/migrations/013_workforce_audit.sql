-- Holidays, leave requests, and immutable audit log

CREATE TABLE public.holidays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  holiday_date DATE NOT NULL,
  name TEXT NOT NULL,
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (holiday_date, site_id)
);

CREATE TABLE public.leave_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  leave_type TEXT NOT NULL CHECK (leave_type IN ('sick', 'annual', 'field_off', 'other')),
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_comment TEXT,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT leave_requests_valid_range CHECK (end_date >= start_date)
);

CREATE INDEX idx_leave_requests_employee ON public.leave_requests(employee_id);
CREATE INDEX idx_leave_requests_status ON public.leave_requests(status);
CREATE INDEX idx_leave_requests_dates ON public.leave_requests(start_date, end_date);
CREATE INDEX idx_holidays_date ON public.holidays(holiday_date);

CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_created ON public.audit_log(created_at DESC);
CREATE INDEX idx_audit_log_entity ON public.audit_log(entity_type, entity_id);

ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_holidays" ON public.holidays
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admins_manage_holidays" ON public.holidays
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "employees_read_own_leave" ON public.leave_requests
  FOR SELECT TO authenticated
  USING (employee_id = auth.uid() OR public.is_admin());

CREATE POLICY "employees_create_own_leave" ON public.leave_requests
  FOR INSERT TO authenticated
  WITH CHECK (employee_id = auth.uid() AND status = 'pending');

CREATE POLICY "admins_manage_leave" ON public.leave_requests
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "admins_read_audit" ON public.audit_log
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Audit helper (SECURITY DEFINER — bypasses RLS for inserts)
CREATE OR REPLACE FUNCTION public.write_audit_log(
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_log (actor_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), p_action, p_entity_type, p_entity_id, p_details);
END;
$$;

REVOKE ALL ON FUNCTION public.write_audit_log(TEXT, TEXT, UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.write_audit_log(TEXT, TEXT, UUID, JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION public.audit_leave_requests()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.write_audit_log(
      'leave.requested',
      'leave_request',
      NEW.id,
      jsonb_build_object(
        'employee_id', NEW.employee_id,
        'start_date', NEW.start_date,
        'end_date', NEW.end_date,
        'leave_type', NEW.leave_type,
        'status', NEW.status
      )
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.write_audit_log(
      'leave.' || NEW.status,
      'leave_request',
      NEW.id,
      jsonb_build_object(
        'employee_id', NEW.employee_id,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'admin_comment', NEW.admin_comment,
        'reviewed_by', NEW.reviewed_by
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_audit_leave_requests
  AFTER INSERT OR UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.audit_leave_requests();

CREATE OR REPLACE FUNCTION public.audit_punch_status()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status OR OLD.admin_comment IS DISTINCT FROM NEW.admin_comment THEN
    PERFORM public.write_audit_log(
      'punch.' || NEW.status,
      'punch',
      NEW.id,
      jsonb_build_object(
        'employee_id', NEW.employee_id,
        'punch_type', NEW.punch_type,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'admin_comment', NEW.admin_comment
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_audit_punch_status
  AFTER UPDATE ON public.punches
  FOR EACH ROW EXECUTE FUNCTION public.audit_punch_status();

CREATE OR REPLACE FUNCTION public.audit_holidays()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.write_audit_log(
      'holiday.created',
      'holiday',
      NEW.id,
      jsonb_build_object('holiday_date', NEW.holiday_date, 'name', NEW.name, 'site_id', NEW.site_id)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.write_audit_log(
      'holiday.updated',
      'holiday',
      NEW.id,
      jsonb_build_object('holiday_date', NEW.holiday_date, 'name', NEW.name, 'site_id', NEW.site_id)
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.write_audit_log(
      'holiday.deleted',
      'holiday',
      OLD.id,
      jsonb_build_object('holiday_date', OLD.holiday_date, 'name', OLD.name, 'site_id', OLD.site_id)
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_audit_holidays
  AFTER INSERT OR UPDATE OR DELETE ON public.holidays
  FOR EACH ROW EXECUTE FUNCTION public.audit_holidays();