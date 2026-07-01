import { describe, it, expect } from "vitest";
import { runScenario } from "./run.js";
import { NYC_DEFAULTS } from "./scenario.js";
import { gini, deadweightLoss, marketSchedule } from "./analytics.js";

describe("gini coefficient", () => {
  it("is 0 for perfect equality", () => {
    expect(gini([5, 5, 5, 5])).toBeCloseTo(0, 6);
  });

  it("approaches 1 as one person holds everything", () => {
    expect(gini([0.000001, 0.000001, 0.000001, 1000])).toBeGreaterThan(0.7);
  });

  it("lands in a plausible range for the NYC population", () => {
    const run = runScenario(NYC_DEFAULTS, { type: "freeMarket" });
    expect(run.analytics.giniIncome).toBeGreaterThan(0.35);
    expect(run.analytics.giniIncome).toBeLessThan(0.6);
  });
});

describe("welfare surplus", () => {
  const free = runScenario(NYC_DEFAULTS, { type: "freeMarket" });

  it("reports non-negative consumer and producer surplus", () => {
    expect(free.analytics.consumerSurplus).toBeGreaterThanOrEqual(0);
    expect(free.analytics.producerSurplus).toBeGreaterThanOrEqual(0);
    expect(free.analytics.totalSurplus).toBeCloseTo(
      free.analytics.consumerSurplus + free.analytics.producerSurplus,
      6
    );
  });

  it("a binding rent ceiling destroys total surplus (positive deadweight loss)", () => {
    const ceiling = Math.round(free.metrics.medianRent * 0.7);
    const capped = runScenario(NYC_DEFAULTS, { type: "rentCeiling", ceiling });
    const dwl = deadweightLoss(free.analytics, capped.analytics);
    expect(dwl).toBeGreaterThan(0);
  });
});

describe("landlord market power θ separates distribution from efficiency", () => {
  const low = runScenario(
    { ...NYC_DEFAULTS, market: { landlordPower: 0.3, propertyTaxRate: 0.012 } },
    { type: "freeMarket" }
  );
  const high = runScenario(
    { ...NYC_DEFAULTS, market: { landlordPower: 0.8, propertyTaxRate: 0.012 } },
    { type: "freeMarket" }
  );

  it("does not change the allocation (housed count and total surplus)", () => {
    expect(high.metrics.housed).toBe(low.metrics.housed);
    expect(high.analytics.totalSurplus).toBeCloseTo(low.analytics.totalSurplus, 2);
  });

  it("shifts surplus from tenants to landlords as θ rises", () => {
    expect(high.analytics.producerSurplus).toBeGreaterThan(low.analytics.producerSurplus);
    expect(high.analytics.consumerSurplus).toBeLessThan(low.analytics.consumerSurplus);
  });
});

describe("supply & demand schedules", () => {
  const run = runScenario(NYC_DEFAULTS, { type: "freeMarket" });
  const sched = marketSchedule(run.households, run.units, 40);

  it("demand slopes down and supply slopes up in price", () => {
    for (let i = 1; i < sched.length; i++) {
      expect(sched[i]!.demand).toBeLessThanOrEqual(sched[i - 1]!.demand);
      expect(sched[i]!.supply).toBeGreaterThanOrEqual(sched[i - 1]!.supply);
    }
  });

  it("crosses once, with demand above supply at low rents", () => {
    expect(sched[0]!.demand).toBeGreaterThan(sched[0]!.supply);
    const last = sched[sched.length - 1]!;
    expect(last.supply).toBeGreaterThanOrEqual(last.demand);
  });
});
