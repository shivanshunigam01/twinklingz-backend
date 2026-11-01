import Razorpay from "razorpay";

let client = null;
let cachedPair = "";

/** Strip whitespace and surrounding quotes from .env values (common VPS copy-paste issue). */
export function sanitizeRazorpayEnv(value) {
  if (value == null) return "";
  let s = String(value).trim();
  for (let i = 0; i < 3; i++) {
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
      s = s.slice(1, -1).trim();
    } else {
      break;
    }
  }
  return s;
}

export function getRazorpayKeyId() {
  return sanitizeRazorpayEnv(process.env.RAZORPAY_KEY_ID);
}

export function getRazorpayKeySecret() {
  return sanitizeRazorpayEnv(process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET);
}

export function isRazorpayConfigured() {
  return Boolean(getRazorpayKeyId() && getRazorpayKeySecret());
}

export function resetRazorpayClient() {
  client = null;
  cachedPair = "";
}

export function createRazorpayClient() {
  const keyId = getRazorpayKeyId();
  const keySecret = getRazorpayKeySecret();
  if (!keyId || !keySecret) return null;

  const pair = `${keyId}:${keySecret.length}`;
  if (client && cachedPair === pair) return client;

  client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  cachedPair = pair;
  return client;
}

/** Safe hint for logs / health (never expose secret). */
export function razorpayKeyHint() {
  const id = getRazorpayKeyId();
  if (!id) return null;
  const mode = id.startsWith("rzp_live_") ? "live" : id.startsWith("rzp_test_") ? "test" : "unknown";
  return { mode, keyIdPrefix: id.slice(0, 16) };
}
