const { makeSchema, mongoose } = require("./baseSchema");

const hostelAllocationSchema = makeSchema({
  student_id: { type: String, required: true, unique: true, index: true },
  hostel_name: { type: String, required: true },
  hostel_type: { type: String, required: true },
  room_no: { type: String, required: true },
  sharing: { type: Number, required: true },
  floor: { type: String, default: null },
  ac_type: { type: String, required: true },
  wifi: { type: Boolean, default: true },
  assigned_by: { type: String, default: null },
});
const HostelAllocation = mongoose.model(
  "HostelAllocation",
  hostelAllocationSchema,
  "hostel_allocations",
);

const hostelImageSchema = makeSchema({
  image_url: { type: String, required: true },
  caption: { type: String, default: null },
  uploaded_by: { type: String, default: null },
});
const HostelImage = mongoose.model("HostelImage", hostelImageSchema, "hostel_images");

module.exports = { HostelAllocation, HostelImage };
