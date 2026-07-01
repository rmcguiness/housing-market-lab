import { Rng } from "./rng.js";
import { freeMarketClear, vacant } from "./clearing.js";
import { valuation } from "./valuation.js";
import type { Household, Unit, Match, UnitOutcome, MarketResult } from "./types.js";

/**
 * How scarce, price-capped units are allocated once price can no longer ration
 * demand (the defining feature of a binding rent ceiling / freeze).
 *
 *  - "lottery": every eligible household has an equal shot. Fairest; models a
 *    pure waiting-list lottery.
 *  - "income-priority": higher-budget households still win the scarce units
 *    (through connections, key money, or simply being first in line). Models the
 *    well-documented tendency of rent-regulated units to be captured by
 *    middle/upper-income tenants.
 */
export type Rationing = "lottery" | "income-priority";

export interface AppliedPolicy {
  /** The cleared market. */
  result: MarketResult;
  /**
   * The households actually faced by the market. Identical to the input except
   * under a rent freeze, where incomes are shocked upward — callers should run
   * metrics against THIS array so rent burden reflects the shocked incomes.
   */
  households: Household[];
  units: Unit[];
  /** Monthly government outlay (vouchers + public-housing subsidy), if any. */
  assistanceCost?: number;
}

/** Pure free-market clearing (the baseline). */
export function freeMarket(
  households: Household[],
  units: Unit[],
  landlordPower: number
): AppliedPolicy {
  return { result: freeMarketClear(households, units, landlordPower), households, units };
}

export interface RentCeilingOptions {
  /** Maximum monthly rent any unit may charge. */
  ceiling: number;
  rationing?: Rationing;
}

/**
 * A rent ceiling: no unit may rent above `ceiling`.
 *
 * Two forces appear, both classic results:
 *  1. Supply contraction — landlords whose carrying cost exceeds the ceiling
 *     withdraw their units rather than rent at a guaranteed loss.
 *  2. Excess demand — at the suppressed price far more households can afford the
 *     remaining units than there are units, so allocation falls to `rationing`.
 *
 * Net effect vs. free market: a lucky minority pay below-market rent (consumer
 * surplus gain), but the housed count falls and the priced-out count rises.
 */
export function rentCeiling(
  households: Household[],
  units: Unit[],
  opts: RentCeilingOptions,
  rng: Rng,
  landlordPower: number
): AppliedPolicy {
  const { ceiling, rationing = "lottery" } = opts;

  // Baseline market rents tell us, per unit, what rent would have prevailed.
  // The ceiling binds only where that rent exceeds it.
  const baselineRent = unitRentMap(freeMarketClear(households, units, landlordPower));

  const priced: PricedUnit[] = [];
  const withdrawn: Unit[] = [];

  for (const unit of units) {
    if (unit.cost > ceiling) {
      // Cannot cover cost at the capped rent → landlord withdraws.
      withdrawn.push(unit);
      continue;
    }
    const market = baselineRent.get(unit.id) ?? unit.cost;
    priced.push({ unit, rent: Math.min(market, ceiling) });
  }

  const result = rationedClear(households, priced, withdrawn, rationing, rng);
  return { result, households, units };
}

export interface RentFreezeOptions {
  /**
   * Fractional income growth applied to every household AFTER rents are frozen
   * (e.g. 0.15 = incomes rise 15%). The freeze pins each unit's rent at its
   * pre-shock market level, so this is the "demand grows but rents can't follow"
   * story behind stabilization over time.
   */
  incomeGrowth: number;
  rationing?: Rationing;
}

/**
 * A rent freeze / stabilization: each unit's rent is frozen at its current
 * market level, then demand grows (incomes rise). Rents cannot follow demand
 * upward, so a shortage emerges — more households chasing the same frozen-price
 * stock — while incumbent-style allocation decides who captures the bargain.
 *
 * Unlike a ceiling, no landlord withdraws (frozen rent ≥ cost by construction),
 * but landlords forgo the rent increases a free market would have delivered.
 */
export function rentFreeze(
  households: Household[],
  units: Unit[],
  opts: RentFreezeOptions,
  rng: Rng,
  landlordPower: number
): AppliedPolicy {
  const { incomeGrowth, rationing = "lottery" } = opts;

  // Freeze rents at the pre-shock market equilibrium.
  const frozenRent = unitRentMap(freeMarketClear(households, units, landlordPower));

  // Demand shock: incomes (and therefore willingness to pay) rise.
  const shocked: Household[] = households.map((h) => {
    const income = h.income * (1 + incomeGrowth);
    return { ...h, income, maxRent: (income / 12) * h.budgetShare };
  });

  const priced: PricedUnit[] = units.map((unit) => ({
    unit,
    rent: frozenRent.get(unit.id) ?? unit.cost,
  }));

  const result = rationedClear(shocked, priced, [], rationing, rng);
  // Metrics must use the shocked incomes.
  return { result, households: shocked, units };
}

export interface AssistanceOptions {
  /** Max monthly voucher added to an eligible household's budget. */
  voucherCap: number;
  /** Households with income below this are eligible for vouchers + public housing. */
  voucherIncomeThreshold: number;
  /** Fraction of the stock operated as public housing, in [0,1]. */
  publicHousingShare: number;
  /** Fraction discount off carrying cost for public-housing rent, in [0,1]. */
  publicRentDiscount: number;
}

/**
 * Government assistance combining both classic approaches:
 *
 *  - DEMAND SIDE (vouchers): eligible low-income households have their housing
 *    budget topped up by up to `voucherCap`, raising their valuation so they can
 *    compete in the private market. Houses the poor without adding supply, but
 *    can be partly capitalised into higher rents.
 *  - SUPPLY SIDE (public housing): the cheapest `publicHousingShare` of the stock
 *    is operated by the government, rented below cost to the lowest-income
 *    households and allocated administratively (not by price). Adds guaranteed
 *    low-income supply, at a continuing subsidy.
 *
 * `assistanceCost` is the monthly government outlay (voucher payments + the
 * below-cost subsidy on public units) — the number the fiscal layer must fund.
 */
export function governmentAssistance(
  households: Household[],
  units: Unit[],
  opts: AssistanceOptions,
  landlordPower: number
): AppliedPolicy {
  const byCost = [...units].sort((a, b) => a.cost - b.cost);
  const nPublic = Math.floor(opts.publicHousingShare * units.length);
  const publicUnits = byCost.slice(0, nPublic);
  const privateUnits = byCost.slice(nPublic);

  // Administratively allocate public units to the lowest-income households.
  const byIncome = [...households].sort((a, b) => a.income - b.income);
  const matches: Match[] = [];
  const unitOutcomes: UnitOutcome[] = [];
  const publiclyHoused = new Set<number>();
  let subsidy = 0;

  for (let k = 0; k < publicUnits.length && k < byIncome.length; k++) {
    const unit = publicUnits[k]!;
    const h = byIncome[k]!;
    const rent = unit.cost * (1 - opts.publicRentDiscount);
    matches.push({ householdId: h.id, unitId: unit.id, rent });
    unitOutcomes.push({
      unitId: unit.id,
      householdId: h.id,
      rent,
      cost: unit.cost,
      profit: rent - unit.cost, // negative: the public subsidy
      occupied: true,
      withdrawn: false,
    });
    publiclyHoused.add(h.id);
    subsidy += unit.cost - rent;
  }
  // Any public units beyond the eligible pool sit idle (still subsidised upkeep).
  for (let k = byIncome.length; k < publicUnits.length; k++) {
    unitOutcomes.push(vacant(publicUnits[k]!, false));
  }

  // The remaining households face the private market, vouchers in hand.
  const remaining = households.filter((h) => !publiclyHoused.has(h.id));
  const boosted = remaining.map((h) =>
    h.income < opts.voucherIncomeThreshold
      ? { ...h, maxRent: h.maxRent + opts.voucherCap }
      : h
  );

  const privateResult = freeMarketClear(boosted, privateUnits, landlordPower);

  // Voucher outlay: what eligible, privately-housed households actually draw.
  const eligibleById = new Map(boosted.map((h) => [h.id, h.income < opts.voucherIncomeThreshold]));
  let voucherSpend = 0;
  for (const m of privateResult.matches) {
    if (m.unitId !== null && eligibleById.get(m.householdId)) {
      voucherSpend += Math.min(opts.voucherCap, m.rent);
    }
  }

  return {
    result: {
      matches: [...matches, ...privateResult.matches],
      unitOutcomes: [...unitOutcomes, ...privateResult.unitOutcomes],
    },
    households: [...households.filter((h) => publiclyHoused.has(h.id)), ...boosted],
    units,
    assistanceCost: subsidy + voucherSpend,
  };
}

// --- internals -----------------------------------------------------------

interface PricedUnit {
  unit: Unit;
  /** The (capped/frozen) rent this unit will charge if occupied. */
  rent: number;
}

/** Extract the per-unit cleared rent from a market result. */
function unitRentMap(result: MarketResult): Map<number, number> {
  const m = new Map<number, number>();
  for (const o of result.unitOutcomes) {
    if (o.occupied) m.set(o.unitId, o.rent);
  }
  return m;
}

/**
 * Allocate price-capped units among households when price no longer rations.
 * Units are filled best-first; households are served in an order set by the
 * rationing rule. A household takes a unit only if it can afford the capped rent.
 */
function rationedClear(
  households: Household[],
  priced: PricedUnit[],
  withdrawn: Unit[],
  rationing: Rationing,
  rng: Rng
): MarketResult {
  const order = orderHouseholds(households, rationing, rng);
  const availableUnits = [...priced].sort((a, b) => b.unit.quality - a.unit.quality);

  const matches: Match[] = [];
  const unitOutcomes: UnitOutcome[] = [];
  const assigned = new Set<number>();

  let head = 0;
  for (const { unit, rent } of availableUnits) {
    // Advance to the next household (in rationing order) that values this unit at
    // least as much as the controlled rent (quality-adjusted, not just budget).
    let takerIndex = -1;
    for (let i = head; i < order.length; i++) {
      const h = order[i]!;
      if (!assigned.has(h.id) && valuation(h, unit.quality) >= rent) {
        takerIndex = i;
        break;
      }
    }

    if (takerIndex === -1) {
      unitOutcomes.push(vacant(unit, false));
      continue;
    }

    const taker = order[takerIndex]!;
    assigned.add(taker.id);
    matches.push({ householdId: taker.id, unitId: unit.id, rent });
    unitOutcomes.push({
      unitId: unit.id,
      householdId: taker.id,
      rent,
      cost: unit.cost,
      profit: rent - unit.cost,
      occupied: true,
      withdrawn: false,
    });

    // For income-priority the order is sorted, so we can advance the head past
    // served households; for lottery we keep scanning from the same head since
    // affordability gaps may leave earlier households unserved by a pricier unit
    // but servable by a cheaper one later.
    if (rationing === "income-priority") head = takerIndex + 1;
  }

  for (const unit of withdrawn) unitOutcomes.push(vacant(unit, true));

  for (const h of households) {
    if (!assigned.has(h.id)) matches.push({ householdId: h.id, unitId: null, rent: 0 });
  }

  return { matches, unitOutcomes };
}

function orderHouseholds(
  households: Household[],
  rationing: Rationing,
  rng: Rng
): Household[] {
  if (rationing === "income-priority") {
    return [...households].sort((a, b) => b.maxRent - a.maxRent);
  }
  // Lottery: Fisher–Yates shuffle with the seeded RNG.
  const arr = [...households];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}
