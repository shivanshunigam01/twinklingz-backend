import { Router } from "express";
import { body, validationResult } from "express-validator";
import { FormSubmission } from "../models/FormSubmission.js";
import { asyncHandler } from "../middleware/errorHandler.js";

const router = Router();

router.post(
  "/",
  body("type").isIn(["contact", "newsletter", "track_order", "account_signup", "other"]),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: "Invalid submission", details: errors.array() });
    }
    const { type, name, email, phone, subject, message, payload, sourcePath } = req.body;
    if (type === "newsletter" && !email) {
      return res.status(400).json({ error: "Email is required for newsletter signup" });
    }
    const doc = await FormSubmission.create({
      type,
      name,
      email,
      phone,
      subject,
      message,
      payload: payload ?? {},
      sourcePath,
    });
    res.status(201).json({ ok: true, id: doc._id });
  }),
);

export default router;
