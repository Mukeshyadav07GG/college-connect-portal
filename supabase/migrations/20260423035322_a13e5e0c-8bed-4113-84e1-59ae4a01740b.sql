-- Atomic, server-side validated fee update
CREATE OR REPLACE FUNCTION public.update_student_fee(
  _student_id uuid,
  _total_fee numeric,
  _paid_amount numeric
)
RETURNS TABLE(total_fee numeric, paid_amount numeric, remaining_amount numeric, payment_diff numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _prev_paid numeric := 0;
BEGIN
  -- Authorization: must be a fee manager
  IF NOT public.is_fee_manager(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  -- Validation
  IF _total_fee IS NULL OR _paid_amount IS NULL THEN
    RAISE EXCEPTION 'Total and paid are required';
  END IF;
  IF _total_fee < 0 OR _paid_amount < 0 THEN
    RAISE EXCEPTION 'Amounts must be non-negative';
  END IF;
  IF _paid_amount > _total_fee THEN
    RAISE EXCEPTION 'Paid amount (%) cannot exceed total fee (%)', _paid_amount, _total_fee;
  END IF;

  -- Lock + read previous (if any)
  SELECT sf.paid_amount INTO _prev_paid
  FROM public.student_fees sf
  WHERE sf.student_id = _student_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.student_fees (student_id, total_fee, paid_amount, updated_by)
    VALUES (_student_id, _total_fee, _paid_amount, auth.uid());
    _prev_paid := 0;
  ELSE
    -- Never allow paid to decrease (prevents accidental rollback / refund via UI)
    IF _paid_amount < _prev_paid THEN
      RAISE EXCEPTION 'Paid amount cannot decrease (previous: %, new: %)', _prev_paid, _paid_amount;
    END IF;

    UPDATE public.student_fees
    SET total_fee = _total_fee,
        paid_amount = _paid_amount,
        updated_by = auth.uid(),
        updated_at = now()
    WHERE student_id = _student_id;
  END IF;

  RETURN QUERY SELECT
    _total_fee,
    _paid_amount,
    GREATEST(_total_fee - _paid_amount, 0) AS remaining_amount,
    GREATEST(_paid_amount - _prev_paid, 0) AS payment_diff;
END;
$$;

-- Tighten manage policies (drop & recreate to be explicit)
DROP POLICY IF EXISTS "Fee managers manage fees" ON public.student_fees;
CREATE POLICY "Only fee managers modify fees"
  ON public.student_fees FOR ALL
  USING (public.is_fee_manager(auth.uid()))
  WITH CHECK (public.is_fee_manager(auth.uid()));

DROP POLICY IF EXISTS "Fee managers manage documents" ON public.student_documents;
CREATE POLICY "Only fee managers modify documents"
  ON public.student_documents FOR ALL
  USING (public.is_fee_manager(auth.uid()))
  WITH CHECK (public.is_fee_manager(auth.uid()));

-- Seed sample fee data (idempotent via ON CONFLICT)
INSERT INTO public.student_fees (student_id, total_fee, paid_amount) VALUES
  ('7c927390-2e67-4d30-a03b-f7cc9b24ef9a', 85000, 50000),
  ('ef8c2c87-8d44-41fe-8ea3-241662f9e930', 85000, 85000),
  ('ea0e9cd6-3f8d-400a-899a-8d9a744ab607', 85000, 30000),
  ('23e4c1f2-1958-4b45-bb89-0af0ab752aff', 85000, 0),
  ('a4013eb4-0041-4f93-a1d3-7345940ccce3', 85000, 60000),
  ('ecab5979-6bca-41a9-a8bf-192e6925c464', 85000, 42500),
  ('bea9807c-c8ed-4b9f-8bc4-7d3e94fe3dab', 85000, 75000),
  ('6a358e6f-fb97-4109-942d-a7955a0eb1e9', 85000, 25000)
ON CONFLICT (student_id) DO NOTHING;

-- Seed a sample document for the first student
INSERT INTO public.student_documents (student_id, title, file_url, type)
SELECT '7c927390-2e67-4d30-a03b-f7cc9b24ef9a',
       'Bonafide Certificate (Sample)',
       'https://www.africau.edu/images/default/sample.pdf',
       'document'
WHERE NOT EXISTS (
  SELECT 1 FROM public.student_documents
  WHERE student_id='7c927390-2e67-4d30-a03b-f7cc9b24ef9a' AND title LIKE 'Bonafide Certificate%'
);