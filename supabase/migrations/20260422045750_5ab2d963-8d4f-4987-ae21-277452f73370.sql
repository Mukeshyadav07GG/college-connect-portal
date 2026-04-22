-- Track the currently approved device per user
CREATE TABLE public.active_sessions (
  user_id UUID PRIMARY KEY,
  session_token TEXT NOT NULL,
  device_info TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own active session"
  ON public.active_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users manage their own active session"
  ON public.active_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Pending login approval requests
CREATE TYPE public.login_request_status AS ENUM ('pending','approved','denied','expired');

CREATE TABLE public.login_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  requesting_token TEXT NOT NULL,
  device_info TEXT,
  user_agent TEXT,
  ip_hint TEXT,
  status public.login_request_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ
);

CREATE INDEX idx_login_requests_user_status ON public.login_requests(user_id, status);

ALTER TABLE public.login_requests ENABLE ROW LEVEL SECURITY;

-- Old device sees pending requests for itself
CREATE POLICY "Users see their own login requests"
  ON public.login_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Old device decides
CREATE POLICY "Users decide their own login requests"
  ON public.login_requests FOR UPDATE
  USING (auth.uid() = user_id);

-- New device polls by requesting_token (no auth yet) — handled via edge function with service role.
-- No INSERT policy: only the edge function (service role) inserts requests.

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.login_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.active_sessions;

-- Updated-at trigger
CREATE TRIGGER update_active_sessions_updated_at
  BEFORE UPDATE ON public.active_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();