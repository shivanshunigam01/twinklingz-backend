import "dotenv/config";
import mongoose from "mongoose";
import { resolveMongoUri } from "../config/db.js";
import { Product } from "../models/Product.js";
import { parseProductFolderName } from "../lib/folderCatalog.js";

const EXCLUDE = "Traditional Wear";

function inferBasePrice(product) {
  const fromSku = product.sku?.match(/(\d{3,5})(?:rs)?$/i);
  if (fromSku) return Number(fromSku[1]);
  const parsed = parseProductFolderName(product.sku || product.name || "");
  if (parsed.price > 0) return parsed.price;
  const fromName = product.name?.match(/₹?\s*(\d{3,5})/);
  if (fromName) return Number(fromName[1]);
  return null;
}

async function main() {
  await mongoose.connect(resolveMongoUri());
  const products = await Product.find({ category: { $ne: EXCLUDE } })
    .select("sku name category price")
    .lean();

  let single = 0;
  let double = 0;
  let other = 0;
  let noBase = 0;
  const samples = { single: [], double: [], other: [] };

  for (const p of products) {
    const base = inferBasePrice(p);
    if (!base) {
      noBase += 1;
      continue;
    }
    const diff = Math.round((p.price - base) * 100) / 100;
    const tol = 2; // ₹ rounding tolerance

    if (Math.abs(diff - 110) <= tol) {
      single += 1;
      if (samples.single.length < 5) samples.single.push({ sku: p.sku, base, price: p.price, diff });
    } else if (Math.abs(diff - 220) <= tol) {
      double += 1;
      if (samples.double.length < 8) samples.double.push({ sku: p.sku, base, price: p.price, diff });
    } else {
      other += 1;
      if (samples.other.length < 8) samples.other.push({ sku: p.sku, base, price: p.price, diff, name: p.name });
    }
  }

  const traditional = await Product.find({ category: EXCLUDE }).select("sku price").lean();

  console.log(JSON.stringify({
    nonTraditionalChecked: products.length,
    inferredBase: products.length - noBase,
    noBaseInferred: noBase,
    matchesBasePlus110: single,
    matchesBasePlus220: double,
    otherDelta: other,
    traditionalWearCount: traditional.length,
    traditionalSample: traditional.slice(0, 3).map((p) => ({ sku: p.sku, price: p.price })),
    sampleSingleBump: samples.single,
    sampleDoubleBump: samples.double,
    sampleOther: samples.other,
  }, null, 2));

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
