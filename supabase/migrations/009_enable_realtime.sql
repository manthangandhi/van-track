-- Enable Supabase Realtime for live admin dashboard updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'punches'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.punches;
  END IF;
END $$;