
-- Table for button presses
CREATE TABLE public.button_presses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sector INTEGER NOT NULL CHECK (sector BETWEEN 0 AND 3),
  people_count INTEGER NOT NULL,
  pressed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.button_presses ENABLE ROW LEVEL SECURITY;

-- Users can only insert their own presses
CREATE POLICY "Users can insert own presses"
ON public.button_presses FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can read their own presses
CREATE POLICY "Users can read own presses"
ON public.button_presses FOR SELECT
USING (auth.uid() = user_id);

-- Index for fast queries by user and date
CREATE INDEX idx_button_presses_user_date ON public.button_presses (user_id, pressed_at DESC);
