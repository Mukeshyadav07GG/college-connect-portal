// Request-Login edge function
// Verifies credentials, then either:
//   - Approves immediately if no active session exists (and registers this device).
//   - Creates a pending login_request if another device is already active.
//
// Client polls the returned request ID over Realtime / select.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const url = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

interface Body {
  email: string;
  password: string;
  device_info?: string;
  user_agent?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    if (!body?.email || !body?.password) {
      return json({ error: "Missing credentials" }, 400);
    }

    // 1. Verify credentials by attempting a sign-in with the public/anon client.
    const publicClient = createClient(url, anonKey, { auth: { persistSession: false } });
    const { data: signIn, error: signErr } = await publicClient.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });
    if (signErr || !signIn.session || !signIn.user) {
      return json({ error: signErr?.message ?? "Invalid credentials" }, 401);
    }

    const newToken = signIn.session.access_token;
    const refreshToken = signIn.session.refresh_token;
    const userId = signIn.user.id;

    // 2. Check if there's already an active session for this user.
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: existing } = await admin
      .from("active_sessions")
      .select("session_token, user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!existing) {
      // First device — approve immediately.
      await admin.from("active_sessions").upsert({
        user_id: userId,
        session_token: newToken,
        device_info: body.device_info ?? null,
        user_agent: body.user_agent ?? null,
      });
      return json({
        status: "approved",
        access_token: newToken,
        refresh_token: refreshToken,
      });
    }

    // 3. Another device is active — create a pending login request.
    const { data: reqRow, error: reqErr } = await admin
      .from("login_requests")
      .insert({
        user_id: userId,
        requesting_token: newToken,
        device_info: body.device_info ?? null,
        user_agent: body.user_agent ?? null,
      })
      .select("id")
      .single();

    if (reqErr || !reqRow) {
      return json({ error: reqErr?.message ?? "Could not create request" }, 500);
    }

    return json({
      status: "pending",
      request_id: reqRow.id,
      // Tokens stashed server-side; only released after approval.
      pending_access_token: newToken,
      pending_refresh_token: refreshToken,
    });
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
