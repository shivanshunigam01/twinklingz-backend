import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";
import { formatInrPdf } from "./money.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUNDLED_LOGO_PATH = path.join(__dirname, "../assets/twinklingz-invoice-logo.png");

const INK = "#1a120e";
const MUTED = "#5c4a42";
const ACCENT = "#7a4a42";
const LINE = "#b8a99a";
const LINE_LIGHT = "#e5dcd4";
const PANEL = "#f7f2ec";
const PANEL_DARK = "#efe6dc";

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
  return [
    settings?.brandName || "Twinklingz",
    settings?.subBrand || "",
    settings?.tagline || "",
    [c.addressLine1, c.addressLine2].filter(Boolean).join(", "),
    [c.city, c.state, c.pinCode].filter(Boolean).join(", "),
    c.country || "India",
    c.email ? `Email: ${c.email}` : "",
    c.phone ? `Phone: ${c.phone}` : "",
    c.gstin ? `GSTIN: ${c.gstin}` : "",
  ].filter(Boolean);
}

function contentBox(doc) {
  const left = doc.page.margins.left;
  const top = doc.page.margins.top;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const height = doc.page.height - doc.page.margins.top - doc.page.margins.bottom;
  return { left, top, width, height, right: left + width, bottom: top + height };
}

function strokeRect(doc, x, y, w, h, { fill = null, stroke = LINE, width = 0.75 } = {}) {
  if (fill) {
    doc.save().rect(x, y, w, h).fill(fill).restore();
  }
  doc.save().rect(x, y, w, h).strokeColor(stroke).lineWidth(width).stroke().restore();
}

function hRule(doc, x, y, w, color = LINE_LIGHT, width = 0.5) {
  doc.save().moveTo(x, y).lineTo(x + w, y).strokeColor(color).lineWidth(width).stroke().restore();
}

function drawSectionLabel(doc, text, x, y, w) {
  doc.font("Helvetica-Bold").fontSize(8).fillColor(ACCENT).text(text, x + 8, y + 6, { width: w - 16, characterSpacing: 1.1 });
}

function drawMetaRow(doc, label, value, x, y, labelW, valueW) {
  doc.font("Helvetica-Bold").fontSize(8).fillColor(MUTED).text(label, x, y, { width: labelW });
  doc.font("Helvetica").fontSize(9).fillColor(INK).text(value, x + labelW, y, { width: valueW, align: "right" });
  return y + 14;
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
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const box = contentBox(doc);
    const { left, top, width } = box;

    strokeRect(doc, left, top, width, box.height, { stroke: LINE, width: 1 });

    let y = top + 12;
    const pad = 14;
    const innerLeft = left + pad;
    const innerWidth = width - pad * 2;

    const headerH = 88;
    strokeRect(doc, innerLeft, y, innerWidth, headerH, { fill: PANEL, stroke: LINE_LIGHT });
    const logoW = 200;
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, innerLeft + 10, y + 10, { fit: [logoW, 68], align: "left", valign: "center" });
      } catch {
        doc.font("Helvetica-Bold").fontSize(20).fillColor(INK).text("TWINKLINGZ", innerLeft + 12, y + 28);
      }
    } else {
      doc.font("Helvetica-Bold").fontSize(20).fillColor(INK).text((settings?.brandName || "TWINKLINGZ").toUpperCase(), innerLeft + 12, y + 22);
      if (settings?.subBrand) {
        doc.font("Helvetica-Oblique").fontSize(10).fillColor(MUTED).text(settings.subBrand, innerLeft + 12, y + 46);
      }
    }

    const metaBoxW = 200;
    const metaX = innerLeft + innerWidth - metaBoxW - 10;
    const metaY = y + 10;
    strokeRect(doc, metaX, metaY, metaBoxW, headerH - 20, { fill: "#fff", stroke: LINE });
    doc.font("Helvetica-Bold").fontSize(11).fillColor(INK).text(title, metaX, metaY + 8, { width: metaBoxW, align: "center" });
    hRule(doc, metaX + 8, metaY + 26, metaBoxW - 16, LINE, 0.75);

    let my = metaY + 32;
    my = drawMetaRow(doc, "Invoice #", order.orderNumber || "—", metaX + 8, my, 58, metaBoxW - 74);
    my = drawMetaRow(doc, "Date", formatInvoiceDate(order.createdAt), metaX + 8, my, 58, metaBoxW - 74);
    my = drawMetaRow(
      doc,
      "Payment",
      (order.paymentStatus || "pending").toUpperCase(),
      metaX + 8,
      my,
      58,
      metaBoxW - 74,
    );
    if (order.razorpayPaymentId) {
      doc.font("Helvetica").fontSize(7).fillColor(MUTED).text(`Razorpay: ${order.razorpayPaymentId}`, metaX + 8, my, {
        width: metaBoxW - 16,
        align: "right",
      });
    }

    y += headerH + 14;

    const addrH = 96;
    const colW = (innerWidth - 10) / 2;
    strokeRect(doc, innerLeft, y, colW, addrH, { fill: "#fff", stroke: LINE_LIGHT });
    strokeRect(doc, innerLeft + colW + 10, y, colW, addrH, { fill: "#fff", stroke: LINE_LIGHT });
    drawSectionLabel(doc, "BILL TO", innerLeft, y, colW);
    drawSectionLabel(doc, "SHIP TO", innerLeft + colW + 10, y, colW);

    const cust = order.customer || {};
    doc.font("Helvetica-Bold").fontSize(10).fillColor(INK).text(cust.fullName || "—", innerLeft + 8, y + 22, { width: colW - 16 });
    doc.font("Helvetica").fontSize(9).fillColor(MUTED);
    doc.text(cust.email || "", innerLeft + 8, doc.y + 3, { width: colW - 16 });
    if (cust.mobile) doc.text(`Mobile: ${cust.mobile}`, innerLeft + 8, doc.y + 3, { width: colW - 16 });

    const addr = order.shippingAddress || {};
    const shipLines = [
      addr.address,
      addr.landmark,
      [addr.city, addr.state, addr.pinCode].filter(Boolean).join(", "),
    ].filter(Boolean);
    doc.font("Helvetica").fontSize(9).fillColor(INK).text(shipLines.length ? shipLines.join("\n") : "—", innerLeft + colW + 18, y + 22, {
      width: colW - 16,
    });

    y += addrH + 14;

    const colSku = 64;
    const colQty = 32;
    const colUnit = 76;
    const colAmt = 76;
    const colProduct = innerWidth - colSku - colQty - colUnit - colAmt;
    const rowH = 22;
    const headerRowH = 24;

    strokeRect(doc, innerLeft, y, innerWidth, headerRowH, { fill: PANEL_DARK, stroke: LINE });
    const cols = [
      { label: "PRODUCT / DESCRIPTION", x: innerLeft, w: colProduct, align: "left" },
      { label: "SKU", x: innerLeft + colProduct, w: colSku, align: "left" },
      { label: "QTY", x: innerLeft + colProduct + colSku, w: colQty, align: "center" },
      { label: "UNIT PRICE", x: innerLeft + colProduct + colSku + colQty, w: colUnit, align: "right" },
      { label: "AMOUNT", x: innerLeft + colProduct + colSku + colQty + colUnit, w: colAmt, align: "right" },
    ];
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor(MUTED);
    for (const c of cols) {
      doc.text(c.label, c.x + 6, y + 8, { width: c.w - 10, align: c.align });
    }
    for (let i = 1; i < cols.length; i++) {
      const vx = cols[i].x;
      doc.save().moveTo(vx, y).lineTo(vx, y + headerRowH).strokeColor(LINE_LIGHT).lineWidth(0.5).stroke().restore();
    }

    y += headerRowH;
    doc.font("Helvetica").fontSize(9).fillColor(INK);

    const items = order.items || [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (y > box.bottom - 160) {
        doc.addPage();
        strokeRect(doc, left, top, width, box.height, { stroke: LINE, width: 1 });
        y = top + pad;
      }

      const name = item.name || "Item";
      const nameH = doc.heightOfString(name, { width: colProduct - 14 });
      const thisRowH = Math.max(rowH, nameH + 12);

      strokeRect(doc, innerLeft, y, innerWidth, thisRowH, { fill: i % 2 === 0 ? "#fff" : "#fdfbf9", stroke: LINE_LIGHT });
      for (let j = 1; j < cols.length; j++) {
        const vx = cols[j].x;
        doc.save().moveTo(vx, y).lineTo(vx, y + thisRowH).strokeColor(LINE_LIGHT).lineWidth(0.5).stroke().restore();
      }

      const lineTotal = (item.unitPrice || 0) * (item.quantity || 1);
      const ty = y + 7;
      doc.text(name, innerLeft + 8, ty, { width: colProduct - 14 });
      doc.text(item.sku || "—", cols[1].x + 6, ty, { width: colSku - 10 });
      doc.text(String(item.quantity ?? 1), cols[2].x, ty, { width: colQty, align: "center" });
      doc.text(formatInrPdf(item.unitPrice || 0), cols[3].x + 4, ty, { width: colUnit - 8, align: "right" });
      doc.font("Helvetica-Bold").text(formatInrPdf(lineTotal), cols[4].x + 4, ty, { width: colAmt - 8, align: "right" });
      doc.font("Helvetica");

      y += thisRowH;
    }

    if (items.length === 0) {
      strokeRect(doc, innerLeft, y, innerWidth, rowH, { stroke: LINE_LIGHT });
      doc.font("Helvetica").fontSize(9).fillColor(MUTED).text("No line items", innerLeft + 8, y + 7, { width: innerWidth });
      y += rowH;
    }

    y += 12;

    const totalsW = 240;
    const totalsX = innerLeft + innerWidth - totalsW;
    const totalsH = 78;
    strokeRect(doc, totalsX, y, totalsW, totalsH, { fill: PANEL, stroke: LINE });

    const subtotal = order.subtotal ?? order.total;
    const shipping = order.shippingFee ?? 0;
    let ty = y + 10;
    const labelW = 100;
    const valW = totalsW - labelW - 16;

    function totalLine(label, value, bold = false) {
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(bold ? 10 : 9).fillColor(bold ? INK : MUTED);
      doc.text(label, totalsX + 10, ty, { width: labelW });
      doc.fillColor(INK).text(value, totalsX + labelW, ty, { width: valW, align: "right" });
      ty += bold ? 18 : 14;
    }

    totalLine("Subtotal", formatInrPdf(subtotal));
    totalLine("Shipping", formatInrPdf(shipping));
    hRule(doc, totalsX + 8, ty, totalsW - 16, LINE, 0.75);
    ty += 8;
    totalLine("Grand Total", formatInrPdf(order.total), true);
    doc.font("Helvetica").fontSize(7).fillColor(MUTED).text("Amount in Indian Rupees (INR)", totalsX + 10, ty + 2, {
      width: totalsW - 20,
      align: "right",
    });

    y += totalsH + 14;

    const sellerH = 88;
    strokeRect(doc, innerLeft, y, innerWidth, sellerH, { fill: "#fff", stroke: LINE_LIGHT });
    drawSectionLabel(doc, "SOLD BY / SELLER DETAILS", innerLeft, y, innerWidth);
    doc.font("Helvetica").fontSize(9).fillColor(INK).text(sellerLines(settings).join("\n"), innerLeft + 8, y + 22, {
      width: innerWidth - 16,
      lineGap: 2,
    });

    y += sellerH + 10;
    doc.font("Helvetica").fontSize(8).fillColor(MUTED).text(
      "All amounts are inclusive of applicable taxes unless stated otherwise. This is a computer-generated invoice and does not require a physical signature.",
      innerLeft,
      y,
      { width: innerWidth, align: "justify", lineGap: 1 },
    );

    const footerY = box.bottom - 8;
    hRule(doc, innerLeft, footerY - 18, innerWidth, LINE, 0.75);
    doc.font("Helvetica-Bold").fontSize(8).fillColor(ACCENT).text(
      `Thank you for shopping with ${settings?.brandName || "Twinklingz"}.`,
      innerLeft,
      footerY - 12,
      { width: innerWidth, align: "center" },
    );

    doc.end();
  });
}
