import { Readable } from "stream";
import { cloudinary } from "../config/cloudinary.js";

export function uploadBufferToCloudinary(buffer, filename, options = {}) {
  const folder = process.env.CLOUDINARY_FOLDER || "twinklingz";
  const baseId =
    options.publicId?.trim() ||
    filename?.replace(/\.[^.]+$/, "") ||
    `img-${Date.now()}`;
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image", public_id: baseId },
      (err, result) => {
        if (err) reject(err);
        else resolve(result);
      },
    );
    Readable.from(buffer).pipe(stream);
  });
}
