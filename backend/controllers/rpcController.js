const {
  Profile,
  Faculty,
  StudentFee,
  Subject,
  SyllabusUnit,
  Timetable,
  SubjectCodeMap,
  UserRole,
} = require("../models");
const { isFeeManager } = require("../middleware/policy");
const { asyncHandler, HttpError } = require("../middleware/error");
const { emitChange } = require("../realtime");

const staff = (u) => u?.role === "admin" || u?.role === "faculty";

/** Limited directory view - no aadhar / dob / phone. */
async function get_profile_directory(_args, user) {
  if (!user) throw new HttpError(401, "Not authenticated");
  const rows = await Profile.find(
    {},
    "user_id full_name avatar_url roll_number employee_id branch semester section course year bio",
  ).lean();
  return rows.map(({ _id, ...rest }) => rest);
}

/** Full faculty rows including mobile - admins only. */
async function admin_list_faculty(_args, user) {
  if (user?.role !== "admin") throw new HttpError(403, "Not authorized");
  const rows = await Faculty.find({}).sort({ name: 1 }).lean();
  return rows.map(({ _id, ...rest }) => ({ id: String(_id), ...rest }));
}

/** Atomic, server-validated fee update. Paid can never exceed total or decrease. */
async function update_student_fee(args, user) {
  if (!(await isFeeManager(user))) throw new HttpError(403, "Not authorized");

  const studentId = args._student_id;
  const total = Number(args._total_fee);
  const paid = Number(args._paid_amount);

  if (!studentId) throw new HttpError(400, "Student is required");
  if (!Number.isFinite(total) || !Number.isFinite(paid)) {
    throw new HttpError(400, "Total and paid are required");
  }
  if (total < 0 || paid < 0) throw new HttpError(400, "Amounts must be non-negative");
  if (paid > total) {
    throw new HttpError(400, `Paid amount (${paid}) cannot exceed total fee (${total})`);
  }

  const existing = await StudentFee.findOne({ student_id: studentId });
  const prevPaid = existing?.paid_amount ?? 0;
  if (existing && paid < prevPaid) {
    throw new HttpError(400, `Paid amount cannot decrease (previous: ${prevPaid}, new: ${paid})`);
  }

  const doc = await StudentFee.findOneAndUpdate(
    { student_id: studentId },
    { $set: { total_fee: total, paid_amount: paid, updated_by: user.id } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean();

  emitChange("student_fees", existing ? "UPDATE" : "INSERT", {
    ...doc,
    id: String(doc._id),
  });

  return [
    {
      total_fee: total,
      paid_amount: paid,
      remaining_amount: Math.max(total - paid, 0),
      payment_diff: Math.max(paid - prevPaid, 0),
    },
  ];
}

/** Sets a unit's progress and recomputes subject completion (average of 5 units). */
async function update_unit_progress(args, user) {
  if (!staff(user)) throw new HttpError(403, "Not authorized");
  const subjectCode = args._subject_code;
  const unit = Number(args._unit_number);
  if (unit < 1 || unit > 5) throw new HttpError(400, "Unit must be 1-5");
  const progress = Math.max(0, Math.min(100, Number(args._progress) || 0));

  await SyllabusUnit.findOneAndUpdate(
    { subject_code: subjectCode, unit_number: unit },
    { $set: { progress, updated_by: user.id } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const units = await SyllabusUnit.find({ subject_code: subjectCode }).lean();
  const sum = units.reduce((acc, u) => acc + (u.progress || 0), 0);
  const average = Math.round(sum / 5);

  await Subject.updateOne({ code: subjectCode }, { $set: { completion: average } });
  emitChange("syllabus_units", "UPDATE", { subject_code: subjectCode, unit_number: unit, progress });
  return average;
}

/** Copies faculty names from the timetable onto the matching syllabus subjects. */
async function sync_syllabus_faculty_from_timetable(_args, user) {
  if (!staff(user)) throw new HttpError(403, "Not authorized");
  const [slots, maps] = await Promise.all([
    Timetable.find({ faculty_name: { $ne: null } }).lean(),
    SubjectCodeMap.find({}).lean(),
  ]);

  const byShort = new Map(maps.map((m) => [m.short_code.toUpperCase(), m]));
  const assignments = new Map();
  for (const slot of slots) {
    const map = byShort.get(String(slot.subject_code || "").toUpperCase());
    if (!map) continue;
    assignments.set(map.syllabus_code, slot.faculty_name);
    if (map.lab_code) assignments.set(map.lab_code, slot.faculty_name);
  }

  let updated = 0;
  for (const [code, facultyName] of assignments) {
    const result = await Subject.updateOne(
      { code, faculty_name: { $ne: facultyName } },
      { $set: { faculty_name: facultyName } },
    );
    updated += result.modifiedCount || 0;
  }
  return updated;
}

async function get_user_role(args, user) {
  const target = args?._user_id || user?.id;
  const row = await UserRole.findOne({ user_id: target }).lean();
  return row?.role ?? null;
}

async function has_role(args, user) {
  const target = args?._user_id || user?.id;
  const row = await UserRole.findOne({ user_id: target, role: args?._role }).lean();
  return !!row;
}

const procedures = {
  get_profile_directory,
  admin_list_faculty,
  update_student_fee,
  update_unit_progress,
  sync_syllabus_faculty_from_timetable,
  get_user_role,
  has_role,
};

/** POST /api/rpc/:name */
const callRpc = asyncHandler(async (req, res) => {
  const fn = procedures[req.params.name];
  if (!fn) throw new HttpError(404, `Unknown function "${req.params.name}"`);
  const data = await fn(req.body || {}, req.user);
  res.json({ data, error: null });
});

module.exports = { callRpc, procedures };
