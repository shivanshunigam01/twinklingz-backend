import { Router } from "express";
import { body, validationResult } from "express-validator";
import { Order } from "../models/Order.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { createRazorpayOrder, verifyRazorpayPaymentSignature } from "../utils/razorpayPayment.js";

const router = Router();

router.post(
  "/create-order",
  body("amount").isInt({ min: 100 }),
  body("currency").optional().isString(),
  body("receipt").optional().isString(),
  body("shopOrderId").optional().isString(),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: "Invalid request", details: errors.array() });
    }
    const { amount, currency, receipt, shopOrderId } = req.body;
    const notes = shopOrderId ? { shopOrderId: String(shopOrderId) } : {};
    const created = await createRazorpayOrder({ amount, currency, receipt, notes });

    if (shopOrderId) {
      await Order.findByIdAndUpdate(shopOrderId, { razorpayOrderId: created.order_id });
    }

    res.json(created);
  }),
);

router.post(
  "/verify-payment",
  body("razorpay_order_id").notEmpty(),
  body("razorpay_payment_id").notEmpty(),
  body("razorpay_signature").notEmpty(),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: "Missing payment verification fields", details: errors.array() });
    }
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const valid = verifyRazorpayPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    );
    if (!valid) {
      return res.status(400).json({ error: "Payment verification failed", success: false });
    }

    const order = await Order.findOne({ razorpayOrderId: razorpay_order_id });
    if (order && order.paymentStatus !== "paid") {
      order.paymentStatus = "paid";
      order.razorpayPaymentId = razorpay_payment_id;
      order.razorpaySignature = razorpay_signature;
      await order.save();
    }

    res.json({
      success: true,
      orderNumber: order?.orderNumber ?? null,
      paymentStatus: order?.paymentStatus ?? "paid",
    });
  }),
);

export default router;
