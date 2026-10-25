ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS student_lat double precision,
  ADD COLUMN IF NOT EXISTS student_lng double precision,
  ADD COLUMN IF NOT EXISTS distance_meters double precision,
  ADD COLUMN IF NOT EXISTS location_status text;

CREATE TABLE public.campus_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  campus_name text NOT NULL DEFAULT 'KNMIET Campus',
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  radius_meters integer NOT NULL DEFAULT 200,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.campus_settings TO authenticated;
GRANT ALL ON public.campus_settings TO service_role;
ALTER TABLE public.campus_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read campus settings" ON public.campus_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins insert campus settings" ON public.campus_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update campus settings" ON public.campus_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
INSERT INTO public.campus_settings (id, latitude, longitude, radius_meters) VALUES (1, 28.8236, 77.5770, 200) ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.geo_check_in(_subject_code text, _lat double precision, _lng double precision)
RETURNS TABLE(status text, distance_meters double precision, radius_meters integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c record; d double precision; uid uuid := auth.uid(); today date := (now() AT TIME ZONE 'Asia/Kolkata')::date;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF NOT public.has_role(uid,'student') THEN RAISE EXCEPTION 'Only students can self check-in'; END IF;
  IF _lat IS NULL OR _lng IS NULL OR _lat < -90 OR _lat > 90 OR _lng < -180 OR _lng > 180 THEN RAISE EXCEPTION 'Invalid location'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.subjects WHERE code = _subject_code) THEN RAISE EXCEPTION 'Unknown subject'; END IF;
  SELECT * INTO c FROM public.campus_settings WHERE id = 1;
  IF c IS NULL THEN RAISE EXCEPTION 'Campus location not configured'; END IF;
  d := 2 * 6371000 * asin(sqrt(
        power(sin(radians(_lat - c.latitude)/2),2) +
        cos(radians(c.latitude)) * cos(radians(_lat)) * power(sin(radians(_lng - c.longitude)/2),2)));
  IF d > c.radius_meters THEN
    RETURN QUERY SELECT 'outside_geofence'::text, d, c.radius_meters; RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM public.attendance a WHERE a.student_id = uid AND a.subject_code = _subject_code AND a.date = today) THEN
    RETURN QUERY SELECT 'already_marked'::text, d, c.radius_meters; RETURN;
  END IF;
  INSERT INTO public.attendance (student_id, subject_code, date, status, marked_by, student_lat, student_lng, distance_meters, location_status)
  VALUES (uid, _subject_code, today, 'present', uid, _lat, _lng, d, 'verified');
  RETURN QUERY SELECT 'verified'::text, d, c.radius_meters;
END $$;
REVOKE EXECUTE ON FUNCTION public.geo_check_in(text,double precision,double precision) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.geo_check_in(text,double precision,double precision) TO authenticated;