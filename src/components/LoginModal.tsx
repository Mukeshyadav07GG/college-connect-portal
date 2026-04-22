import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Users, ShieldCheck, Loader2, ShieldAlert } from "lucide-react";
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

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const FN_URL = `https://${PROJECT_ID}.supabase.co/functions/v1/request-login`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const deviceLabel = () => {
  const ua = navigator.userAgent;
  const platform = (navigator as any).platform ?? "Unknown";
  // Tiny human-friendly tag
  let browser = "Browser";
  if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("Chrome/")) browser = "Chrome";
  else if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Safari/")) browser = "Safari";
  return `${browser} on ${platform}`;
};

export const LoginModal = ({ open, onOpenChange }: LoginModalProps) => {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("student");
  const [loading, setLoading] = useState(false);
  const [idNumber, setIdNumber] = useState("");
  const [password, setPassword] = useState("");
  const [waiting, setWaiting] = useState<{ requestId: string; userId: string } | null>(null);

  // While waiting for approval, listen on login_requests for status change.
  useEffect(() => {
    if (!waiting) return;
    let cancelled = false;

    const finish = async () => {
      const { data } = await supabase
        .from("login_requests")
        .select("status, requesting_token")
        .eq("id", waiting.requestId)
        .maybeSingle();
      if (!data || cancelled) return;
      if (data.status === "approved") {
        // The edge function already swapped active_sessions. We just need to
        // install the new tokens in this browser. The token stash lives in
        // sessionStorage from when we made the request.
        const stash = JSON.parse(sessionStorage.getItem(`pending_${waiting.requestId}`) ?? "null");
        if (stash) {
          await supabase.auth.setSession({
            access_token: stash.access_token,
            refresh_token: stash.refresh_token,
          });
          sessionStorage.removeItem(`pending_${waiting.requestId}`);
        }
        toast.success("Approved on your other device — signing you in");
        setWaiting(null);
        onOpenChange(false);
        // Resolve role and route
        const { data: u } = await supabase.auth.getUser();
        let resolvedRole: Role = role;
        if (u.user) {
          const { data: rr } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", u.user.id)
            .maybeSingle();
          if (rr?.role) resolvedRole = rr.role as Role;
        }
        setTimeout(() => navigate(ROLE_META[resolvedRole].route), 150);
      } else if (data.status === "denied" || data.status === "expired") {
        sessionStorage.removeItem(`pending_${waiting.requestId}`);
        toast.error(data.status === "denied" ? "Login denied by your other device" : "Request expired");
        setWaiting(null);
      }
    };

    // Initial check (in case it was decided before we subscribed)
    finish();

    const channel = supabase
      .channel(`login_req_${waiting.requestId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "login_requests",
          filter: `id=eq.${waiting.requestId}`,
        },
        () => finish()
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [waiting, navigate, onOpenChange, role]);

  const cancelWaiting = async () => {
    if (!waiting) return;
    sessionStorage.removeItem(`pending_${waiting.requestId}`);
    setWaiting(null);
    toast("Login attempt cancelled");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idNumber.trim() || password.length < 6) {
      toast.error("Enter your ID and a password (min 6 chars)");
      return;
    }
    setLoading(true);
    try {
      const email = idToEmail(idNumber);
      const res = await fetch(FN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${ANON}` },
        body: JSON.stringify({
          email,
          password,
          device_info: deviceLabel(),
          user_agent: navigator.userAgent,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Login failed");

      if (json.status === "approved") {
        // No other active session — install tokens and proceed.
        await supabase.auth.setSession({
          access_token: json.access_token,
          refresh_token: json.refresh_token,
        });
        const { data: u } = await supabase.auth.getUser();
        let resolvedRole: Role = role;
        if (u.user) {
          const { data: rr } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", u.user.id)
            .maybeSingle();
          if (rr?.role) resolvedRole = rr.role as Role;
        }
        toast.success(`Welcome back, ${ROLE_META[resolvedRole].label}!`);
        onOpenChange(false);
        setTimeout(() => navigate(ROLE_META[resolvedRole].route), 150);
      } else if (json.status === "pending") {
        // Stash tokens locally; install only after approval comes back.
        sessionStorage.setItem(
          `pending_${json.request_id}`,
          JSON.stringify({
            access_token: json.pending_access_token,
            refresh_token: json.pending_refresh_token,
          })
        );
        setWaiting({ requestId: json.request_id, userId: json.user_id ?? "" });
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!waiting) onOpenChange(v); }}>
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
          {waiting ? (
            <div className="text-center space-y-4 py-4 animate-fade-in">
              <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <ShieldAlert className="w-7 h-7 text-primary animate-pulse" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold">Waiting for approval</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  This account is already signed in on another device. We&apos;ve sent an approval
                  request to that device.
                </p>
              </div>
              <Loader2 className="w-5 h-5 mx-auto animate-spin text-primary" />
              <Button variant="outline" className="w-full" onClick={cancelWaiting}>
                Cancel
              </Button>
            </div>
          ) : (
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
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
