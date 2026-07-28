const { makeSchema, mongoose } = require("./baseSchema");

const subjectSchema = makeSchema({
  code: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  faculty_name: { type: String, default: null, index: true },
  branch: { type: String, default: null },
  semester: { type: String, default: null },
  units: { type: mongoose.Schema.Types.Mixed, default: [] },
  completion: { type: Number, default: 0 },
});
const Subject = mongoose.model("Subject", subjectSchema, "subjects");

const subjectCodeMapSchema = makeSchema({
  short_code: { type: String, required: true, unique: true, index: true },
  syllabus_code: { type: String, required: true },
  lab_code: { type: String, default: null },
});
const SubjectCodeMap = mongoose.model("SubjectCodeMap", subjectCodeMapSchema, "subject_code_map");

const subjectNoteSchema = makeSchema({
  subject_code: { type: String, required: true, index: true },
  unit_number: { type: Number, default: null },
  title: { type: String, required: true },
  file_path: { type: String, required: true },
  uploaded_by: { type: String, default: null },
});
const SubjectNote = mongoose.model("SubjectNote", subjectNoteSchema, "subject_notes");

const syllabusUnitSchema = makeSchema({
  subject_code: { type: String, required: true, index: true },
  unit_number: { type: Number, required: true, min: 1, max: 5 },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  updated_by: { type: String, default: null },
});
syllabusUnitSchema.index({ subject_code: 1, unit_number: 1 }, { unique: true });
const SyllabusUnit = mongoose.model("SyllabusUnit", syllabusUnitSchema, "syllabus_units");

const syllabusProblemSchema = makeSchema({
  student_id: { type: String, required: true, index: true },
  subject_code: { type: String, required: true, index: true },
  unit_number: { type: Number, required: true },
  title: { type: String, required: true },
  file_url: { type: String, required: true },
});
const SyllabusProblem = mongoose.model("SyllabusProblem", syllabusProblemSchema, "syllabus_problems");

module.exports = { Subject, SubjectCodeMap, SubjectNote, SyllabusUnit, SyllabusProblem };
