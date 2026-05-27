
-- 1. Faculty: require authentication to read
DROP POLICY IF EXISTS "Faculty readable by all" ON public.faculty;
CREATE POLICY "Authenticated read faculty"
  ON public.faculty FOR SELECT
  TO authenticated
  USING (true);

-- 2. Avatars: allow users to delete their own avatar files
DROP POLICY IF EXISTS "Users delete own avatar" ON storage.objects;
CREATE POLICY "Users delete own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- 3. Harden is_fee_manager: also require faculty role
CREATE OR REPLACE FUNCTION public.is_fee_manager(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    public.has_role(_user_id, 'admin'::app_role)
    OR (
      public.has_role(_user_id, 'faculty'::app_role)
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.user_id = _user_id
          AND p.employee_id IN ('FAC003','FAC008')
      )
    )
$function$;

-- 4. Realtime: remove sensitive tables from broadcast publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime DROP TABLE public.login_requests;
