import { Router } from "express";
import { body, validationResult } from "express-validator";
import { Product } from "../models/Product.js";
import { Review } from "../models/Review.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { requireCustomer } from "../middleware/customerAuth.js";

const router = Router();

function toPublicReview(doc) {
  const r = doc.toObject ? doc.toObject() : doc;
  return {
    id: r._id?.toString() ?? r.id,
    rating: r.rating,
    title: r.title || "",
    body: r.body,
    authorName: r.authorName,
    createdAt: r.createdAt,
  };
}

router.get(
  "/products/:slug/reviews",
  asyncHandler(async (req, res) => {
    const product = await Product.findOne({ slug: req.params.slug, published: true }).select("_id slug");
    if (!product) return res.status(404).json({ error: "Product not found" });
    const reviews = await Review.find({ productId: product._id, status: "approved" })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ reviews: reviews.map(toPublicReview) });
  }),
);

router.get(
  "/customer/reviews/for-product/:slug",
  requireCustomer,
  asyncHandler(async (req, res) => {
    const product = await Product.findOne({ slug: req.params.slug, published: true }).select("_id");
    if (!product) return res.status(404).json({ error: "Product not found" });
    const mine = await Review.findOne({ productId: product._id, customerId: req.customer.id });
    if (!mine) {
      return res.json({ review: null, canSubmit: true });
    }
    res.json({
      review: {
        id: mine._id.toString(),
        rating: mine.rating,
        title: mine.title || "",
        body: mine.body,
        status: mine.status,
        createdAt: mine.createdAt,
      },
      canSubmit: mine.status === "rejected",
    });
  }),
);

router.post(
  "/reviews",
  requireCustomer,
  body("productSlug").trim().isLength({ min: 1 }),
  body("rating").isInt({ min: 1, max: 5 }),
  body("body").trim().isLength({ min: 10, max: 2000 }),
  body("title").optional({ values: "falsy" }).trim().isLength({ max: 120 }),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: "Invalid review", details: errors.array() });
    }
    const { productSlug, rating, title, body: reviewBody } = req.body;
    const product = await Product.findOne({ slug: productSlug, published: true });
    if (!product) return res.status(404).json({ error: "Product not found" });

    const existing = await Review.findOne({ productId: product._id, customerId: req.customer.id });
    if (existing?.status === "approved") {
      return res.status(409).json({ error: "You have already reviewed this product" });
    }

    const authorName = req.customer.name || req.customer.email.split("@")[0];
    const payload = {
      productId: product._id,
      productSlug: product.slug,
      customerId: req.customer.id,
      authorName,
      rating: Number(rating),
      title: title?.trim() || "",
      body: reviewBody.trim(),
      status: "pending",
    };

    let review;
    if (existing) {
      review = await Review.findByIdAndUpdate(existing._id, payload, { new: true });
    } else {
      review = await Review.create(payload);
    }

    res.status(existing ? 200 : 201).json({
      review: {
        id: review._id.toString(),
        status: review.status,
        rating: review.rating,
        title: review.title,
        body: review.body,
      },
      message: "Thank you! Your review will appear after our team approves it.",
    });
  }),
);

export default router;
