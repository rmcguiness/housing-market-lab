import { describe, it, expect } from "vitest";
import { runScenario } from "./run.js";
import { runDynamics } from "./dynamics.js";
import { deadweightLoss } from "./analytics.js";
import { NYC_DEFAULTS } from "./scenario.js";
import type { ScenarioConfig } from "./scenario.js";
import type { DynamicsParams } from "./dynamics.js";

/**
 * Characterization tests for the robust ("Tier 1") findings the sweep reports.
 * These guard the headline claims of any write-up against regressions. They only
 * assert directions the theory + evidence support — not the confounded per-
 * quintile-over-time results, which the sweep README explicitly flags.
 */

const cfg = (propertyTax: number): ScenarioConfig => ({
  ...NYC_DEFAULTS,
  market: { landlordPower: 0.6, propertyTaxRate: propertyTax },
});

describe("finding: property tax monotonically reduces housing (free market)", () => {
  const housed = (t: number) =>
    runScenario(cfg(t), { type: "freeMarket" }).metrics.housed;

  it("more tax → fewer housed, across 0% / 1.2% / 4%", () => {
    expect(housed(0)).toBeGreaterThan(housed(0.012));
    expect(housed(0.012)).toBeGreaterThan(housed(0.04));
  });

  it("more tax → lower landlord profit", () => {
    const profit = (t: number) =>
      runScenario(cfg(t), { type: "freeMarket" }).metrics.totalLandlordProfit;
    expect(profit(0)).toBeGreaterThan(profit(0.04));
  });
});

describe("finding: a below-market rent ceiling destroys total surplus", () => {
  it("has positive deadweight loss at every tax level", () => {
    for (const t of [0, 0.012, 0.04]) {
      const free = runScenario(cfg(t), { type: "freeMarket" });
      const ceil = runScenario(cfg(t), {
        type: "rentCeiling",
        ceiling: Math.round(free.metrics.medianRent * 0.7),
      });
      expect(deadweightLoss(free.analytics, ceil.analytics)).toBeGreaterThan(0);
    }
  });
});

describe("finding: assistance relieves the poorest quintile", () => {
  const free = runScenario(NYC_DEFAULTS, { type: "freeMarket" });
  const assisted = runScenario(NYC_DEFAULTS, {
    type: "governmentAssistance",
    voucherCap: 1500,
    voucherIncomeThreshold: 60000,
    publicHousingShare: 0.25,
    publicRentDiscount: 0.5,
  });

  it("sharply lowers Q1 priced-out and houses more overall", () => {
    expect(assisted.metrics.bands[0]!.pricedOutRate).toBeLessThan(
      free.metrics.bands[0]!.pricedOutRate
    );
    expect(assisted.metrics.housed).toBeGreaterThan(free.metrics.housed);
  });
});

describe("finding: trickle-down strength widens inequality (over time)", () => {
  const params = (trickle: number): DynamicsParams => ({
    base: {
      seed: 1,
      population: { ...NYC_DEFAULTS.population, count: 800 },
      stock: { ...NYC_DEFAULTS.stock, count: 700 },
      market: { landlordPower: 0.6, propertyTaxRate: 0.012 },
    },
    years: 25,
    rentFreeze: false,
    incomeTaxRate: 0.05,
    housingBudgetShare: 0.15,
    voucherCap: 800,
    voucherIncomeThreshold: 50000,
    publicHousingShare: 0.1,
    publicBuildRate: 0,
    maintenancePerUnit: 600,
    flightSensitivity: 0.15,
    distressMargin: 0.06,
    constructionElasticity: 0.6,
    constructionLag: 2,
    maintenanceDecayRate: 0.08,
    trickleStrength: trickle,
    jobsMultiplier: 0.4,
    baseIncomeGrowth: 0.02,
    emigrationSensitivity: 0.4,
  });

  const endGini = (trickle: number) => {
    const years = runDynamics(params(trickle)).years;
    return years[years.length - 1]!.gini;
  };

  it("end-state Gini rises monotonically with trickle strength", () => {
    const g0 = endGini(0);
    const gMid = endGini(0.5);
    const gHigh = endGini(1);
    expect(gMid).toBeGreaterThan(g0);
    expect(gHigh).toBeGreaterThan(gMid);
  });
});
