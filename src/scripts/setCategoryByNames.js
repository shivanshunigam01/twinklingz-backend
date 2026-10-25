import "dotenv/config";
import mongoose from "mongoose";
import { resolveMongoUri } from "../config/db.js";
import { Product } from "../models/Product.js";

const TARGET = "Traditional Wear";

/** Substrings matched case-insensitively against product name */
const NAME_PATTERNS = [
  "Gold Plated Multicolor Handcrafted Brass Necklace",
  "Gold Plated Floral Pendant Necklace Set",
  "Gold Plated Pendant Necklace Set",
  "Heritage Neckalce Set",
  "Heritage Necklace Set",
  "Red Green Multicut Stone Necklace",
  "Brass High Heritage Hasli Set",
  "Brass High Heritage Hasdi Set",
  "Brass High Gold Heritage Hasli Set",
  "Brass High Gold Heritage Hasdi Set",
  "Micro Gold Plated Traditional Lakshmi Set",
  "Traditional Gold Plated Short Necklace",
  "Traditional Temple Gold Plated Goddess Lakshmi Necklace",
  "Antique Floral Design Set",
];

async function main() {
  const uri = resolveMongoUri();
  if (!uri) {
    console.error("Set MONGODB_URI in .env");
    process.exit(1);
  }
  await mongoose.connect(uri);

  const or = NAME_PATTERNS.map((p) => ({
    name: { $regex: p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" },
  }));

  const matches = await Product.find({ $or: or }).select("name sku category price").lean();
  console.log("[setCategory] matched", matches.length);
  for (const p of matches) {
    console.log(`  - ${p.sku} | ${p.category} | ₹${p.price} | ${p.name}`);
  }

  if (!matches.length) {
    await mongoose.disconnect();
    process.exit(0);
  }

  const ids = matches.map((p) => p._id);
  const result = await Product.updateMany({ _id: { $in: ids } }, { $set: { category: TARGET } });
  console.log("[setCategory] updated", result.modifiedCount, "→", TARGET);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
