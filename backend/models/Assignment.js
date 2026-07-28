const { makeSchema, mongoose } = require("./baseSchema");

const assignmentSchema = makeSchema({
  title: { type: String, required: true },
  description: { type: String, default: null },
  subject_code: { type: String, default: null, index: true },
  deadline: { type: Date, default: null },
  file_url: { type: String, default: null },
  created_by: { type: String, default: null },
});
const Assignment = mongoose.model("Assignment", assignmentSchema, "assignments");

const submissionSchema = makeSchema({
  assignment_id: { type: String, required: true, index: true },
  student_id: { type: String, required: true, index: true },
  file_url: { type: String, required: true },
  submitted_at: { type: Date, default: Date.now },
});
submissionSchema.index({ assignment_id: 1, student_id: 1 }, { unique: true });
const AssignmentSubmission = mongoose.model(
  "AssignmentSubmission",
  submissionSchema,
  "assignment_submissions",
);

module.exports = { Assignment, AssignmentSubmission };
