import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import { AdminUser } from "../models/AdminUser.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();

router.post(
  "/login",
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 6 }),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: "Invalid credentials", details: errors.array() });
    }
    const { email, password } = req.body;
    const user = await AdminUser.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(503).json({ error: "JWT_SECRET is not configured on the server" });
    }
    const token = jwt.sign({ email: user.email, role: "admin" }, secret, {
      subject: user._id.toString(),
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });
    res.json({
      token,
      admin: { id: user._id, email: user.email, name: user.name },
    });
  }),
);

router.get(
  "/me",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const user = await AdminUser.findById(req.admin.id).select("-passwordHash");
    if (!user) return res.status(404).json({ error: "Admin not found" });
    res.json({ admin: user });
  }),
);

export default router;
