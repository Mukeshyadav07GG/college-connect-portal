import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Monitor, ShieldAlert, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface LoginRequest {
  id: string;
  device_info: string | null;
  user_agent: string | null;
  created_at: string;
}

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const FN_URL = `https://${PROJECT_ID}.supabase.co/functions/v1/approve-login`;

export const LoginApprovalGate = () => {
  const { user, session } = useAuth();
  const [pending, setPending] = useState<LoginRequest | null>(null);
  const [busy, setBusy] = useState(false);

  // Subscribe to incoming login requests for this user.
  useEffect(() => {
    if (!user) {
      setPending(null);
      return;
    }

    let cancelled = false;

    const fetchPending = async () => {
      const { data } = await supabase
        .from("login_requests")
        .select("id, device_info, user_agent, created_at")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled) setPending((data as LoginRequest) ?? null);
    };

    fetchPending();

    const channel = supabase
      .channel(`login_requests_user_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "login_requests",
          filter: `user_id=eq.${user.id}`,
        },
        () => fetchPending()
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  const decide = async (decision: "approve" | "deny") => {
    if (!pending || !session) return;
    setBusy(true);
    try {
      const res = await fetch(FN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ request_id: pending.id, decision }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      toast.success(decision === "approve" ? "New device approved" : "Login request denied");
      setPending(null);
      // If approved, the active_sessions row now points to the new token.
      // AuthContext's session-watcher will detect the mismatch and sign us out.
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  if (!pending) return null;

  return (
    <Dialog open onOpenChange={() => { /* must decide */ }}>
      <DialogContent className="glass-strong sm:max-w-md border-glass-border" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <div className="text-center space-y-4 py-2">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <ShieldAlert className="w-7 h-7 text-primary" />
          </div>
          <DialogTitle className="font-display text-xl">New sign-in attempt</DialogTitle>
          <DialogDescription>
            Someone is trying to sign in to your account from a new device.
          </DialogDescription>

          <div className="glass rounded-xl p-4 text-left space-y-2">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm">{pending.device_info ?? "Unknown device"}</span>
            </div>
            <p className="text-[11px] text-muted-foreground break-all leading-relaxed">
              {pending.user_agent ?? "No user-agent reported"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Requested {new Date(pending.created_at).toLocaleString()}
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            If you approve, this device will be signed out automatically.
          </p>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" disabled={busy} onClick={() => decide("deny")}>
              Deny
            </Button>
            <Button className="flex-1 glow-button" disabled={busy} onClick={() => decide("approve")}>
              {busy && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Accept
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
