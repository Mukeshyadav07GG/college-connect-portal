const { makeSchema, mongoose } = require("./baseSchema");

const studentFeeSchema = makeSchema({
  student_id: { type: String, required: true, unique: true, index: true },
  total_fee: { type: Number, required: true, default: 0 },
  paid_amount: { type: Number, required: true, default: 0 },
  updated_by: { type: String, default: null },
});
const StudentFee = mongoose.model("StudentFee", studentFeeSchema, "student_fees");

const studentDocumentSchema = makeSchema({
  student_id: { type: String, default: null, index: true },
  title: { type: String, required: true },
  file_url: { type: String, required: true },
  type: { type: String, required: true },
  receipt_no: { type: String, default: null, index: true },
  amount: { type: Number, default: null },
  uploaded_by: { type: String, default: null },
});
const StudentDocument = mongoose.model(
  "StudentDocument",
  studentDocumentSchema,
  "student_documents",
);

module.exports = { StudentFee, StudentDocument };
