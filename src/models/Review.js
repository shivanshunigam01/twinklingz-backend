import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    productSlug: { type: String, required: true, trim: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "CustomerUser", required: true },
    authorName: { type: String, required: true, trim: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, default: "", trim: true, maxlength: 120 },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
  },
  { timestamps: true },
);

reviewSchema.index({ productId: 1, customerId: 1 }, { unique: true });

export const Review = mongoose.models.Review || mongoose.model("Review", reviewSchema);
