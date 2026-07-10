
-- 1) Restrict subjects SELECT to authenticated
DROP POLICY IF EXISTS "Subjects readable by all" ON public.subjects;
CREATE POLICY "Authenticated read subjects" ON public.subjects
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.subjects FROM anon;

-- 2) Restrict subject_code_map SELECT to authenticated
DROP POLICY IF EXISTS "Subject map readable by all" ON public.subject_code_map;
CREATE POLICY "Authenticated read subject map" ON public.subject_code_map
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.subject_code_map FROM anon;

-- 3) Prevent faculty from reading student aadhar via column-level revoke.
--    Admin/service_role still has full access (SECURITY DEFINER functions bypass).
REVOKE SELECT (aadhar), UPDATE (aadhar) ON public.profiles FROM authenticated;

-- 4) Remove syllabus_problems from realtime broadcast (student uploads shouldn't stream)
ALTER PUBLICATION supabase_realtime DROP TABLE public.syllabus_problems;

-- 5) Storage: require path ownership on syllabus-problems uploads
DROP POLICY IF EXISTS "Students upload syllabus-problems" ON storage.objects;
CREATE POLICY "Students upload syllabus-problems own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'syllabus-problems'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
