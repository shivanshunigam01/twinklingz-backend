import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { AdminUser } from "../models/AdminUser.js";
import { resolveMongoUri } from "../config/db.js";

const email = process.env.ADMIN_EMAIL?.trim();
const password = process.env.ADMIN_PASSWORD?.trim();
const uri = resolveMongoUri();

if (!uri || !email || !password) {
  console.error("Set MongoDB (MONGODB_URI or MONGODB_USER + MONGODB_PASSWORD), ADMIN_EMAIL, and ADMIN_PASSWORD in backend/.env");
  process.exit(1);
}

await mongoose.connect(uri);
const existing = await AdminUser.findOne({ email });
if (existing) {
  console.log("Admin already exists:", email);
  process.exit(0);
}
const passwordHash = await bcrypt.hash(password, 12);
await AdminUser.create({ email, passwordHash, name: "Twinklingz Admin" });
console.log("Created admin user:", email);
await mongoose.disconnect();
