const bcrypt = require("bcryptjs");
const { makeSchema, mongoose } = require("./baseSchema");

/** Auth identity (replaces auth.users). */
const userSchema = makeSchema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password_hash: { type: String, required: true, select: false },
  email_confirmed: { type: Boolean, default: true },
  last_sign_in_at: { type: Date, default: null },
});

userSchema.methods.verifyPassword = function (plain) {
  return bcrypt.compare(plain, this.password_hash);
};

userSchema.statics.hashPassword = function (plain) {
  return bcrypt.hash(plain, 10);
};

const User = mongoose.model("User", userSchema, "users");

/** Roles live in their own collection - never on the profile. */
const userRoleSchema = makeSchema({
  user_id: { type: String, required: true, index: true },
  role: { type: String, enum: ["student", "faculty", "admin"], required: true },
});
userRoleSchema.index({ user_id: 1, role: 1 }, { unique: true });
const UserRole = mongoose.model("UserRole", userRoleSchema, "user_roles");

/** Student / faculty / admin profile data. */
const profileSchema = makeSchema({
  user_id: { type: String, required: true, unique: true, index: true },
  full_name: { type: String, required: true },
  email: { type: String, default: null },
  roll_number: { type: String, default: null, index: true },
  employee_id: { type: String, default: null, index: true },
  branch: { type: String, default: null },
  semester: { type: String, default: null },
  section: { type: String, default: null },
  course: { type: String, default: null },
  year: { type: String, default: null },
  phone: { type: String, default: null },
  avatar_url: { type: String, default: null },
  bio: { type: String, default: null },
  dob: { type: String, default: null },
  aadhar: { type: String, default: null },
  prefs: { type: mongoose.Schema.Types.Mixed, default: {} },
});
const Profile = mongoose.model("Profile", profileSchema, "profiles");

/** Single-device session tracking. */
const activeSessionSchema = makeSchema({
  user_id: { type: String, required: true, unique: true, index: true },
  session_token: { type: String, required: true },
  device_info: { type: String, default: null },
  user_agent: { type: String, default: null },
});
const ActiveSession = mongoose.model("ActiveSession", activeSessionSchema, "active_sessions");

module.exports = { User, UserRole, Profile, ActiveSession };
