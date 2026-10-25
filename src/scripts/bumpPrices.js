import "dotenv/config";
import mongoose from "mongoose";
import { resolveMongoUri } from "../config/db.js";
import { Product } from "../models/Product.js";

const BUMP = Number(process.argv[2] || 110);
const EXCLUDE_CATEGORY = "Traditional Wear";

async function main() {
  const uri = resolveMongoUri();
  if (!uri) {
    console.error("Set MONGODB_URI in .env");
    process.exit(1);
  }
  await mongoose.connect(uri);

  const filter = { category: { $ne: EXCLUDE_CATEGORY } };
  const count = await Product.countDocuments(filter);

  const priceResult = await Product.updateMany(filter, [{ $set: { price: { $add: ["$price", BUMP] } } }]);

  const mrpResult = await Product.updateMany(
    { ...filter, mrp: { $exists: true, $ne: null, $gt: 0 } },
    [{ $set: { mrp: { $add: ["$mrp", BUMP] } } }],
  );

  const traditional = await Product.countDocuments({ category: EXCLUDE_CATEGORY });

  console.log("[bumpPrices] done", {
    bumpInr: BUMP,
    excludedCategory: EXCLUDE_CATEGORY,
    productsUpdatedPrice: priceResult.modifiedCount,
    productsUpdatedMrp: mrpResult.modifiedCount,
    matchedNonTraditional: count,
    traditionalWearUnchanged: traditional,
  });

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
