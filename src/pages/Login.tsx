import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { idToEmail, useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Users, ShieldCheck, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

type Role = "student" | "faculty" | "admin";

const ROLE_META: Record<Role, { icon: any; label: string; idLabel: string; placeholder: string; route: string }> = {
  student: { icon: GraduationCap, label: "Student", idLabel: "Roll Number", placeholder: "e.g. 02303cse001", route: "/student" },
  faculty: { icon: Users, label: "Faculty", idLabel: "Employee ID", placeholder: "e.g. FAC001", route: "/faculty" },
  admin: { icon: ShieldCheck, label: "Admin", idLabel: "Admin ID", placeholder: "e.g. ADM001", route: "/admin" },
};

/** Only allow same-origin relative paths as post-login destinations. */
const safeNext = (raw: string | null): string | null => {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
};

const Login = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, role: authRole, loading, profileLoading } = useAuth();
  const next = safeNext(params.get("next"));

  const [role, setRole] = useState<Role>("student");
  const [idNumber, setIdNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  // Auto-redirect if already signed in
  useEffect(() => {
    if (loading || profileLoading || !user) return;
    if (next) navigate(next, { replace: true });
    else if (authRole) navigate(ROLE_META[authRole as Role].route, { replace: true });
  }, [loading, profileLoading, user, authRole, next, navigate]);

  const meta = ROLE_META[role];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = idNumber.trim();
    if (!trimmed) return toast.error(`Please enter your ${meta.idLabel}`);
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    setBusy(true);
    try {
      const email = idToEmail(trimmed);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      let resolved: Role = role;
      if (data.user) {
        const { data: rr } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id).maybeSingle();
        if (rr?.role) resolved = rr.role as Role;
      }
      toast.success(`Welcome back, ${ROLE_META[resolved].label}!`);
      const dest = next ?? ROLE_META[resolved].route;
      setTimeout(() => navigate(dest, { replace: true }), 100);
    } catch (err: any) {
      const msg = err?.message ?? "Login failed";
      toast.error(/invalid login credentials/i.test(msg) ? "Incorrect ID or password" : msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md glass-strong rounded-2xl overflow-hidden border border-glass-border">
        <div className="bg-gradient-hero p-6 text-primary-foreground">
          <h1 className="text-2xl font-display font-bold">Sign in to KNMIET</h1>
          <p className="text-sm text-primary-foreground/90 mt-1">
            {next ? "Sign in to continue to the requested page." : "Sign in with your ID & password."}
          </p>
        </div>

        <div className="p-6">
          <Tabs value={role} onValueChange={(v) => setRole(v as Role)}>
            <TabsList className="grid grid-cols-3 w-full mb-4">
              {(Object.keys(ROLE_META) as Role[]).map((r) => {
                const Icon = ROLE_META[r].icon;
                return (
                  <TabsTrigger key={r} value={r} className="flex items-center gap-1.5">
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{ROLE_META[r].label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <form onSubmit={handleSubmit} className="space-y-3" key={role}>
              <div>
                <Label htmlFor="login-id">{meta.idLabel}</Label>
                <Input
                  id="login-id"
                  autoFocus
                  autoComplete="username"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder={meta.placeholder}
                  disabled={busy}
                  required
                />
              </div>
              <div>
                <Label htmlFor="login-password">Password</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={busy}
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" disabled={busy} className="w-full glow-button">
                {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Sign in as {meta.label}
              </Button>
            </form>
          </Tabs>
        </div>
      </div>
    </main>
  );
};

export default Login;
