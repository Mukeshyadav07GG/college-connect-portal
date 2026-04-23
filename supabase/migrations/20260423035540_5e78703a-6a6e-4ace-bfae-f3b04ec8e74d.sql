-- Per-unit progress
CREATE TABLE public.syllabus_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_code text NOT NULL,
  unit_number int NOT NULL CHECK (unit_number BETWEEN 1 AND 5),
  progress int NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subject_code, unit_number)
);
ALTER TABLE public.syllabus_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Units readable by authenticated"
  ON public.syllabus_units FOR SELECT TO authenticated USING (true);

CREATE POLICY "Faculty/admin manage units"
  ON public.syllabus_units FOR ALL
  USING (public.has_role(auth.uid(),'faculty') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'faculty') OR public.has_role(auth.uid(),'admin'));

-- Student problems
CREATE TABLE public.syllabus_problems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  subject_code text NOT NULL,
  unit_number int NOT NULL CHECK (unit_number BETWEEN 1 AND 5),
  title text NOT NULL,
  file_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.syllabus_problems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own problems"
  ON public.syllabus_problems FOR SELECT
  USING (auth.uid() = student_id);
CREATE POLICY "Faculty/admin view all problems"
  ON public.syllabus_problems FOR SELECT
  USING (public.has_role(auth.uid(),'faculty') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Students upload own problems"
  ON public.syllabus_problems FOR INSERT
  WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students delete own problems"
  ON public.syllabus_problems FOR DELETE
  USING (auth.uid() = student_id);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('syllabus-problems', 'syllabus-problems', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read syllabus-problems"
  ON storage.objects FOR SELECT USING (bucket_id = 'syllabus-problems');
CREATE POLICY "Students upload syllabus-problems"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'syllabus-problems' AND auth.role() = 'authenticated');
CREATE POLICY "Owners delete syllabus-problems"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'syllabus-problems' AND owner = auth.uid());

-- RPC: validated progress update + auto-recalc subject completion
CREATE OR REPLACE FUNCTION public.update_unit_progress(
  _subject_code text,
  _unit_number int,
  _progress int
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _avg int;
BEGIN
  IF NOT (public.has_role(auth.uid(),'faculty') OR public.has_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501';
  END IF;
  IF _unit_number < 1 OR _unit_number > 5 THEN
    RAISE EXCEPTION 'Unit must be 1-5';
  END IF;
  _progress := GREATEST(0, LEAST(100, _progress));

  INSERT INTO public.syllabus_units (subject_code, unit_number, progress, updated_by)
  VALUES (_subject_code, _unit_number, _progress, auth.uid())
  ON CONFLICT (subject_code, unit_number)
  DO UPDATE SET progress = EXCLUDED.progress, updated_by = auth.uid(), updated_at = now();

  -- Recompute subject completion as average across 5 units (missing = 0)
  SELECT COALESCE(ROUND(SUM(progress)::numeric / 5)::int, 0) INTO _avg
  FROM public.syllabus_units WHERE subject_code = _subject_code;

  UPDATE public.subjects SET completion = _avg WHERE code = _subject_code;
  RETURN _avg;
END;
$$;

-- Enable realtime for live progress sync
ALTER PUBLICATION supabase_realtime ADD TABLE public.syllabus_units;
ALTER PUBLICATION supabase_realtime ADD TABLE public.syllabus_problems;