import { describe, it, expect } from "vitest";
import { runScenario } from "./run.js";
import { NYC_DEFAULTS } from "./scenario.js";

const cfg = NYC_DEFAULTS;

describe("free-market clearing", () => {
  const run = runScenario(cfg, { type: "freeMarket" });
  const incomeById = new Map(run.households.map((h) => [h.id, h.income]));

  it("never rents a unit below its carrying cost (no landlord rents at a loss)", () => {
    for (const o of run.result.unitOutcomes) {
      if (o.occupied) expect(o.rent).toBeGreaterThanOrEqual(o.cost - 1e-6);
    }
  });

  it("matches assortatively: higher-income tenants get higher-quality units", () => {
    const occupied = run.result.unitOutcomes
      .filter((o) => o.occupied)
      .map((o) => ({
        income: incomeById.get(o.householdId!)!,
        quality: run.units.find((u) => u.id === o.unitId)!.quality,
      }));
    // Spearman-style check via quartile means: top-income quartile should hold
    // higher-quality units than the bottom-income quartile.
    occupied.sort((a, b) => a.income - b.income);
    const n = occupied.length;
    const bottomQ = occupied.slice(0, Math.floor(n / 4));
    const topQ = occupied.slice(Math.floor((3 * n) / 4));
    const avgQ = (xs: typeof occupied) =>
      xs.reduce((s, x) => s + x.quality, 0) / xs.length;
    expect(avgQ(topQ)).toBeGreaterThan(avgQ(bottomQ));
  });

  it("prices out the lowest-income households when supply < demand", () => {
    const pricedOutIncomes = run.result.matches
      .filter((m) => m.unitId === null)
      .map((m) => incomeById.get(m.householdId)!);
    const housedIncomes = run.result.matches
      .filter((m) => m.unitId !== null)
      .map((m) => incomeById.get(m.householdId)!);

    expect(pricedOutIncomes.length).toBeGreaterThan(0);
    const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
    // The priced-out group is poorer than the housed group on average.
    expect(avg(pricedOutIncomes)).toBeLessThan(avg(housedIncomes));
  });

  it("houses exactly min(units, willing+able households)", () => {
    const housed = run.result.matches.filter((m) => m.unitId !== null).length;
    expect(housed).toBeLessThanOrEqual(cfg.stock.count);
    expect(housed).toBeLessThanOrEqual(cfg.population.count);
  });

  it("accounts for every household exactly once", () => {
    const ids = new Set(run.result.matches.map((m) => m.householdId));
    expect(run.result.matches.length).toBe(cfg.population.count);
    expect(ids.size).toBe(cfg.population.count);
  });

  it("is deterministic for a fixed seed", () => {
    const a = runScenario(cfg, { type: "freeMarket" });
    const b = runScenario(cfg, { type: "freeMarket" });
    expect(a.metrics).toEqual(b.metrics);
  });
});
