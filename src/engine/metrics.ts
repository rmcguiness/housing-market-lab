import type { Household, Unit, MarketResult } from "./types.js";

export interface BandMetrics {
  /** Quintile label, 0 = lowest income … 4 = highest. */
  band: number;
  households: number;
  housed: number;
  pricedOut: number;
  pricedOutRate: number;
  avgIncome: number;
  /** Average monthly rent paid by housed households in this band. */
  avgRent: number;
  /** Average quality [0,1] of units captured by this band (housed only). */
  avgQualityHoused: number;
  /** Average rent burden (annual rent / income) for housed households. */
  avgRentBurden: number;
}

export interface Metrics {
  totalHouseholds: number;
  housed: number;
  pricedOut: number;
  pricedOutRate: number;

  medianRent: number;
  meanRent: number;

  /** Housed households paying >30% of income on rent. */
  rentBurdenedRate: number;
  /** Housed households paying >50% of income on rent. */
  severelyBurdenedRate: number;

  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  withdrawnUnits: number;

  /** Sum of (rent − cost) across occupied units. */
  totalLandlordProfit: number;
  meanProfitPerOccupied: number;
  profitableLandlords: number;
  losingLandlords: number;

  /** Income-quintile breakdown — the basis for the colour-coded views. */
  bands: BandMetrics[];
}

export function computeMetrics(
  households: Household[],
  units: Unit[],
  result: MarketResult
): Metrics {
  const householdById = new Map(households.map((h) => [h.id, h]));
  const qualityByUnit = new Map(units.map((u) => [u.id, u.quality]));

  // --- demand side -------------------------------------------------------
  const housedMatches = result.matches.filter((m) => m.unitId !== null);
  const housed = housedMatches.length;
  const pricedOut = households.length - housed;

  const rents = housedMatches.map((m) => m.rent).sort((a, b) => a - b);
  const medianRent = median(rents);
  const meanRent = mean(rents);

  let burdened = 0;
  let severely = 0;
  for (const m of housedMatches) {
    const h = householdById.get(m.householdId);
    if (!h) continue;
    const burden = (m.rent * 12) / h.income;
    if (burden > 0.5) severely++;
    if (burden > 0.3) burdened++;
  }

  // --- supply side -------------------------------------------------------
  let occupiedUnits = 0;
  let vacantUnits = 0;
  let withdrawnUnits = 0;
  let totalLandlordProfit = 0;
  let profitable = 0;
  let losing = 0;
  for (const o of result.unitOutcomes) {
    if (o.withdrawn) {
      withdrawnUnits++;
    } else if (o.occupied) {
      occupiedUnits++;
      totalLandlordProfit += o.profit;
      if (o.profit > 0) profitable++;
      else losing++;
    } else {
      vacantUnits++;
    }
  }

  // --- income-band breakdown --------------------------------------------
  const bands = computeBands(households, housedMatches, householdById, qualityByUnit);

  return {
    totalHouseholds: households.length,
    housed,
    pricedOut,
    pricedOutRate: households.length ? pricedOut / households.length : 0,
    medianRent,
    meanRent,
    rentBurdenedRate: housed ? burdened / housed : 0,
    severelyBurdenedRate: housed ? severely / housed : 0,
    totalUnits: units.length,
    occupiedUnits,
    vacantUnits,
    withdrawnUnits,
    totalLandlordProfit,
    meanProfitPerOccupied: occupiedUnits ? totalLandlordProfit / occupiedUnits : 0,
    profitableLandlords: profitable,
    losingLandlords: losing,
    bands,
  };
}

function computeBands(
  households: Household[],
  housedMatches: { householdId: number; unitId: number | null; rent: number }[],
  householdById: Map<number, Household>,
  qualityByUnit: Map<number, number>
): BandMetrics[] {
  const incomes = households.map((h) => h.income).sort((a, b) => a - b);
  // Quintile cut points.
  const cuts = [0.2, 0.4, 0.6, 0.8].map((q) => quantile(incomes, q));
  const bandOf = (income: number): number => {
    let b = 0;
    while (b < cuts.length && income > cuts[b]!) b++;
    return b;
  };

  const acc = Array.from({ length: 5 }, (_, band) => ({
    band,
    households: 0,
    housed: 0,
    incomeSum: 0,
    rentSum: 0,
    qualitySum: 0,
    burdenSum: 0,
  }));

  for (const h of households) {
    const a = acc[bandOf(h.income)]!;
    a.households++;
    a.incomeSum += h.income;
  }

  for (const m of housedMatches) {
    const h = householdById.get(m.householdId);
    if (!h) continue;
    const a = acc[bandOf(h.income)]!;
    a.housed++;
    a.rentSum += m.rent;
    a.qualitySum += m.unitId !== null ? qualityByUnit.get(m.unitId) ?? 0 : 0;
    a.burdenSum += (m.rent * 12) / h.income;
  }

  return acc.map((a) => {
    const pricedOut = a.households - a.housed;
    return {
      band: a.band,
      households: a.households,
      housed: a.housed,
      pricedOut,
      pricedOutRate: a.households ? pricedOut / a.households : 0,
      avgIncome: a.households ? a.incomeSum / a.households : 0,
      avgRent: a.housed ? a.rentSum / a.housed : 0,
      avgQualityHoused: a.housed ? a.qualitySum / a.housed : 0,
      avgRentBurden: a.housed ? a.burdenSum / a.housed : 0,
    };
  });
}

// --- small stats helpers --------------------------------------------------

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

/** Median of an already-sorted array. */
function median(sorted: number[]): number {
  return quantile(sorted, 0.5);
}

/** Linear-interpolated quantile of an already-sorted array. */
function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0]!;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const frac = pos - lo;
  return sorted[lo]! * (1 - frac) + sorted[hi]! * frac;
}
