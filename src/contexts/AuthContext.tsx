import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "student" | "faculty" | "admin";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  roll_number: string | null;
  employee_id: string | null;
  branch: string | null;
  semester: string | null;
  section: string | null;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  course?: string | null;
  year?: string | null;
  dob?: string | null;
  aadhar?: string | null;
}

/** Convert any user-typed ID into the internal email used by Supabase auth. */
export const idToEmail = (id: string) =>
  `${id.trim().toLowerCase().replace(/[^a-z0-9]/g, "")}@knmiet.local`;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  profileLoading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const loadProfile = async (uid: string) => {
    setProfileLoading(true);
    try {
      const [{ data: prof }, { data: roleRow }] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", uid).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid).maybeSingle(),
      ]);
      setProfile(prof as Profile | null);
      setRole((roleRow?.role as AppRole) ?? null);
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        setProfileLoading(true);
        setTimeout(() => { loadProfile(newSession.user.id); }, 0);
      } else {
        setProfile(null);
        setRole(null);
        setProfileLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) loadProfile(s.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRole(null);
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, role, loading, profileLoading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
