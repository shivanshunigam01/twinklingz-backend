export function isCloudinaryUrl(url) {
  if (!url || typeof url !== "string") return false;
  return /res\.cloudinary\.com/i.test(url) || /cloudinary\.com/i.test(url);
}

export function normalizeProductImages(doc) {
  const images = (doc.images || []).filter(isCloudinaryUrl);
  const image = isCloudinaryUrl(doc.image) ? doc.image : images[0] || "";
  const altImage = isCloudinaryUrl(doc.altImage) ? doc.altImage : images[1] || images[0] || "";
  const list = images.length > 0 ? images : [image, altImage].filter(isCloudinaryUrl);
  const unique = [...new Set(list)];
  return {
    image: unique[0] || "",
    altImage: unique[1] || unique[0] || "",
    images: unique,
  };
}

export function applyImageFields(product) {
  const normalized = normalizeProductImages(product);
  product.image = normalized.image;
  product.altImage = normalized.altImage;
  product.images = normalized.images;
  return product;
}
