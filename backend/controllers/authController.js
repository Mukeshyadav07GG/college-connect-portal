import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { models } from "../models/index.js";
import { HttpError } from "../middleware/error.js";
import { signToken } from "../middleware/auth.js";

const buildSession = async (userDoc) => {
  const [roleRow, profile] = await Promise.all([
    models.user_roles.findOne({ user_id: userDoc.id }).lean(),
    models.profiles.findOne({ user_id: userDoc.id }).lean(),
  ]);
  const access_token = signToken({ sub: userDoc.id, email: userDoc.email });
  return {
    access_token,
    token_type: "bearer",
    expires_at: Math.floor(Date.now() / 1000) + 7 * 24 * 3600,
    user: {
      id: userDoc.id,
      email: userDoc.email,
      user_metadata: userDoc.user_metadata || {},
      role: roleRow?.role || "student",
    },
    profile: profile || null,
    role: roleRow?.role || "student",
  };
};

export const login = async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").toLowerCase().trim();
    const password = String(req.body?.password || "");
    const user = await models.users.findOne({ email }).select("+password_hash").lean();
    if (!user || !user.password_hash)
      throw new HttpError(400, "Invalid login credentials", "invalid_credentials");
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) throw new HttpError(400, "Invalid login credentials", "invalid_credentials");
    res.json({ data: { session: await buildSession(user) } });
  } catch (err) {
    next(err);
  }
};

export const register = async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").toLowerCase().trim();
    const password = String(req.body?.password || "");
    const meta = req.body?.options?.data || req.body?.user_metadata || {};
    if (!email || password.length < 6)
      throw new HttpError(400, "Email and a 6+ character password are required", "400");
    if (await models.users.findOne({ email }))
      throw new HttpError(400, "User already registered", "user_exists");

    const id = uuid();
    const password_hash = await bcrypt.hash(password, 10);
    const user = await models.users.create({ id, email, password_hash, user_metadata: meta });
    await models.user_roles.create({ user_id: id, role: "student" });
    await models.profiles.create({
      user_id: id,
      email,
      full_name: meta.full_name || email.split("@")[0],
      roll_number: meta.roll_number || null,
      employee_id: meta.employee_id || null,
      branch: meta.branch || null,
      semester: meta.semester || null,
      section: meta.section || null,
    });
    res.json({ data: { session: await buildSession(user.toJSON()) } });
  } catch (err) {
    next(err);
  }
};

export const session = async (req, res, next) => {
  try {
    if (!req.user) return res.json({ data: { session: null } });
    const user = await models.users.findOne({ id: req.user.id }).lean();
    if (!user) return res.json({ data: { session: null } });
    res.json({ data: { session: await buildSession(user) } });
  } catch (err) {
    next(err);
  }
};

export const updatePassword = async (req, res, next) => {
  try {
    const password = String(req.body?.password || "");
    if (password.length < 6) throw new HttpError(400, "Password too short", "400");
    const password_hash = await bcrypt.hash(password, 10);
    await models.users.updateOne({ id: req.user.id }, { $set: { password_hash } });
    res.json({ data: { user: { id: req.user.id } } });
  } catch (err) {
    next(err);
  }
};
