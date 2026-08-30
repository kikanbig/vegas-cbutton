
CREATE OR REPLACE FUNCTION public.auto_close_stale_shifts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE seller_breaks
  SET ended_at = NOW()
  WHERE ended_at IS NULL
    AND user_id IN (
      SELECT user_id FROM seller_shifts
      WHERE ended_at IS NULL
        AND (
          (NOW() AT TIME ZONE 'Europe/Minsk')::time >= '22:30:00'::time
          OR NOW() - started_at >= INTERVAL '13 hours'
        )
    );

  UPDATE seller_shifts
  SET ended_at = NOW()
  WHERE ended_at IS NULL
    AND (
      (NOW() AT TIME ZONE 'Europe/Minsk')::time >= '22:30:00'::time
      OR NOW() - started_at >= INTERVAL '13 hours'
    );

  UPDATE seller_breaks
  SET ended_at = (SELECT ss.ended_at FROM seller_shifts ss WHERE ss.id = seller_breaks.shift_id)
  WHERE seller_breaks.ended_at IS NULL
    AND EXISTS (
      SELECT 1 FROM seller_shifts ss
      WHERE ss.id = seller_breaks.shift_id
        AND ss.ended_at IS NOT NULL
    );
END;
$$;
