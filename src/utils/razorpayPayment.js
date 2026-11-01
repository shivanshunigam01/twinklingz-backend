import crypto from "crypto";
import {
  createRazorpayClient,
  getRazorpayKeyId,
  getRazorpayKeySecret,
  resetRazorpayClient,
} from "../config/razorpay.js";

const RAZORPAY_AUTH_HELP =
  "Razorpay rejected the API keys on the server. In /var/www/twinklingz-backend/.env set matching RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET from Razorpay Dashboard → Settings → API Keys (same Test or Live mode), then pm2 restart twinklingz-api.";

export function verifyRazorpayPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
  const secret = getRazorpayKeySecret();
  if (!secret) {
    const err = new Error("Razorpay is not configured on the server");
    err.status = 503;
    throw err;
  }
  const payload = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return expected === razorpaySignature;
}

async function createRazorpayOrderOnce({ amount, currency, receipt, notes }) {
  const razorpay = createRazorpayClient();
  if (!razorpay) {
    const err = new Error("Razorpay is not configured on the server (missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET)");
    err.status = 503;
    throw err;
  }
  const amountPaise = Math.round(Number(amount));
  if (Number.isNaN(amountPaise) || amountPaise < 100) {
    const err = new Error("Amount must be at least 100 paise (₹1)");
    err.status = 400;
    throw err;
  }
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
}

function mapRazorpayError(e) {
  const statusCode = e?.statusCode ?? e?.error?.statusCode;
  const description = e?.error?.description || e?.message || "Razorpay order creation failed";
  const err = new Error(description);
  if (statusCode === 401 || /authentication failed/i.test(description)) {
    err.status = 503;
    err.message = RAZORPAY_AUTH_HELP;
    err.code = "RAZORPAY_AUTH_FAILED";
  } else {
    err.status = typeof statusCode === "number" && statusCode >= 400 && statusCode < 600 ? statusCode : 500;
    err.message = description;
  }
  return err;
}

export async function createRazorpayOrder(params) {
  try {
    return await createRazorpayOrderOnce(params);
  } catch (e) {
    const statusCode = e?.statusCode ?? e?.error?.statusCode;
    const description = e?.error?.description || e?.message || "";
    if (statusCode === 401 || /authentication failed/i.test(description)) {
      resetRazorpayClient();
      try {
        return await createRazorpayOrderOnce(params);
      } catch (retryErr) {
        throw mapRazorpayError(retryErr);
      }
    }
    throw mapRazorpayError(e);
  }
}
