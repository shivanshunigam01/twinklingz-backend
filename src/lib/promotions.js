/** Site-wide Diwali sale — keep in sync with storefront `src/lib/promotions.ts`. */
export const DIWALI_SALE = {
  active: true,
  percentOff: 25,
  code: "DIWALI25",
  label: "Diwali Festive Sale",
};

/** Catalog selling price in MongoDB (unchanged during promo). */
export function catalogOriginalPrice(dbPrice) {
  return Number(dbPrice) || 0;
}

export function applyDiwaliUnitPrice(dbPrice) {
  const original = catalogOriginalPrice(dbPrice);
  if (!DIWALI_SALE.active) return original;
  return Math.round(original * (1 - DIWALI_SALE.percentOff / 100));
}

/** Public API + checkout: `price` = offer, `mrp` = struck-through original. DB rows stay unchanged. */
export function publicPriceFields(dbPrice, dbMrp) {
  const original = catalogOriginalPrice(dbPrice);
  const storedMrp = Number(dbMrp) || 0;

  if (!DIWALI_SALE.active) {
    return {
      price: original,
      mrp: storedMrp > original ? storedMrp : undefined,
    };
  }

  const offer = applyDiwaliUnitPrice(dbPrice);
  return {
    price: offer,
    mrp: original,
  };
}
