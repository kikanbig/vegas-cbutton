
CREATE OR REPLACE FUNCTION public.admin_get_funnel_stats()
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_from timestamptz := (timestamp '2026-07-01 00:00:00' AT TIME ZONE 'Europe/Minsk');
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;
  RETURN (
    WITH
    bp AS (
      SELECT * FROM button_presses WHERE pressed_at >= v_from
    ),
    cc AS (
      SELECT c.*
      FROM client_consultations c
      JOIN button_presses b ON b.id = c.button_press_id
      WHERE b.pressed_at >= v_from
    ),
    cd AS (
      SELECT d.*
      FROM client_deals d
      JOIN button_presses b ON b.id = d.button_press_id
      WHERE b.pressed_at >= v_from
    ),
    totals AS (
      SELECT
        (SELECT COUNT(*) FROM bp)::int AS clients,
        (SELECT COUNT(*) FROM cc)::int AS consultations,
        (SELECT COUNT(*) FROM cc WHERE outcome = 'proposal_sent')::int AS proposals,
        (SELECT COUNT(*) FROM cc WHERE outcome = 'project_offered')::int AS projects,
        (SELECT COUNT(*) FROM cc WHERE outcome = 'refused')::int AS refusals,
        (SELECT COUNT(*) FROM cd)::int AS deals
    ),
    by_type AS (
      SELECT consultation_type::text AS k, COUNT(*)::int AS v
      FROM cc GROUP BY 1
    ),
    by_outcome AS (
      SELECT outcome::text AS k, COUNT(*)::int AS v
      FROM cc GROUP BY 1
    ),
    by_reason AS (
      SELECT refusal_reason::text AS k, COUNT(*)::int AS v
      FROM cc WHERE refusal_reason IS NOT NULL GROUP BY 1
    ),
    by_seller AS (
      SELECT
        bp.user_id,
        COALESCE(p.full_name, '—') AS name,
        COUNT(DISTINCT bp.id)::int AS clients,
        COUNT(DISTINCT cc.id)::int AS consultations,
        COUNT(DISTINCT cc.id) FILTER (WHERE cc.outcome = 'proposal_sent')::int AS proposals,
        COUNT(DISTINCT cc.id) FILTER (WHERE cc.outcome = 'project_offered')::int AS projects,
        COUNT(DISTINCT cc.id) FILTER (WHERE cc.outcome = 'refused')::int AS refusals,
        COUNT(DISTINCT cd.id)::int AS deals
      FROM bp
      LEFT JOIN profiles p ON p.user_id = bp.user_id
      LEFT JOIN cc ON cc.button_press_id = bp.id
      LEFT JOIN cd ON cd.button_press_id = bp.id
      GROUP BY bp.user_id, p.full_name
      ORDER BY clients DESC
    )
    SELECT json_build_object(
      'totals', (SELECT row_to_json(totals) FROM totals),
      'byType', (SELECT COALESCE(json_object_agg(k, v), '{}'::json) FROM by_type),
      'byOutcome', (SELECT COALESCE(json_object_agg(k, v), '{}'::json) FROM by_outcome),
      'byReason', (SELECT COALESCE(json_object_agg(k, v), '{}'::json) FROM by_reason),
      'bySeller', (SELECT COALESCE(json_agg(row_to_json(by_seller)), '[]'::json) FROM by_seller),
      'periodFrom', to_char(v_from AT TIME ZONE 'Europe/Minsk', 'YYYY-MM-DD')
    )
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_get_funnel_stats() TO authenticated;
