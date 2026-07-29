import jwt from "jsonwebtoken";
import { models } from "../models/index.js";
import { HttpError } from "./error.js";

const secret = () => process.env.JWT_SECRET || "dev-secret-change-me";

export const signToken = (payload, expiresIn = "7d") =>
  jwt.sign(payload, secret(), { expiresIn });

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, secret());
  } catch {
    return null;
  }
};

/** Attaches req.user = { id, email, role, profile } when a valid Bearer token exists. */
export const attachUser = async (req, _res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return next();
  const decoded = verifyToken(token);
  if (!decoded?.sub) return next();
  const [roleRow, profile] = await Promise.all([
    models.user_roles.findOne({ user_id: decoded.sub }).lean(),
    models.profiles.findOne({ user_id: decoded.sub }).lean(),
  ]);
  req.user = {
    id: decoded.sub,
    email: decoded.email,
    role: roleRow?.role || "student",
    profile: profile || null,
  };
  next();
};

export const requireAuth = (req, _res, next) => {
  if (!req.user) return next(new HttpError(401, "Not authenticated", "401"));
  next();
};

export const requireRole =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user) return next(new HttpError(401, "Not authenticated", "401"));
    if (!roles.includes(req.user.role))
      return next(new HttpError(403, "Not authorized", "42501"));
    next();
  };
