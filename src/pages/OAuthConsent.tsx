import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, X } from "lucide-react";

// The @supabase/supabase-js `auth.oauth` namespace is beta and may not appear
// in the generated types. A tiny local typed wrapper keeps this consent route
// on the supported client methods without any raw endpoint calls.
type OAuthClient = { name?: string; client_name?: string; redirect_uri?: string; redirect_uris?: string[] };
type AuthorizationDetails = {
  client?: OAuthClient;
  scopes?: string[];
  scope?: string;
  redirect_url?: string;
  redirect_to?: string;
};
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: { redirect_url?: string; redirect_to?: string } | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: { redirect_url?: string; redirect_to?: string } | null; error: { message: string } | null }>;
};

const oauthApi = (): OAuthApi => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

const OAuthConsent = () => {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("Missing authorization_id");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/login?next=" + encodeURIComponent(next);
        return;
      }
      try {
        const { data, error } = await oauthApi().getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (error) return setError(error.message);
        const immediate = data?.redirect_url ?? data?.redirect_to;
        if (immediate && !data?.client) {
          window.location.href = immediate;
          return;
        }
        setDetails(data);
      } catch (err: any) {
        setError(err?.message ?? "Failed to load authorization request.");
      }
    })();
    return () => { active = false; };
  }, [authorizationId]);

  const decide = async (approve: boolean) => {
    setBusy(true);
    try {
      const { data, error } = approve
        ? await oauthApi().approveAuthorization(authorizationId)
        : await oauthApi().denyAuthorization(authorizationId);
      if (error) { setBusy(false); return setError(error.message); }
      const target = data?.redirect_url ?? data?.redirect_to;
      if (!target) { setBusy(false); return setError("No redirect returned by the authorization server."); }
      window.location.href = target;
    } catch (err: any) {
      setBusy(false);
      setError(err?.message ?? "Failed to record decision.");
    }
  };

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full glass-strong rounded-2xl p-6 border border-glass-border">
          <h1 className="text-xl font-display font-bold mb-2">Could not load this authorization request</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </main>
    );
  }

  if (!details) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      </main>
    );
  }

  const clientName = details.client?.name ?? details.client?.client_name ?? "an app";
  const redirectUri =
    details.client?.redirect_uri ?? details.client?.redirect_uris?.[0] ?? null;
  const scopes = details.scopes ?? (details.scope ? details.scope.split(/\s+/).filter(Boolean) : []);

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md glass-strong rounded-2xl overflow-hidden border border-glass-border">
        <div className="bg-gradient-hero p-6 text-primary-foreground">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-5 h-5" />
            <span className="text-xs uppercase tracking-wider opacity-90">Authorize access</span>
          </div>
          <h1 className="text-2xl font-display font-bold">Connect {clientName} to KNMIET ERP</h1>
          <p className="text-sm text-primary-foreground/90 mt-1">
            This lets {clientName} use this app as you.
          </p>
        </div>

        <div className="p-6 space-y-4">
          {redirectUri && (
            <div className="text-xs text-muted-foreground break-all">
              Redirects to: <span className="font-mono">{redirectUri}</span>
            </div>
          )}

          <div>
            <div className="text-sm font-semibold mb-2">Access being granted</div>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
              <li>Read your basic profile (name, roll/employee ID, branch)</li>
              <li>Read KNMIET announcements and events on your behalf</li>
              <li>Browse the faculty directory</li>
              {scopes.length > 0 && (
                <li>Requested scopes: <span className="font-mono">{scopes.join(" ")}</span></li>
              )}
            </ul>
            <p className="text-xs text-muted-foreground mt-3">
              This does not bypass this app's row-level security — {clientName} sees only what your account can see.
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => decide(false)} disabled={busy}>
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
            <Button className="flex-1 glow-button" onClick={() => decide(true)} disabled={busy}>
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Approve
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default OAuthConsent;
