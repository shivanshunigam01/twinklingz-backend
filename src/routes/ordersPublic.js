import { Router } from "express";
import { body, validationResult } from "express-validator";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { getRazorpayKeyId } from "../config/razorpay.js";
import { generateOrderNumber } from "../utils/orderNumber.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { createRazorpayOrder, verifyRazorpayPaymentSignature } from "../utils/razorpayPayment.js";
import { markOrderPaid } from "../lib/markOrderPaid.js";

const router = Router();

router.post(
  "/",
  body("customer.fullName").notEmpty(),
  body("customer.email").isEmail(),
  body("customer.mobile").notEmpty(),
  body("shippingAddress.address").notEmpty(),
  body("shippingAddress.city").notEmpty(),
  body("shippingAddress.state").notEmpty(),
  body("shippingAddress.pinCode").notEmpty(),
  body("items").isArray({ min: 1 }),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: "Invalid order", details: errors.array() });
    }
    const { customer, shippingAddress, items, paymentMethod } = req.body;

    const lineItems = [];
    let subtotal = 0;
    for (const item of items) {
      const product = item.productId
        ? await Product.findById(item.productId)
        : item.slug
          ? await Product.findOne({ slug: item.slug })
          : null;
      const qty = Math.max(1, Number(item.quantity) || 1);

      if (product && product.published) {
        const unitPrice = product.price;
        subtotal += unitPrice * qty;
        lineItems.push({
          productId: product._id,
          slug: product.slug,
          name: product.name,
          sku: product.sku,
          quantity: qty,
          unitPrice,
          image: product.image,
        });
        continue;
      }

      if (item.name && item.unitPrice != null) {
        const unitPrice = Number(item.unitPrice);
        if (Number.isNaN(unitPrice) || unitPrice < 0) {
          return res.status(400).json({ error: "Invalid unitPrice for cart item" });
        }
        subtotal += unitPrice * qty;
        lineItems.push({
          slug: item.slug,
          name: String(item.name),
          sku: item.sku,
          quantity: qty,
          unitPrice,
          image: item.image,
        });
        continue;
      }

      return res.status(400).json({
        error: `Product not available: ${item.slug || item.productId}. Add it in admin or send name and unitPrice.`,
      });
    }

    const shippingFee = 0;
    const total = subtotal + shippingFee;
    const orderNumber = generateOrderNumber();

    const order = await Order.create({
      orderNumber,
      customer,
      shippingAddress,
      items: lineItems,
      subtotal,
      shippingFee,
      total,
      paymentMethod: paymentMethod || "razorpay",
      paymentStatus: "pending",
    });

    res.status(201).json({
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        total: order.total,
        currency: order.currency,
        paymentStatus: order.paymentStatus,
      },
    });
  }),
);

router.get(
  "/track",
  asyncHandler(async (req, res) => {
    const orderNumber = String(req.query.orderNumber || "").trim();
    const emailOrPhone = String(req.query.emailOrPhone || "").trim();
    if (!orderNumber || !emailOrPhone) {
      return res.status(400).json({ error: "orderNumber and emailOrPhone are required" });
    }
    const order = await Order.findOne({ orderNumber });
    if (!order) return res.status(404).json({ error: "Order not found" });
    const match =
      order.customer.email.toLowerCase() === emailOrPhone.toLowerCase() ||
      order.customer.mobile === emailOrPhone;
    if (!match) return res.status(404).json({ error: "Order not found" });
    res.json({
      order: {
        orderNumber: order.orderNumber,
        fulfillmentStatus: order.fulfillmentStatus,
        paymentStatus: order.paymentStatus,
        trackingNote: order.trackingNote,
        createdAt: order.createdAt,
        total: order.total,
      },
    });
  }),
);

router.post(
  "/:orderId/razorpay/create",
  asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.paymentStatus === "paid") {
      return res.status(400).json({ error: "Order is already paid" });
    }
    const amountPaise = Math.round(order.total * 100);
    const created = await createRazorpayOrder({
      amount: amountPaise,
      currency: order.currency || "INR",
      receipt: order.orderNumber,
      notes: { shopOrderId: order._id.toString() },
    });
    order.razorpayOrderId = created.order_id;
    await order.save();
    res.json({
      keyId: created.key_id || getRazorpayKeyId(),
      razorpayOrderId: created.order_id,
      amount: created.amount,
      currency: created.currency,
      orderNumber: order.orderNumber,
    });
  }),
);

router.post(
  "/razorpay/verify",
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
    if (!order) return res.status(404).json({ error: "Order not found for this payment" });
    await markOrderPaid(order, {
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
    });
    res.json({ ok: true, success: true, orderNumber: order.orderNumber, paymentStatus: order.paymentStatus });
  }),
);

export default router;
