
CREATE TABLE IF NOT EXISTS public.hostel_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL UNIQUE,
  hostel_name text NOT NULL,
  hostel_type text NOT NULL CHECK (hostel_type IN ('Boys','Girls')),
  room_no text NOT NULL,
  sharing integer NOT NULL DEFAULT 1,
  floor text,
  ac_type text NOT NULL DEFAULT 'Non-AC' CHECK (ac_type IN ('AC','Non-AC')),
  wifi boolean NOT NULL DEFAULT true,
  assigned_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hostel_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage hostel allocations"
ON public.hostel_allocations FOR ALL
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Students view own allocation"
ON public.hostel_allocations FOR SELECT
USING (auth.uid() = student_id);

CREATE TRIGGER update_hostel_allocations_updated_at
BEFORE UPDATE ON public.hostel_allocations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
