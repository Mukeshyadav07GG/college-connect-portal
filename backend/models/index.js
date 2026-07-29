import mongoose from "mongoose";
import { v4 as uuid } from "uuid";

/**
 * Every ERP collection keeps the exact same field names the frontend already
 * uses, and keeps UUID string ids so existing relations keep working.
 */
export const COLLECTIONS = [
  "users",
  "user_roles",
  "profiles",
  "faculty",
  "subjects",
  "subject_code_map",
  "subject_notes",
  "syllabus_units",
  "syllabus_problems",
  "timetable",
  "attendance",
  "assignments",
  "assignment_submissions",
  "results",
  "hostel_allocations",
  "hostel_images",
  "announcements",
  "events",
  "student_fees",
  "student_documents",
  "chat_messages",
];

const makeSchema = (name) => {
  const schema = new mongoose.Schema(
    { id: { type: String, default: uuid, unique: true, index: true } },
    {
      collection: name,
      strict: false,
      minimize: false,
      versionKey: false,
      timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
      toJSON: {
        virtuals: false,
        transform: (_doc, ret) => {
          delete ret._id;
          delete ret.password_hash;
          return ret;
        },
      },
    }
  );
  return schema;
};

export const models = Object.fromEntries(
  COLLECTIONS.map((name) => [name, mongoose.model(name, makeSchema(name))])
);

export const getModel = (table) => models[table] || null;
