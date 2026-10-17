import Razorpay from "razorpay";

let client = null;

export function createRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) return null;
  if (!client) {
    client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }
  return client;
}

export function getRazorpayKeyId() {
  return process.env.RAZORPAY_KEY_ID?.trim() || "";
}
