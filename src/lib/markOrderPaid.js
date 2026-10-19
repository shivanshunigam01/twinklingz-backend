import { sendOrderConfirmationEmail } from "./orderConfirmationEmail.js";

/** Marks order paid and sends confirmation email once. */
export async function markOrderPaid(order, { razorpayPaymentId, razorpaySignature }) {
  const wasPaid = order.paymentStatus === "paid";
  if (!wasPaid) {
    order.paymentStatus = "paid";
    if (razorpayPaymentId) order.razorpayPaymentId = razorpayPaymentId;
    if (razorpaySignature) order.razorpaySignature = razorpaySignature;
    await order.save();
    sendOrderConfirmationEmail(order).catch((err) => {
      console.error("[email] Failed to send order confirmation:", err.message);
    });
  }
  return { wasPaid };
}
