DROP VIEW IF EXISTS public.profiles_directory;

-- View owned by postgres; bypasses RLS but only exposes safe columns.
CREATE VIEW public.profiles_directory AS
SELECT user_id, full_name, avatar_url, roll_number, employee_id,
       branch, semester, section, course, year, bio
FROM public.profiles;

REVOKE ALL ON public.profiles_directory FROM PUBLIC, anon;
GRANT SELECT ON public.profiles_directory TO authenticated;