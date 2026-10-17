import { Router } from "express";
import { getOrCreateSiteSettings } from "../models/SiteSettings.js";
import { asyncHandler } from "../middleware/errorHandler.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const settings = await getOrCreateSiteSettings();
    res.json({
      settings: {
        brandName: settings.brandName,
        subBrand: settings.subBrand,
        tagline: settings.tagline,
        announcementBar: settings.announcementBar,
        contact: settings.contact,
        social: settings.social,
        returnRefundPolicy: settings.returnRefundPolicy,
        storyCopy: settings.storyCopy,
      },
    });
  }),
);

export default router;
