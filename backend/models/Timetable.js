const { makeSchema, mongoose } = require("./baseSchema");

const timetableSchema = makeSchema({
  section: { type: String, required: true, index: true },
  semester: { type: String, required: true },
  branch: { type: String, required: true },
  day: { type: String, required: true },
  slot: { type: Number, required: true },
  subject_code: { type: String, default: null },
  faculty_name: { type: String, default: null, index: true },
  room: { type: String, default: null },
});

module.exports = mongoose.model("Timetable", timetableSchema, "timetable");
