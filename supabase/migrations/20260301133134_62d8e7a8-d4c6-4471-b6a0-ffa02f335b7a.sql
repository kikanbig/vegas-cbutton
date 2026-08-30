
-- Function to auto-close stale shifts:
-- 1) Shifts open past 22:00 Minsk time
-- 2) Shifts open longer than 13 hours
CREATE OR REPLACE FUNCTION public.auto_close_stale_shifts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Close all open breaks for shifts that will be closed
  UPDATE seller_breaks
  SET ended_at = NOW()
  WHERE ended_at IS NULL
    AND user_id IN (
      SELECT user_id FROM seller_shifts
      WHERE ended_at IS NULL
        AND (
          (NOW() AT TIME ZONE 'Europe/Minsk')::time >= '22:00:00'::time
          OR NOW() - started_at >= INTERVAL '13 hours'
        )
    );

  -- Close the shifts themselves
  UPDATE seller_shifts
  SET ended_at = NOW()
  WHERE ended_at IS NULL
    AND (
      (NOW() AT TIME ZONE 'Europe/Minsk')::time >= '22:00:00'::time
      OR NOW() - started_at >= INTERVAL '13 hours'
    );
END;
$$;

-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
