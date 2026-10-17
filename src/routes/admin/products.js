import { Router } from "express";
import multer from "multer";
import { Readable } from "stream";
import { Product } from "../../models/Product.js";
import { cloudinary, isCloudinaryConfigured } from "../../config/cloudinary.js";
import { slugify } from "../../utils/slugify.js";
import { asyncHandler } from "../../middleware/errorHandler.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

function uploadBufferToCloudinary(buffer, filename) {
  const folder = process.env.CLOUDINARY_FOLDER || "twinklingz";
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image", public_id: filename?.replace(/\.[^.]+$/, "") },
      (err, result) => {
        if (err) reject(err);
        else resolve(result);
      },
    );
    Readable.from(buffer).pipe(stream);
  });
}

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
    const data = { ...req.body };
    if (!data.slug && data.name) data.slug = slugify(data.name);
    const product = await Product.create(data);
    res.status(201).json({ product });
  }),
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!product) return res.status(404).json({ error: "Product not found" });
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
    for (const file of files) {
      const result = await uploadBufferToCloudinary(file.buffer, file.originalname);
      urls.push(result.secure_url);
    }
    product.images = [...(product.images || []), ...urls];
    if (!product.image && product.images[0]) product.image = product.images[0];
    if (!product.altImage && product.images[1]) product.altImage = product.images[1];
    await product.save();
    res.json({ product, uploaded: urls });
  }),
);

export default router;
