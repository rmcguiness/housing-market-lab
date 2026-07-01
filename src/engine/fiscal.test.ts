import { describe, it, expect } from "vitest";
import { runScenario } from "./run.js";
import { NYC_DEFAULTS } from "./scenario.js";
import type { ScenarioConfig } from "./scenario.js";

const withTax = (rate: number): ScenarioConfig => ({
  ...NYC_DEFAULTS,
  market: { landlordPower: 0.6, propertyTaxRate: rate },
});

describe("property tax", () => {
  const noTax = runScenario(withTax(0), { type: "freeMarket" });
  const highTax = runScenario(withTax(0.05), { type: "freeMarket" });

  it("raises landlord carrying cost, pricing out marginal tenants", () => {
    expect(highTax.metrics.housed).toBeLessThan(noTax.metrics.housed);
  });

  it("compresses landlord profit (tax eats the margin)", () => {
    expect(highTax.metrics.totalLandlordProfit).toBeLessThan(
      noTax.metrics.totalLandlordProfit
    );
  });
});

describe("government assistance", () => {
  const free = runScenario(NYC_DEFAULTS, { type: "freeMarket" });
  const assisted = runScenario(NYC_DEFAULTS, {
    type: "governmentAssistance",
    voucherCap: 1000,
    voucherIncomeThreshold: 60000,
    publicHousingShare: 0.15,
    publicRentDiscount: 0.5,
  });

  it("houses more households than the free market", () => {
    expect(assisted.metrics.housed).toBeGreaterThan(free.metrics.housed);
  });

  it("relieves the lowest income quintile most", () => {
    expect(assisted.metrics.bands[0]!.pricedOutRate).toBeLessThan(
      free.metrics.bands[0]!.pricedOutRate
    );
  });

  it("has a positive government cost", () => {
    expect(assisted.assistanceCost).toBeGreaterThan(0);
  });
});
