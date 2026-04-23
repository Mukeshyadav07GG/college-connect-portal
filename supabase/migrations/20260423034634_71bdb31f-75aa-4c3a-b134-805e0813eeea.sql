-- Create Aditi Gautam (Deputy Coordinator) faculty account
DO $$
DECLARE _uid uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'fac008@knmiet.local') THEN
    _uid := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', _uid, 'authenticated', 'authenticated',
      'fac008@knmiet.local', crypt('123456789', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name','Ms. Aditi Gautam','employee_id','FAC008','role','faculty'),
      now(), now(), '', '', '', ''
    );
  END IF;
END $$;

-- ============= FEES & DOCUMENTS MODULE =============

-- Coordinator role helper (Coordinator + Deputy + Admin)
CREATE OR REPLACE FUNCTION public.is_fee_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = _user_id
        AND p.employee_id IN ('FAC003','FAC008')
    )
$$;

-- Student fee records
CREATE TABLE public.student_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL UNIQUE,
  total_fee numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.student_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own fees"
  ON public.student_fees FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Fee managers view all fees"
  ON public.student_fees FOR SELECT
  USING (public.is_fee_manager(auth.uid()));

CREATE POLICY "Fee managers manage fees"
  ON public.student_fees FOR ALL
  USING (public.is_fee_manager(auth.uid()))
  WITH CHECK (public.is_fee_manager(auth.uid()));

CREATE TRIGGER update_student_fees_updated_at
  BEFORE UPDATE ON public.student_fees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Documents (uploads + auto receipts)
CREATE TABLE public.student_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid,
  title text NOT NULL,
  file_url text NOT NULL,
  type text NOT NULL DEFAULT 'document', -- 'document' | 'receipt'
  receipt_no text,
  amount numeric,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own documents"
  ON public.student_documents FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Fee managers view all documents"
  ON public.student_documents FOR SELECT
  USING (public.is_fee_manager(auth.uid()));

CREATE POLICY "Fee managers manage documents"
  ON public.student_documents FOR ALL
  USING (public.is_fee_manager(auth.uid()))
  WITH CHECK (public.is_fee_manager(auth.uid()));

-- Storage bucket for fees/documents/receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('student-docs', 'student-docs', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read student-docs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'student-docs');

CREATE POLICY "Fee managers upload student-docs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'student-docs' AND public.is_fee_manager(auth.uid()));

CREATE POLICY "Fee managers update student-docs"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'student-docs' AND public.is_fee_manager(auth.uid()));

CREATE POLICY "Fee managers delete student-docs"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'student-docs' AND public.is_fee_manager(auth.uid()));