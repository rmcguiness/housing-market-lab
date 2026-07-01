import { describe, it, expect } from "vitest";
import { runScenario } from "./run.js";
import { NYC_DEFAULTS } from "./scenario.js";

const cfg = NYC_DEFAULTS;
const free = runScenario(cfg, { type: "freeMarket" });

describe("rent ceiling vs. free market", () => {
  // A ceiling well below the free-market median rent, so it bites.
  const ceiling = Math.round(free.metrics.medianRent * 0.7);
  const capped = runScenario(cfg, { type: "rentCeiling", ceiling, rationing: "lottery" });

  it("withdraws units whose carrying cost exceeds the ceiling", () => {
    expect(capped.metrics.withdrawnUnits).toBeGreaterThan(0);
  });

  it("raises the priced-out rate (shortage worsens)", () => {
    expect(capped.metrics.pricedOutRate).toBeGreaterThan(free.metrics.pricedOutRate);
  });

  it("lowers rent for the lucky tenants who do get a unit", () => {
    expect(capped.metrics.medianRent).toBeLessThan(free.metrics.medianRent);
  });

  it("compresses total landlord profit", () => {
    expect(capped.metrics.totalLandlordProfit).toBeLessThan(
      free.metrics.totalLandlordProfit
    );
  });

  it("still never charges an occupied unit below cost", () => {
    for (const o of capped.result.unitOutcomes) {
      if (o.occupied) expect(o.rent).toBeGreaterThanOrEqual(o.cost - 1e-6);
    }
  });
});

describe("rationing rule changes who captures controlled units", () => {
  const ceiling = Math.round(free.metrics.medianRent * 0.7);
  const lottery = runScenario(cfg, { type: "rentCeiling", ceiling, rationing: "lottery" });
  const priority = runScenario(cfg, {
    type: "rentCeiling",
    ceiling,
    rationing: "income-priority",
  });

  it("income-priority skews controlled units toward higher-income bands", () => {
    const topBandHoused = (r: typeof lottery) => r.metrics.bands[4]!.housed;
    // The richest quintile captures more controlled units under income-priority.
    expect(topBandHoused(priority)).toBeGreaterThanOrEqual(topBandHoused(lottery));
  });
});

describe("rent freeze with a demand shock", () => {
  const growth = 0.2;
  const frozen = runScenario(cfg, {
    type: "rentFreeze",
    incomeGrowth: growth,
    rationing: "lottery",
  });
  // A free market facing the SAME upward demand shock, for comparison.
  const shockedCfg = {
    ...cfg,
    population: {
      ...cfg.population,
      medianIncome: cfg.population.medianIncome * (1 + growth),
    },
  };
  const freeShocked = runScenario(shockedCfg, { type: "freeMarket" });

  it("sanity: the demand shock raises rents and margins in a free market", () => {
    expect(freeShocked.metrics.medianRent).toBeGreaterThan(free.metrics.medianRent);
    expect(freeShocked.metrics.meanProfitPerOccupied).toBeGreaterThan(
      free.metrics.meanProfitPerOccupied
    );
  });

  it("transfers surplus from landlords to tenants vs. the shocked free market", () => {
    // Per-occupied margin isolates the price effect from composition/count.
    expect(frozen.metrics.meanProfitPerOccupied).toBeLessThan(
      freeShocked.metrics.meanProfitPerOccupied
    );
  });

  it("does not withdraw units (frozen rent stays at or above cost)", () => {
    expect(frozen.metrics.withdrawnUnits).toBe(0);
  });
});

describe("income-band metrics", () => {
  it("splits households into five quintiles that sum to the population", () => {
    expect(free.metrics.bands).toHaveLength(5);
    const total = free.metrics.bands.reduce((s, b) => s + b.households, 0);
    expect(total).toBe(cfg.population.count);
  });

  it("concentrates priced-out households in the lowest income band", () => {
    const lowest = free.metrics.bands[0]!;
    const highest = free.metrics.bands[4]!;
    expect(lowest.pricedOutRate).toBeGreaterThan(highest.pricedOutRate);
  });
});
