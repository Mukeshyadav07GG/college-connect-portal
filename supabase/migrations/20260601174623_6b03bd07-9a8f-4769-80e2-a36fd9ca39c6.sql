
-- 1. Restrict anonymous SELECT on user-only tables
DROP POLICY IF EXISTS "Announcements readable by all" ON public.announcements;
CREATE POLICY "Announcements readable by authenticated"
  ON public.announcements FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Timetable readable by all" ON public.timetable;
CREATE POLICY "Timetable readable by authenticated"
  ON public.timetable FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Events readable by all" ON public.events;
CREATE POLICY "Events readable by authenticated"
  ON public.events FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Notes readable by all" ON public.subject_notes;
CREATE POLICY "Notes readable by authenticated"
  ON public.subject_notes FOR SELECT TO authenticated USING (true);

-- 2. Faculty mobile -> column-level revoke (admins use RPC below)
REVOKE SELECT ON public.faculty FROM anon, authenticated;
GRANT SELECT (id, name, role, subjects, description, email, contact_email,
              room_no, available_time, experience, qualification, avatar_url, created_at)
  ON public.faculty TO authenticated;
GRANT SELECT (id, name, role, subjects, description, email, contact_email,
              room_no, available_time, experience, qualification, avatar_url, created_at)
  ON public.faculty TO anon;
-- service_role keeps full access via default grants on its membership

CREATE OR REPLACE FUNCTION public.admin_list_faculty()
RETURNS SETOF public.faculty
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.faculty
  WHERE public.has_role(auth.uid(), 'admin'::public.app_role)
  ORDER BY name;
$$;
REVOKE ALL ON FUNCTION public.admin_list_faculty() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_faculty() TO authenticated;

-- 3. Syllabus-problems bucket -> private + scoped read
UPDATE storage.buckets SET public = false WHERE id = 'syllabus-problems';

DROP POLICY IF EXISTS "Public read syllabus-problems" ON storage.objects;

CREATE POLICY "Owner/faculty/admin read syllabus-problems"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'syllabus-problems' AND (
      owner = auth.uid()
      OR public.has_role(auth.uid(), 'faculty'::public.app_role)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

-- Migrate existing public-URL rows to bucket-relative paths so signed URLs can be generated.
UPDATE public.syllabus_problems
   SET file_url = regexp_replace(file_url, '^.*/syllabus-problems/', '')
 WHERE file_url ~ '/syllabus-problems/';
