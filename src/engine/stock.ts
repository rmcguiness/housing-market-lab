import { Rng } from "./rng.js";
import type { Unit } from "./types.js";
import type { StockConfig } from "./scenario.js";

/**
 * Generate the housing stock.
 *
 * Quality is right-skewed (most of the stock is modest, with a thin luxury
 * tail) by taking the smaller of two uniforms. This matters for realism: a real
 * city has far more ordinary apartments than penthouses, and that cheaper supply
 * is what keeps lower-income households housed. A symmetric or centre-weighted
 * distribution starves the low end and produces an implausible mass of
 * unaffordable, perpetually-vacant units.
 *
 * Landlord carrying cost rises with quality: nicer units cost more to own
 * (bigger mortgage, higher taxes/maintenance). A small idiosyncratic jitter
 * keeps costs from being a perfect function of quality.
 */
export function generateStock(config: StockConfig, rng: Rng): Unit[] {
  const units: Unit[] = [];

  for (let id = 0; id < config.count; id++) {
    // Right-skewed quality in [0, 1]: many modest units, few luxury.
    const quality = Math.min(rng.next(), rng.next());

    const baseCost = config.minCost + quality * (config.maxCost - config.minCost);
    // ±8% idiosyncratic cost variation.
    const cost = baseCost * rng.uniform(0.92, 1.08);

    units.push({ id, quality, cost, ownership: "private", condition: 1 });
  }

  return units;
}
