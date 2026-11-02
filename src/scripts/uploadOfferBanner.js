/**
 * Upload local offer banner to Cloudinary and save URL in SiteSettings.
 * Usage:
 *   node src/scripts/uploadOfferBanner.js "C:\\path\\to\\desktop.jpg"
 *   node src/scripts/uploadOfferBanner.js --mobile "C:\\path\\to\\mobile.jpg"
 */
import fs from "fs";
import "dotenv/config";
import { connectDb } from "../config/db.js";
import { configureCloudinary, isCloudinaryConfigured } from "../config/cloudinary.js";
import { uploadBufferToCloudinary } from "../lib/cloudinaryUpload.js";
import { getOrCreateSiteSettings } from "../models/SiteSettings.js";

const mobile = process.argv[2] === "--mobile";
const filePath = mobile ? process.argv[3] : process.argv[2];
if (!filePath) {
  console.error("Usage: node src/scripts/uploadOfferBanner.js [--mobile] <path-to-image.jpg>");
  process.exit(1);
}

configureCloudinary();
if (!isCloudinaryConfigured()) {
  console.error("Configure Cloudinary in .env first");
  process.exit(1);
}

const buffer = fs.readFileSync(filePath);
await connectDb();
const result = await uploadBufferToCloudinary(buffer, filePath, {
  publicId: mobile ? "marketing/diwali-offer-banner-mobile" : "marketing/diwali-offer-banner",
});
const settings = await getOrCreateSiteSettings();
if (mobile) {
  settings.offerBannerImageMobile = result.secure_url;
} else {
  settings.offerBannerImage = result.secure_url;
}
await settings.save();
console.log(`[offer-banner${mobile ? "-mobile" : ""}] saved:`, result.secure_url);
process.exit(0);
