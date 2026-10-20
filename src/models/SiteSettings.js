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
  returnRefundPolicy: "All sales are final. No returns, refunds, or exchanges.",
  storyCopy: {
    headline: "A Journey of Purpose, Passion & Sparkle",
    body: `Every beautiful journey begins with a dream. Twinklingz By Priya Kaur brings together elegant, timeless jewellery chosen with an eye for beauty, detail, and timeless appeal — so every woman can find a piece that feels uniquely hers.`,
    highlight: "Every woman has a story. Let yours sparkle.",
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
