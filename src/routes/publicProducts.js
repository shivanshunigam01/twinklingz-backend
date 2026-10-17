import { Router } from "express";
import { Product } from "../models/Product.js";
import { asyncHandler } from "../middleware/errorHandler.js";

const router = Router();

function toPublicProduct(doc) {
  const p = doc.toObject ? doc.toObject() : doc;
  return {
    id: p._id?.toString() ?? p.id,
    slug: p.slug,
    sku: p.sku,
    name: p.name,
    category: p.category,
    description: p.description,
    price: p.price,
    mrp: p.mrp,
    badge: p.badge,
    rating: p.rating,
    reviews: p.reviews,
    image: p.image,
    altImage: p.altImage,
    images: p.images,
    inStock: p.inStock,
    featured: p.featured,
  };
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const filter = { published: true };
    if (req.query.category) filter.category = String(req.query.category);
    if (req.query.featured === "true") filter.featured = true;
    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json({ products: products.map(toPublicProduct) });
  }),
);

router.get(
  "/:slug",
  asyncHandler(async (req, res) => {
    const product = await Product.findOne({ slug: req.params.slug, published: true });
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json({ product: toPublicProduct(product) });
  }),
);

export default router;
