import { Product } from "../models/Product.js";
import { isCloudinaryUrl, normalizeProductImages } from "./productImages.js";

function resolveLineItemImage(storedImage, productDoc) {
  if (typeof storedImage === "string" && isCloudinaryUrl(storedImage)) {
    return storedImage;
  }
  if (productDoc) {
    const normalized = normalizeProductImages(productDoc);
    return normalized.image || normalized.images[0] || storedImage || "";
  }
  return storedImage || "";
}

/** Attach current Cloudinary image URLs to order line items. */
export async function enrichOrdersWithImages(orders) {
  const slugs = new Set();
  const productIds = new Set();
  for (const order of orders) {
    for (const item of order.items || []) {
      if (item.slug) slugs.add(item.slug);
      if (item.productId) productIds.add(String(item.productId));
    }
  }

  const [bySlugList, byIdList] = await Promise.all([
    slugs.size ? Product.find({ slug: { $in: [...slugs] } }) : [],
    productIds.size ? Product.find({ _id: { $in: [...productIds] } }) : [],
  ]);

  const bySlug = new Map(bySlugList.map((p) => [p.slug, p]));
  const byId = new Map(byIdList.map((p) => [String(p._id), p]));

  return orders.map((order) => {
    const doc = order.toObject ? order.toObject() : { ...order };
    doc.items = (doc.items || []).map((item) => {
      const product =
        (item.slug && bySlug.get(item.slug)) ||
        (item.productId && byId.get(String(item.productId))) ||
        null;
      return {
        ...item,
        image: resolveLineItemImage(item.image, product),
      };
    });
    return doc;
  });
}
