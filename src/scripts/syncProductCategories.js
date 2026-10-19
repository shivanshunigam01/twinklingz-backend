import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { resolveMongoUri } from "../config/db.js";
import { Product } from "../models/Product.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mapPath = path.join(__dirname, "../data/product-categories.json");

function parseArgs(argv) {
  let dryRun = false;
  for (const a of argv.slice(2)) {
    if (a === "--dry-run") dryRun = true;
  }
  return { dryRun };
}

const { dryRun } = parseArgs(process.argv);
if (!fs.existsSync(mapPath)) {
  console.error("Missing", mapPath, "— run: node src/scripts/buildProductCategoriesFromZips.js");
  process.exit(1);
}

const { skuCategories } = JSON.parse(fs.readFileSync(mapPath, "utf8"));
const uri = resolveMongoUri();
if (!uri || !uri.startsWith("mongodb")) {
  console.error("Set a valid MONGODB_URI in .env before syncing categories.");
  process.exit(1);
}

await mongoose.connect(uri);

let updated = 0;
let missing = 0;

for (const [sku, category] of Object.entries(skuCategories)) {
  const meta = typeof category === "string" ? { category } : category;
  const cat = meta.category ?? category;
  const product = await Product.findOne({
    $or: [{ name: sku }, { slug: sku }, { slug: `style-${sku}` }, { sku }],
  });
  if (!product) {
    missing += 1;
    continue;
  }
  if (product.category === cat) continue;
  console.log(dryRun ? "would update" : "update", product.name, product.category, "→", cat);
  if (!dryRun) {
    product.category = cat;
    await product.save();
  }
  updated += 1;
}

console.log("[sync] done", { updated, missing, dryRun });
await mongoose.disconnect();
