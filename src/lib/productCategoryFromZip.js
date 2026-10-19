import AdmZip from "adm-zip";

const IMAGE_EXT = /\.(png|jpe?g|webp|gif)$/i;

/** Folder names inside product zips → storefront category labels. */
export const FOLDER_CATEGORY = {
  bracelet: "Bracelets",
  bracelets: "Bracelets",
  bangle: "Bracelets",
  bangles: "Bracelets",
  earing: "Earrings",
  earring: "Earrings",
  earrings: "Earrings",
  necklace: "Necklaces",
  necklaces: "Necklaces",
  ring: "Rings",
  rings: "Rings",
  rin: "Rings",
  set: "Jewellery Sets",
  sets: "Jewellery Sets",
};

/**
 * Category from zip entry path (folder names + known batch folders in Twinklingz exports).
 */
export function categoryFromZipParts(parts, fallback = "Necklaces") {
  for (const part of parts) {
    const key = part.toLowerCase().trim();
    if (FOLDER_CATEGORY[key]) return FOLDER_CATEGORY[key];
  }

  const lower = parts.map((p) => p.toLowerCase());
  if (lower.includes("30-09-2026")) return "Earrings";
  if (lower.some((p) => p === "first lot")) return "Rings";

  return fallback;
}

export function defaultCategoryForZipFilename(zipPath, cliDefault = "Necklaces") {
  const lower = String(zipPath).toLowerCase();
  if (lower.includes("necklace")) return "Necklaces";
  if (lower.includes("bracelet") || lower.includes("bangle")) return "Bracelets";
  if (lower.includes("earring") || lower.includes("earing")) return "Earrings";
  if (lower.includes("ring") || lower.includes("_rin_") || lower.includes("-rin-")) return "Rings";
  if (lower.includes("first-lot")) return "Earrings";
  return cliDefault;
}

/** @returns {Map<string, { category: string, zipBasename: string }>} */
export function buildSkuCategoryMapFromZip(zipPath, cliDefault = "Necklaces") {
  const zip = new AdmZip(zipPath);
  const fallback = defaultCategoryForZipFilename(zipPath, cliDefault);
  const basename = zipPath.split(/[/\\]/).pop() || zipPath;
  /** @type {Map<string, { category: string, zipBasename: string }>} */
  const map = new Map();

  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    const normalized = entry.entryName.replace(/\\/g, "/");
    const parts = normalized.split("/").filter(Boolean);
    if (parts.length < 2) continue;
    const fileName = parts[parts.length - 1];
    if (!IMAGE_EXT.test(fileName)) continue;
    const productName = parts[parts.length - 2];
    const category = categoryFromZipParts(parts, fallback);
    map.set(productName, { category, zipBasename: basename });
  }

  return map;
}

/** Merge multiple zips; later zips do not override an existing SKU unless `overwrite`. */
export function mergeSkuCategoryMaps(maps, { overwrite = false } = {}) {
  const merged = new Map();
  for (const map of maps) {
    for (const [sku, meta] of map) {
      if (!overwrite && merged.has(sku)) continue;
      merged.set(sku, meta);
    }
  }
  return merged;
}
