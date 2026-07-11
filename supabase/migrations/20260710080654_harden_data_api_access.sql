-- Explicitly expose only the operations the signed-in app needs. RLS remains
-- the row-level authorization boundary for every table.
GRANT SELECT ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.oauth_tokens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.unsubscribe_jobs TO authenticated;

-- The signup helper runs only as an auth.users trigger. It must not also be a
-- callable SECURITY DEFINER endpoint through PostgREST/RPC.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Scope policies explicitly to signed-in users and use scalar subqueries for
-- auth.uid() so Postgres can cache the value once per statement.
DROP POLICY users_select_own ON public.users;
CREATE POLICY users_select_own ON public.users
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = id);

DROP POLICY oauth_tokens_own ON public.oauth_tokens;
CREATE POLICY oauth_tokens_own ON public.oauth_tokens
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY subscriptions_own ON public.subscriptions;
CREATE POLICY subscriptions_own ON public.subscriptions
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY unsubscribe_jobs_own ON public.unsubscribe_jobs;
CREATE POLICY unsubscribe_jobs_own ON public.unsubscribe_jobs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.subscriptions s
      WHERE s.id = unsubscribe_jobs.subscription_id
        AND s.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.subscriptions s
      WHERE s.id = unsubscribe_jobs.subscription_id
        AND s.user_id = (SELECT auth.uid())
    )
  );
