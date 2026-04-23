import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const COORDINATOR_IDS = ["FAC003", "FAC008"];

/** True if current user is Admin / Coordinator (FAC003) / Deputy (FAC008). */
export const useIsFeeManager = () => {
  const { user, profile, role } = useAuth();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!user) { setAllowed(false); return; }
    if (role === "admin") { setAllowed(true); return; }
    if (profile?.employee_id && COORDINATOR_IDS.includes(profile.employee_id)) {
      setAllowed(true);
      return;
    }
    setAllowed(false);
  }, [user, profile, role]);

  return allowed;
};

export interface StudentLite {
  user_id: string;
  full_name: string;
  roll_number: string | null;
  section: string | null;
  semester: string | null;
}

export const fetchStudents = async (): Promise<StudentLite[]> => {
  const { data: roles } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "student");
  const ids = (roles ?? []).map((r) => r.user_id);
  if (!ids.length) return [];
  const { data } = await supabase
    .from("profiles")
    .select("user_id, full_name, roll_number, section, semester")
    .in("user_id", ids)
    .order("roll_number", { ascending: true });
  return (data ?? []) as StudentLite[];
};
