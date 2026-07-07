-- 002_sites_and_punches.sql
-- Create sites and punches tables with RLS

-- Sites table
CREATE TABLE public.sites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  radius_meters INT DEFAULT 500,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add FK to profiles for assigned_site_id
ALTER TABLE public.profiles
ADD CONSTRAINT fk_profiles_sites 
FOREIGN KEY (assigned_site_id) REFERENCES public.sites(id) ON DELETE SET NULL;

-- Punches table
CREATE TABLE public.punches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  punch_type TEXT NOT NULL CHECK (punch_type IN ('check_in', 'midday', 'check_out')),
  photo_url TEXT NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  gps_accuracy_meters INT,
  distance_from_site_meters NUMERIC,
  device_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  server_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  synced_late BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'auto_approved' CHECK (status IN ('auto_approved', 'flagged', 'approved', 'rejected')),
  flag_reasons TEXT[] DEFAULT '{}',
  admin_comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_punches_employee_id ON public.punches(employee_id);
CREATE INDEX idx_punches_server_timestamp ON public.punches(server_timestamp);
CREATE INDEX idx_punches_status ON public.punches(status);
CREATE INDEX idx_sites_name ON public.sites(name);

-- Enable RLS on sites
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_sites" ON public.sites
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "admins_manage_sites" ON public.sites
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Enable RLS on punches
ALTER TABLE public.punches ENABLE ROW LEVEL SECURITY;

-- RLS: Employees see own punches; admins see all
CREATE POLICY "employees_read_own_punches" ON public.punches
  FOR SELECT
  USING (employee_id = auth.uid() OR public.is_admin());

CREATE POLICY "employees_insert_own_punches" ON public.punches
  FOR INSERT
  WITH CHECK (employee_id = auth.uid());

CREATE POLICY "admins_all_punches" ON public.punches
  FOR ALL
  USING (public.is_admin());
