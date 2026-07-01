import type { Household, Unit, Match, UnitOutcome, MarketResult } from "./types.js";
import { valuation } from "./valuation.js";

/**
 * Free-market clearing as a competitive equilibrium of the assignment market
 * (Becker 1973; Shapley–Shubik 1971).
 *
 * ALLOCATION (efficiency). Because valuation is supermodular in (budget,
 * quality) — see valuation.ts — the surplus-maximising assignment is positive
 * assortative: rank households by budget and units by quality and match greedily.
 * A unit whose cost exceeds even the richest remaining household's valuation is
 * worth less occupied than vacant (negative social surplus), so it is skipped and
 * left vacant while that household flows down to the next, cheaper unit.
 *
 * PRICE (distribution). Each matched pair realises a surplus s = valuation −
 * cost. The rent splits it by the landlord's market power θ:
 *
 *     rent = cost + θ · (valuation − cost)
 *
 * θ reflects market tightness (Nash-bargaining outcome): a shortage gives
 * landlords pricing power (θ→1, rent near the tenant's full willingness to pay);
 * slack gives tenants the upper hand (θ→0, rent near cost). θ moves only the
 * transfer, never the allocation — so total surplus and deadweight loss do not
 * depend on it. Distribution and efficiency are cleanly separated.
 */
export function freeMarketClear(
  households: Household[],
  units: Unit[],
  landlordPower: number
): MarketResult {
  const byBudget = [...households].sort((a, b) => b.maxRent - a.maxRent);
  const byQuality = [...units].sort((a, b) => b.quality - a.quality);

  const matches: Match[] = [];
  const unitOutcomes: UnitOutcome[] = [];
  const matchedHouseholds = new Set<number>();
  const occupiedUnitIds = new Set<number>();

  // Two-pointer assortative match over budgets (desc) and qualities (desc).
  let bi = 0;
  let qi = 0;
  while (bi < byBudget.length && qi < byQuality.length) {
    const h = byBudget[bi]!;
    const u = byQuality[qi]!;
    const v = valuation(h, u.quality);
    if (v >= u.cost) {
      const rent = rentFor(v, u.cost, landlordPower);
      matches.push({ householdId: h.id, unitId: u.id, rent });
      unitOutcomes.push({
        unitId: u.id,
        householdId: h.id,
        rent,
        cost: u.cost,
        profit: rent - u.cost,
        occupied: true,
        withdrawn: false,
      });
      matchedHouseholds.add(h.id);
      occupiedUnitIds.add(u.id);
      bi++;
      qi++;
    } else {
      // Nobody poorer can cover it either: leave vacant, advance to a cheaper unit.
      qi++;
    }
  }

  for (const u of units) {
    if (!occupiedUnitIds.has(u.id)) unitOutcomes.push(vacant(u, false));
  }
  for (const h of households) {
    if (!matchedHouseholds.has(h.id)) {
      matches.push({ householdId: h.id, unitId: null, rent: 0 });
    }
  }

  return { matches, unitOutcomes };
}

/** Split a match's surplus by landlord market power, clamped to [cost, value]. */
export function rentFor(value: number, cost: number, landlordPower: number): number {
  return cost + clamp(landlordPower, 0, 1) * (value - cost);
}

export function vacant(unit: Unit, withdrawn: boolean): UnitOutcome {
  return {
    unitId: unit.id,
    householdId: null,
    rent: 0,
    cost: unit.cost,
    profit: 0,
    occupied: false,
    withdrawn,
  };
}

export function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}
