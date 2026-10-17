import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true },
    sku: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, default: "Necklaces" },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    mrp: { type: Number, min: 0 },
    badge: { type: String, enum: ["NEW", "BESTSELLER", null], default: null },
    rating: { type: Number, default: 4.8, min: 0, max: 5 },
    reviews: { type: Number, default: 0, min: 0 },
    image: { type: String, default: "" },
    altImage: { type: String, default: "" },
    images: { type: [String], default: [] },
    inStock: { type: Boolean, default: true },
    featured: { type: Boolean, default: false },
    published: { type: Boolean, default: true },
  },
  { timestamps: true },
);

productSchema.index({ category: 1, published: 1 });
productSchema.index({ featured: 1, published: 1 });

export const Product = mongoose.models.Product || mongoose.model("Product", productSchema);
