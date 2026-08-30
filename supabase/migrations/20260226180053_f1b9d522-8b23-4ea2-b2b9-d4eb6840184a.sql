
-- Table to track seller on-expo/break shifts
CREATE TABLE public.seller_shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.seller_shifts ENABLE ROW LEVEL SECURITY;

-- Users can insert their own shifts
CREATE POLICY "Users can insert own shifts" ON public.seller_shifts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own shifts
CREATE POLICY "Users can update own shifts" ON public.seller_shifts
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can read their own shifts
CREATE POLICY "Users can read own shifts" ON public.seller_shifts
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can read all shifts
CREATE POLICY "Admins can read all shifts" ON public.seller_shifts
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for fast lookups
CREATE INDEX idx_seller_shifts_user_id ON public.seller_shifts (user_id);
CREATE INDEX idx_seller_shifts_started_at ON public.seller_shifts (started_at);
