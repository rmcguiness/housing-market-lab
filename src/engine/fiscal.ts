import type { Unit } from "./types.js";

/**
 * Fiscal layer: property-tax incidence and the government budget.
 *
 * Property tax is *value-based*, as in the real world: a unit's assessed value
 * is a capitalisation of its quality, and the monthly tax is that value times
 * the annual rate divided by twelve. This tax is added to the landlord's
 * carrying cost, so raising the rate pushes the marginal (low-margin) landlords
 * out of the market — the supply-side channel behind "raise taxes and the
 * owners leave."
 */

/**
 * Property value implied by a unit, as a capitalisation of its monthly carrying
 * cost (≈200× monthly, i.e. a low single-digit cap rate). Tying value to cost
 * keeps property tax a sensible fraction of the unit's economics rather than
 * dwarfing it. Condition scales value down as a unit deteriorates.
 */
export function assessedValue(unit: Unit): number {
  return unit.cost * unit.condition * 200;
}

/** Monthly property tax owed on a unit at the given annual rate. */
export function propertyTaxMonthly(unit: Unit, annualRate: number): number {
  return (assessedValue(unit) * annualRate) / 12;
}

/**
 * A unit as the market sees it once tax and physical condition are applied:
 * carrying cost includes property tax, and quality is degraded by condition.
 * The clearing engine consumes these "effective" units, unchanged.
 */
export function effectiveUnit(unit: Unit, propertyTaxRate: number): Unit {
  return {
    ...unit,
    cost: unit.cost + propertyTaxMonthly(unit, propertyTaxRate),
    quality: unit.quality * unit.condition,
  };
}

export interface FiscalAccount {
  /** Property tax collected from taxable (owned, non-abandoned) units. Monthly USD. */
  propertyTaxRevenue: number;
  /** Income tax collected from resident households. Monthly USD. */
  incomeTaxRevenue: number;
  /** propertyTaxRevenue + incomeTaxRevenue. */
  revenue: number;
  /** Voucher outlays actually funded this period. Monthly USD. */
  voucherSpend: number;
  /** Public-housing maintenance actually funded this period. Monthly USD. */
  maintenanceSpend: number;
  /** voucherSpend + maintenanceSpend. */
  spending: number;
  /** revenue − spending. Negative = deficit drawn from reserves. */
  balance: number;
}

export interface FiscalInputs {
  propertyTaxRevenue: number;
  incomeTaxRevenue: number;
  voucherSpend: number;
  maintenanceSpend: number;
}

export function fiscalAccount(i: FiscalInputs): FiscalAccount {
  const revenue = i.propertyTaxRevenue + i.incomeTaxRevenue;
  const spending = i.voucherSpend + i.maintenanceSpend;
  return {
    propertyTaxRevenue: i.propertyTaxRevenue,
    incomeTaxRevenue: i.incomeTaxRevenue,
    revenue,
    voucherSpend: i.voucherSpend,
    maintenanceSpend: i.maintenanceSpend,
    spending,
    balance: revenue - spending,
  };
}

/** Flat income tax on a set of resident incomes (annual incomes → monthly tax). */
export function incomeTaxMonthly(incomes: number[], annualRate: number): number {
  let total = 0;
  for (const y of incomes) total += y * annualRate;
  return total / 12;
}
