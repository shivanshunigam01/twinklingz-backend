import "dotenv/config";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
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

async function checkSmtp() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!host || !user || !pass) {
    console.log("[smtp] SKIP — set SMTP_HOST, SMTP_USER, SMTP_PASS for order emails");
    return;
  }
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
    await transporter.verify();
    console.log("[smtp] OK —", user, "via", host);
  } catch (err) {
    console.error("[smtp] FAIL —", err.message);
    exitCode = 1;
  }
}

await checkMongo();
await checkCloudinary();
await checkSmtp();
process.exit(exitCode);
