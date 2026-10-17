import mongoose from "mongoose";

const defaultSettings = {
  brandName: "Twinklingz",
  subBrand: "by Priya Kaur",
  tagline: "Because every sparkle tells a story.",
  announcementBar: "✦ Free Shipping on Selected Orders | Secure Online Payments ✦",
  contact: {
    email: "",
    phone: "",
    whatsapp: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pinCode: "",
    country: "India",
  },
  social: {
    instagramHandle: "@Twinklingz",
    instagramUrl: "https://www.instagram.com/",
  },
  returnRefundPolicy: `All sales are final. We do not accept returns, refunds, or exchanges except where required by applicable law or where an incorrect or defective item is delivered.`,
  storyCopy: {
    headline: "Jewellery for the stories only you can tell.",
    body: `We bring you elegant, timeless, and trend-forward jewellery designed to complement every style and occasion.

From everyday essentials to statement pieces, each collection is carefully curated to help you shine with confidence.

Our mission is to offer beautiful jewellery that combines quality, affordability, and sophistication.`,
    highlight: "Because every sparkle tells a story. ✨",
  },
};

const siteSettingsSchema = new mongoose.Schema(
  {
    brandName: String,
    subBrand: String,
    tagline: String,
    announcementBar: String,
    contact: {
      email: String,
      phone: String,
      whatsapp: String,
      addressLine1: String,
      addressLine2: String,
      city: String,
      state: String,
      pinCode: String,
      country: String,
    },
    social: {
      instagramHandle: String,
      instagramUrl: String,
    },
    returnRefundPolicy: String,
    storyCopy: {
      headline: String,
      body: String,
      highlight: String,
    },
  },
  { timestamps: true },
);

export const SiteSettings =
  mongoose.models.SiteSettings || mongoose.model("SiteSettings", siteSettingsSchema);

export async function getOrCreateSiteSettings() {
  let doc = await SiteSettings.findOne();
  if (!doc) {
    doc = await SiteSettings.create(defaultSettings);
  }
  return doc;
}
