import "dotenv/config";
import mongoose from "mongoose";
import { cloudinary, configureCloudinary, isCloudinaryConfigured } from "../config/cloudinary.js";
import { resolveMongoUri } from "../config/db.js";

let exitCode = 0;

async function checkMongo() {
  const uri = resolveMongoUri();
  if (!uri) {
    console.log("[mongo] SKIP — set MONGODB_USER + MONGODB_PASSWORD or MONGODB_URI");
    exitCode = 1;
    return;
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    console.log("[mongo] OK — connected to", process.env.MONGODB_HOST || "cluster");
    await mongoose.disconnect();
  } catch (err) {
    console.error("[mongo] FAIL —", err.message);
    exitCode = 1;
  }
}

async function checkCloudinary() {
  configureCloudinary();
  if (!isCloudinaryConfigured()) {
    console.log("[cloudinary] SKIP — credentials not set");
    exitCode = 1;
    return;
  }
  try {
    const ping = await cloudinary.api.ping();
    console.log("[cloudinary] OK —", ping.status || "ping");
  } catch (err) {
    console.error("[cloudinary] FAIL —", err.message || err);
    exitCode = 1;
  }
}

await checkMongo();
await checkCloudinary();
process.exit(exitCode);
