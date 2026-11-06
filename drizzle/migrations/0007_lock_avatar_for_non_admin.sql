CREATE OR REPLACE FUNCTION public.prevent_privileged_profile_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT has_role(auth.uid(),'admin'::app_role) THEN
    NEW.employee_id := OLD.employee_id;
    NEW.roll_number := OLD.roll_number;
    NEW.semester := OLD.semester;
    NEW.branch := OLD.branch;
    NEW.section := OLD.section;
    -- Students/faculty may set a photo only when none exists; only admins change or remove it
    IF auth.uid() IS NOT NULL AND OLD.avatar_url IS NOT NULL AND OLD.avatar_url <> '' THEN
      NEW.avatar_url := OLD.avatar_url;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;