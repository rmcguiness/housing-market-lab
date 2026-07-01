import type { Household } from "./types.js";

/**
 * Household valuation of housing — the micro-foundation of the whole model.
 *
 * A household's gross monthly value for occupying a unit of quality q ∈ [0,1] is
 *
 *     v_i(q) = W_i · ( SHELTER_BASE + (1 − SHELTER_BASE) · q )
 *
 * where W_i is the household's housing budget (its value for an ideal q=1 unit,
 * derived from income × budget share). Two pieces:
 *   - SHELTER_BASE · W_i  — value of mere shelter, independent of quality. Housing
 *     is a necessity, so even a bare unit is worth a large share of the budget.
 *   - (1 − SHELTER_BASE) · W_i · q  — the quality premium.
 *
 * The cross-partial ∂²v / ∂W ∂q = (1 − SHELTER_BASE) > 0: valuation is
 * SUPERMODULAR in (budget, quality). By the assignment-model theorem (Becker
 * 1973; Shapley–Shubik 1971) the surplus-maximising allocation is therefore
 * POSITIVE ASSORTATIVE — richer households occupy higher-quality units. This is
 * what makes the free-market clearing efficient and gives rent control a
 * well-defined deadweight loss.
 */
export const SHELTER_BASE = 0.6;

/** Gross monthly value to `h` of a unit of quality `q`. */
export function valuation(h: Household, q: number): number {
  return h.maxRent * (SHELTER_BASE + (1 - SHELTER_BASE) * q);
}

/** Marginal value of quality, dv/dq = W_i · (1 − SHELTER_BASE). */
export function marginalQualityValue(h: Household): number {
  return h.maxRent * (1 - SHELTER_BASE);
}
