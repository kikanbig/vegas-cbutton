
-- Table to map custom 6-digit codes to Supabase's 8-digit OTPs
CREATE TABLE public.custom_otps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  custom_code TEXT NOT NULL,
  original_otp TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 hour'),
  used BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS but no public policies (only service role accesses this)
ALTER TABLE public.custom_otps ENABLE ROW LEVEL SECURITY;

-- Index for fast lookup
CREATE INDEX idx_custom_otps_email_code ON public.custom_otps (email, custom_code);

-- Auto-cleanup old OTPs
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.custom_otps WHERE expires_at < now() OR used = true;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_cleanup_otps
AFTER INSERT ON public.custom_otps
FOR EACH STATEMENT
EXECUTE FUNCTION public.cleanup_expired_otps();
