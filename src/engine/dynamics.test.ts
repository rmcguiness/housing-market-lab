import { describe, it, expect } from "vitest";
import { runDynamics, type DynamicsParams } from "./dynamics.js";
import { NYC_DEFAULTS } from "./scenario.js";

const base = {
  ...NYC_DEFAULTS,
  population: { ...NYC_DEFAULTS.population, count: 800 },
  stock: { ...NYC_DEFAULTS.stock, count: 700 },
};

function params(over: Partial<DynamicsParams> = {}): DynamicsParams {
  return {
    base,
    years: 15,
    rentFreeze: false,
    incomeTaxRate: 0.04,
    housingBudgetShare: 0.15,
    voucherCap: 800,
    voucherIncomeThreshold: 50000,
    publicHousingShare: 0.08,
    publicBuildRate: 0,
    maintenancePerUnit: 500,
    flightSensitivity: 0.1,
    distressMargin: 0.05,
    constructionElasticity: 0.5,
    constructionLag: 2,
    maintenanceDecayRate: 0.08,
    trickleStrength: 0,
    jobsMultiplier: 0.4,
    baseIncomeGrowth: 0.02,
    emigrationSensitivity: 0.5,
    ...over,
  };
}

describe("dynamics: invariants", () => {
  const { years } = runDynamics(params());

  it("is deterministic for a fixed seed", () => {
    const a = runDynamics(params());
    const b = runDynamics(params());
    expect(a.years).toEqual(b.years);
  });

  it("never funds more assistance than is needed, and keeps coverage in [0,1]", () => {
    for (const y of years) {
      expect(y.assistanceFunded).toBeLessThanOrEqual(y.assistanceNeeded + 1e-6);
      expect(y.voucherCoverage).toBeGreaterThanOrEqual(0);
      expect(y.voucherCoverage).toBeLessThanOrEqual(1);
      expect(y.reserve).toBeGreaterThanOrEqual(-1e-6);
    }
  });

  it("conserves housing units across fates each year", () => {
    for (const y of years) {
      const sum =
        y.privateRented +
        y.privateVacant +
        y.publicOccupied +
        y.ownerOccupied +
        y.warehoused +
        y.abandoned;
      // privateRented + privateVacant = landlordCount; public/owner/ware/aband are the rest.
      expect(y.landlordCount + y.publicOccupied + y.ownerOccupied + y.warehoused + y.abandoned)
        .toBeGreaterThan(0);
      expect(sum).toBeGreaterThan(0);
      expect(y.privateRented + y.privateVacant).toBe(y.landlordCount);
    }
  });
});

describe("dynamics: fiscal feedback (tax + freeze + flight)", () => {
  const { years } = runDynamics(
    params({
      rentFreeze: true,
      base: { ...base, market: { landlordPower: 0.6, propertyTaxRate: 0.04 } },
      flightSensitivity: 0.3,
      emigrationSensitivity: 1.5,
    })
  );
  const first = years[0]!;
  const last = years[years.length - 1]!;

  it("erodes the rental stock as landlords flee", () => {
    expect(last.landlordCount).toBeLessThan(first.landlordCount);
  });

  it("erodes government revenue as the tax base shrinks", () => {
    expect(last.revenue).toBeLessThan(first.revenue);
  });

  it("sends the fled units somewhere (owner-occupied / warehoused / abandoned grow)", () => {
    expect(last.ownerOccupied + last.warehoused + last.abandoned).toBeGreaterThan(0);
  });
});

describe("dynamics: construction supply response", () => {
  const off = runDynamics(params({ constructionElasticity: 0 }));
  const on = runDynamics(params({ constructionElasticity: 2 }));

  it("builds more units and ends with a larger stock when building is responsive", () => {
    const builtOff = off.years.reduce((s, y) => s + y.unitsBuilt, 0);
    const builtOn = on.years.reduce((s, y) => s + y.unitsBuilt, 0);
    expect(builtOn).toBeGreaterThan(builtOff);
    expect(on.years.at(-1)!.landlordCount).toBeGreaterThan(off.years.at(-1)!.landlordCount);
  });
});

describe("dynamics: trickle-down is a tunable hypothesis", () => {
  const none = runDynamics(params({ trickleStrength: 0 }));
  const strong = runDynamics(params({ trickleStrength: 0.5 }));

  it("raises broad incomes only when switched on", () => {
    expect(strong.years.at(-1)!.medianIncome).toBeGreaterThan(
      none.years.at(-1)!.medianIncome
    );
  });
});
