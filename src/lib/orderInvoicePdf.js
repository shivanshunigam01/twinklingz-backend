import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";
import { formatInr } from "./money.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUNDLED_LOGO_PATH = path.join(__dirname, "../assets/twinklingz-invoice-logo.png");

const BRAND_COLOR = "#2c1810";
const MUTED = "#5c4a42";
const ACCENT = "#8b5a5a";
const BORDER = "#e8ddd6";

async function fetchImageBuffer(url) {
  if (!url?.trim()) return null;
  try {
    const res = await fetch(url.trim(), { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") || "";
    if (!type.startsWith("image/")) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

async function resolveLogoBuffer() {
  const fromEnv = process.env.INVOICE_LOGO_URL?.trim();
  if (fromEnv) {
    const buf = await fetchImageBuffer(fromEnv);
    if (buf) return buf;
  }
  try {
    return await readFile(BUNDLED_LOGO_PATH);
  } catch {
    return null;
  }
}

function formatInvoiceDate(date) {
  const d = date ? new Date(date) : new Date();
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sellerLines(settings) {
  const c = settings?.contact || {};
  const lines = [
    settings?.brandName || "Twinklingz",
    settings?.subBrand || "",
    settings?.tagline || "",
    [c.addressLine1, c.addressLine2].filter(Boolean).join(", "),
    [c.city, c.state, c.pinCode].filter(Boolean).join(", "),
    c.country || "India",
    c.email ? `Email: ${c.email}` : "",
    c.phone ? `Phone: ${c.phone}` : "",
    c.whatsapp ? `WhatsApp: ${c.whatsapp}` : "",
  ].filter(Boolean);
  return lines;
}

function drawBrandHeader(doc, settings, logoBuffer) {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  let y = doc.page.margins.top;
  let drewLogo = false;

  if (logoBuffer) {
    try {
      doc.image(logoBuffer, left, y, { fit: [260, 72], align: "left" });
      y += 78;
      drewLogo = true;
    } catch {
      drewLogo = false;
    }
  }

  if (!drewLogo) {
    doc
      .font("Helvetica-Bold")
      .fontSize(22)
      .fillColor(BRAND_COLOR)
      .text((settings?.brandName || "TWINKLINGZ").toUpperCase(), left, y, { width: right - left });
    y = doc.y + 2;
    if (settings?.subBrand) {
      doc.font("Helvetica").fontSize(10).fillColor(MUTED).text(settings.subBrand, left, y);
      y = doc.y + 4;
    }
  }

  doc
    .moveTo(left, y + 4)
    .lineTo(right, y + 4)
    .strokeColor(ACCENT)
    .lineWidth(1)
    .stroke();

  return y + 14;
}

function drawSectionTitle(doc, title, x, y, width) {
  doc.font("Helvetica-Bold").fontSize(9).fillColor(ACCENT).text(title, x, y, { width, characterSpacing: 1.2 });
  return doc.y + 6;
}

function drawLabelValue(doc, label, value, x, y, width) {
  doc.font("Helvetica-Bold").fontSize(9).fillColor(MUTED).text(label, x, y, { width });
  const y2 = doc.y;
  doc.font("Helvetica").fontSize(10).fillColor(BRAND_COLOR).text(value, x, y2, { width });
  return doc.y + 8;
}

/**
 * @param {object} order - plain order object (items enriched optional)
 * @param {object} settings - site settings document
 */
export async function buildOrderInvoicePdf(order, settings = {}) {
  const logoBuffer = await resolveLogoBuffer();
  const isPaid = order.paymentStatus === "paid";
  const title = isPaid ? "TAX INVOICE" : "ORDER SUMMARY";

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const left = doc.page.margins.left;
    let y = drawBrandHeader(doc, settings, logoBuffer);

    doc
      .font("Helvetica-Bold")
      .fontSize(16)
      .fillColor(BRAND_COLOR)
      .text(title, left, y, { width: pageWidth * 0.55 });
    const metaX = left + pageWidth * 0.55;
    doc.font("Helvetica").fontSize(9).fillColor(MUTED);
    doc.text(`Invoice #: ${order.orderNumber}`, metaX, y, { width: pageWidth * 0.45, align: "right" });
    doc.text(`Date: ${formatInvoiceDate(order.createdAt)}`, metaX, doc.y, {
      width: pageWidth * 0.45,
      align: "right",
    });
    doc.text(`Payment: ${order.paymentStatus || "pending"}`, metaX, doc.y, {
      width: pageWidth * 0.45,
      align: "right",
    });
    if (order.razorpayPaymentId) {
      doc.text(`Razorpay ID: ${order.razorpayPaymentId}`, metaX, doc.y, {
        width: pageWidth * 0.45,
        align: "right",
      });
    }

    y = doc.y + 18;
    const colW = pageWidth / 2 - 8;
    const shipX = left + colW + 16;
    const blockTop = y;

    drawSectionTitle(doc, "BILL TO", left, blockTop, colW);
    const cust = order.customer || {};
    doc.font("Helvetica-Bold").fontSize(11).fillColor(BRAND_COLOR).text(cust.fullName || "—", left, doc.y, { width: colW });
    doc.font("Helvetica").fontSize(10).fillColor(MUTED);
    doc.text(cust.email || "", left, doc.y + 2, { width: colW });
    doc.text(cust.mobile ? `Mobile: ${cust.mobile}` : "", left, doc.y + 2, { width: colW });
    const billBottom = doc.y;

    drawSectionTitle(doc, "SHIP TO", shipX, blockTop, colW);
    const addr = order.shippingAddress || {};
    const shipLines = [
      addr.address,
      addr.landmark,
      [addr.city, addr.state, addr.pinCode].filter(Boolean).join(", "),
    ].filter(Boolean);
    doc.font("Helvetica").fontSize(10).fillColor(BRAND_COLOR).text(shipLines.join("\n"), shipX, doc.y, { width: colW });
    const shipBottom = doc.y;

    y = Math.max(billBottom, shipBottom) + 20;

    const colSku = 72;
    const colQty = 36;
    const colUnit = 72;
    const colLine = 72;
    const colName = pageWidth - colSku - colQty - colUnit - colLine;

    const tableTop = y;
    doc.rect(left, tableTop, pageWidth, 20).fill("#f7f3ef");
    doc.fillColor(MUTED).font("Helvetica-Bold").fontSize(8);
    doc.text("PRODUCT", left + 6, tableTop + 6, { width: colName });
    doc.text("SKU", left + colName + 4, tableTop + 6, { width: colSku });
    doc.text("QTY", left + colName + colSku + 4, tableTop + 6, { width: colQty, align: "center" });
    doc.text("UNIT", left + colName + colSku + colQty + 4, tableTop + 6, { width: colUnit, align: "right" });
    doc.text("AMOUNT", left + pageWidth - colLine, tableTop + 6, { width: colLine - 4, align: "right" });

    y = tableTop + 24;
    doc.font("Helvetica").fontSize(9).fillColor(BRAND_COLOR);

    for (const item of order.items || []) {
      if (y > doc.page.height - 120) {
        doc.addPage();
        y = doc.page.margins.top;
      }
      const lineTotal = (item.unitPrice || 0) * (item.quantity || 1);
      const nameH = doc.heightOfString(item.name || "Item", { width: colName - 8 });
      doc.text(item.name || "Item", left + 6, y, { width: colName - 8 });
      doc.text(item.sku || "—", left + colName + 4, y, { width: colSku });
      doc.text(String(item.quantity ?? 1), left + colName + colSku + 4, y, { width: colQty, align: "center" });
      doc.text(formatInr(item.unitPrice || 0), left + colName + colSku + colQty + 4, y, {
        width: colUnit,
        align: "right",
      });
      doc.text(formatInr(lineTotal), left + pageWidth - colLine, y, { width: colLine - 4, align: "right" });
      y += Math.max(nameH, 14) + 8;
      doc.moveTo(left, y - 4).lineTo(left + pageWidth, y - 4).strokeColor(BORDER).lineWidth(0.5).stroke();
    }

    y += 8;
    const totalsX = left + pageWidth - 220;
    const subtotal = order.subtotal ?? order.total;
    const shipping = order.shippingFee ?? 0;

    drawLabelValue(doc, "Subtotal", formatInr(subtotal), totalsX, y, 220);
    drawLabelValue(doc, "Shipping", formatInr(shipping), totalsX, doc.y, 220);
    doc.font("Helvetica-Bold").fontSize(11).fillColor(BRAND_COLOR);
    doc.text("Total (INR)", totalsX, doc.y + 4, { width: 110 });
    doc.text(formatInr(order.total), totalsX + 110, doc.y - 11, { width: 110, align: "right" });

    y = doc.y + 16;
    doc.font("Helvetica").fontSize(8).fillColor(MUTED);
    doc.text("All amounts are inclusive of applicable taxes unless stated otherwise.", left, y, { width: pageWidth });

    y = doc.y + 14;
    drawSectionTitle(doc, "SELLER", left, y, pageWidth);
    doc.font("Helvetica").fontSize(9).fillColor(BRAND_COLOR);
    doc.text(sellerLines(settings).join("\n"), left, doc.y + 2, { width: pageWidth });

    const footerY = doc.page.height - doc.page.margins.bottom - 24;
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(MUTED)
      .text(
        `Thank you for shopping with ${settings?.brandName || "Twinklingz"}. This is a computer-generated invoice.`,
        left,
        footerY,
        { width: pageWidth, align: "center" },
      );

    doc.end();
  });
}
