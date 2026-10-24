import fs from "fs";
import path from "path";

const IMAGE_EXT = /\.(png|jpe?g|webp|gif)$/i;

/** @typedef {{ categoryDir: string, category: string, productDir: string, productKey: string, imagePaths: string[] }} CatalogProduct */

export function categoryFromFolderName(folderName) {
  const key = folderName.toLowerCase().replace(/\s+/g, " ").trim();
  if (key.includes("ear")) return "Earrings";
  if (key.includes("bracelet") || key.includes("bangle")) return "Bracelets";
  if (key.includes("neclace") || key.includes("necklace")) return "Necklaces";
  if (key.includes("ring")) return "Rings";
  if (key.includes("set")) return "Jewellery Sets";
  if (key.includes("traditional") || key.includes("ethnic")) return "Traditional Wear";
  return "Necklaces";
}

function sanitizeSkuKey(clean) {
  return clean
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

/** Folder names like `1-800` or `113---1350rs` → label and suggested ₹ price. */
export function parseProductFolderName(folderName) {
  const clean = folderName.trim();
  // Style index + price (e.g. `1-800`, `10-650`). Avoid `51355-1` (variant folders).
  const standard = clean.match(/^(\d{1,2})-(\d{2,5})$/);
  if (standard) {
    const sortIndex = Number(standard[1]);
    const price = Number(standard[2]);
    if (price >= 100 || (sortIndex <= 30 && price >= 10)) {
      return {
        skuKey: clean,
        sortIndex,
        price,
        displayName: `Style ${clean}`,
      };
    }
  }

  const rsMatch = clean.match(/(\d{3,5})\s*rs?\b/i);
  const trailingPrice = rsMatch ? Number(rsMatch[1]) : 0;
  const skuKey = sanitizeSkuKey(clean) || clean;

  return {
    skuKey,
    sortIndex: 0,
    price: trailingPrice,
    displayName: clean.replace(/-+/g, " ").trim(),
  };
}

function listImagesInDir(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => IMAGE_EXT.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((f) => path.join(dir, f));
}

/**
 * Scan WeTransfer-style trees: root/category/product/images
 * @param {string[]} roots
 * @returns {CatalogProduct[]}
 */
export function listProductsFromRoots(roots) {
  /** @type {Map<string, CatalogProduct>} */
  const byKey = new Map();

  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    for (const categoryDir of fs.readdirSync(root, { withFileTypes: true })) {
      if (!categoryDir.isDirectory()) continue;
      const categoryPath = path.join(root, categoryDir.name);
      const category = categoryFromFolderName(categoryDir.name);

      for (const productDir of fs.readdirSync(categoryPath, { withFileTypes: true })) {
        if (!productDir.isDirectory()) continue;
        const productPath = path.join(categoryPath, productDir.name);
        const imagePaths = listImagesInDir(productPath);
        if (!imagePaths.length) continue;

        const parsed = parseProductFolderName(productDir.name);
        const productKey = `${category}::${parsed.skuKey}`;
        if (byKey.has(productKey)) {
          const existing = byKey.get(productKey);
          existing.imagePaths = [...new Set([...existing.imagePaths, ...imagePaths])];
          continue;
        }

        byKey.set(productKey, {
          categoryDir: categoryDir.name,
          category,
          productDir: productDir.name,
          productKey,
          imagePaths,
        });
      }
    }
  }

  return [...byKey.values()].sort((a, b) => {
    const pa = parseProductFolderName(a.productDir);
    const pb = parseProductFolderName(b.productDir);
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return pa.sortIndex - pb.sortIndex || a.productDir.localeCompare(b.productDir, undefined, { numeric: true });
  });
}

export function buildSku(category, productDir) {
  const parsed = parseProductFolderName(productDir);
  const prefix = category.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, "") || "PRD";
  return `${prefix}-${parsed.skuKey}`.replace(/[^A-Za-z0-9-]/g, "-").slice(0, 48);
}
