import { Router } from "express";
import { Order } from "../../models/Order.js";
import { asyncHandler } from "../../middleware/errorHandler.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const status = req.query.status;
    const filter = {};
    if (status) filter.fulfillmentStatus = String(status);
    if (req.query.paymentStatus) filter.paymentStatus = String(req.query.paymentStatus);
    const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(200);
    res.json({ orders });
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json({ order });
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
    res.json({ order });
  }),
);

export default router;
