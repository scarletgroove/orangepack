import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { matchTier, type PriceTier } from "./pricing";

const tiers: PriceTier[] = [
  { minQty: 1000, unitPriceSatang: 900 },
  { minQty: 3000, unitPriceSatang: 800 },
  { minQty: 5000, unitPriceSatang: 750 },
];

describe("matchTier", () => {
  it("picks the tier the quantity reaches", () => {
    assert.deepEqual(matchTier(tiers, 3000), { tier: tiers[1], belowMinimum: false });
    assert.deepEqual(matchTier(tiers, 4999), { tier: tiers[1], belowMinimum: false });
    assert.deepEqual(matchTier(tiers, 5000), { tier: tiers[2], belowMinimum: false });
    assert.deepEqual(matchTier(tiers, 99_999), { tier: tiers[2], belowMinimum: false });
  });

  it("flags a quantity under the minimum but still quotes the first tier", () => {
    assert.deepEqual(matchTier(tiers, 500), { tier: tiers[0], belowMinimum: true });
  });

  it("returns nothing when a variant has no prices", () => {
    assert.equal(matchTier([], 1000), null);
  });
});
