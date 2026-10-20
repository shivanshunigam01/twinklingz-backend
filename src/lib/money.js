/** Use in PDFs — standard fonts do not render the ₹ glyph reliably. */
export function formatInrPdf(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "Rs. 0";
  return `Rs. ${n.toLocaleString("en-IN", { maximumFractionDigits: 0, minimumFractionDigits: 0 })}`;
}

export function formatInr(amount) {
  return `₹${Number(amount).toLocaleString("en-IN")}`;
}
