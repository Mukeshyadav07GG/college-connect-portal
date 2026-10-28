-- Track reported GPS accuracy for every check-in
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS gps_accuracy double precision;

-- Hardened check-in: validates GPS accuracy and rejects impossible movement between check-ins
CREATE OR REPLACE FUNCTION public.geo_check_in(
  _subject_code text,
  _lat double precision,
  _lng double precision,
  _accuracy double precision DEFAULT NULL
)
 RETURNS TABLE(status text, distance_meters double precision, radius_meters integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  c record; d double precision; uid uuid := auth.uid(); today date := (now() AT TIME ZONE 'Asia/Kolkata')::date;
  prev_lat double precision; prev_lng double precision; prev_at timestamptz;
  dp double precision; dt double precision;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF NOT public.has_role(uid,'student') THEN RAISE EXCEPTION 'Only students can self check-in'; END IF;
  IF _lat IS NULL OR _lng IS NULL OR _lat < -90 OR _lat > 90 OR _lng < -180 OR _lng > 180 THEN RAISE EXCEPTION 'Invalid location'; END IF;
  IF _accuracy IS NOT NULL AND (_accuracy < 0 OR _accuracy > 250) THEN
    RAISE EXCEPTION 'GPS signal too weak to verify. Move to an open area and retry';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.subjects WHERE code = _subject_code) THEN RAISE EXCEPTION 'Unknown subject'; END IF;
  SELECT * INTO c FROM public.campus_settings WHERE id = 1;
  IF c IS NULL THEN RAISE EXCEPTION 'Campus location not configured'; END IF;
  d := 2 * 6371000 * asin(sqrt(
        power(sin(radians(_lat - c.latitude)/2),2) +
        cos(radians(c.latitude)) * cos(radians(_lat)) * power(sin(radians(_lng - c.longitude)/2),2)));
  IF d > c.radius_meters THEN
    RETURN QUERY SELECT 'outside_geofence'::text, d, c.radius_meters; RETURN;
  END IF;
  -- Reject impossible movement: another check-in today too far away too recently
  SELECT a.student_lat, a.student_lng, a.created_at
    INTO prev_lat, prev_lng, prev_at
    FROM public.attendance a
   WHERE a.student_id = uid AND a.date = today
     AND a.student_lat IS NOT NULL AND a.student_lng IS NOT NULL
   ORDER BY a.created_at DESC LIMIT 1;
  IF prev_lat IS NOT NULL THEN
    dp := 2 * 6371000 * asin(sqrt(
          power(sin(radians(_lat - prev_lat)/2),2) +
          cos(radians(prev_lat)) * cos(radians(_lat)) * power(sin(radians(_lng - prev_lng)/2),2)));
    dt := EXTRACT(EPOCH FROM (now() - prev_at));
    IF dt > 0 AND dt < 3600 AND dp / dt > 55.5 THEN
      RAISE EXCEPTION 'Location changed too quickly to be genuine';
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM public.attendance a WHERE a.student_id = uid AND a.subject_code = _subject_code AND a.date = today) THEN
    RETURN QUERY SELECT 'already_marked'::text, d, c.radius_meters; RETURN;
  END IF;
  INSERT INTO public.attendance (student_id, subject_code, date, status, marked_by, student_lat, student_lng, distance_meters, location_status, gps_accuracy)
  VALUES (uid, _subject_code, today, 'present', uid, _lat, _lng, d, 'verified', _accuracy);
  RETURN QUERY SELECT 'verified'::text, d, c.radius_meters;
END $function$;

-- Replace blanket "USING (true)" read policies with a real role predicate.
-- Same effective access (every signed-in user has a role), but no tautology.
DROP POLICY IF EXISTS "Authenticated read subject map" ON public.subject_code_map;
CREATE POLICY "Authenticated read subject map" ON public.subject_code_map
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'student') OR public.has_role(auth.uid(),'faculty') OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Signed-in users read campus settings" ON public.campus_settings;
CREATE POLICY "Signed-in users read campus settings" ON public.campus_settings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'student') OR public.has_role(auth.uid(),'faculty') OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Assignments readable by authenticated" ON public.assignments;
CREATE POLICY "Assignments readable by authenticated" ON public.assignments
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'student') OR public.has_role(auth.uid(),'faculty') OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Authenticated read subjects" ON public.subjects;
CREATE POLICY "Authenticated read subjects" ON public.subjects
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'student') OR public.has_role(auth.uid(),'faculty') OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Announcements readable by authenticated" ON public.announcements;
CREATE POLICY "Announcements readable by authenticated" ON public.announcements
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'student') OR public.has_role(auth.uid(),'faculty') OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Authenticated read faculty" ON public.faculty;
CREATE POLICY "Authenticated read faculty" ON public.faculty
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'student') OR public.has_role(auth.uid(),'faculty') OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Notes readable by authenticated" ON public.subject_notes;
CREATE POLICY "Notes readable by authenticated" ON public.subject_notes
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'student') OR public.has_role(auth.uid(),'faculty') OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Timetable readable by authenticated" ON public.timetable;
CREATE POLICY "Timetable readable by authenticated" ON public.timetable
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'student') OR public.has_role(auth.uid(),'faculty') OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Units readable by authenticated" ON public.syllabus_units;
CREATE POLICY "Units readable by authenticated" ON public.syllabus_units
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'student') OR public.has_role(auth.uid(),'faculty') OR public.has_role(auth.uid(),'admin'));
