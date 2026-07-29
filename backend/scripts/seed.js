import "dotenv/config";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { models } from "../models/index.js";

const idToEmail = (id) => `${id.toLowerCase().replace(/[^a-z0-9]/g, "")}@knmiet.local`;

const createUser = async ({ loginId, password, role, profile }) => {
  const email = idToEmail(loginId);
  const id = uuid();
  await models.users.create({
    id,
    email,
    password_hash: await bcrypt.hash(password, 10),
    user_metadata: { full_name: profile.full_name },
  });
  await models.user_roles.create({ user_id: id, role });
  await models.profiles.create({ user_id: id, email, ...profile });
  return id;
};

const run = async () => {
  await connectDB();
  for (const m of Object.values(models)) await m.deleteMany({});

  await createUser({
    loginId: "ADM001",
    password: "admin123",
    role: "admin",
    profile: { full_name: "System Administrator", employee_id: "ADM001" },
  });

  const facultySeed = [
    { employee_id: "FAC003", full_name: "Mr. Nikhil Tyagi", designation: "Coordinator" },
    { employee_id: "FAC008", full_name: "Ms. Aditi Gautam", designation: "Deputy Coordinator" },
    { employee_id: "FAC001", full_name: "Dr. R. K. Sharma", designation: "HOD" },
  ];
  for (const f of facultySeed) {
    await createUser({
      loginId: f.employee_id,
      password: "faculty123",
      role: "faculty",
      profile: { full_name: f.full_name, employee_id: f.employee_id, branch: "CSE" },
    });
    await models.faculty.create({
      name: f.full_name,
      designation: f.designation,
      department: "Computer Science & Engineering",
      qualification: "M.Tech",
      experience: "8 years",
      contact_email: idToEmail(f.employee_id),
      room_no: "B-201",
      available_time: "10:00 AM - 4:00 PM",
    });
  }

  const students = [
    "2200320130001",
    "2200320130002",
    "2200320130003",
    "2200320130004",
    "2200320130005",
    "2200320130006",
    "2200320130007",
    "2200320130008",
  ];
  let n = 1;
  for (const roll of students) {
    const uid = await createUser({
      loginId: roll,
      password: "student123",
      role: "student",
      profile: {
        full_name: `Student ${n}`,
        roll_number: roll,
        branch: "CSE",
        semester: "VI",
        section: "CS31",
        course: "B.Tech",
        year: "3rd",
      },
    });
    await models.student_fees.create({
      student_id: uid,
      total_fee: 125000,
      paid_amount: n % 3 === 0 ? 125000 : 75000,
    });
    n += 1;
  }

  await models.announcements.create({
    title: "Semester VI mid-term schedule released",
    body: "Mid-term examinations begin next Monday. Check the events calendar for details.",
    category: "Examination",
  });

  console.log("[seed] done. Logins: ADM001/admin123, FAC003/faculty123, 2200320130001/student123");
  await mongoose.disconnect();
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
