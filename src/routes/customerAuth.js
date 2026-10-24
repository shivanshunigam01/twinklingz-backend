import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import { CustomerUser } from "../models/CustomerUser.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { requireCustomer } from "../middleware/customerAuth.js";

const router = Router();

function signCustomerToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not configured");
  return jwt.sign({ email: user.email, name: user.name, role: "customer" }, secret, {
    subject: user._id.toString(),
    expiresIn: process.env.JWT_CUSTOMER_EXPIRES_IN || "30d",
  });
}

router.post(
  "/register",
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 6 }),
  body("name").trim().isLength({ min: 2, max: 80 }),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: "Invalid registration details", details: errors.array() });
    }
    const { email, password, name } = req.body;
    const existing = await CustomerUser.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await CustomerUser.create({ email, passwordHash, name: name.trim() });
    const token = signCustomerToken(user);
    res.status(201).json({
      token,
      customer: { id: user._id, email: user.email, name: user.name },
    });
  }),
);

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
    const user = await CustomerUser.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const token = signCustomerToken(user);
    res.json({
      token,
      customer: { id: user._id, email: user.email, name: user.name },
    });
  }),
);

router.get(
  "/me",
  requireCustomer,
  asyncHandler(async (req, res) => {
    const user = await CustomerUser.findById(req.customer.id).select("-passwordHash");
    if (!user) return res.status(404).json({ error: "Account not found" });
    res.json({ customer: { id: user._id, email: user.email, name: user.name } });
  }),
);

export default router;
