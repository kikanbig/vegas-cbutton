
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_otps() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_single_open_shift() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_single_open_break() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_client_consultation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_assign_admin_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
-- has_role is needed by RLS policies for signed-in users
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
