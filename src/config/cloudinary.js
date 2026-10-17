import { v2 as cloudinary } from "cloudinary";

export { cloudinary };

export function isCloudinaryConfigured() {
  const url = process.env.CLOUDINARY_URL?.trim();
  if (url && !url.includes("<your_api_key>")) return true;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  return Boolean(cloudName && apiKey && apiSecret);
}

export function configureCloudinary() {
  const url = process.env.CLOUDINARY_URL?.trim();
  if (url && !url.includes("<your_api_key>")) {
    cloudinary.config({ secure: true });
    console.log("[api] Cloudinary configured (CLOUDINARY_URL)");
    return;
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) {
    console.warn("[api] Cloudinary credentials missing — image uploads disabled until configured.");
    return;
  }
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
  console.log("[api] Cloudinary configured");
}
