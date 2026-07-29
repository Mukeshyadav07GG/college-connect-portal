import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Users, ShieldCheck, Loader2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/api/client";
import { idToEmail } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface LoginModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type Role = "student" | "faculty" | "admin";

const ROLE_META: Record<Role, { icon: any; label: string; idLabel: string; placeholder: string; route: string }> = {
  student: { icon: GraduationCap, label: "Student", idLabel: "Roll Number", placeholder: "e.g. 02303cse001", route: "/student" },
  faculty: { icon: Users, label: "Faculty", idLabel: "Employee ID", placeholder: "e.g. FAC001", route: "/faculty" },
  admin: { icon: ShieldCheck, label: "Admin", idLabel: "Admin ID", placeholder: "e.g. ADM001", route: "/admin" },
};

export const LoginModal = ({ open, onOpenChange }: LoginModalProps) => {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("student");
  const [loading, setLoading] = useState(false);
  const [idNumber, setIdNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Reset form state whenever the modal closes
  useEffect(() => {
    if (!open) {
      setIdNumber("");
      setPassword("");
      setShowPassword(false);
      setLoading(false);
      setRole("student");
    }
  }, [open]);

  const meta = ROLE_META[role];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedId = idNumber.trim();
    if (!trimmedId) {
      toast.error(`Please enter your ${meta.idLabel}`);
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      const email = idToEmail(trimmedId);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      let resolvedRole: Role = role;
      if (data.user) {
        const { data: rr } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .maybeSingle();
        if (rr?.role) resolvedRole = rr.role as Role;
      }
      toast.success(`Welcome back, ${ROLE_META[resolvedRole].label}!`);
      onOpenChange(false);
      setTimeout(() => navigate(ROLE_META[resolvedRole].route), 150);
    } catch (err: any) {
      const msg = err?.message ?? "Login failed";
      toast.error(
        /invalid login credentials/i.test(msg)
          ? "Incorrect ID or password"
          : msg
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading) onOpenChange(v); }}>
      <DialogContent className="glass-strong sm:max-w-md p-0 overflow-hidden border-glass-border animate-scale-in">
        <div className="bg-gradient-hero p-6 text-primary-foreground">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display font-bold">Welcome to KNMIET</DialogTitle>
            <DialogDescription className="text-primary-foreground/90">
              Sign in with your ID & password
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6">
          <Tabs value={role} onValueChange={(v) => setRole(v as Role)} className="w-full">
            <TabsList className="grid grid-cols-3 w-full mb-4">
              {(Object.keys(ROLE_META) as Role[]).map((r) => {
                const Icon = ROLE_META[r].icon;
                return (
                  <TabsTrigger key={r} value={r} className="flex items-center gap-1.5 transition-all">
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{ROLE_META[r].label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <form onSubmit={handleSubmit} className="space-y-3 animate-fade-in" key={role}>
              <div>
                <Label htmlFor="login-id">{meta.idLabel}</Label>
                <Input
                  id="login-id"
                  required
                  autoFocus
                  autoComplete="username"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder={meta.placeholder}
                  disabled={loading}
                />
              </div>
              <div>
                <Label htmlFor="login-password">Password</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={loading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full glow-button">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Sign in as {meta.label}
              </Button>

              <p className="text-center text-xs text-muted-foreground pt-1">
                Demo: <span className="font-mono">02303cse001</span> / <span className="font-mono">123456789</span>
              </p>
            </form>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
