import { HttpError } from "./error.js";

export const FEE_MANAGER_EMPLOYEE_IDS = ["FAC003", "FAC008"];

export const isAdmin = (user) => user?.role === "admin";
export const isStaff = (user) => user?.role === "admin" || user?.role === "faculty";

export const isFeeManager = (user) =>
  isAdmin(user) ||
  (user?.role === "faculty" &&
    FEE_MANAGER_EMPLOYEE_IDS.includes(user?.profile?.employee_id));

/** Tables only staff may write to. */
const STAFF_WRITE = new Set([
  "faculty",
  "subjects",
  "subject_code_map",
  "subject_notes",
  "syllabus_units",
  "timetable",
  "attendance",
  "assignments",
  "results",
  "hostel_allocations",
  "hostel_images",
  "announcements",
  "events",
]);

const ADMIN_WRITE = new Set(["user_roles", "users"]);
const FEE_WRITE = new Set(["student_fees", "student_documents"]);

/** Rows a user may read — mirrors the previous row level security rules. */
export const readScope = (table, user) => {
  if (!user) throw new HttpError(401, "Not authenticated", "401");
  if (isAdmin(user)) return {};
  switch (table) {
    case "student_fees":
      return isFeeManager(user) ? {} : { student_id: user.id };
    case "student_documents":
      return isFeeManager(user) ? {} : { student_id: user.id };
    case "results":
      return isStaff(user) ? {} : { student_id: user.id };
    case "attendance":
      return isStaff(user) ? {} : { student_id: user.id };
    case "assignment_submissions":
      return isStaff(user) ? {} : { student_id: user.id };
    case "syllabus_problems":
      return isStaff(user) ? {} : { uploaded_by: user.id };
    case "user_roles":
      return isStaff(user) ? {} : { user_id: user.id };
    default:
      return {};
  }
};

export const assertWrite = (table, user, action, payload) => {
  if (!user) throw new HttpError(401, "Not authenticated", "401");
  if (isAdmin(user)) return;
  if (ADMIN_WRITE.has(table)) throw new HttpError(403, "Not authorized", "42501");
  if (FEE_WRITE.has(table) && !isFeeManager(user))
    throw new HttpError(403, "Not authorized", "42501");
  if (STAFF_WRITE.has(table) && !isStaff(user))
    throw new HttpError(403, "Not authorized", "42501");
  if (table === "profiles" && action !== "select") {
    const target = payload?.user_id;
    if (target && target !== user.id && !isStaff(user))
      throw new HttpError(403, "Not authorized", "42501");
  }
};

/** Columns non-admins may never receive. */
const HIDDEN = {
  profiles: ["aadhar", "dob"],
  faculty: ["mobile"],
};

export const stripSensitive = (table, user, rows) => {
  if (isAdmin(user)) return rows;
  const cols = HIDDEN[table];
  if (!cols) return rows;
  return rows.map((r) => {
    const copy = { ...r };
    for (const c of cols) if (copy.user_id !== user?.id) delete copy[c];
    return copy;
  });
};
