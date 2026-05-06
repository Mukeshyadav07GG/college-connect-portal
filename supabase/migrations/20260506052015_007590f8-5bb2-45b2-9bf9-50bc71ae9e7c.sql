DROP VIEW IF EXISTS public.profiles_directory;

CREATE OR REPLACE FUNCTION public.get_profile_directory()
RETURNS TABLE (
  user_id uuid,
  full_name text,
  avatar_url text,
  roll_number text,
  employee_id text,
  branch text,
  semester text,
  section text,
  course text,
  year text,
  bio text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id, full_name, avatar_url, roll_number, employee_id,
         branch, semester, section, course, year, bio
  FROM public.profiles
  WHERE auth.uid() IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.get_profile_directory() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_profile_directory() TO authenticated;