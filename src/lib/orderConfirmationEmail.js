import nodemailer from "nodemailer";
import { getStorefrontUrl } from "./storefrontUrl.js";

function formatInr(amount) {
  return `₹${Number(amount).toLocaleString("en-IN")}`;
}

function isSmtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim(),
  );
}

function getTransporter() {
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST?.trim(),
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER?.trim(),
      pass: process.env.SMTP_PASS?.trim(),
    },
  });
}

function buildTrackUrl(order) {
  const base = getStorefrontUrl();
  const q = new URLSearchParams({
    orderNumber: order.orderNumber,
    emailOrPhone: order.customer.email,
  });
  return `${base}/track-order?${q.toString()}`;
}

function buildHtml(order) {
  const trackUrl = buildTrackUrl(order);
  const addr = order.shippingAddress;
  const addressLines = [
    addr.address,
    addr.landmark,
    `${addr.city}, ${addr.state} ${addr.pinCode}`,
  ]
    .filter(Boolean)
    .join("<br/>");

  const rows = order.items
    .map(
      (item) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #eee;">${item.name}${item.sku ? ` <span style="color:#888;font-size:12px;">(${item.sku})</span>` : ""}</td>
      <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
      <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;">${formatInr(item.unitPrice * item.quantity)}</td>
    </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<body style="margin:0;font-family:Georgia,'Times New Roman',serif;background:#f7f3ef;color:#2c1810;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;padding:32px 20px;">
    <tr><td style="text-align:center;padding-bottom:24px;">
      <p style="letter-spacing:0.28em;font-size:11px;margin:0 0 8px;color:#8b5a5a;">TWINKLINGZ</p>
      <h1 style="margin:0;font-size:28px;font-weight:400;">Thank you, ${order.customer.fullName}</h1>
    </td></tr>
    <tr><td style="background:#fff;padding:28px;border:1px solid #e8ddd6;">
      <p style="margin:0 0 8px;font-size:14px;color:#5c4a42;">Your order is confirmed</p>
      <p style="margin:0;font-size:22px;"><strong>${order.orderNumber}</strong></p>
      <p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:#5c4a42;">Payment received. We are preparing your jewellery with care.</p>
      <h2 style="margin:28px 0 12px;font-size:16px;font-weight:600;letter-spacing:0.06em;">ITEMS</h2>
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
        <tr style="color:#888;font-size:12px;">
          <th align="left" style="padding-bottom:8px;">Product</th>
          <th align="center" style="padding-bottom:8px;">Qty</th>
          <th align="right" style="padding-bottom:8px;">Amount</th>
        </tr>
        ${rows}
        <tr>
          <td colspan="2" style="padding-top:16px;font-weight:600;">Total</td>
          <td align="right" style="padding-top:16px;font-weight:600;">${formatInr(order.total)}</td>
        </tr>
      </table>
      <h2 style="margin:28px 0 12px;font-size:16px;font-weight:600;letter-spacing:0.06em;">SHIPPING TO</h2>
      <p style="margin:0;font-size:14px;line-height:1.7;color:#5c4a42;">${addressLines}<br/>Phone: ${order.customer.mobile}</p>
      <p style="margin:28px 0 0;text-align:center;">
        <a href="${trackUrl}" style="display:inline-block;background:#2c1810;color:#fff;text-decoration:none;padding:14px 28px;font-size:13px;letter-spacing:0.12em;">TRACK YOUR ORDER</a>
      </p>
    </td></tr>
    <tr><td style="text-align:center;padding-top:24px;font-size:12px;color:#8b7a72;">
      Questions? Reply to this email or visit <a href="${getStorefrontUrl()}/contact" style="color:#8b5a5a;">Contact</a>.
    </td></tr>
  </table>
</body>
</html>`;
}

function buildText(order) {
  const trackUrl = buildTrackUrl(order);
  const addr = order.shippingAddress;
  const lines = order.items.map(
    (i) => `- ${i.name} x${i.quantity} — ${formatInr(i.unitPrice * i.quantity)}`,
  );
  return `Thank you, ${order.customer.fullName}!

Order: ${order.orderNumber}
Total: ${formatInr(order.total)}

Items:
${lines.join("\n")}

Ship to:
${addr.address}
${addr.landmark ? `${addr.landmark}\n` : ""}${addr.city}, ${addr.state} ${addr.pinCode}
Phone: ${order.customer.mobile}

Track your order: ${trackUrl}
`;
}

/** Sends confirmation email; logs and swallows errors so checkout is not blocked. */
export async function sendOrderConfirmationEmail(order) {
  if (!isSmtpConfigured()) {
    console.warn("[email] SMTP not configured — skip order confirmation for", order.orderNumber);
    return false;
  }

  const from =
    process.env.SMTP_FROM?.trim() ||
    process.env.SMTP_USER?.trim() ||
    "orders@twinklingz.com";

  const to = order.customer.email?.trim();
  if (!to) return false;

  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"Twinklingz" <${from}>`,
    to,
    subject: `Order confirmed — ${order.orderNumber}`,
    text: buildText(order),
    html: buildHtml(order),
  });

  console.log("[email] Order confirmation sent to", to, "for", order.orderNumber);
  return true;
}
