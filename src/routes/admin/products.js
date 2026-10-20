import { Router } from "express";
import multer from "multer";
import { Product } from "../../models/Product.js";
import { isCloudinaryConfigured } from "../../config/cloudinary.js";
import { uploadBufferToCloudinary } from "../../lib/cloudinaryUpload.js";
import { slugify } from "../../utils/slugify.js";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { applyImageFields, isCloudinaryUrl } from "../../lib/productImages.js";

const ALLOWED_FIELDS = [
  "name",
  "sku",
  "slug",
  "category",
  "description",
  "price",
  "mrp",
  "badge",
  "rating",
  "reviews",
  "image",
  "altImage",
  "images",
  "inStock",
  "featured",
  "published",
];

function pickProductBody(body) {
  const data = {};
  for (const key of ALLOWED_FIELDS) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  if (Array.isArray(data.images)) {
    data.images = data.images.filter(isCloudinaryUrl);
  }
  if (data.image && !isCloudinaryUrl(data.image)) delete data.image;
  if (data.altImage && !isCloudinaryUrl(data.altImage)) delete data.altImage;
  return data;
}

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || "").trim();
    const filter = q
      ? { $or: [{ name: new RegExp(q, "i") }, { sku: new RegExp(q, "i") }, { slug: new RegExp(q, "i") }] }
      : {};
    const products = await Product.find(filter).sort({ updatedAt: -1 });
    res.json({ products });
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json({ product });
  }),
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = pickProductBody(req.body);
    if (!data.slug && data.name) data.slug = slugify(data.name);
    const product = await Product.create(data);
    applyImageFields(product);
    await product.save();
    res.status(201).json({ product });
  }),
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    Object.assign(product, pickProductBody(req.body));
    applyImageFields(product);
    await product.save();
    res.json({ product });
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json({ ok: true });
  }),
);

router.post(
  "/:id/images",
  upload.array("images", 10),
  asyncHandler(async (req, res) => {
    if (!isCloudinaryConfigured()) {
      return res.status(503).json({ error: "Cloudinary is not configured" });
    }
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ error: "No images uploaded" });
    const urls = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const publicId = `${product.slug || product.sku}-${Date.now()}-${i + 1}`;
      const result = await uploadBufferToCloudinary(file.buffer, file.originalname, { publicId });
      urls.push(result.secure_url);
    }
    product.images = [...(product.images || []), ...urls];
    applyImageFields(product);
    await product.save();
    res.json({ product, uploaded: urls });
  }),
);

router.put(
  "/:id/images",
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    const { images, image, altImage } = req.body || {};
    if (!Array.isArray(images)) {
      return res.status(400).json({ error: "images array required" });
    }
    product.images = images.filter(isCloudinaryUrl);
    if (image && isCloudinaryUrl(image)) product.image = image;
    if (altImage && isCloudinaryUrl(altImage)) product.altImage = altImage;
    applyImageFields(product);
    await product.save();
    res.json({ product });
  }),
);

router.delete(
  "/:id/images/:index",
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    const index = Number.parseInt(req.params.index, 10);
    if (!Number.isFinite(index) || index < 0 || index >= (product.images?.length || 0)) {
      return res.status(400).json({ error: "Invalid image index" });
    }
    product.images = product.images.filter((_, i) => i !== index);
    applyImageFields(product);
    await product.save();
    res.json({ product });
  }),
);

export default router;
