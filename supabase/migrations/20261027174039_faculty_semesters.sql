ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS semesters text[] NOT NULL DEFAULT '{}';
