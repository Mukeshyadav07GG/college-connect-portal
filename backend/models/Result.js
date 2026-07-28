const { makeSchema, mongoose } = require("./baseSchema");

const resultSchema = makeSchema({
  student_id: { type: String, required: true, index: true },
  subject_code: { type: String, required: true, index: true },
  exam_type: {
    type: String,
    enum: ["sessional1", "sessional2", "put", "semester"],
    required: true,
  },
  marks: { type: Number, required: true },
  max_marks: { type: Number, required: true },
});

module.exports = mongoose.model("Result", resultSchema, "results");
