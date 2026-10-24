import { Review } from "../models/Review.js";
import { Product } from "../models/Product.js";

/** Recompute product.rating and product.reviews from approved reviews only. */
export async function syncProductReviewStats(productId) {
  const approved = await Review.find({ productId, status: "approved" }).select("rating").lean();
  const count = approved.length;
  let rating = 0;
  if (count > 0) {
    const sum = approved.reduce((acc, r) => acc + r.rating, 0);
    rating = Math.round((sum / count) * 10) / 10;
  }
  await Product.findByIdAndUpdate(productId, {
    reviews: count,
    rating: count > 0 ? rating : 4.8,
  });
  return { count, rating };
}
