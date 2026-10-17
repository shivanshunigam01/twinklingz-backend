import "dotenv/config";
import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import mongoose from "mongoose";
import { configureCloudinary, isCloudinaryConfigured } from "../config/cloudinary.js";
import { resolveMongoUri } from "../config/db.js";
import { Product } from "../models/Product.js";
import { slugify } from "../utils/slugify.js";
import { uploadBufferToCloudinary } from "../lib/cloudinaryUpload.js";

const IMAGE_EXT = /\.(png|jpe?g|webp|gif)$/i;

function parseArgs(argv) {
  const args = { zips: [], category: "Necklaces", dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--category" && argv[i + 1]) args.category = argv[++i];
    else if (!a.startsWith("-")) args.zips.push(a);
  }
  return args;
}

function listProductImages(zipPath) {
  const zip = new AdmZip(zipPath);
  const groups = new Map();
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    const normalized = entry.entryName.replace(/\\/g, "/");
    const parts = normalized.split("/").filter(Boolean);
    if (parts.length < 2) continue;
    const productName = parts[parts.length - 2];
    const fileName = parts[parts.length - 1];
    if (!IMAGE_EXT.test(fileName)) continue;
    if (!groups.has(productName)) groups.set(productName, []);
    groups.get(productName).push({ entryName: normalized, fileName });
  }
  for (const files of groups.values()) {
    files.sort((a, b) => a.fileName.localeCompare(b.fileName, undefined, { numeric: true }));
  }
  return groups;
}

function readProductImageBuffers(zipPath, files) {
  const zip = new AdmZip(zipPath);
  return files.map(({ entryName, fileName }) => {
    const entry = zip.getEntry(entryName);
    if (!entry) throw new Error(`Missing zip entry: ${entryName}`);
    return { fileName, buffer: entry.getData() };
  });
}

async function uniqueSlug(base) {
  let slug = slugify(base) || `product-${Date.now()}`;
  let n = 0;
  while (await Product.exists({ slug })) {
    n += 1;
    slug = `${slugify(base)}-${n}`;
  }
  return slug;
}

async function importZip(zipPath, category, dryRun) {
  if (!fs.existsSync(zipPath)) {
    console.error("Zip not found:", zipPath);
    return { created: 0, skipped: 0, errors: 1 };
  }
  const groups = listProductImages(zipPath);
  const names = [...groups.keys()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  console.log(`\n[import] ${path.basename(zipPath)} — ${names.length} products (${category})`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const name of names) {
    const existing = await Product.findOne({ name });
    if (existing?.images?.length) {
      console.log(`  skip (exists): ${name}`);
      skipped += 1;
      continue;
    }

    const files = groups.get(name);
    if (!files?.length) continue;

    if (dryRun) {
      console.log(`  would import: ${name} (${files.length} images)`);
      created += 1;
      continue;
    }

    try {
      const slug = await uniqueSlug(name);
      const sku = slug.replace(/-/g, "").toUpperCase().slice(0, 32) || `SKU-${Date.now()}`;
      let product = existing;
      if (!product) {
        product = await Product.create({
          name,
          slug,
          sku,
          category,
          description: "",
          price: 0,
          published: true,
          inStock: true,
          images: [],
        });
      }

      const urls = [];
      const imageBuffers = readProductImageBuffers(zipPath, files);
      for (const { fileName, buffer } of imageBuffers) {
        const publicId = `${slug}-${fileName.replace(/\.[^.]+$/, "")}`;
        const result = await uploadBufferToCloudinary(buffer, fileName, { publicId });
        urls.push(result.secure_url);
      }

      product.images = [...(product.images || []), ...urls];
      if (!product.image && product.images[0]) product.image = product.images[0];
      if (!product.altImage && product.images[1]) product.altImage = product.images[1];
      await product.save();

      console.log(`  ok: ${name} (${urls.length} images)`);
      created += 1;
    } catch (err) {
      console.error(`  fail: ${name} —`, err.message || err);
      errors += 1;
    }
  }

  return { created, skipped, errors };
}

const { zips, category, dryRun } = parseArgs(process.argv);
if (!zips.length) {
  console.error(
    "Usage: node src/scripts/importProductsFromZip.js [--category Necklaces] [--dry-run] <zip1> [zip2...]",
  );
  process.exit(1);
}

const uri = resolveMongoUri();
if (!uri) {
  console.error("Set MONGODB_URI (or MONGODB_USER + MONGODB_PASSWORD) in .env");
  process.exit(1);
}

configureCloudinary();
if (!dryRun && !isCloudinaryConfigured()) {
  console.error("Cloudinary is not configured in .env");
  process.exit(1);
}

await mongoose.connect(uri);

let totals = { created: 0, skipped: 0, errors: 0 };
for (const zipPath of zips) {
  const lower = zipPath.toLowerCase();
  const cat = lower.includes("necklace")
    ? "Necklaces"
    : lower.includes("first-lot")
      ? "Earrings"
      : category;
  const result = await importZip(zipPath, cat, dryRun);
  totals.created += result.created;
  totals.skipped += result.skipped;
  totals.errors += result.errors;
}

console.log("\n[import] done", totals);
await mongoose.disconnect();
process.exit(totals.errors ? 1 : 0);
