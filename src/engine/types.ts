/**
 * Core domain types for the market engine.
 *
 * The engine is intentionally generic about "households", "units" and
 * "landlords" so that the same clearing machinery can later model other markets
 * (groceries, fuel, etc.). Housing is simply the first scenario.
 */

/** A consumer / demand-side agent. */
export interface Household {
  id: number;
  /** Annual gross income in USD. */
  income: number;
  /**
   * Share of monthly income this household is willing to commit to housing.
   * Centred near the 0.30 affordability rule of thumb, with spread.
   */
  budgetShare: number;
  /**
   * Maximum monthly rent this household can/will pay = budgetShare * income/12.
   * Pre-computed for clearing convenience.
   */
  maxRent: number;
}

/** Who owns/operates a unit. */
export type Ownership = "private" | "public" | "ownerOccupied";

/** A housing unit and its supply-side economics. */
export interface Unit {
  id: number;
  /**
   * Intrinsic quality score in [0, 1]; higher is more desirable (location, size).
   * Effective quality experienced by tenants is `quality * condition`.
   */
  quality: number;
  /**
   * Landlord's monthly reservation cost BEFORE property tax: mortgage +
   * maintenance. Property tax is added on top by the fiscal layer. The landlord
   * will not rent below the resulting carrying cost.
   */
  cost: number;
  /** Who owns it. Defaults to "private". Used by the dynamics layer. */
  ownership: Ownership;
  /**
   * Physical condition in [0, 1], a multiplier on quality. Starts at 1 and
   * decays without maintenance (the depreciation channel in the dynamics model).
   */
  condition: number;
}

/** Outcome of placing one household into one unit (or marking it unhoused). */
export interface Match {
  householdId: number;
  /** null => household is priced out / unhoused. */
  unitId: number | null;
  /** Monthly rent actually paid (0 if unhoused). */
  rent: number;
}

/** Per-unit supply-side outcome. */
export interface UnitOutcome {
  unitId: number;
  /** null => vacant (off-market or no eligible tenant). */
  householdId: number | null;
  rent: number;
  cost: number;
  /** rent - cost when occupied; 0 when vacant (landlord still bears cost, see profit). */
  profit: number;
  /** True when the unit produces a loss or sits vacant against its carrying cost. */
  occupied: boolean;
  /** True when the landlord withdrew the unit (e.g. ceiling below cost). */
  withdrawn: boolean;
}

/** Full result of clearing a market under a given policy. */
export interface MarketResult {
  matches: Match[];
  unitOutcomes: UnitOutcome[];
  /** Equilibrium / cleared rents are embedded in matches & unitOutcomes. */
}
