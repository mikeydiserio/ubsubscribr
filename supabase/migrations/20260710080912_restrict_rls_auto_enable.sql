-- This SECURITY DEFINER event-trigger helper is internal database machinery,
-- not an application RPC endpoint. Event triggers execute without granting
-- client roles permission to call the underlying function directly.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
