import { Rng } from "./rng.js";
import type { Household } from "./types.js";
import type { PopulationConfig } from "./scenario.js";

/**
 * Generate a synthetic population of households.
 *
 * Income is log-normal (real income distributions are right-skewed — a symmetric
 * bell curve would understate the rich tail and overstate the middle). Budget
 * share (fraction of income spent on housing) is drawn from a clamped normal so
 * a few households stretch toward severe rent burden while none spend ≤0 or an
 * implausible share.
 */
export function generatePopulation(
  config: PopulationConfig,
  rng: Rng
): Household[] {
  const mu = Math.log(config.medianIncome);
  const households: Household[] = [];

  for (let id = 0; id < config.count; id++) {
    const income = rng.logNormal(mu, config.incomeSigma);

    // Clamp budget share to a sane band: nobody spends <10% or >70% of income.
    const rawShare = rng.normal(config.budgetShareMean, config.budgetShareSigma);
    const budgetShare = clamp(rawShare, 0.1, 0.7);

    const maxRent = (income / 12) * budgetShare;

    households.push({ id, income, budgetShare, maxRent });
  }

  return households;
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}
