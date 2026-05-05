import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SHARED_PASSWORD = "123456789";
const SECTION = "CS31";

// 12 real students provided by the college, mapped to roll numbers 02303cse001..012
const STUDENTS: { roll: string; name: string }[] = [
  { roll: "02303cse001", name: "Sonu Yadav" },
  { roll: "02303cse002", name: "Nikesh Yadav" },
  { roll: "02303cse003", name: "Anuj Yadav" },
  { roll: "02303cse004", name: "Snuj Yadav" },
  { roll: "02303cse005", name: "Niraj Kumar" },
  { roll: "02303cse006", name: "Deepak Kumar" },
  { roll: "02303cse007", name: "Shivanshi Yadav" },
  { roll: "02303cse008", name: "Lalu Yadav" },
  { roll: "02303cse009", name: "Mukesh Kumar" },
  { roll: "02303cse010", name: "Guriya Kumari" },
  { roll: "02303cse011", name: "Deepali Kumari" },
  { roll: "02303cse012", name: "Nandani Kumari" },
];

// 7 real faculty members, mapped to employee IDs FAC001..FAC007
const FACULTY: { empId: string; name: string; designation: string }[] = [
  { empId: "FAC001", name: "Shishir Rastogi",    designation: "Director" },
  { empId: "FAC002", name: "Dr. Neeraj Jain",    designation: "HOD - CSE" },
  { empId: "FAC003", name: "Mr. Nikhil Tyagi",   designation: "Coordinator - CSE" },
  { empId: "FAC004", name: "Mr. P.K. Agarwal",   designation: "Professor" },
  { empId: "FAC005", name: "Mr. Aditya Paliwal", designation: "Professor" },
  { empId: "FAC006", name: "Ms. Archana Rajora", designation: "Professor" },
  { empId: "FAC007", name: "Mr. Saransh Sharma", designation: "Professor" },
];

const idToEmail = (id: string) => `${id.toLowerCase().replace(/[^a-z0-9]/g, "")}@knmiet.local`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

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

  let studentsCreated = 0;
  let studentsSkipped = 0;
  let facultyCreated = 0;
  let facultySkipped = 0;
  let adminCreated = 0;
  let adminSkipped = 0;
  const errors: string[] = [];

  // Seed admin (ADM001)
  {
    const adminId = "ADM001";
    const email = idToEmail(adminId);
    if (existingByEmail.has(email)) {
      adminSkipped++;
    } else {
      const { error } = await supabase.auth.admin.createUser({
        email,
        password: SHARED_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: "Admin User",
          role: "admin",
          employee_id: adminId,
        },
      });
      if (error) errors.push(`${adminId}: ${error.message}`);
      else adminCreated++;
    }
  }

  // Seed students
  for (const s of STUDENTS) {
    const email = idToEmail(s.roll);
    if (existingByEmail.has(email)) {
      studentsSkipped++;
      continue;
    }
    const { error } = await supabase.auth.admin.createUser({
      email,
      password: SHARED_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: s.name,
        role: "student",
        roll_number: s.roll,
        branch: "CSE",
        semester: "VI",
        section: SECTION,
      },
    });
    if (error) { errors.push(`${s.roll}: ${error.message}`); continue; }
    studentsCreated++;
  }

  // Seed faculty
  for (const f of FACULTY) {
    const email = idToEmail(f.empId);
    if (existingByEmail.has(email)) {
      facultySkipped++;
      continue;
    }
    const { error } = await supabase.auth.admin.createUser({
      email,
      password: SHARED_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: f.name,
        role: "faculty",
        employee_id: f.empId,
        branch: "CSE",
        bio: f.designation,
      },
    });
    if (error) { errors.push(`${f.empId}: ${error.message}`); continue; }
    facultyCreated++;
  }

  return new Response(
    JSON.stringify({
      ok: true,
      summary: {
        studentsCreated,
        studentsAlreadyExisted: studentsSkipped,
        facultyCreated,
        facultyAlreadyExisted: facultySkipped,
        adminCreated,
        adminAlreadyExisted: adminSkipped,
        errors: errors.length ? errors : undefined,
      },
      sharedPassword: SHARED_PASSWORD,
      sampleLogins: {
        student: { id: "02303cse001", password: SHARED_PASSWORD },
        faculty: { id: "FAC001", password: SHARED_PASSWORD },
      },
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
