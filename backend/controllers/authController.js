const { User, UserRole, Profile } = require("../models");
const { signToken } = require("../middleware/auth");
const { asyncHandler, HttpError } = require("../middleware/error");

const buildSession = (user, role, token) => ({
  access_token: token,
  token_type: "bearer",
  expires_in: 60 * 60 * 24 * 7,
  user: {
    id: String(user._id),
    email: user.email,
    role,
    user_metadata: {},
    app_metadata: { role },
  },
});

/** POST /api/auth/login */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) throw new HttpError(400, "Email and password are required");

  const user = await User.findOne({ email: String(email).toLowerCase() }).select("+password_hash");
  if (!user) throw new HttpError(400, "Invalid login credentials");

  const ok = await user.verifyPassword(password);
  if (!ok) throw new HttpError(400, "Invalid login credentials");

  const roleRow = await UserRole.findOne({ user_id: String(user._id) }).lean();
  const role = roleRow?.role || "student";

  user.last_sign_in_at = new Date();
  await user.save();

  const token = signToken(user, role);
  res.json({ session: buildSession(user, role, token), error: null });
});

/** POST /api/auth/register - always creates a student; elevation is admin-only. */
const register = asyncHandler(async (req, res) => {
  const { email, password, full_name, ...meta } = req.body || {};
  if (!email || !password) throw new HttpError(400, "Email and password are required");

  const existing = await User.findOne({ email: String(email).toLowerCase() });
  if (existing) throw new HttpError(409, "A user with this email already exists");

  const user = await User.create({
    email: String(email).toLowerCase(),
    password_hash: await User.hashPassword(password),
  });

  await Profile.create({
    user_id: String(user._id),
    full_name: full_name || String(email).split("@")[0],
    email: user.email,
    roll_number: meta.roll_number ?? null,
    employee_id: meta.employee_id ?? null,
    branch: meta.branch ?? null,
    semester: meta.semester ?? null,
    section: meta.section ?? null,
  });
  await UserRole.create({ user_id: String(user._id), role: "student" });

  const token = signToken(user, "student");
  res.status(201).json({ session: buildSession(user, "student", token), error: null });
});

/** GET /api/auth/session */
const session = asyncHandler(async (req, res) => {
  if (!req.user) return res.json({ session: null, error: null });
  const user = await User.findById(req.user.id);
  if (!user) return res.json({ session: null, error: null });
  res.json({ session: buildSession(user, req.user.role, req.token), error: null });
});

/** PATCH /api/auth/user - change password */
const updateUser = asyncHandler(async (req, res) => {
  const { password } = req.body || {};
  if (!password || String(password).length < 6) {
    throw new HttpError(400, "Password must be at least 6 characters");
  }
  const user = await User.findById(req.user.id);
  if (!user) throw new HttpError(404, "User not found");
  user.password_hash = await User.hashPassword(password);
  await user.save();
  res.json({ data: { id: String(user._id) }, error: null });
});

/** POST /api/auth/logout */
const logout = asyncHandler(async (_req, res) => res.json({ error: null }));

module.exports = { login, register, session, updateUser, logout };
