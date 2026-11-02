/**
 * One-time: upload local offer banner JPG to Cloudinary and save URL in SiteSettings.
 * Usage: node src/scripts/uploadOfferBanner.js "C:\\path\\to\\banner.jpg"
 */
import fs from "fs";
import "dotenv/config";
import { connectDb } from "../config/db.js";
import { configureCloudinary, isCloudinaryConfigured } from "../config/cloudinary.js";
import { uploadBufferToCloudinary } from "../lib/cloudinaryUpload.js";
import { getOrCreateSiteSettings } from "../models/SiteSettings.js";

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: node src/scripts/uploadOfferBanner.js <path-to-image.jpg>");
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
  publicId: "marketing/diwali-offer-banner",
});
const settings = await getOrCreateSiteSettings();
settings.offerBannerImage = result.secure_url;
await settings.save();
console.log("[offer-banner] saved:", result.secure_url);
process.exit(0);
