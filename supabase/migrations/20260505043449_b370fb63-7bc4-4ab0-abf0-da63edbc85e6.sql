
CREATE TABLE IF NOT EXISTS public.subject_code_map (
  short_code text PRIMARY KEY,
  syllabus_code text NOT NULL,
  lab_code text
);

ALTER TABLE public.subject_code_map ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Subject map readable by all" ON public.subject_code_map;
CREATE POLICY "Subject map readable by all" ON public.subject_code_map FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage subject map" ON public.subject_code_map;
CREATE POLICY "Admins manage subject map" ON public.subject_code_map FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.subject_code_map (short_code, syllabus_code, lab_code) VALUES
  ('SE',   'KCS-601', 'KCS-653'),
  ('CD',   'KCS-602', 'KCS-652'),
  ('CN',   'KCS-603', 'KCS-651'),
  ('DC',   'KCS-062', NULL),
  ('SPM',  'KCS-070', NULL),
  ('EITK', 'KOE-068', NULL),
  ('PDP',  'NC-PDP',  NULL)
ON CONFLICT (short_code) DO UPDATE
  SET syllabus_code = EXCLUDED.syllabus_code, lab_code = EXCLUDED.lab_code;

CREATE OR REPLACE FUNCTION public.sync_syllabus_faculty_from_timetable()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _updated int := 0;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT (has_role(auth.uid(),'faculty') OR has_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501';
  END IF;

  WITH src AS (
    SELECT m.syllabus_code AS code, MAX(t.faculty_name) AS faculty_name
      FROM public.timetable t
      JOIN public.subject_code_map m ON UPPER(t.subject_code) = m.short_code
     WHERE t.faculty_name IS NOT NULL
     GROUP BY m.syllabus_code
    UNION ALL
    SELECT m.lab_code AS code, MAX(t.faculty_name) AS faculty_name
      FROM public.timetable t
      JOIN public.subject_code_map m ON UPPER(t.subject_code) = m.short_code
     WHERE t.faculty_name IS NOT NULL AND m.lab_code IS NOT NULL
     GROUP BY m.lab_code
  )
  UPDATE public.subjects s
     SET faculty_name = src.faculty_name
    FROM src
   WHERE s.code = src.code AND COALESCE(s.faculty_name,'') <> COALESCE(src.faculty_name,'');

  GET DIAGNOSTICS _updated = ROW_COUNT;
  RETURN _updated;
END;
$$;

SELECT public.sync_syllabus_faculty_from_timetable();
