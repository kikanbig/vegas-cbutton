
-- Table for breaks within a shift
CREATE TABLE public.seller_breaks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shift_id uuid NOT NULL REFERENCES public.seller_shifts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_seller_breaks_shift_id ON public.seller_breaks(shift_id);
CREATE INDEX idx_seller_breaks_user_id ON public.seller_breaks(user_id);

-- RLS
ALTER TABLE public.seller_breaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own breaks"
  ON public.seller_breaks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own breaks"
  ON public.seller_breaks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read own breaks"
  ON public.seller_breaks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all breaks"
  ON public.seller_breaks FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));
