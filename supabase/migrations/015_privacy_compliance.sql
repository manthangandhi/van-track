-- Privacy consent, retention, erasure requests, legal hold

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS privacy_consent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS privacy_consent_version TEXT,
  ADD COLUMN IF NOT EXISTS legal_hold BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_erasure_requested_at TIMESTAMPTZ;

CREATE TABLE public.org_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  photo_retention_days INT NOT NULL DEFAULT 365 CHECK (photo_retention_days >= 30),
  privacy_policy_version TEXT NOT NULL DEFAULT '1.0',
  data_controller_name TEXT,
  data_controller_email TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

INSERT INTO public.org_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE public.data_erasure_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  reason TEXT,
  admin_comment TEXT,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_erasure_requests_status ON public.data_erasure_requests(status);
CREATE INDEX idx_erasure_requests_employee ON public.data_erasure_requests(employee_id);

ALTER TABLE public.org_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_erasure_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_org_settings" ON public.org_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admins_manage_org_settings" ON public.org_settings
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "employees_read_own_erasure" ON public.data_erasure_requests
  FOR SELECT TO authenticated
  USING (employee_id = auth.uid() OR public.is_admin());

CREATE POLICY "employees_request_erasure" ON public.data_erasure_requests
  FOR INSERT TO authenticated
  WITH CHECK (employee_id = auth.uid() AND status = 'pending');

CREATE POLICY "admins_manage_erasure" ON public.data_erasure_requests
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Record employee privacy consent (biometric + location processing)
CREATE OR REPLACE FUNCTION public.record_privacy_consent(p_version TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    privacy_consent_at = NOW(),
    privacy_consent_version = p_version,
    updated_at = NOW()
  WHERE id = auth.uid();

  PERFORM public.write_audit_log(
    'privacy.consent',
    'profile',
    auth.uid(),
    jsonb_build_object('version', p_version)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_privacy_consent(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_privacy_consent(TEXT) TO authenticated;

-- Purge punch photo references past retention (admins run manually or via cron)
CREATE OR REPLACE FUNCTION public.run_photo_retention_purge()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days INT;
  v_cutoff TIMESTAMPTZ;
  v_count INT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  SELECT photo_retention_days INTO v_days FROM public.org_settings WHERE id = 1;
  v_cutoff := NOW() - (v_days || ' days')::INTERVAL;

  UPDATE public.punches p
  SET photo_url = 'purged', updated_at = NOW()
  FROM public.profiles pr
  WHERE p.employee_id = pr.id
    AND pr.legal_hold IS NOT TRUE
    AND p.server_timestamp < v_cutoff
    AND p.photo_url IS NOT NULL
    AND p.photo_url <> 'purged';

  GET DIAGNOSTICS v_count = ROW_COUNT;

  PERFORM public.write_audit_log(
    'privacy.retention_purge',
    'org_settings',
    '00000000-0000-0000-0000-000000000001'::uuid,
    jsonb_build_object('purged_punches', v_count, 'retention_days', v_days, 'cutoff', v_cutoff)
  );

  RETURN jsonb_build_object('purged_punches', v_count, 'retention_days', v_days);
END;
$$;

REVOKE ALL ON FUNCTION public.run_photo_retention_purge() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_photo_retention_purge() TO authenticated;

-- Complete approved erasure: anonymize profile + purge photo refs
CREATE OR REPLACE FUNCTION public.complete_data_erasure(p_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.data_erasure_requests%ROWTYPE;
  v_emp UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  SELECT * INTO v_req FROM public.data_erasure_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND OR v_req.status <> 'approved' THEN
    RAISE EXCEPTION 'Request must be approved first';
  END IF;

  v_emp := v_req.employee_id;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_emp AND legal_hold IS TRUE) THEN
    RAISE EXCEPTION 'Employee is on legal hold';
  END IF;

  UPDATE public.punches
  SET photo_url = 'purged', updated_at = NOW()
  WHERE employee_id = v_emp AND photo_url IS NOT NULL AND photo_url <> 'purged';

  UPDATE public.profiles
  SET
    full_name = 'Redacted User',
    phone = NULL,
    reference_selfie_url = NULL,
    face_descriptor = NULL,
    is_active = false,
    updated_at = NOW()
  WHERE id = v_emp;

  UPDATE public.data_erasure_requests
  SET status = 'completed', completed_at = NOW()
  WHERE id = p_request_id;

  PERFORM public.write_audit_log(
    'privacy.erasure_completed',
    'profile',
    v_emp,
    jsonb_build_object('request_id', p_request_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_data_erasure(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_data_erasure(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.audit_erasure_requests()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.write_audit_log(
      'privacy.erasure_requested',
      'erasure_request',
      NEW.id,
      jsonb_build_object('employee_id', NEW.employee_id, 'reason', NEW.reason)
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.write_audit_log(
      'privacy.erasure_' || NEW.status,
      'erasure_request',
      NEW.id,
      jsonb_build_object(
        'employee_id', NEW.employee_id,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'admin_comment', NEW.admin_comment
      )
    );
    IF NEW.status = 'approved' THEN
      UPDATE public.profiles
      SET data_erasure_requested_at = NOW()
      WHERE id = NEW.employee_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_audit_erasure_requests
  AFTER INSERT OR UPDATE ON public.data_erasure_requests
  FOR EACH ROW EXECUTE FUNCTION public.audit_erasure_requests();

CREATE OR REPLACE FUNCTION public.audit_org_settings()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.write_audit_log(
    'privacy.settings_updated',
    'org_settings',
    '00000000-0000-0000-0000-000000000001'::uuid,
    jsonb_build_object(
      'photo_retention_days', NEW.photo_retention_days,
      'privacy_policy_version', NEW.privacy_policy_version,
      'data_controller_name', NEW.data_controller_name,
      'data_controller_email', NEW.data_controller_email
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_audit_org_settings
  AFTER UPDATE ON public.org_settings
  FOR EACH ROW EXECUTE FUNCTION public.audit_org_settings();

-- Extend profile audit for legal hold + consent fields
CREATE OR REPLACE FUNCTION public.audit_profiles()
RETURNS TRIGGER AS $$
DECLARE
  v_changes JSONB := '{}'::jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.write_audit_log(
      'profile.created', 'profile', NEW.id,
      jsonb_build_object('full_name', NEW.full_name, 'role', NEW.role, 'is_active', NEW.is_active)
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
    IF OLD.legal_hold IS DISTINCT FROM NEW.legal_hold THEN
      v_changes := v_changes || jsonb_build_object('legal_hold', jsonb_build_object('old', OLD.legal_hold, 'new', NEW.legal_hold));
    END IF;
    IF OLD.privacy_consent_at IS DISTINCT FROM NEW.privacy_consent_at THEN
      v_changes := v_changes || jsonb_build_object('privacy_consent_version', NEW.privacy_consent_version);
    END IF;
    IF OLD.reference_selfie_url IS DISTINCT FROM NEW.reference_selfie_url THEN
      v_changes := v_changes || jsonb_build_object('reference_selfie_updated', true);
    END IF;
    IF v_changes <> '{}'::jsonb THEN
      PERFORM public.write_audit_log('profile.updated', 'profile', NEW.id, jsonb_build_object('changes', v_changes));
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;