CREATE TABLE IF NOT EXISTS public.subject_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_code text NOT NULL,
  unit_number int,
  title text NOT NULL,
  file_path text NOT NULL,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subject_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Notes readable by all" ON public.subject_notes;
CREATE POLICY "Notes readable by all"
  ON public.subject_notes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Faculty/admin manage notes" ON public.subject_notes;
CREATE POLICY "Faculty/admin manage notes"
  ON public.subject_notes FOR ALL
  USING (has_role(auth.uid(), 'faculty'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'faculty'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

INSERT INTO storage.buckets (id, name, public)
VALUES ('subject-notes', 'subject-notes', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Notes files readable by authenticated" ON storage.objects;
CREATE POLICY "Notes files readable by authenticated"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'subject-notes');

DROP POLICY IF EXISTS "Faculty/admin upload notes" ON storage.objects;
CREATE POLICY "Faculty/admin upload notes"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'subject-notes'
    AND (has_role(auth.uid(), 'faculty'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  );

DROP POLICY IF EXISTS "Faculty/admin delete notes" ON storage.objects;
CREATE POLICY "Faculty/admin delete notes"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'subject-notes'
    AND (has_role(auth.uid(), 'faculty'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  );