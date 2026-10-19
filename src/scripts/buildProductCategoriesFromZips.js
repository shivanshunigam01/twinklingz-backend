import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  buildSkuCategoryMapFromZip,
  mergeSkuCategoryMaps,
} from "../lib/productCategoryFromZip.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const outBackend = path.join(__dirname, "../data/product-categories.json");
const outFrontend = path.join(
  repoRoot,
  "twinklingz-sparkle-suite/src/lib/product-categories.json",
);

const defaultZips = [
  path.join(process.env.USERPROFILE || "", "Downloads/wetransfer_necklace_2026-10-14_1034.zip"),
  path.join(process.env.USERPROFILE || "", "Downloads/wetransfer_first-lot_2026-10-14_1041.zip"),
];

function parseArgs(argv) {
  const zips = [];
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("-")) zips.push(path.resolve(a));
  }
  return zips.length ? zips : defaultZips.filter((z) => fs.existsSync(z));
}

const zips = parseArgs(process.argv);
if (!zips.length) {
  console.error("No zip files found. Pass paths to wetransfer zips or place them in Downloads.");
  process.exit(1);
}

const maps = [];
for (const zipPath of zips) {
  console.log("[categories]", zipPath);
  maps.push(buildSkuCategoryMapFromZip(zipPath));
}

const merged = mergeSkuCategoryMaps(maps);
const byCategory = {};
for (const [sku, { category }] of merged) {
  byCategory[category] = (byCategory[category] || 0) + 1;
}

const payload = {
  generatedAt: new Date().toISOString(),
  sources: zips.map((z) => path.basename(z)),
  skuCategories: Object.fromEntries(
    [...merged.entries()].sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true })),
  ),
};

for (const dir of [path.dirname(outBackend), path.dirname(outFrontend)]) {
  fs.mkdirSync(dir, { recursive: true });
}
fs.writeFileSync(outBackend, `${JSON.stringify(payload, null, 2)}\n`);
fs.writeFileSync(outFrontend, `${JSON.stringify(payload, null, 2)}\n`);

console.log("[categories] SKUs:", merged.size, byCategory);
console.log("[categories] wrote", outBackend);
console.log("[categories] wrote", outFrontend);
