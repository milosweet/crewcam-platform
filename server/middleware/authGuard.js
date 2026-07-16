// server/middleware/authGuard.js — Verify JWT and attach user + org to request

import jwt from "jsonwebtoken";
import { query } from "../config/database.js";

const SECRET = () => process.env.JWT_SECRET || "dev-secret-change-me";

/**
 * Middleware: requires a valid JWT in the Authorization header.
 * Attaches req.user = { id, orgId, email, name, role }
 */
export function authGuard(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, SECRET());
    req.user = {
      id: payload.sub,
      orgId: payload.orgId,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Middleware: requires req.user.role === 'admin'.
 * Must be used after authGuard.
 */
export function adminOnly(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

/**
 * Generate a JWT for a user.
 */
export function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      orgId: user.org_id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    SECRET(),
    { expiresIn: "24h" }
  );
}
