/**
 * One-off migration: copies every table out of the old Postgres database
 * into MongoDB, preserving all primary keys and foreign keys.
 *
 *   1. put PG_CONNECTION_STRING and MONGO_URI in backend/.env
 *   2. cd backend && npm install && npm run migrate
 *
 * Passwords cannot be migrated (the old hashes are not exportable), so every
 * user gets DEFAULT_PASSWORD and must change it after the first sign-in.
 */
require("dotenv").config();

const { Client } = require("pg");
const { connectDB, mongoose } = require("../config/db");
const { models, User } = require("../models");

const DEFAULT_PASSWORD = process.env.MIGRATION_DEFAULT_PASSWORD || "123456789";

/** postgres table -> mongo collection key (same names here) */
const TABLES = [
  "profiles",
  "user_roles",
  "faculty",
  "subjects",
  "subject_code_map",
  "subject_notes",
  "syllabus_units",
  "syllabus_problems",
  "timetable",
  "attendance",
  "assignments",
  "assignment_submissions",
  "results",
  "hostel_allocations",
  "hostel_images",
  "announcements",
  "events",
  "student_fees",
  "student_documents",
  "chat_messages",
];

const dateFields = new Set(["created_at", "updated_at", "deadline", "submitted_at"]);

function normalizeRow(row) {
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    if (key === "id") out._id = String(value);
    else if (value instanceof Date && dateFields.has(key)) out[key] = value;
    else if (value instanceof Date) out[key] = value.toISOString().slice(0, 10);
    else out[key] = value;
  }
  return out;
}

async function migrate() {
  const pgUri = process.env.PG_CONNECTION_STRING;
  if (!pgUri) {
    console.error("[migrate] PG_CONNECTION_STRING is not set in backend/.env");
    process.exit(1);
  }

  await connectDB();
  const pg = new Client({ connectionString: pgUri, ssl: { rejectUnauthorized: false } });
  await pg.connect();
  console.log("[migrate] connected to Postgres");

  // 1. auth users
  const { rows: authUsers } = await pg.query(
    "select id, email, created_at, last_sign_in_at from auth.users",
  );
  const passwordHash = await User.hashPassword(DEFAULT_PASSWORD);
  await User.deleteMany({});
  await User.insertMany(
    authUsers.map((u) => ({
      _id: String(u.id),
      email: u.email,
      password_hash: passwordHash,
      email_confirmed: true,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
    })),
    { ordered: false },
  );
  console.log(`[migrate] users: ${authUsers.length} (password reset to "${DEFAULT_PASSWORD}")`);

  // 2. public tables
  for (const table of TABLES) {
    const Model = models[table];
    if (!Model) continue;
    let rows = [];
    try {
      ({ rows } = await pg.query(`select * from public.${table}`));
    } catch (err) {
      console.warn(`[migrate] skipped ${table}: ${err.message}`);
      continue;
    }
    await Model.deleteMany({});
    if (rows.length) {
      await Model.insertMany(rows.map(normalizeRow), { ordered: false });
    }
    console.log(`[migrate] ${table}: ${rows.length}`);
  }

  await pg.end();
  await mongoose.disconnect();
  console.log("[migrate] done");
}

migrate().catch((err) => {
  console.error("[migrate] failed:", err);
  process.exit(1);
});
