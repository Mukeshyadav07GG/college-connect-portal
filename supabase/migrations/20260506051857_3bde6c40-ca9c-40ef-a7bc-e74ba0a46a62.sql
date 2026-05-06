-- 1) Fix handle_new_user: hardcode default role to 'student'; never trust metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, roll_number, employee_id, branch, semester, section)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    NEW.email,
    NEW.raw_user_meta_data->>'roll_number',
    NEW.raw_user_meta_data->>'employee_id',
    NEW.raw_user_meta_data->>'branch',
    NEW.raw_user_meta_data->>'semester',
    NEW.raw_user_meta_data->>'section'
  );
  -- Always default to 'student'. Elevation only via admin UI / service role.
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$function$;

-- 2) Profiles: tighten SELECT to owner + faculty/admin; expose limited directory view
DROP POLICY IF EXISTS "Profiles viewable by authenticated" ON public.profiles;

CREATE POLICY "Users view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Faculty and admin view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(),'faculty'::app_role) OR has_role(auth.uid(),'admin'::app_role));

-- Limited directory (no aadhar/dob/phone/email) for general authenticated lookups (chat, assignments, etc.)
CREATE OR REPLACE VIEW public.profiles_directory
WITH (security_invoker = false) AS
SELECT user_id, full_name, avatar_url, roll_number, employee_id,
       branch, semester, section, course, year, bio
FROM public.profiles;

REVOKE ALL ON public.profiles_directory FROM PUBLIC;
GRANT SELECT ON public.profiles_directory TO authenticated;

-- 3) Prevent employee_id / roll_number self-escalation via profile update
CREATE OR REPLACE FUNCTION public.prevent_privileged_profile_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT has_role(auth.uid(),'admin'::app_role) THEN
    NEW.employee_id := OLD.employee_id;
    NEW.roll_number := OLD.roll_number;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_privileged_profile_changes_trg ON public.profiles;
CREATE TRIGGER prevent_privileged_profile_changes_trg
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_privileged_profile_changes();

-- 4) Chat messages: split UPDATE so recipients can't rewrite content
DROP POLICY IF EXISTS "Users update own messages" ON public.chat_messages;

CREATE POLICY "Sender updates own messages"
  ON public.chat_messages FOR UPDATE
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipient marks read"
  ON public.chat_messages FOR UPDATE
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id AND read = true);

-- 5) Remove active_sessions from realtime publication (prevents broadcasting session tokens)
ALTER PUBLICATION supabase_realtime DROP TABLE public.active_sessions;

-- 6) Make student-docs bucket private; replace public read with scoped policies
UPDATE storage.buckets SET public = false WHERE id = 'student-docs';

DROP POLICY IF EXISTS "Public read student-docs" ON storage.objects;

CREATE POLICY "Owner reads own student-docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'student-docs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Fee managers read student-docs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'student-docs' AND public.is_fee_manager(auth.uid()));