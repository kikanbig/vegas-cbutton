
-- 1. Add has_role check inside SECURITY DEFINER admin functions
CREATE OR REPLACE FUNCTION public.admin_get_total_stats()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;
  RETURN (
    SELECT json_build_object(
      'totalClients', COUNT(*)::int,
      'totalPeople', COALESCE(SUM(people_count), 0)::int,
      'avgPeoplePerClient', CASE WHEN COUNT(*) > 0 THEN ROUND(SUM(people_count)::numeric / COUNT(*), 2) ELSE 0 END
    )
    FROM button_presses
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_daily_stats()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.date), '[]'::json)
    FROM (
      SELECT
        (pressed_at AT TIME ZONE 'Europe/Minsk')::date::text AS date,
        COUNT(*)::int AS clients,
        SUM(people_count)::int AS people
      FROM button_presses
      GROUP BY 1
      ORDER BY 1
    ) t
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_monthly_stats()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.month), '[]'::json)
    FROM (
      SELECT
        to_char((pressed_at AT TIME ZONE 'Europe/Minsk'), 'YYYY-MM') AS month,
        COUNT(*)::int AS clients,
        SUM(people_count)::int AS people
      FROM button_presses
      GROUP BY 1
      ORDER BY 1
    ) t
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_seller_stats()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
    FROM (
      SELECT
        bp.user_id,
        COALESCE(p.full_name, '—') AS name,
        COALESCE(p.company, '—') AS company,
        COUNT(*)::int AS total_clients,
        SUM(bp.people_count)::int AS total_people,
        COUNT(DISTINCT (bp.pressed_at AT TIME ZONE 'Europe/Minsk')::date)::int AS days_active
      FROM button_presses bp
      LEFT JOIN profiles p ON p.user_id = bp.user_id
      GROUP BY bp.user_id, p.full_name, p.company
      ORDER BY total_clients DESC
    ) t
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_funnel_stats()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;
  RETURN (
    WITH
    totals AS (
      SELECT
        (SELECT COUNT(*) FROM button_presses)::int AS clients,
        (SELECT COUNT(*) FROM client_consultations)::int AS consultations,
        (SELECT COUNT(*) FROM client_consultations WHERE outcome = 'proposal_sent')::int AS proposals,
        (SELECT COUNT(*) FROM client_consultations WHERE outcome = 'project_offered')::int AS projects,
        (SELECT COUNT(*) FROM client_consultations WHERE outcome = 'refused')::int AS refusals,
        (SELECT COUNT(*) FROM client_deals)::int AS deals
    ),
    by_type AS (
      SELECT consultation_type::text AS k, COUNT(*)::int AS v
      FROM client_consultations GROUP BY 1
    ),
    by_outcome AS (
      SELECT outcome::text AS k, COUNT(*)::int AS v
      FROM client_consultations GROUP BY 1
    ),
    by_reason AS (
      SELECT refusal_reason::text AS k, COUNT(*)::int AS v
      FROM client_consultations WHERE refusal_reason IS NOT NULL GROUP BY 1
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
      FROM button_presses bp
      LEFT JOIN profiles p ON p.user_id = bp.user_id
      LEFT JOIN client_consultations cc ON cc.button_press_id = bp.id
      LEFT JOIN client_deals cd ON cd.button_press_id = bp.id
      GROUP BY bp.user_id, p.full_name
      ORDER BY clients DESC
    )
    SELECT json_build_object(
      'totals', (SELECT row_to_json(totals) FROM totals),
      'byType', (SELECT COALESCE(json_object_agg(k, v), '{}'::json) FROM by_type),
      'byOutcome', (SELECT COALESCE(json_object_agg(k, v), '{}'::json) FROM by_outcome),
      'byReason', (SELECT COALESCE(json_object_agg(k, v), '{}'::json) FROM by_reason),
      'bySeller', (SELECT COALESCE(json_agg(row_to_json(by_seller)), '[]'::json) FROM by_seller)
    )
  );
END;
$$;

-- 2. Revoke EXECUTE on admin functions from anon/authenticated/public
REVOKE EXECUTE ON FUNCTION public.admin_get_total_stats() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_get_daily_stats() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_get_monthly_stats() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_get_seller_stats() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_get_funnel_stats() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_close_stale_shifts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_total_stats() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_daily_stats() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_monthly_stats() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_seller_stats() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_funnel_stats() TO service_role;
GRANT EXECUTE ON FUNCTION public.auto_close_stale_shifts() TO service_role;

-- 3. Add people_count validation constraint
ALTER TABLE public.button_presses
  DROP CONSTRAINT IF EXISTS valid_people_count;
ALTER TABLE public.button_presses
  ADD CONSTRAINT valid_people_count CHECK (people_count BETWEEN 1 AND 4);

-- 4. Lock down user_roles: explicit restrictive policy on UPDATE so it can never be added permissively
DROP POLICY IF EXISTS "Deny all updates on user_roles" ON public.user_roles;
CREATE POLICY "Deny all updates on user_roles"
  ON public.user_roles
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);

-- 5. Lock down custom_otps: explicit deny policies for any client access (service_role bypasses RLS)
DROP POLICY IF EXISTS "Deny all access to custom_otps" ON public.custom_otps;
CREATE POLICY "Deny all access to custom_otps"
  ON public.custom_otps
  AS RESTRICTIVE
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);
