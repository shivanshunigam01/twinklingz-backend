import crypto from "crypto";
import { createRazorpayClient, getRazorpayKeyId } from "../config/razorpay.js";

export function verifyRazorpayPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
  const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!secret) {
    const err = new Error("Razorpay is not configured on the server");
    err.status = 503;
    throw err;
  }
  const payload = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return expected === razorpaySignature;
}

export async function createRazorpayOrder({ amount, currency = "INR", receipt, notes }) {
  const razorpay = createRazorpayClient();
  if (!razorpay) {
    const err = new Error("Razorpay is not configured on the server");
    err.status = 503;
    throw err;
  }
  const amountPaise = Math.round(Number(amount));
  if (Number.isNaN(amountPaise) || amountPaise < 100) {
    const err = new Error("Amount must be at least 100 paise (₹1)");
    err.status = 400;
    throw err;
  }
  try {
    const rpOrder = await razorpay.orders.create({
      amount: amountPaise,
      currency: String(currency || "INR").toUpperCase(),
      receipt: receipt ? String(receipt).slice(0, 40) : undefined,
      notes: notes ?? {},
    });
    return {
      order_id: rpOrder.id,
      amount: rpOrder.amount,
      currency: rpOrder.currency,
      key_id: getRazorpayKeyId(),
    };
  } catch (e) {
    const statusCode = e?.statusCode ?? e?.error?.statusCode;
    const err = new Error(e?.error?.description || e?.message || "Razorpay order creation failed");
    if (statusCode === 401) err.status = 401;
    else err.status = 500;
    throw err;
  }
}
