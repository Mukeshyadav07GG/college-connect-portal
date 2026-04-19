import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SHARED_PASSWORD = "123456789";

const FIRST_NAMES = ["Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Krishna", "Ishaan", "Kabir", "Ananya", "Diya", "Aadhya", "Saanvi", "Pari", "Myra", "Aaradhya", "Anika", "Navya", "Kiara", "Rohan", "Karan", "Yash", "Devansh", "Harsh", "Priya", "Riya", "Tanya", "Neha", "Pooja"];
const LAST_NAMES = ["Sharma", "Verma", "Singh", "Yadav", "Gupta", "Kumar", "Patel", "Mishra", "Tiwari", "Pandey", "Chauhan", "Rastogi", "Agarwal", "Joshi", "Kapoor", "Mehta", "Shah", "Reddy", "Iyer", "Nair"];
const SECTIONS = ["CS31", "CS32", "CS33"];
const SUBJECTS = ["KCS-601", "KCS-602", "KCS-603", "KCS-651", "KOE-068"];

const pick = <T,>(arr: T[], i: number) => arr[i % arr.length];
const pad = (n: number, w = 3) => String(n).padStart(w, "0");

const idToEmail = (id: string) => `${id.toLowerCase().replace(/[^a-z0-9]/g, "")}@knmiet.local`;

interface SeedUser {
  id: string;
  email: string;
  meta: Record<string, any>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Build the full user list
  const users: SeedUser[] = [];

  // 50 students: 02303cse001..050
  for (let i = 1; i <= 50; i++) {
    const id = `02303cse${pad(i)}`;
    const fname = pick(FIRST_NAMES, i - 1);
    const lname = pick(LAST_NAMES, Math.floor((i - 1) / 2));
    users.push({
      id,
      email: idToEmail(id),
      meta: {
        full_name: `${fname} ${lname}`,
        role: "student",
        roll_number: id,
        branch: "CSE",
        semester: "VI",
        section: pick(SECTIONS, i - 1),
      },
    });
  }

  // 15 faculty: FAC001..015
  for (let i = 1; i <= 15; i++) {
    const id = `FAC${pad(i)}`;
    users.push({
      id,
      email: idToEmail(id),
      meta: {
        full_name: `Dr. ${pick(FIRST_NAMES, i + 5)} ${pick(LAST_NAMES, i + 3)}`,
        role: "faculty",
        employee_id: id,
      },
    });
  }

  // 5 admins: ADM001..005
  for (let i = 1; i <= 5; i++) {
    const id = `ADM${pad(i)}`;
    users.push({
      id,
      email: idToEmail(id),
      meta: {
        full_name: `${pick(FIRST_NAMES, i + 10)} ${pick(LAST_NAMES, i + 7)} (Admin)`,
        role: "admin",
        employee_id: id,
      },
    });
  }

  // Page through existing users to avoid duplicates
  const existingByEmail = new Map<string, string>();
  let page = 1;
  while (true) {
    const { data } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    const list = data?.users ?? [];
    for (const u of list) if (u.email) existingByEmail.set(u.email, u.id);
    if (list.length < 1000) break;
    page++;
  }

  const created: Record<string, { uid: string; role: string }> = {};
  let createdCount = 0;
  let skippedCount = 0;
  const errors: string[] = [];

  for (const u of users) {
    if (existingByEmail.has(u.email)) {
      created[u.id] = { uid: existingByEmail.get(u.email)!, role: u.meta.role };
      skippedCount++;
      continue;
    }
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: SHARED_PASSWORD,
      email_confirm: true,
      user_metadata: u.meta,
    });
    if (error) {
      errors.push(`${u.id}: ${error.message}`);
      continue;
    }
    created[u.id] = { uid: data.user!.id, role: u.meta.role };
    createdCount++;
  }

  // Pick a faculty + student to seed sample data against
  const facultyEntry = Object.entries(created).find(([, v]) => v.role === "faculty");
  const studentEntry = Object.entries(created).find(([, v]) => v.role === "student");

  let seededAssignments = 0;
  let seededResults = 0;
  let seededAnnouncements = 0;

  if (facultyEntry && studentEntry) {
    const facultyId = facultyEntry[1].uid;
    const studentId = studentEntry[1].uid;

    // Only seed if we don't already have many assignments
    const { count } = await supabase.from("assignments").select("*", { count: "exact", head: true });
    if ((count ?? 0) < 3) {
      const { data: a } = await supabase.from("assignments").insert([
        { title: "CN Lab Report 1", description: "Submit lab report on TCP/IP fundamentals.", subject_code: "KCS-603", deadline: new Date(Date.now() + 7 * 86400000).toISOString(), created_by: facultyId },
        { title: "Compiler Design Assignment", description: "Implement lexical analyzer in C.", subject_code: "KCS-602", deadline: new Date(Date.now() + 5 * 86400000).toISOString(), created_by: facultyId },
        { title: "SE Case Study", description: "Prepare case study on Agile methodology.", subject_code: "KCS-601", deadline: new Date(Date.now() + 10 * 86400000).toISOString(), created_by: facultyId },
      ]).select();
      seededAssignments = a?.length ?? 0;

      const results = SUBJECTS.flatMap((code) => [
        { student_id: studentId, subject_code: code, exam_type: "Sessional 1", marks: 22 + Math.floor(Math.random() * 8), max_marks: 30 },
        { student_id: studentId, subject_code: code, exam_type: "Sessional 2", marks: 23 + Math.floor(Math.random() * 7), max_marks: 30 },
        { student_id: studentId, subject_code: code, exam_type: "PUT", marks: 38 + Math.floor(Math.random() * 12), max_marks: 50 },
        { student_id: studentId, subject_code: code, exam_type: "Semester", marks: 65 + Math.floor(Math.random() * 25), max_marks: 100 },
      ]);
      const { data: r } = await supabase.from("results").insert(results).select();
      seededResults = r?.length ?? 0;

      const { data: an } = await supabase.from("announcements").insert([
        { title: "Mid-Sem Exams Schedule Released", body: "Mid-semester exams begin from next Monday.", category: "Exam", created_by: facultyId },
        { title: "Holiday on 26th", body: "College closed on 26th for Republic Day.", category: "Holiday", created_by: facultyId },
        { title: "Tech Fest Registration Open", body: "Register for Innovexa 2026.", category: "Event", created_by: facultyId },
      ]).select();
      seededAnnouncements = an?.length ?? 0;
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      summary: {
        usersCreated: createdCount,
        usersAlreadyExisted: skippedCount,
        errors: errors.length ? errors : undefined,
      },
      sharedPassword: SHARED_PASSWORD,
      sampleLogins: {
        student: { id: "02303cse001", password: SHARED_PASSWORD },
        faculty: { id: "FAC001", password: SHARED_PASSWORD },
        admin: { id: "ADM001", password: SHARED_PASSWORD },
      },
      seeded: { assignments: seededAssignments, results: seededResults, announcements: seededAnnouncements },
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
