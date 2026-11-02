import { Router } from "express";
import multer from "multer";
import { getOrCreateSiteSettings } from "../../models/SiteSettings.js";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { isCloudinaryConfigured } from "../../config/cloudinary.js";
import { uploadBufferToCloudinary } from "../../lib/cloudinaryUpload.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024 } });

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const settings = await getOrCreateSiteSettings();
    res.json({ settings });
  }),
);

router.put(
  "/",
  asyncHandler(async (req, res) => {
    const settings = await getOrCreateSiteSettings();
    const allowedRoots = [
      "brandName",
      "subBrand",
      "tagline",
      "announcementBar",
      "contact",
      "social",
      "returnRefundPolicy",
      "storyCopy",
      "offerBannerImage",
      "offerBannerImageMobile",
    ];
    for (const key of allowedRoots) {
      if (req.body[key] !== undefined) settings[key] = req.body[key];
    }
    await settings.save();
    res.json({ settings });
  }),
);

router.post(
  "/offer-banner",
  upload.single("image"),
  asyncHandler(async (req, res) => {
    if (!isCloudinaryConfigured()) {
      return res.status(503).json({ error: "Cloudinary is not configured on the server" });
    }
    if (!req.file?.buffer?.length) {
      return res.status(400).json({ error: "Choose an image file to upload" });
    }

    const settings = await getOrCreateSiteSettings();
    const result = await uploadBufferToCloudinary(req.file.buffer, req.file.originalname, {
      publicId: `marketing/offer-banner-${Date.now()}`,
    });
    settings.offerBannerImage = result.secure_url;
    await settings.save();

    res.json({
      url: result.secure_url,
      settings,
    });
  }),
);

router.post(
  "/offer-banner-mobile",
  upload.single("image"),
  asyncHandler(async (req, res) => {
    if (!isCloudinaryConfigured()) {
      return res.status(503).json({ error: "Cloudinary is not configured on the server" });
    }
    if (!req.file?.buffer?.length) {
      return res.status(400).json({ error: "Choose an image file to upload" });
    }

    const settings = await getOrCreateSiteSettings();
    const result = await uploadBufferToCloudinary(req.file.buffer, req.file.originalname, {
      publicId: `marketing/offer-banner-mobile-${Date.now()}`,
    });
    settings.offerBannerImageMobile = result.secure_url;
    await settings.save();

    res.json({
      url: result.secure_url,
      settings,
    });
  }),
);

export default router;
