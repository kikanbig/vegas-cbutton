
-- 1. Total stats (clients, people, avg)
CREATE OR REPLACE FUNCTION public.admin_get_total_stats()
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT json_build_object(
    'totalClients', COUNT(*)::int,
    'totalPeople', COALESCE(SUM(people_count), 0)::int,
    'avgPeoplePerClient', CASE WHEN COUNT(*) > 0 THEN ROUND(SUM(people_count)::numeric / COUNT(*), 2) ELSE 0 END
  )
  FROM button_presses;
$$;

-- 2. Daily aggregation (UTC+3)
CREATE OR REPLACE FUNCTION public.admin_get_daily_stats()
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.date), '[]'::json)
  FROM (
    SELECT
      (pressed_at AT TIME ZONE 'Europe/Minsk')::date::text AS date,
      COUNT(*)::int AS clients,
      SUM(people_count)::int AS people
    FROM button_presses
    GROUP BY 1
    ORDER BY 1
  ) t;
$$;

-- 3. Monthly aggregation (UTC+3)
CREATE OR REPLACE FUNCTION public.admin_get_monthly_stats()
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.month), '[]'::json)
  FROM (
    SELECT
      to_char((pressed_at AT TIME ZONE 'Europe/Minsk'), 'YYYY-MM') AS month,
      COUNT(*)::int AS clients,
      SUM(people_count)::int AS people
    FROM button_presses
    GROUP BY 1
    ORDER BY 1
  ) t;
$$;

-- 4. Per-seller aggregation
CREATE OR REPLACE FUNCTION public.admin_get_seller_stats()
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  ) t;
$$;
