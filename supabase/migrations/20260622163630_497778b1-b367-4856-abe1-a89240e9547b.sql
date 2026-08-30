
-- Enums
CREATE TYPE public.consultation_type AS ENUM ('express', 'deep');
CREATE TYPE public.consultation_outcome AS ENUM ('proposal_sent', 'project_offered', 'refused');
CREATE TYPE public.refusal_reason AS ENUM ('price', 'product', 'other');

-- client_consultations
CREATE TABLE public.client_consultations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  button_press_id UUID NOT NULL UNIQUE REFERENCES public.button_presses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  consultation_type public.consultation_type NOT NULL,
  outcome public.consultation_outcome NOT NULL,
  refusal_reason public.refusal_reason,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_consultations TO authenticated;
GRANT ALL ON public.client_consultations TO service_role;

ALTER TABLE public.client_consultations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers manage their own consultations"
  ON public.client_consultations
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_client_consultations_user ON public.client_consultations(user_id);
CREATE INDEX idx_client_consultations_recorded ON public.client_consultations(recorded_at);

-- Validation trigger
CREATE OR REPLACE FUNCTION public.validate_client_consultation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.outcome = 'project_offered' AND NEW.consultation_type <> 'deep' THEN
    RAISE EXCEPTION 'Outcome project_offered is only valid for deep consultations';
  END IF;
  IF NEW.outcome = 'refused' AND NEW.refusal_reason IS NULL THEN
    RAISE EXCEPTION 'refusal_reason is required when outcome = refused';
  END IF;
  IF NEW.outcome <> 'refused' AND NEW.refusal_reason IS NOT NULL THEN
    NEW.refusal_reason := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_client_consultation
  BEFORE INSERT OR UPDATE ON public.client_consultations
  FOR EACH ROW EXECUTE FUNCTION public.validate_client_consultation();

CREATE TRIGGER trg_client_consultations_updated_at
  BEFORE UPDATE ON public.client_consultations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- client_deals (structure only, no UI yet)
CREATE TABLE public.client_deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  button_press_id UUID NOT NULL UNIQUE REFERENCES public.button_presses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  closed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_deals TO authenticated;
GRANT ALL ON public.client_deals TO service_role;

ALTER TABLE public.client_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers manage their own deals"
  ON public.client_deals
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_client_deals_user ON public.client_deals(user_id);
CREATE INDEX idx_client_deals_closed ON public.client_deals(closed_at);

CREATE TRIGGER trg_client_deals_updated_at
  BEFORE UPDATE ON public.client_deals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Aggregation function for admin funnel stats
CREATE OR REPLACE FUNCTION public.admin_get_funnel_stats()
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
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
  );
$$;
