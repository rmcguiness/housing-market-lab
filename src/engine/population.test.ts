import { describe, it, expect } from "vitest";
import { Rng } from "./rng.js";
import { generatePopulation } from "./population.js";
import { generateStock } from "./stock.js";
import { NYC_DEFAULTS } from "./scenario.js";

describe("population generation", () => {
  it("hits the target median income within a few percent", () => {
    const rng = new Rng(42);
    const hh = generatePopulation(NYC_DEFAULTS.population, rng);
    const incomes = hh.map((h) => h.income).sort((a, b) => a - b);
    const median = incomes[Math.floor(incomes.length / 2)]!;
    const target = NYC_DEFAULTS.population.medianIncome;
    expect(Math.abs(median - target) / target).toBeLessThan(0.06);
  });

  it("produces a right-skewed (log-normal) income distribution: mean > median", () => {
    const rng = new Rng(7);
    const hh = generatePopulation(NYC_DEFAULTS.population, rng);
    const incomes = hh.map((h) => h.income).sort((a, b) => a - b);
    const median = incomes[Math.floor(incomes.length / 2)]!;
    const mean = incomes.reduce((s, x) => s + x, 0) / incomes.length;
    // Right skew is the whole point — a symmetric bell curve would fail this.
    expect(mean).toBeGreaterThan(median);
  });

  it("clamps budget share into the [0.1, 0.7] band", () => {
    const rng = new Rng(99);
    const hh = generatePopulation(NYC_DEFAULTS.population, rng);
    for (const h of hh) {
      expect(h.budgetShare).toBeGreaterThanOrEqual(0.1);
      expect(h.budgetShare).toBeLessThanOrEqual(0.7);
    }
  });

  it("is deterministic for a fixed seed", () => {
    const a = generatePopulation(NYC_DEFAULTS.population, new Rng(123));
    const b = generatePopulation(NYC_DEFAULTS.population, new Rng(123));
    expect(a.map((h) => Math.round(h.income))).toEqual(
      b.map((h) => Math.round(h.income))
    );
  });
});

describe("stock generation", () => {
  it("keeps quality in [0,1] and cost positive", () => {
    const rng = new Rng(5);
    const units = generateStock(NYC_DEFAULTS.stock, rng);
    for (const u of units) {
      expect(u.quality).toBeGreaterThanOrEqual(0);
      expect(u.quality).toBeLessThanOrEqual(1);
      expect(u.cost).toBeGreaterThan(0);
    }
  });

  it("ties carrying cost to quality (top-quartile units cost more than bottom)", () => {
    const rng = new Rng(5);
    const units = generateStock(NYC_DEFAULTS.stock, rng).sort(
      (a, b) => a.quality - b.quality
    );
    const q = units.length;
    const bottom = units.slice(0, Math.floor(q / 4));
    const top = units.slice(Math.floor((3 * q) / 4));
    const avg = (xs: typeof units) => xs.reduce((s, u) => s + u.cost, 0) / xs.length;
    expect(avg(top)).toBeGreaterThan(avg(bottom));
  });
});
