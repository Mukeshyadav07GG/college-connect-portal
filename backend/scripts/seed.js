/**
 * Creates a minimal working dataset so the app can be used before (or instead
 * of) running the Postgres migration.
 *
 *   cd backend && npm run seed
 */
require("dotenv").config();

const { connectDB, mongoose } = require("../config/db");
const {
  User,
  UserRole,
  Profile,
  Faculty,
  Subject,
  Timetable,
  Announcement,
  Event,
  StudentFee,
} = require("../models");

const PASSWORD = process.env.SEED_PASSWORD || "123456789";
const idToEmail = (id) => `${id.trim().toLowerCase().replace(/[^a-z0-9]/g, "")}@knmiet.local`;

const PEOPLE = [
  { id: "ADM001", name: "System Administrator", role: "admin" },
  { id: "FAC003", name: "Mr. Nikhil Tyagi", role: "faculty", employee_id: "FAC003" },
  { id: "FAC008", name: "Ms. Aditi Gautam", role: "faculty", employee_id: "FAC008" },
  { id: "FAC001", name: "Dr. Shishir Rastogi", role: "faculty", employee_id: "FAC001" },
  { id: "2101", name: "Aarav Sharma", role: "student", roll_number: "2101" },
  { id: "2102", name: "Diya Verma", role: "student", roll_number: "2102" },
  { id: "2103", name: "Kabir Singh", role: "student", roll_number: "2103" },
];

const SUBJECTS = [
  { code: "KCS-601", name: "Software Engineering", faculty_name: "Mr. Nikhil Tyagi" },
  { code: "KCS-603", name: "Computer Network", faculty_name: "Dr. Shishir Rastogi" },
  { code: "KCS-602", name: "Compiler Design", faculty_name: "Ms. Aditi Gautam" },
];

async function seed() {
  await connectDB();
  const passwordHash = await User.hashPassword(PASSWORD);

  for (const person of PEOPLE) {
    const email = idToEmail(person.id);
    const user = await User.findOneAndUpdate(
      { email },
      { $set: { email, password_hash: passwordHash } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    await UserRole.findOneAndUpdate(
      { user_id: String(user._id) },
      { $set: { user_id: String(user._id), role: person.role } },
      { upsert: true },
    );
    await Profile.findOneAndUpdate(
      { user_id: String(user._id) },
      {
        $set: {
          user_id: String(user._id),
          full_name: person.name,
          email,
          roll_number: person.roll_number ?? null,
          employee_id: person.employee_id ?? null,
          branch: "CSE",
          semester: "VI",
          section: "CS31",
          course: "B.Tech",
          year: "3rd",
        },
      },
      { upsert: true },
    );

    if (person.role === "student") {
      await StudentFee.findOneAndUpdate(
        { student_id: String(user._id) },
        { $set: { total_fee: 120000, paid_amount: 80000 } },
        { upsert: true, setDefaultsOnInsert: true },
      );
    }
  }

  for (const subject of SUBJECTS) {
    await Subject.findOneAndUpdate(
      { code: subject.code },
      { $set: { ...subject, branch: "CSE", semester: "VI", completion: 0 } },
      { upsert: true, setDefaultsOnInsert: true },
    );
    await Faculty.findOneAndUpdate(
      { name: subject.faculty_name },
      {
        $set: {
          name: subject.faculty_name,
          role: "Assistant Professor",
          subjects: [subject.name],
        },
      },
      { upsert: true, setDefaultsOnInsert: true },
    );
  }

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  for (let d = 0; d < days.length; d++) {
    for (let slot = 1; slot <= 3; slot++) {
      const subject = SUBJECTS[(d + slot) % SUBJECTS.length];
      await Timetable.findOneAndUpdate(
        { section: "CS31", day: days[d], slot },
        {
          $set: {
            section: "CS31",
            semester: "VI",
            branch: "CSE",
            day: days[d],
            slot,
            subject_code: subject.code,
            faculty_name: subject.faculty_name,
            room: `LT-${100 + slot}`,
          },
        },
        { upsert: true, setDefaultsOnInsert: true },
      );
    }
  }

  await Announcement.findOneAndUpdate(
    { title: "Welcome to the new ERP backend" },
    {
      $set: {
        title: "Welcome to the new ERP backend",
        body: "The portal now runs on the new API. Please change your password after signing in.",
        category: "General",
      },
    },
    { upsert: true, setDefaultsOnInsert: true },
  );
  await Event.findOneAndUpdate(
    { title: "Mid Semester Examination" },
    {
      $set: {
        title: "Mid Semester Examination",
        description: "Sessional 1 for all branches",
        event_date: new Date(Date.now() + 12096e5).toISOString().slice(0, 10),
        location: "Main Block",
        category: "Academic",
      },
    },
    { upsert: true, setDefaultsOnInsert: true },
  );

  console.log(`[seed] done. Sign in with e.g. ADM001 / ${PASSWORD}`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
