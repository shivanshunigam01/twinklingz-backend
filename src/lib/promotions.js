/** Site-wide Diwali sale — keep in sync with storefront `src/lib/promotions.ts`. */
export const DIWALI_SALE = {
  active: true,
  percentOff: 25,
  code: "DIWALI25",
  label: "Diwali Festive Sale",
};

export function listPriceBeforePromo(dbPrice, dbMrp) {
  const price = Number(dbPrice) || 0;
  const mrp = Number(dbMrp) || 0;
  return mrp > price ? mrp : price;
}

export function applyDiwaliUnitPrice(dbPrice, dbMrp) {
  if (!DIWALI_SALE.active) return Number(dbPrice) || 0;
  const list = listPriceBeforePromo(dbPrice, dbMrp);
  return Math.round(list * (1 - DIWALI_SALE.percentOff / 100));
}

export function publicPriceFields(dbPrice, dbMrp) {
  const list = listPriceBeforePromo(dbPrice, dbMrp);
  const sale = applyDiwaliUnitPrice(dbPrice, dbMrp);
  if (!DIWALI_SALE.active || sale >= list) {
    return { price: list, mrp: dbMrp ?? undefined };
  }
  return { price: sale, mrp: list };
}
