// server/routes/auth.js — Authentication routes

import { Router } from "express";
import bcrypt from "bcrypt";
import { query } from "../config/database.js";
import { authGuard, signToken } from "../middleware/authGuard.js";

const router = Router();

// POST /api/auth/login — email + password → JWT
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const result = await query(
      "SELECT u.*, o.name AS org_name, o.slug AS org_slug FROM users u JOIN organizations o ON u.org_id = o.id WHERE u.email = $1",
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = signToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        org: {
          id: user.org_id,
          name: user.org_name,
          slug: user.org_slug,
        },
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// POST /api/auth/logout — client-side token discard (stateless JWT)
router.post("/logout", (_req, res) => {
  res.json({ ok: true });
});

// GET /api/auth/me — current user info
router.get("/me", authGuard, async (req, res) => {
  try {
    const result = await query(
      "SELECT u.id, u.email, u.name, u.role, u.org_id, o.name AS org_name, o.slug AS org_slug FROM users u JOIN organizations o ON u.org_id = o.id WHERE u.id = $1",
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      org: {
        id: user.org_id,
        name: user.org_name,
        slug: user.org_slug,
      },
    });
  } catch (err) {
    console.error("Me error:", err);
    res.status(500).json({ error: "Failed to load user" });
  }
});

export default router;
