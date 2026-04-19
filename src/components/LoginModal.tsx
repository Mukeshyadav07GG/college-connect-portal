import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Users, ShieldCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idNumber.trim() || password.length < 6) {
      toast.error("Enter your ID and a password (min 6 chars)");
      return;
    }
    setLoading(true);
    try {
      const email = idToEmail(idNumber);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success(`Welcome back, ${ROLE_META[role].label}!`);
      onOpenChange(false);
      // Direct redirect to the role's dashboard — no extra picker
      navigate(ROLE_META[role].route);
    } catch (err: any) {
      toast.error(err?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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

            {(Object.keys(ROLE_META) as Role[]).map((r) => (
              <TabsContent key={r} value={r} className="mt-0 animate-fade-in">
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <Label htmlFor="idNumber">{ROLE_META[r].idLabel}</Label>
                    <Input
                      id="idNumber"
                      required
                      autoFocus
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                      placeholder={ROLE_META[r].placeholder}
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>

                  <Button type="submit" disabled={loading} className="w-full glow-button">
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Sign in as {ROLE_META[r].label}
                  </Button>

                  <p className="text-center text-xs text-muted-foreground pt-1">
                    Demo: <span className="font-mono">02303cse001</span> / <span className="font-mono">123456789</span>
                  </p>
                </form>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
