import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Users, ShieldCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

interface LoginModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type Role = "student" | "faculty" | "admin";
type Mode = "signin" | "signup";

const emailSchema = z.string().trim().email("Invalid email").max(255);
const passwordSchema = z.string().min(6, "Password must be at least 6 characters").max(72);
const nameSchema = z.string().trim().min(2, "Name too short").max(100);

const ROLE_META: Record<Role, { icon: any; label: string; idLabel: string; idField: string }> = {
  student: { icon: GraduationCap, label: "Student", idLabel: "Roll Number", idField: "roll_number" },
  faculty: { icon: Users, label: "Faculty", idLabel: "Employee ID", idField: "employee_id" },
  admin: { icon: ShieldCheck, label: "Admin", idLabel: "Admin ID", idField: "employee_id" },
};

export const LoginModal = ({ open, onOpenChange }: LoginModalProps) => {
  const [role, setRole] = useState<Role>("student");
  const [mode, setMode] = useState<Mode>("signin");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
    idNumber: "",
    branch: "CSE",
    semester: "VI",
    section: "CS31",
  });

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const email = emailSchema.parse(form.email);
      const password = passwordSchema.parse(form.password);

      if (mode === "signup") {
        const fullName = nameSchema.parse(form.fullName);
        const meta: Record<string, string> = {
          full_name: fullName,
          role,
          [ROLE_META[role].idField]: form.idNumber,
        };
        if (role === "student") {
          meta.branch = form.branch;
          meta.semester = form.semester;
          meta.section = form.section;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/`, data: meta },
        });
        if (error) throw error;
        toast.success(`${ROLE_META[role].label} account created! You're now signed in.`);
        onOpenChange(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success(`Welcome back!`);
        onOpenChange(false);
      }
    } catch (err: any) {
      const msg = err?.errors?.[0]?.message || err?.message || "Authentication failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong sm:max-w-md p-0 overflow-hidden border-glass-border">
        <div className="bg-gradient-hero p-6 text-primary-foreground">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display font-bold">Welcome to KNMIET</DialogTitle>
            <DialogDescription className="text-primary-foreground/90">
              Sign in to access your portal
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6">
          <Tabs value={role} onValueChange={(v) => setRole(v as Role)} className="w-full">
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

            {(Object.keys(ROLE_META) as Role[]).map((r) => (
              <TabsContent key={r} value={r} className="mt-0">
                <form onSubmit={handleSubmit} className="space-y-3 animate-fade-in">
                  {mode === "signup" && (
                    <>
                      <div>
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input id="fullName" required value={form.fullName} onChange={(e) => update("fullName", e.target.value)} placeholder="As per official records" />
                      </div>
                      <div>
                        <Label htmlFor="idNumber">{ROLE_META[r].idLabel}</Label>
                        <Input id="idNumber" required value={form.idNumber} onChange={(e) => update("idNumber", e.target.value)} placeholder={r === "student" ? "e.g. 2200310100001" : "e.g. KNM-1024"} />
                      </div>
                      {r === "student" && (
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Label htmlFor="branch">Branch</Label>
                            <Input id="branch" value={form.branch} onChange={(e) => update("branch", e.target.value)} />
                          </div>
                          <div>
                            <Label htmlFor="semester">Sem</Label>
                            <Input id="semester" value={form.semester} onChange={(e) => update("semester", e.target.value)} />
                          </div>
                          <div>
                            <Label htmlFor="section">Section</Label>
                            <Input id="section" value={form.section} onChange={(e) => update("section", e.target.value)} />
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="you@knmiet.ac.in" />
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" required value={form.password} onChange={(e) => update("password", e.target.value)} placeholder="••••••••" />
                  </div>

                  <Button type="submit" disabled={loading} className="w-full glow-button">
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {mode === "signin" ? `Sign in as ${ROLE_META[r].label}` : `Create ${ROLE_META[r].label} Account`}
                  </Button>

                  <div className="text-center text-sm text-muted-foreground pt-1">
                    {mode === "signin" ? "Don't have an account? " : "Already registered? "}
                    <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="text-primary font-medium hover:underline">
                      {mode === "signin" ? "Sign up" : "Sign in"}
                    </button>
                  </div>
                </form>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
