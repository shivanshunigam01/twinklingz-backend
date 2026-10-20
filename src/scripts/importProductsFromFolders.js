import "dotenv/config";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { configureCloudinary, isCloudinaryConfigured } from "../config/cloudinary.js";
import { resolveMongoUri } from "../config/db.js";
import { Product } from "../models/Product.js";
import { slugify } from "../utils/slugify.js";
import { uploadBufferToCloudinary } from "../lib/cloudinaryUpload.js";
import {
  buildSku,
  listProductsFromRoots,
  parseProductFolderName,
} from "../lib/folderCatalog.js";
import { applyImageFields } from "../lib/productImages.js";

const IMAGE_EXT = /\.(png|jpe?g|webp|gif)$/i;

function parseArgs(argv) {
  const args = { roots: [], replaceAll: false, dryRun: false, pricesOnly: false, copyCatalogTo: "" };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--replace-all") args.replaceAll = true;
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--prices-only") args.pricesOnly = true;
    else if (a === "--copy-catalog-to" && argv[i + 1]) args.copyCatalogTo = argv[++i];
    else if (!a.startsWith("-")) args.roots.push(a);
  }
  return args;
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

function copyToLocalCatalog(copyRoot, sku, imagePaths) {
  const destDir = path.join(copyRoot, sku);
  fs.mkdirSync(destDir, { recursive: true });
  const relPaths = [];
  imagePaths.forEach((src, index) => {
    const ext = path.extname(src).toLowerCase() || ".jpg";
    const destName = `${index + 1}${ext}`;
    const dest = path.join(destDir, destName);
    fs.copyFileSync(src, dest);
    relPaths.push(`/catalog/${encodeURIComponent(sku)}/${destName}`);
  });
  return relPaths;
}

function writeCategoriesJson(copyRoot, skuCategories) {
  const categoriesFile = path.join(copyRoot, "..", "..", "src", "lib", "product-categories.json");
  if (!fs.existsSync(path.dirname(categoriesFile))) return;
  fs.writeFileSync(
    categoriesFile,
    JSON.stringify({ skuCategories, updatedAt: new Date().toISOString() }, null, 2),
    "utf8",
  );
  console.log("[import] wrote", categoriesFile);
}

async function main() {
  const { roots, replaceAll, dryRun, pricesOnly, copyCatalogTo } = parseArgs(process.argv);
  if (!roots.length) {
    console.error(
      "Usage: node src/scripts/importProductsFromFolders.js --replace-all [--copy-catalog-to ../twinklingz-sparkle-suite/public/catalog] <folder1> [folder2...]",
    );
    process.exit(1);
  }

  const items = listProductsFromRoots(roots);
  console.log(`[import] found ${items.length} products in ${roots.length} folder(s)`);
  if (!items.length) process.exit(1);

  if (dryRun) {
    for (const item of items.slice(0, 5)) {
      console.log(`  ${item.category} / ${item.productDir} — ${item.imagePaths.length} images`);
    }
    console.log("[import] dry-run only");
    process.exit(0);
  }

  const uri = resolveMongoUri();
  if (!uri) {
    console.error("Set MONGODB_URI in .env");
    process.exit(1);
  }
  if (!pricesOnly) {
    configureCloudinary();
    if (!isCloudinaryConfigured()) {
      console.error("Cloudinary is not configured in .env");
      process.exit(1);
    }
  }

  await mongoose.connect(uri);

  if (replaceAll) {
    const deleted = await Product.deleteMany({});
    console.log(`[import] removed ${deleted.deletedCount} existing products`);
  }

  if (copyCatalogTo) {
    if (fs.existsSync(copyCatalogTo)) {
      for (const entry of fs.readdirSync(copyCatalogTo)) {
        const full = path.join(copyCatalogTo, entry);
        if (fs.statSync(full).isDirectory()) fs.rmSync(full, { recursive: true, force: true });
      }
    } else {
      fs.mkdirSync(copyCatalogTo, { recursive: true });
    }
  }

  const skuCategories = {};
  let created = 0;
  let errors = 0;

  for (const item of items) {
    const parsed = parseProductFolderName(item.productDir);
    const sku = buildSku(item.category, item.productDir);
    const name = `${item.category.replace(/s$/, "")} · ${parsed.displayName}`;
    const existing = await Product.findOne({ sku });
    const slug = existing?.slug ?? (await uniqueSlug(slugify(sku)));

    try {
      const price = parsed.price > 0 ? parsed.price : 999;

      if (pricesOnly) {
        const doc = existing ?? (await Product.findOne({ sku }));
        if (!doc) {
          console.warn(`  skip: ${sku} (not in database)`);
          continue;
        }
        doc.name = name;
        doc.price = price;
        doc.category = item.category;
        await doc.save();
        console.log(`  price: ${sku} → ₹${price}`);
        created += 1;
        continue;
      }

      const urls = [];
      for (let i = 0; i < item.imagePaths.length; i++) {
        const filePath = item.imagePaths[i];
        const fileName = path.basename(filePath);
        const buffer = fs.readFileSync(filePath);
        const publicId = `${slug}-${i + 1}`;
        const result = await uploadBufferToCloudinary(buffer, fileName, { publicId });
        urls.push(result.secure_url);
      }

      if (copyCatalogTo) {
        copyToLocalCatalog(copyCatalogTo, sku, item.imagePaths);
      }

      const payload = {
        name,
        slug,
        sku,
        category: item.category,
        description: "",
        price,
        published: true,
        inStock: true,
        image: urls[0] || "",
        altImage: urls[1] || urls[0] || "",
        images: urls,
      };

      if (existing) {
        Object.assign(existing, payload);
        applyImageFields(existing);
        await existing.save();
      } else {
        const created = await Product.create(payload);
        applyImageFields(created);
        await created.save();
      }

      skuCategories[sku] = { category: item.category, folder: item.productDir };
      console.log(`  ok: ${sku} (${urls.length} images, ₹${price})`);
      created += 1;
    } catch (err) {
      console.error(`  fail: ${item.productDir} —`, err.message || err);
      errors += 1;
    }
  }

  if (copyCatalogTo) {
    writeCategoriesJson(copyCatalogTo, skuCategories);
  }

  console.log("\n[import] done", { created, errors });
  await mongoose.disconnect();
  process.exit(errors ? 1 : 0);
}

main();
