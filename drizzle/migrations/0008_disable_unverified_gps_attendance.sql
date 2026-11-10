CREATE OR REPLACE FUNCTION public.geo_check_in(
  _subject_code text,
  _lat double precision,
  _lng double precision
)
RETURNS TABLE(status text, distance_meters double precision, radius_meters integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  campus_radius integer;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;
  IF NOT public.has_role(uid, 'student'::public.app_role) THEN
    RAISE EXCEPTION 'Only students can request attendance check-in';
  END IF;
  IF _subject_code IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.subjects s WHERE s.code = _subject_code
  ) THEN
    RAISE EXCEPTION 'Unknown subject';
  END IF;

  SELECT c.radius_meters INTO campus_radius
  FROM public.campus_settings c
  WHERE c.id = 1;

  -- Browser-provided coordinates cannot establish a trusted physical location.
  -- Do not create an attendance row; faculty must mark attendance.
  RETURN QUERY SELECT 'manual_required'::text, NULL::double precision, campus_radius;
END;
$function$;

CREATE OR REPLACE FUNCTION public.geo_check_in(
  _subject_code text,
  _lat double precision,
  _lng double precision,
  _accuracy double precision DEFAULT NULL::double precision
)
RETURNS TABLE(status text, distance_meters double precision, radius_meters integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  campus_radius integer;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;
  IF NOT public.has_role(uid, 'student'::public.app_role) THEN
    RAISE EXCEPTION 'Only students can request attendance check-in';
  END IF;
  IF _subject_code IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.subjects s WHERE s.code = _subject_code
  ) THEN
    RAISE EXCEPTION 'Unknown subject';
  END IF;

  SELECT c.radius_meters INTO campus_radius
  FROM public.campus_settings c
  WHERE c.id = 1;

  -- Browser-provided coordinates cannot establish a trusted physical location.
  -- Do not create an attendance row; faculty must mark attendance.
  RETURN QUERY SELECT 'manual_required'::text, NULL::double precision, campus_radius;
END;
$function$;

REVOKE ALL ON FUNCTION public.geo_check_in(text, double precision, double precision) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.geo_check_in(text, double precision, double precision, double precision) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.geo_check_in(text, double precision, double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION public.geo_check_in(text, double precision, double precision, double precision) TO authenticated;