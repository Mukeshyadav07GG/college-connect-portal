// Approve-Login edge function
// Called by the OLD device when the user clicks Accept on the popup.
// Effect:
//   - Marks the login_request as approved
//   - Replaces the active_sessions row with the new device's token
//   (The old client detects the mismatch and signs out.)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const url = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    // Verify the caller (the OLD device).
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: auth } },
      auth: { persistSession: false },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "Unauthorized" }, 401);

    const { request_id, decision } = (await req.json()) as {
      request_id: string;
      decision: "approve" | "deny";
    };
    if (!request_id || !["approve", "deny"].includes(decision)) {
      return json({ error: "Invalid input" }, 400);
    }

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

    // Fetch the request, ensure it belongs to this caller and is still pending.
    const { data: reqRow } = await admin
      .from("login_requests")
      .select("id, user_id, requesting_token, status")
      .eq("id", request_id)
      .maybeSingle();
    if (!reqRow) return json({ error: "Request not found" }, 404);
    if (reqRow.user_id !== u.user.id) return json({ error: "Forbidden" }, 403);
    if (reqRow.status !== "pending") return json({ error: "Already decided" }, 409);

    if (decision === "deny") {
      await admin
        .from("login_requests")
        .update({ status: "denied", decided_at: new Date().toISOString() })
        .eq("id", request_id);
      return json({ ok: true, status: "denied" });
    }

    // Approve — swap active session to the new token.
    await admin.from("active_sessions").upsert({
      user_id: reqRow.user_id,
      session_token: reqRow.requesting_token,
      updated_at: new Date().toISOString(),
    });

    await admin
      .from("login_requests")
      .update({ status: "approved", decided_at: new Date().toISOString() })
      .eq("id", request_id);

    return json({ ok: true, status: "approved" });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
