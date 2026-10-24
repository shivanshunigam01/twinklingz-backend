import { Router } from "express";
import { body, validationResult } from "express-validator";
import { Review } from "../../models/Review.js";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { syncProductReviewStats } from "../../lib/syncProductReviewStats.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const status = req.query.status ? String(req.query.status) : undefined;
    const productSlug = req.query.productSlug ? String(req.query.productSlug).trim() : undefined;
    const filter = {};
    if (status && ["pending", "approved", "rejected"].includes(status)) {
      filter.status = status;
    }
    if (productSlug) {
      filter.productSlug = productSlug;
    }
    const reviews = await Review.find(filter).sort({ createdAt: -1 }).limit(500);
    res.json({
      reviews: reviews.map((r) => ({
        id: r._id.toString(),
        productId: r.productId.toString(),
        productSlug: r.productSlug,
        authorName: r.authorName,
        rating: r.rating,
        title: r.title || "",
        body: r.body,
        status: r.status,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
    });
  }),
);

router.patch(
  "/:id",
  body("status").optional().isIn(["approved", "rejected", "pending"]),
  body("rating").optional().isInt({ min: 1, max: 5 }),
  body("title").optional({ values: "falsy" }).trim().isLength({ max: 120 }),
  body("body").optional().trim().isLength({ min: 10, max: 2000 }),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: "Invalid review update", details: errors.array() });
    }
    const { status, rating, title, body: reviewBody } = req.body;
    if (status === undefined && rating === undefined && title === undefined && reviewBody === undefined) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ error: "Review not found" });

    const prevStatus = review.status;
    if (status !== undefined) review.status = status;
    if (rating !== undefined) review.rating = Number(rating);
    if (title !== undefined) review.title = title?.trim() || "";
    if (reviewBody !== undefined) review.body = reviewBody.trim();
    await review.save();

    if (prevStatus === "approved" || review.status === "approved") {
      await syncProductReviewStats(review.productId);
    }

    res.json({
      review: {
        id: review._id.toString(),
        status: review.status,
        productSlug: review.productSlug,
        rating: review.rating,
        title: review.title || "",
        body: review.body,
      },
    });
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) return res.status(404).json({ error: "Review not found" });
    if (review.status === "approved") {
      await syncProductReviewStats(review.productId);
    }
    res.json({ ok: true });
  }),
);

export default router;
