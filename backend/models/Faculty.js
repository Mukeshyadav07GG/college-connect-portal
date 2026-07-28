const { makeSchema, mongoose } = require("./baseSchema");

const facultySchema = makeSchema({
  name: { type: String, required: true },
  role: { type: String, default: null },
  subjects: { type: [String], default: [] },
  description: { type: String, default: null },
  email: { type: String, default: null },
  contact_email: { type: String, default: null },
  mobile: { type: String, default: null },
  room_no: { type: String, default: null },
  available_time: { type: String, default: null },
  experience: { type: String, default: null },
  qualification: { type: String, default: null },
  avatar_url: { type: String, default: null },
});

module.exports = mongoose.model("Faculty", facultySchema, "faculty");
