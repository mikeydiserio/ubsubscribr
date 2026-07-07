-- Security hardening + schema fixes.
--
-- 1. Existing oauth_tokens rows were stored in plaintext (and mostly never
--    saved at all, because the upserts referenced conflict targets that had
--    no unique constraint). Wipe them; users reconnect and get encrypted
--    tokens. This is destructive by design.
DELETE FROM oauth_tokens;

-- 2. Unique constraints required by the app's upserts.
ALTER TABLE oauth_tokens
  ADD CONSTRAINT oauth_tokens_user_provider_key UNIQUE (user_id, provider);

ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_user_from_key UNIQUE (user_id, from_address);

-- 3. Persist the actual unsubscribe target, not just a description string.
ALTER TABLE subscriptions
  ADD COLUMN unsubscribe_url TEXT,
  ADD COLUMN unsubscribe_mailto TEXT;

-- 4. Create public.users rows from auth signups (any provider), instead of
--    relying on app-level inserts that RLS would block for unconfirmed
--    email signups.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, provider)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, 'unknown'),
    CASE COALESCE(NEW.raw_app_meta_data->>'provider', 'email')
      WHEN 'azure' THEN 'microsoft'
      WHEN 'google' THEN 'google'
      WHEN 'apple' THEN 'apple'
      ELSE 'email'
    END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill rows for auth users created before this trigger existed.
INSERT INTO public.users (id, email, provider)
SELECT
  au.id,
  COALESCE(au.email, 'unknown'),
  CASE COALESCE(au.raw_app_meta_data->>'provider', 'email')
    WHEN 'azure' THEN 'microsoft'
    WHEN 'google' THEN 'google'
    WHEN 'apple' THEN 'apple'
    ELSE 'email'
  END
FROM auth.users au
ON CONFLICT (id) DO NOTHING;

-- 5. Row Level Security. Without this, every table is readable by anyone
--    holding the publishable key that ships to the browser.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE unsubscribe_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_select_own ON users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY oauth_tokens_own ON oauth_tokens
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY subscriptions_own ON subscriptions
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY unsubscribe_jobs_own ON unsubscribe_jobs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM subscriptions s
      WHERE s.id = unsubscribe_jobs.subscription_id
        AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM subscriptions s
      WHERE s.id = unsubscribe_jobs.subscription_id
        AND s.user_id = auth.uid()
    )
  );
