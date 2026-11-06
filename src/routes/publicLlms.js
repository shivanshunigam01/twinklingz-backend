import { Router } from "express";
import { Product } from "../models/Product.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { publicPriceFields } from "../lib/promotions.js";

const router = Router();

const SITE_ORIGIN = (process.env.STOREFRONT_URL || "https://www.twinklingz.com").replace(/\/$/, "");
const API_ORIGIN = (process.env.API_PUBLIC_URL || "https://api.twinklingz.com").replace(/\/$/, "");

const STATIC_PAGES = [
  { path: "/", title: "Home" },
  { path: "/shop", title: "Shop all jewellery" },
  { path: "/new-arrivals", title: "New arrivals" },
  { path: "/bestsellers", title: "Bestsellers" },
  { path: "/collections", title: "Collections" },
  { path: "/about", title: "About Twinklingz" },
  { path: "/contact", title: "Contact" },
  { path: "/faq", title: "FAQ" },
  { path: "/jewellery-care", title: "Jewellery care guide" },
  { path: "/shipping-policy", title: "Shipping policy" },
  { path: "/return-policy", title: "Sales & return policy" },
  { path: "/privacy", title: "Privacy policy" },
  { path: "/terms", title: "Terms & conditions" },
  { path: "/track-order", title: "Track order" },
  { path: "/collections/necklaces", title: "Necklaces" },
  { path: "/collections/earrings", title: "Earrings" },
  { path: "/collections/bracelets", title: "Bracelets" },
  { path: "/collections/rings", title: "Rings" },
  { path: "/collections/jewellery-sets", title: "Jewellery sets" },
  { path: "/collections/traditional-wear", title: "Traditional wear" },
];

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatProductLine(doc) {
  const p = doc.toObject ? doc.toObject() : doc;
  const pricing = publicPriceFields(p.price, p.mrp);
  const url = `${SITE_ORIGIN}/products/${p.slug}`;
  const desc = (p.description || "").replace(/\s+/g, " ").trim().slice(0, 240);
  return `- [${p.name}](${url}): ₹${pricing.price}${desc ? ` — ${desc}` : ""}`;
}

router.get(
  "/llms.txt",
  asyncHandler(async (_req, res) => {
    const products = await Product.find({ published: true })
      .sort({ featured: -1, createdAt: -1 })
      .select("name slug description price mrp category")
      .limit(120);

    const lines = [
      "# Twinklingz by Priya Kaur",
      "",
      "> Premium fashion jewellery — Because every sparkle tells a story.",
      "",
      "Use this canonical storefront URL (avoid bare twinklingz.com redirects):",
      SITE_ORIGIN,
      "",
      "## Store pages",
      ...STATIC_PAGES.map(({ path, title }) => `- [${title}](${SITE_ORIGIN}${path})`),
      "",
      "## Machine-readable catalog",
      `- JSON product list: ${API_ORIGIN}/api/products`,
      `- This file (auto-updated): ${API_ORIGIN}/api/llms.txt`,
      `- Sitemap: ${SITE_ORIGIN}/sitemap.xml`,
      "",
      "## Products (sample)",
      ...products.map(formatProductLine),
      products.length >= 120 ? "\n(Full list in JSON at /api/products)" : "",
      "",
    ].filter(Boolean);

    res.set({
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
    });
    res.send(`${lines.join("\n")}\n`);
  }),
);

router.get(
  "/sitemap.xml",
  asyncHandler(async (_req, res) => {
    const products = await Product.find({ published: true }).select("slug updatedAt").sort({ updatedAt: -1 });

    const urls = [
      ...STATIC_PAGES.map(({ path }) => ({
        loc: `${SITE_ORIGIN}${path}`,
        changefreq: path === "/" ? "daily" : "weekly",
        priority: path === "/" ? "1.0" : "0.7",
      })),
      ...products.map((p) => ({
        loc: `${SITE_ORIGIN}/products/${p.slug}`,
        lastmod: p.updatedAt?.toISOString?.()?.slice(0, 10),
        changefreq: "weekly",
        priority: "0.8",
      })),
    ];

    const body = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...urls.map((u) => {
        const parts = [`  <url>`, `    <loc>${escapeXml(u.loc)}</loc>`];
        if (u.lastmod) parts.push(`    <lastmod>${u.lastmod}</lastmod>`);
        if (u.changefreq) parts.push(`    <changefreq>${u.changefreq}</changefreq>`);
        if (u.priority) parts.push(`    <priority>${u.priority}</priority>`);
        parts.push("  </url>");
        return parts.join("\n");
      }),
      "</urlset>",
    ].join("\n");

    res.set({
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    });
    res.send(body);
  }),
);

export default router;
