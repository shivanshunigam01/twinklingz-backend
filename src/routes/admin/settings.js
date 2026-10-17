import { Router } from "express";
import { getOrCreateSiteSettings } from "../../models/SiteSettings.js";
import { asyncHandler } from "../../middleware/errorHandler.js";

const router = Router();

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
    ];
    for (const key of allowedRoots) {
      if (req.body[key] !== undefined) settings[key] = req.body[key];
    }
    await settings.save();
    res.json({ settings });
  }),
);

export default router;
