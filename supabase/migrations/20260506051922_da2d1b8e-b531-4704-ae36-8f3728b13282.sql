DROP VIEW IF EXISTS public.profiles_directory;

CREATE VIEW public.profiles_directory
WITH (security_invoker = true) AS
SELECT user_id, full_name, avatar_url, roll_number, employee_id,
       branch, semester, section, course, year, bio
FROM public.profiles;

GRANT SELECT ON public.profiles_directory TO authenticated;

-- Allow authenticated users to read non-sensitive directory fields via a separate policy on profiles
CREATE POLICY "Authenticated read directory fields"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Wait — that re-opens the hole. Instead, drop and reissue narrowly using column privileges.
DROP POLICY "Authenticated read directory fields" ON public.profiles;