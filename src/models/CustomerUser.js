import mongoose from "mongoose";

const customerUserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

export const CustomerUser =
  mongoose.models.CustomerUser || mongoose.model("CustomerUser", customerUserSchema);
