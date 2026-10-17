import { Router } from "express";
import { FormSubmission } from "../../models/FormSubmission.js";
import { asyncHandler } from "../../middleware/errorHandler.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.type) filter.type = String(req.query.type);
    if (req.query.unread === "true") filter.read = false;
    const submissions = await FormSubmission.find(filter).sort({ createdAt: -1 }).limit(300);
    res.json({ submissions });
  }),
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const submission = await FormSubmission.findByIdAndUpdate(
      req.params.id,
      { read: Boolean(req.body.read) },
      { new: true },
    );
    if (!submission) return res.status(404).json({ error: "Submission not found" });
    res.json({ submission });
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const submission = await FormSubmission.findByIdAndDelete(req.params.id);
    if (!submission) return res.status(404).json({ error: "Submission not found" });
    res.json({ ok: true });
  }),
);

export default router;
