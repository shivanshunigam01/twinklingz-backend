import { Router } from "express";
import { Order } from "../../models/Order.js";
import { getOrCreateSiteSettings } from "../../models/SiteSettings.js";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { enrichOrdersWithImages } from "../../lib/enrichOrderItems.js";
import { buildOrderInvoicePdf } from "../../lib/orderInvoicePdf.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const status = req.query.status;
    const filter = {};
    if (status) filter.fulfillmentStatus = String(status);
    if (req.query.paymentStatus) filter.paymentStatus = String(req.query.paymentStatus);
    const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(200);
    const enriched = await enrichOrdersWithImages(orders);
    res.json({ orders: enriched });
  }),
);

router.get(
  "/:id/invoice",
  asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    const [enriched] = await enrichOrdersWithImages([order]);
    const settings = await getOrCreateSiteSettings();
    const settingsPlain = settings.toObject ? settings.toObject() : settings;
    const pdf = await buildOrderInvoicePdf(enriched, settingsPlain);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Twinklingz-Invoice-${enriched.orderNumber}.pdf"`,
    );
    res.send(pdf);
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    const [enriched] = await enrichOrdersWithImages([order]);
    res.json({ order: enriched });
  }),
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const allowed = ["fulfillmentStatus", "paymentStatus", "trackingNote", "notes"];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    const order = await Order.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!order) return res.status(404).json({ error: "Order not found" });
    const [enriched] = await enrichOrdersWithImages([order]);
    res.json({ order: enriched });
  }),
);

export default router;
