const { Profile } = require("../models");
const { HttpError } = require("./error");

const FEE_COORDINATOR_IDS = ["FAC003", "FAC008"];

/** Admin, or the two designated fee coordinators (Nikhil Tyagi / Aditi Gautam). */
async function isFeeManager(user) {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.role !== "faculty") return false;
  const profile = await Profile.findOne({ user_id: user.id }).lean();
  return !!profile?.employee_id && FEE_COORDINATOR_IDS.includes(profile.employee_id);
}

const staff = (u) => u?.role === "admin" || u?.role === "faculty";
const admin = (u) => u?.role === "admin";

/**
 * Access policies, one per table. This is the MongoDB equivalent of the
 * previous row level security rules.
 *
 *   read(user)  -> true | false | <extra mongo filter to AND into the query>
 *   write(user, action, payload) -> boolean (may be async)
 */
const ownRow = (field) => async (user) =>
  staff(user) ? true : { [field]: user.id };

const policies = {
  profiles: {
    read: async (user) => (staff(user) ? true : { user_id: user.id }),
    write: async (user, action, payload) => {
      if (admin(user)) return true;
      if (action === "delete") return false;
      return payload?.user_id === user.id || payload?.__match?.user_id === user.id;
    },
    // Fields only an admin may change.
    protectedFields: ["employee_id", "roll_number"],
  },
  user_roles: {
    read: async (user) => (staff(user) ? true : { user_id: user.id }),
    write: async (user) => admin(user),
  },
  active_sessions: {
    read: async (user) => ({ user_id: user.id }),
    write: async (user, _a, payload) => payload?.user_id === user.id,
  },

  faculty: { read: async () => true, write: async (user) => admin(user) },
  subjects: { read: async () => true, write: async (user) => staff(user) },
  subject_code_map: { read: async () => true, write: async (user) => staff(user) },
  timetable: { read: async () => true, write: async (user) => staff(user) },
  announcements: { read: async () => true, write: async (user) => staff(user) },
  events: { read: async () => true, write: async (user) => staff(user) },
  hostel_images: { read: async () => true, write: async (user) => staff(user) },
  subject_notes: { read: async () => true, write: async (user) => staff(user) },
  syllabus_units: { read: async () => true, write: async (user) => staff(user) },
  assignments: { read: async () => true, write: async (user) => staff(user) },

  attendance: {
    read: ownRow("student_id"),
    write: async (user) => staff(user),
  },
  results: {
    read: ownRow("student_id"),
    write: async (user) => staff(user),
  },
  assignment_submissions: {
    read: ownRow("student_id"),
    write: async (user, action, payload) => {
      if (action === "delete") return false;
      if (staff(user)) return true;
      return payload?.student_id === user.id;
    },
  },
  syllabus_problems: {
    read: ownRow("student_id"),
    write: async (user, action, payload) => {
      if (action === "update") return false;
      if (staff(user)) return true;
      return payload?.student_id === user.id || payload?.__match?.student_id === user.id;
    },
  },
  hostel_allocations: {
    read: async (user) => (staff(user) ? true : { student_id: user.id }),
    write: async (user) => admin(user),
  },
  student_fees: {
    read: async (user) => ((await isFeeManager(user)) ? true : { student_id: user.id }),
    write: async (user) => isFeeManager(user),
  },
  student_documents: {
    read: async (user) => ((await isFeeManager(user)) ? true : { student_id: user.id }),
    write: async (user) => isFeeManager(user),
  },
  chat_messages: {
    read: async (user) => ({
      $or: [{ sender_id: user.id }, { recipient_id: user.id }],
    }),
    write: async (user, action, payload) => {
      if (action === "delete") return false;
      if (action === "insert") return payload?.sender_id === user.id;
      // Recipients may only flip the read flag; senders may not edit after send.
      const keys = Object.keys(payload || {}).filter((k) => !k.startsWith("__"));
      return keys.every((k) => k === "read");
    },
  },
};

function getPolicy(table) {
  const policy = policies[table];
  if (!policy) throw new HttpError(404, `Unknown table "${table}"`);
  return policy;
}

/** Returns the mongo filter a user is allowed to read, or throws 403. */
async function readFilter(table, user) {
  const policy = getPolicy(table);
  const result = await policy.read(user);
  if (result === false) throw new HttpError(403, "Not authorized to read this resource");
  return result === true ? {} : result;
}

/** Throws 403 unless the user may perform the write. */
async function assertWrite(table, user, action, payload) {
  const policy = getPolicy(table);
  const allowed = await policy.write(user, action, payload);
  if (!allowed) throw new HttpError(403, "Not authorized to modify this resource");
  if (policy.protectedFields && !admin(user)) {
    for (const field of policy.protectedFields) delete payload?.[field];
  }
}

module.exports = { policies, getPolicy, readFilter, assertWrite, isFeeManager, FEE_COORDINATOR_IDS };
