import { models } from "../models/index.js";
import { HttpError } from "../middleware/error.js";
import { isFeeManager, isStaff, isAdmin } from "../middleware/policy.js";
import { emitChange } from "../realtime.js";

const handlers = {
  /** Directory of profiles visible to any authenticated user. */
  get_profile_directory: async (_args, user) => {
    if (!user) throw new HttpError(401, "Not authenticated", "401");
    return models.profiles
      .find(
        {},
        {
          _id: 0,
          user_id: 1,
          full_name: 1,
          avatar_url: 1,
          roll_number: 1,
          employee_id: 1,
          branch: 1,
          semester: 1,
          section: 1,
          course: 1,
          year: 1,
          bio: 1,
        }
      )
      .lean();
  },

  admin_list_faculty: async (_args, user) => {
    if (!isAdmin(user)) throw new HttpError(403, "Not authorized", "42501");
    return models.faculty.find({}).sort({ name: 1 }).lean();
  },

  /** Atomic, server-validated fee update. */
  update_student_fee: async (args, user) => {
    if (!isFeeManager(user)) throw new HttpError(403, "Not authorized", "42501");
    const student_id = args._student_id;
    const total_fee = Number(args._total_fee);
    const paid_amount = Number(args._paid_amount);
    if (!Number.isFinite(total_fee) || !Number.isFinite(paid_amount))
      throw new HttpError(400, "Total and paid are required", "400");
    if (total_fee < 0 || paid_amount < 0)
      throw new HttpError(400, "Amounts must be non-negative", "400");
    if (paid_amount > total_fee)
      throw new HttpError(
        400,
        `Paid amount (${paid_amount}) cannot exceed total fee (${total_fee})`,
        "400"
      );

    const existing = await models.student_fees.findOne({ student_id }).lean();
    const prev_paid = Number(existing?.paid_amount || 0);
    if (existing && paid_amount < prev_paid)
      throw new HttpError(
        400,
        `Paid amount cannot decrease (previous: ${prev_paid}, new: ${paid_amount})`,
        "400"
      );

    const doc = await models.student_fees
      .findOneAndUpdate(
        { student_id },
        { $set: { student_id, total_fee, paid_amount, updated_by: user.id } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      )
      .lean();
    emitChange("student_fees", existing ? "UPDATE" : "INSERT", doc);

    return [
      {
        total_fee,
        paid_amount,
        remaining_amount: Math.max(total_fee - paid_amount, 0),
        payment_diff: Math.max(paid_amount - prev_paid, 0),
      },
    ];
  },

  /** Sets unit progress and recomputes subject completion as the 5-unit average. */
  update_unit_progress: async (args, user) => {
    if (!isStaff(user)) throw new HttpError(403, "Not authorized", "42501");
    const subject_code = args._subject_code;
    const unit_number = Number(args._unit_number);
    if (unit_number < 1 || unit_number > 5)
      throw new HttpError(400, "Unit must be 1-5", "400");
    const progress = Math.max(0, Math.min(100, Number(args._progress) || 0));

    await models.syllabus_units.findOneAndUpdate(
      { subject_code, unit_number },
      { $set: { subject_code, unit_number, progress, updated_by: user.id } },
      { upsert: true, setDefaultsOnInsert: true }
    );

    const units = await models.syllabus_units.find({ subject_code }).lean();
    const sum = units.reduce((a, u) => a + Number(u.progress || 0), 0);
    const completion = Math.round(sum / 5);
    await models.subjects.updateOne({ code: subject_code }, { $set: { completion } });
    emitChange("syllabus_units", "UPDATE", { subject_code, unit_number, progress });
    return completion;
  },

  /** Copies faculty names from the timetable onto their syllabus subjects. */
  sync_syllabus_faculty_from_timetable: async (_args, user) => {
    if (!isStaff(user)) throw new HttpError(403, "Not authorized", "42501");
    const [slots, map] = await Promise.all([
      models.timetable.find({ faculty_name: { $ne: null } }).lean(),
      models.subject_code_map.find({}).lean(),
    ]);
    const byShort = new Map(map.map((m) => [String(m.short_code).toUpperCase(), m]));
    const target = new Map();
    for (const s of slots) {
      const m = byShort.get(String(s.subject_code || "").toUpperCase());
      if (!m) continue;
      if (m.syllabus_code) target.set(m.syllabus_code, s.faculty_name);
      if (m.lab_code) target.set(m.lab_code, s.faculty_name);
    }
    let updated = 0;
    for (const [code, faculty_name] of target) {
      const r = await models.subjects.updateOne(
        { code, faculty_name: { $ne: faculty_name } },
        { $set: { faculty_name } }
      );
      updated += r.modifiedCount || 0;
    }
    return updated;
  },

  has_role: async (args) => {
    const row = await models.user_roles
      .findOne({ user_id: args._user_id, role: args._role })
      .lean();
    return !!row;
  },

  get_user_role: async (args) => {
    const row = await models.user_roles.findOne({ user_id: args._user_id }).lean();
    return row?.role || null;
  },

  is_fee_manager: async (args) => {
    const [role, profile] = await Promise.all([
      models.user_roles.findOne({ user_id: args._user_id }).lean(),
      models.profiles.findOne({ user_id: args._user_id }).lean(),
    ]);
    return isFeeManager({ role: role?.role, profile });
  },
};

export const callRpc = async (req, res, next) => {
  try {
    const { fn, args = {} } = req.body || {};
    const handler = handlers[fn];
    if (!handler) throw new HttpError(400, `Unknown function "${fn}"`, "400");
    const data = await handler(args, req.user);
    res.json({ data });
  } catch (err) {
    next(err);
  }
};
