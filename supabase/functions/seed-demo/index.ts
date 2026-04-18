import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const demoUsers = [
    {
      email: "admin@knmiet.demo",
      password: "Admin@12345",
      meta: { full_name: "Admin User", role: "admin", employee_id: "ADM001" },
    },
    {
      email: "faculty@knmiet.demo",
      password: "Faculty@12345",
      meta: { full_name: "Dr. Shishir Rastogi", role: "faculty", employee_id: "FAC001" },
    },
    {
      email: "student@knmiet.demo",
      password: "Student@12345",
      meta: {
        full_name: "Demo Student",
        role: "student",
        roll_number: "2200520100001",
        branch: "CSE",
        semester: "VI",
        section: "CS31",
      },
    },
  ];

  const created: Record<string, string> = {};

  for (const u of demoUsers) {
    // Check if user already exists
    const { data: list } = await supabase.auth.admin.listUsers();
    const existing = list?.users.find((x) => x.email === u.email);
    if (existing) {
      created[u.email] = existing.id;
      continue;
    }
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: u.meta,
    });
    if (error) return new Response(JSON.stringify({ error: error.message, at: u.email }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    created[u.email] = data.user!.id;
  }

  const studentId = created["student@knmiet.demo"];
  const facultyId = created["faculty@knmiet.demo"];

  // Sample assignments
  await supabase.from("assignments").insert([
    { title: "CN Lab Report 1", description: "Submit lab report on TCP/IP fundamentals.", subject_code: "KCS-603", deadline: new Date(Date.now() + 7 * 86400000).toISOString(), created_by: facultyId },
    { title: "Compiler Design Assignment", description: "Implement lexical analyzer in C.", subject_code: "KCS-602", deadline: new Date(Date.now() + 5 * 86400000).toISOString(), created_by: facultyId },
    { title: "SE Case Study", description: "Prepare case study on Agile methodology.", subject_code: "KCS-601", deadline: new Date(Date.now() + 10 * 86400000).toISOString(), created_by: facultyId },
  ]);

  // Sample results
  const subjects = ["KCS-601", "KCS-602", "KCS-603", "KCS-651", "KOE-068", "KHU-601", "KNC-601"];
  const results = subjects.flatMap((code) => [
    { student_id: studentId, subject_code: code, exam_type: "Sessional 1", marks: 22 + Math.floor(Math.random() * 8), max_marks: 30 },
    { student_id: studentId, subject_code: code, exam_type: "Sessional 2", marks: 23 + Math.floor(Math.random() * 7), max_marks: 30 },
    { student_id: studentId, subject_code: code, exam_type: "PUT", marks: 38 + Math.floor(Math.random() * 12), max_marks: 50 },
    { student_id: studentId, subject_code: code, exam_type: "Semester", marks: 65 + Math.floor(Math.random() * 25), max_marks: 100 },
  ]);
  await supabase.from("results").insert(results);

  // Sample announcements
  await supabase.from("announcements").insert([
    { title: "Mid-Sem Exams Schedule Released", body: "Mid-semester exams begin from next Monday. Check the timetable on the portal.", category: "Exam", created_by: facultyId },
    { title: "Holiday on 26th", body: "College will remain closed on 26th for Republic Day.", category: "Holiday", created_by: facultyId },
    { title: "Tech Fest Registration Open", body: "Register for Innovexa 2026 — coding, robotics, and design contests.", category: "Event", created_by: facultyId },
    { title: "Library Timing Change", body: "Library will be open till 9 PM during exam season.", category: "General", created_by: facultyId },
  ]);

  return new Response(
    JSON.stringify({
      ok: true,
      accounts: {
        admin: { email: "admin@knmiet.demo", password: "Admin@12345" },
        faculty: { email: "faculty@knmiet.demo", password: "Faculty@12345" },
        student: { email: "student@knmiet.demo", password: "Student@12345" },
      },
      seeded: { assignments: 3, results: results.length, announcements: 4 },
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
