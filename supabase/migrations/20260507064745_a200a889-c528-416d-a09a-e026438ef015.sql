ALTER TABLE public.faculty
  ADD COLUMN IF NOT EXISTS experience text,
  ADD COLUMN IF NOT EXISTS qualification text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS mobile text,
  ADD COLUMN IF NOT EXISTS room_no text,
  ADD COLUMN IF NOT EXISTS available_time text;