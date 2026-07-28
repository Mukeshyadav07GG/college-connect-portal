const jwt = require("jsonwebtoken");
const { UserRole } = require("../models");

const JWT_SECRET = () => process.env.JWT_SECRET || "dev-insecure-secret";

function signToken(user, role) {
  return jwt.sign({ sub: String(user._id), email: user.email, role }, JWT_SECRET(), {
    expiresIn: "7d",
  });
}

function decodeToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET());
  } catch {
    return null;
  }
}

/** Attaches req.user = { id, email, role } when a valid bearer token is present. */
async function attachUser(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return next();

  const payload = decodeToken(token);
  if (!payload) return next();

  let role = payload.role;
  if (!role) {
    const row = await UserRole.findOne({ user_id: payload.sub }).lean();
    role = row?.role || null;
  }
  req.user = { id: payload.sub, email: payload.email, role };
  req.token = token;
  next();
}

/** Blocks anonymous requests. */
function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });
  next();
}

/** Blocks users whose role is not in the allowed list. */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Not authorized" });
    }
    next();
  };
}

const isAdmin = (req) => req.user?.role === "admin";
const isStaff = (req) => req.user?.role === "admin" || req.user?.role === "faculty";

module.exports = { signToken, decodeToken, attachUser, requireAuth, requireRole, isAdmin, isStaff };
