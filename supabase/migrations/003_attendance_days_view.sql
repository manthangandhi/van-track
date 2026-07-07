-- 003_attendance_days_view.sql
-- Create view for daily attendance summary

CREATE VIEW public.attendance_days AS
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

-- Enable RLS for view
ALTER VIEW public.attendance_days SET (security_barrier = on);