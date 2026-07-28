const {
  Profile,
  UserRole,
  Faculty,
  Timetable,
  Attendance,
  Assignment,
  AssignmentSubmission,
  Result,
  HostelAllocation,
  HostelImage,
  Announcement,
  Event,
  StudentFee,
  StudentDocument,
  ChatMessage,
} = require("../models");
const { asyncHandler, HttpError } = require("../middleware/error");
const { isFeeManager } = require("../middleware/policy");
const { emitChange } = require("../realtime");

const clean = (doc) => {
  if (!doc) return doc;
  const { _id, ...rest } = doc;
  return { id: String(_id), ...rest };
};
const cleanAll = (docs) => docs.map(clean);
const staff = (u) => u?.role === "admin" || u?.role === "faculty";

/* ------------------------------ students ------------------------------ */

/** GET /api/students/profile */
const myProfile = asyncHandler(async (req, res) => {
  const [profile, roleRow] = await Promise.all([
    Profile.findOne({ user_id: req.user.id }).lean(),
    UserRole.findOne({ user_id: req.user.id }).lean(),
  ]);
  res.json({ data: { ...(profile ? clean(profile) : null), role: roleRow?.role ?? null } });
});

/** PATCH /api/students/profile */
const updateMyProfile = asyncHandler(async (req, res) => {
  const payload = { ...req.body };
  if (req.user.role !== "admin") {
    delete payload.employee_id;
    delete payload.roll_number;
  }
  const doc = await Profile.findOneAndUpdate(
    { user_id: req.user.id },
    { $set: payload },
    { new: true },
  ).lean();
  emitChange("profiles", "UPDATE", clean(doc));
  res.json({ data: clean(doc) });
});

/** GET /api/students - staff only */
const listStudents = asyncHandler(async (req, res) => {
  if (!staff(req.user)) throw new HttpError(403, "Not authorized");
  const roles = await UserRole.find({ role: "student" }).lean();
  const ids = roles.map((r) => r.user_id);
  const profiles = await Profile.find({ user_id: { $in: ids } })
    .sort({ roll_number: 1 })
    .lean();
  res.json({ data: cleanAll(profiles) });
});

/* ------------------------------- faculty ------------------------------ */

/** GET /api/faculty */
const listFaculty = asyncHandler(async (req, res) => {
  const fields =
    req.user?.role === "admin"
      ? undefined
      : "name role subjects description email contact_email room_no available_time experience qualification avatar_url created_at";
  const rows = await Faculty.find({}, fields).sort({ name: 1 }).lean();
  res.json({ data: cleanAll(rows) });
});

/* ------------------------------ timetable ----------------------------- */

/** GET /api/timetable?section=&semester=&branch= */
const getTimetable = asyncHandler(async (req, res) => {
  const filter = {};
  ["section", "semester", "branch", "faculty_name"].forEach((k) => {
    if (req.query[k]) filter[k] = req.query[k];
  });
  const rows = await Timetable.find(filter).sort({ day: 1, slot: 1 }).lean();
  res.json({ data: cleanAll(rows) });
});

/* ------------------------------ attendance ---------------------------- */

/** POST /api/attendance - bulk mark, staff only */
const markAttendance = asyncHandler(async (req, res) => {
  if (!staff(req.user)) throw new HttpError(403, "Not authorized");
  const records = Array.isArray(req.body) ? req.body : [req.body];
  const saved = [];
  for (const record of records) {
    const doc = await Attendance.findOneAndUpdate(
      {
        student_id: record.student_id,
        subject_code: record.subject_code,
        date: record.date,
      },
      { $set: { status: record.status, marked_by: req.user.id } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();
    saved.push(clean(doc));
  }
  emitChange("attendance", "INSERT", saved);
  res.status(201).json({ data: saved });
});

/** GET /api/attendance?student_id=&subject_code= */
const getAttendance = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.subject_code) filter.subject_code = req.query.subject_code;
  filter.student_id = staff(req.user)
    ? req.query.student_id || { $exists: true }
    : req.user.id;
  const rows = await Attendance.find(filter).sort({ date: -1 }).lean();
  res.json({ data: cleanAll(rows) });
});

/* ------------------------------ messaging ----------------------------- */

/** POST /api/messages/send */
const sendMessage = asyncHandler(async (req, res) => {
  const { recipient_id, message } = req.body || {};
  if (!recipient_id || !message) throw new HttpError(400, "recipient_id and message are required");
  const doc = await ChatMessage.create({
    sender_id: req.user.id,
    recipient_id,
    message,
  });
  const row = clean(doc.toObject());
  emitChange("chat_messages", "INSERT", row);
  res.status(201).json({ data: row });
});

/** GET /api/messages/:peerId */
const getConversation = asyncHandler(async (req, res) => {
  const peer = req.params.peerId;
  const rows = await ChatMessage.find({
    $or: [
      { sender_id: req.user.id, recipient_id: peer },
      { sender_id: peer, recipient_id: req.user.id },
    ],
  })
    .sort({ created_at: 1 })
    .lean();
  res.json({ data: cleanAll(rows) });
});

/** PATCH /api/messages/:id/read */
const markRead = asyncHandler(async (req, res) => {
  const doc = await ChatMessage.findOneAndUpdate(
    { _id: req.params.id, recipient_id: req.user.id },
    { $set: { read: true } },
    { new: true },
  ).lean();
  if (!doc) throw new HttpError(404, "Message not found");
  res.json({ data: clean(doc) });
});

/* --------------------------- assignments ------------------------------ */

const listAssignments = asyncHandler(async (_req, res) => {
  const rows = await Assignment.find({}).sort({ created_at: -1 }).lean();
  res.json({ data: cleanAll(rows) });
});

const createAssignment = asyncHandler(async (req, res) => {
  if (!staff(req.user)) throw new HttpError(403, "Not authorized");
  const doc = await Assignment.create({ ...req.body, created_by: req.user.id });
  const row = clean(doc.toObject());
  emitChange("assignments", "INSERT", row);
  res.status(201).json({ data: row });
});

const submitAssignment = asyncHandler(async (req, res) => {
  const { assignment_id, file_url } = req.body || {};
  if (!assignment_id || !file_url) throw new HttpError(400, "assignment_id and file_url required");
  const doc = await AssignmentSubmission.findOneAndUpdate(
    { assignment_id, student_id: req.user.id },
    { $set: { file_url, submitted_at: new Date() } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();
  emitChange("assignment_submissions", "INSERT", clean(doc));
  res.status(201).json({ data: clean(doc) });
});

/* ------------------------------- results ------------------------------ */

const listResults = asyncHandler(async (req, res) => {
  const studentId = staff(req.user) ? req.query.student_id : req.user.id;
  const filter = studentId ? { student_id: studentId } : {};
  const rows = await Result.find(filter).lean();
  res.json({ data: cleanAll(rows) });
});

const upsertResult = asyncHandler(async (req, res) => {
  if (!staff(req.user)) throw new HttpError(403, "Not authorized");
  const { student_id, subject_code, exam_type, marks, max_marks } = req.body || {};
  const doc = await Result.findOneAndUpdate(
    { student_id, subject_code, exam_type },
    { $set: { marks, max_marks } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();
  emitChange("results", "INSERT", clean(doc));
  res.status(201).json({ data: clean(doc) });
});

/* -------------------------------- hostel ------------------------------ */

const myHostel = asyncHandler(async (req, res) => {
  const doc = await HostelAllocation.findOne({ student_id: req.user.id }).lean();
  res.json({ data: doc ? clean(doc) : null });
});

const listHostelImages = asyncHandler(async (_req, res) => {
  const rows = await HostelImage.find({}).sort({ created_at: -1 }).lean();
  res.json({ data: cleanAll(rows) });
});

/* ---------------------- announcements and events ---------------------- */

const listAnnouncements = asyncHandler(async (_req, res) => {
  const rows = await Announcement.find({}).sort({ created_at: -1 }).lean();
  res.json({ data: cleanAll(rows) });
});

const listEvents = asyncHandler(async (_req, res) => {
  const rows = await Event.find({}).sort({ event_date: 1 }).lean();
  res.json({ data: cleanAll(rows) });
});

/* -------------------------- fees and documents ------------------------ */

const myFees = asyncHandler(async (req, res) => {
  const studentId = (await isFeeManager(req.user)) && req.query.student_id
    ? req.query.student_id
    : req.user.id;
  const [fee, documents] = await Promise.all([
    StudentFee.findOne({ student_id: studentId }).lean(),
    StudentDocument.find({ student_id: studentId }).sort({ created_at: -1 }).lean(),
  ]);
  res.json({
    data: {
      fee: fee ? clean(fee) : null,
      remaining_amount: fee ? Math.max(fee.total_fee - fee.paid_amount, 0) : 0,
      documents: cleanAll(documents),
    },
  });
});

module.exports = {
  myProfile,
  updateMyProfile,
  listStudents,
  listFaculty,
  getTimetable,
  markAttendance,
  getAttendance,
  sendMessage,
  getConversation,
  markRead,
  listAssignments,
  createAssignment,
  submitAssignment,
  listResults,
  upsertResult,
  myHostel,
  listHostelImages,
  listAnnouncements,
  listEvents,
  myFees,
};
