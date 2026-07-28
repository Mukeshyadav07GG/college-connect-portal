const { makeSchema, mongoose } = require("./baseSchema");

const attendanceSchema = makeSchema({
  student_id: { type: String, required: true, index: true },
  subject_code: { type: String, required: true, index: true },
  date: { type: String, required: true },
  status: { type: String, enum: ["present", "absent", "late"], required: true },
  marked_by: { type: String, default: null },
});
attendanceSchema.index({ student_id: 1, subject_code: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema, "attendance");
