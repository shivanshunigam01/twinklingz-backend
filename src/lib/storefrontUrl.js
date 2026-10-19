/** Public storefront origin for links in emails (no trailing slash). */
export function getStorefrontUrl() {
  const explicit = process.env.STOREFRONT_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const fromClient = (process.env.CLIENT_URL || "")
    .split(",")
    .map((s) => s.trim())
    .find((u) => u.startsWith("http://") || u.startsWith("https://"));

  return (fromClient || "https://twinklingz.com").replace(/\/$/, "");
}
