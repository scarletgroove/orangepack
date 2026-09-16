export type PriceTier = { minQty: number; unitPriceSatang: number };

export type TierMatch = {
  tier: PriceTier;
  belowMinimum: boolean;
};

/** Tiers must be sorted by minQty ascending. Below the first tier, the first tier's price applies and the line is flagged. */
export function matchTier(tiers: PriceTier[], qty: number): TierMatch | null {
  if (tiers.length === 0) return null;
  if (qty < tiers[0].minQty) return { tier: tiers[0], belowMinimum: true };
  let tier = tiers[0];
  for (const t of tiers) {
    if (t.minQty <= qty) tier = t;
    else break;
  }
  return { tier, belowMinimum: false };
}
