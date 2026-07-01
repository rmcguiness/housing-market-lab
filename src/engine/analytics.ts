import type { Household, Unit, MarketResult } from "./types.js";
import { valuation } from "./valuation.js";

/**
 * Welfare analytics — the master's-level layer on top of the raw market outcome.
 *
 * These are the quantities economists use to judge a market's *efficiency* and
 * *distribution*, not just its prices: inequality (Gini), the gains from trade
 * split between the two sides (consumer/producer surplus), and the value
 * destroyed by an intervention (deadweight loss).
 */
export interface Analytics {
  /** Gini coefficient of household income, in [0,1]. 0 = perfect equality. */
  giniIncome: number;

  /**
   * Consumer surplus: Σ over housed households of (willingness to pay − rent).
   * Willingness to pay is the household's reservation rent (its budget ceiling),
   * so this is the value tenants capture above what they pay. Monthly USD.
   */
  consumerSurplus: number;

  /**
   * Producer (landlord) surplus: Σ over occupied units of (rent − carrying cost).
   * Monthly USD. Equal to total landlord profit.
   */
  producerSurplus: number;

  /** consumerSurplus + producerSurplus. The total gains from trade. Monthly USD. */
  totalSurplus: number;
}

export function computeAnalytics(
  households: Household[],
  units: Unit[],
  result: MarketResult
): Analytics {
  const giniIncome = gini(households.map((h) => h.income));

  const byId = new Map(households.map((h) => [h.id, h]));
  const qualityByUnit = new Map(units.map((u) => [u.id, u.quality]));
  let consumerSurplus = 0;
  for (const m of result.matches) {
    if (m.unitId === null) continue;
    const h = byId.get(m.householdId);
    const q = qualityByUnit.get(m.unitId);
    if (!h || q === undefined) continue;
    // Surplus = quality-adjusted value of the unit minus rent paid.
    consumerSurplus += Math.max(0, valuation(h, q) - m.rent);
  }

  let producerSurplus = 0;
  for (const o of result.unitOutcomes) {
    if (o.occupied) producerSurplus += o.profit;
  }

  return {
    giniIncome,
    consumerSurplus,
    producerSurplus,
    totalSurplus: consumerSurplus + producerSurplus,
  };
}

/**
 * Deadweight loss of a policy relative to a reference (efficient) allocation —
 * usually the free market. The competitive free-market equilibrium maximises
 * total surplus for a given stock, so any intervention that lowers total surplus
 * has destroyed value: DWL = TS_reference − TS_policy (floored at 0).
 */
export function deadweightLoss(reference: Analytics, policy: Analytics): number {
  return Math.max(0, reference.totalSurplus - policy.totalSurplus);
}

/**
 * Gini coefficient via the mean-absolute-difference formula on sorted values:
 *   G = Σ_i (2i − n − 1) x_i  /  (n · Σ_i x_i),  i = 1..n ascending.
 */
export function gini(values: number[]): number {
  const xs = values.filter((x) => x > 0).sort((a, b) => a - b);
  const n = xs.length;
  if (n === 0) return 0;
  let weighted = 0;
  let total = 0;
  for (let i = 0; i < n; i++) {
    weighted += (2 * (i + 1) - n - 1) * xs[i]!;
    total += xs[i]!;
  }
  return total === 0 ? 0 : weighted / (n * total);
}

export interface SchedulePoint {
  /** Monthly rent level. */
  price: number;
  /** Households willing & able to rent at this price (maxRent ≥ price). */
  demand: number;
  /** Units whose landlord would rent at this price (cost ≤ price). */
  supply: number;
}

/**
 * The classic supply & demand schedules, reconstructed from the same agents that
 * drive the simulation (so the textbook curve and the agent model never
 * disagree). Demand slopes down (fewer households can afford higher rents),
 * supply slopes up (more landlords participate as rent rises).
 */
export function marketSchedule(
  households: Household[],
  units: Unit[],
  steps = 60
): SchedulePoint[] {
  const maxCost = Math.max(...units.map((u) => u.cost));
  const maxRent = Math.max(...households.map((h) => h.maxRent));
  const top = Math.max(maxCost, maxRent);

  const budgets = households.map((h) => h.maxRent).sort((a, b) => a - b);
  const costs = units.map((u) => u.cost).sort((a, b) => a - b);

  const points: SchedulePoint[] = [];
  for (let s = 0; s <= steps; s++) {
    const price = (top * s) / steps;
    points.push({
      price,
      demand: budgets.length - lowerBound(budgets, price), // budgets ≥ price
      supply: upperBound(costs, price), // costs ≤ price
    });
  }
  return points;
}

/** First index with arr[i] ≥ x (arr sorted ascending). */
function lowerBound(arr: number[], x: number): number {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid]! < x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Count of elements ≤ x (arr sorted ascending). */
function upperBound(arr: number[], x: number): number {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid]! <= x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
