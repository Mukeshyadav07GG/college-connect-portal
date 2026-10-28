CREATE OR REPLACE FUNCTION public.prevent_privileged_profile_changes()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT has_role(auth.uid(),'admin'::app_role) THEN
    NEW.employee_id := OLD.employee_id;
    NEW.roll_number := OLD.roll_number;
    NEW.semester := OLD.semester;
    NEW.branch := OLD.branch;
    NEW.section := OLD.section;
  END IF;
  RETURN NEW;
END;
$function$;