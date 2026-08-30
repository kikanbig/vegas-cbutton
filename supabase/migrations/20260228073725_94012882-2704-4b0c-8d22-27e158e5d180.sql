
-- Prevent multiple open shifts per user: auto-close old ones
CREATE OR REPLACE FUNCTION public.validate_single_open_shift()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.ended_at IS NULL THEN
    UPDATE seller_shifts 
    SET ended_at = NOW() 
    WHERE user_id = NEW.user_id 
      AND ended_at IS NULL 
      AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER tr_validate_single_open_shift
  BEFORE INSERT ON public.seller_shifts
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_single_open_shift();

-- Prevent multiple open breaks per user: auto-close old ones
CREATE OR REPLACE FUNCTION public.validate_single_open_break()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.ended_at IS NULL THEN
    UPDATE seller_breaks 
    SET ended_at = NOW() 
    WHERE user_id = NEW.user_id 
      AND ended_at IS NULL 
      AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$function$
