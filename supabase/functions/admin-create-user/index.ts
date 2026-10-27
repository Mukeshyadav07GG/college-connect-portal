import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const SEMS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: u } = await admin.auth.getUser(token);
    if (!u?.user) return json({ error: "Not signed in" }, 401);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Only admin can add users" }, 403);

    const b = await req.json();
    const role = String(b.role ?? "");
    const loginId = String(b.login_id ?? "").trim();
    const fullName = String(b.full_name ?? "").trim();
    const password = String(b.password ?? "");
    if (!["student", "faculty", "admin"].includes(role)) return json({ error: "Invalid role" }, 400);
    if (!/^[A-Za-z0-9._-]{3,40}$/.test(loginId)) return json({ error: "User ID: 3-40 letters/numbers only" }, 400);
    if (fullName.length < 2 || fullName.length > 100) return json({ error: "Full name required" }, 400);
    if (password.length < 6) return json({ error: "Password must be at least 6 characters" }, 400);
    const semester = b.semester ? String(b.semester) : null;
    if (semester && !SEMS.includes(semester)) return json({ error: "Invalid semester" }, 400);
    if (role === "student" && !semester) return json({ error: "Semester required for student" }, 400);

    const email = `${loginId.toLowerCase().replace(/[^a-z0-9]/g, "")}@knmiet.local`;
    const meta: Record<string, string | null> = {
      full_name: fullName,
      branch: b.branch ? String(b.branch).slice(0, 20) : "CSE",
      semester,
      section: b.section ? String(b.section).slice(0, 20) : null,
      roll_number: role === "student" ? loginId : null,
      employee_id: role !== "student" ? loginId : null,
    };

    const { data: created, error } = await admin.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: meta,
    });
    if (error) {
      const msg = /already/i.test(error.message) ? "Ye User ID pehle se registered hai" : error.message;
      return json({ error: msg }, 400);
    }
    const id = created.user.id;
    if (role !== "student") {
      await admin.from("user_roles").delete().eq("user_id", id);
      await admin.from("user_roles").insert({ user_id: id, role });
    }
    return json({ ok: true, user_id: id });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
