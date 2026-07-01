/**
 * Parameter-sweep harness — data collection for a data-heavy policy analysis.
 *
 *   npm run sweep
 *
 * Runs several controlled experiments across the model's levers and writes tidy
 * CSVs to `data/` (ready for Python/R/Excel), plus readable console summaries.
 * Every run is seeded and averaged over a few seeds to damp the stochastic noise
 * from lotteries / emigration, so the tables reflect signal, not one draw.
 *
 * Experiments:
 *   1. snapshot_policies.csv   — static one-shot: free market vs rent ceiling vs
 *      assistance, across property-tax levels and voucher generosity, with the
 *      priced-out rate for each income quintile.
 *   2. overtime_endpoints.csv  — 25-year dynamics: free market vs rent freeze,
 *      fully crossed over property tax, income tax, vouchers, and trickle-down.
 *   3. trickle_income_groups.csv — how trickle-down strength changes income
 *      growth and housing by quintile (is it regressive?).
 */
import {
  runScenario,
  runDynamics,
  deadweightLoss,
  NYC_DEFAULTS,
  type ScenarioConfig,
  type Policy,
  type DynamicsParams,
  type YearMetrics,
} from "../engine/index.js";
import { writeCsv, r2, type Row } from "./csv.js";

const OUT = "data";
const SEEDS = [1, 2, 3, 4, 5];
const POP = 1500;
const UNITS = 1320; // ~12% shortage, matching the app defaults
const YEARS = 25;

const pctOf = (x: number) => r2(x * 100, 1);
const usd = (x: number) => Math.round(x);

// ===========================================================================
// Experiment 1 — static snapshot: policies × property tax × assistance
// ===========================================================================

function staticConfig(propertyTax: number): ScenarioConfig {
  return {
    ...NYC_DEFAULTS,
    population: { ...NYC_DEFAULTS.population, count: POP },
    stock: { ...NYC_DEFAULTS.stock, count: UNITS },
    market: { landlordPower: 0.6, propertyTaxRate: propertyTax },
  };
}

interface StaticCase {
  label: string;
  policy: (cfg: ScenarioConfig) => Policy;
}

function snapshotSweep(): Row[] {
  const rows: Row[] = [];
  const propertyTaxes = [0, 0.012, 0.04];

  const cases: StaticCase[] = [
    { label: "free_market", policy: () => ({ type: "freeMarket" }) },
    {
      label: "rent_ceiling_-30pct",
      policy: (cfg) => {
        const med = runScenario(cfg, { type: "freeMarket" }).metrics.medianRent;
        return { type: "rentCeiling", ceiling: Math.round(med * 0.7), rationing: "lottery" };
      },
    },
    {
      label: "assistance_light",
      policy: () => ({
        type: "governmentAssistance",
        voucherCap: 800,
        voucherIncomeThreshold: 50000,
        publicHousingShare: 0.1,
        publicRentDiscount: 0.4,
      }),
    },
    {
      label: "assistance_heavy",
      policy: () => ({
        type: "governmentAssistance",
        voucherCap: 1500,
        voucherIncomeThreshold: 60000,
        publicHousingShare: 0.25,
        publicRentDiscount: 0.5,
      }),
    },
  ];

  for (const propertyTax of propertyTaxes) {
    const cfg = staticConfig(propertyTax);
    const free = runScenario(cfg, { type: "freeMarket" }); // efficiency benchmark

    for (const c of cases) {
      // Average metrics over seeds.
      const runs = SEEDS.map((seed) =>
        runScenario({ ...cfg, seed }, c.policy({ ...cfg, seed }))
      );
      const freeRuns = SEEDS.map((seed) => runScenario({ ...cfg, seed }, { type: "freeMarket" }));

      const avg = (f: (r: (typeof runs)[number]) => number) =>
        runs.reduce((s, r) => s + f(r), 0) / runs.length;
      const band = (i: number) =>
        runs.reduce((s, r) => s + r.metrics.bands[i]!.pricedOutRate, 0) / runs.length;

      const dwl =
        runs.reduce(
          (s, r, k) => s + deadweightLoss(freeRuns[k]!.analytics, r.analytics),
          0
        ) / runs.length;

      rows.push({
        policy: c.label,
        propertyTaxRate: propertyTax,
        housedPct: pctOf(avg((r) => 1 - r.metrics.pricedOutRate)),
        medianRent: usd(avg((r) => r.metrics.medianRent)),
        rentBurdenedPct: pctOf(avg((r) => r.metrics.rentBurdenedRate)),
        landlordProfit: usd(avg((r) => r.metrics.totalLandlordProfit)),
        consumerSurplus: usd(avg((r) => r.analytics.consumerSurplus)),
        producerSurplus: usd(avg((r) => r.analytics.producerSurplus)),
        totalSurplus: usd(avg((r) => r.analytics.totalSurplus)),
        deadweightLoss: usd(dwl),
        assistanceCost: usd(avg((r) => r.assistanceCost)),
        giniIncome: r2(free.analytics.giniIncome, 3),
        q1_pricedOutPct: pctOf(band(0)),
        q2_pricedOutPct: pctOf(band(1)),
        q3_pricedOutPct: pctOf(band(2)),
        q4_pricedOutPct: pctOf(band(3)),
        q5_pricedOutPct: pctOf(band(4)),
      });
    }
  }
  return rows;
}

// ===========================================================================
// Experiment 2 — 25-year dynamics: free market vs rent freeze × conditions
// ===========================================================================

interface DynOpts {
  rentFreeze: boolean;
  propertyTax: number;
  incomeTax: number;
  voucherCap: number;
  trickle: number;
  seed: number;
}

function dynParams(o: DynOpts): DynamicsParams {
  return {
    base: {
      seed: o.seed,
      population: { ...NYC_DEFAULTS.population, count: POP },
      stock: { ...NYC_DEFAULTS.stock, count: UNITS },
      market: { landlordPower: 0.6, propertyTaxRate: o.propertyTax },
    },
    years: YEARS,
    rentFreeze: o.rentFreeze,
    incomeTaxRate: o.incomeTax,
    housingBudgetShare: 0.15,
    voucherCap: o.voucherCap,
    voucherIncomeThreshold: 50000,
    publicHousingShare: 0.1,
    publicBuildRate: 0,
    maintenancePerUnit: 600,
    flightSensitivity: 0.15,
    distressMargin: 0.06,
    constructionElasticity: 0.6,
    constructionLag: 2,
    maintenanceDecayRate: 0.08,
    trickleStrength: o.trickle,
    jobsMultiplier: 0.4,
    baseIncomeGrowth: 0.02,
    emigrationSensitivity: 0.4,
  };
}

const supply = (y: YearMetrics) => y.landlordCount + y.publicUnits;

/** Average the first- and last-year metrics of a scenario across seeds. */
function avgEndpoints(base: Omit<DynOpts, "seed">) {
  const firsts: YearMetrics[] = [];
  const lasts: YearMetrics[] = [];
  for (const seed of SEEDS) {
    const years = runDynamics(dynParams({ ...base, seed })).years;
    firsts.push(years[0]!);
    lasts.push(years[years.length - 1]!);
  }
  const avg = (arr: YearMetrics[], f: (y: YearMetrics) => number) =>
    arr.reduce((s, y) => s + f(y), 0) / arr.length;
  const avgBand = (arr: YearMetrics[], i: number, f: (b: YearMetrics["bands"][number]) => number) =>
    arr.reduce((s, y) => s + f(y.bands[i]!), 0) / arr.length;
  return { firsts, lasts, avg, avgBand };
}

function overtimeSweep(): Row[] {
  const rows: Row[] = [];
  const grid = {
    policy: [false, true], // rentFreeze
    propertyTax: [0, 0.02, 0.04],
    incomeTax: [0, 0.05, 0.1],
    voucherCap: [0, 1500],
    trickle: [0, 0.5],
  };

  for (const rentFreeze of grid.policy)
    for (const propertyTax of grid.propertyTax)
      for (const incomeTax of grid.incomeTax)
        for (const voucherCap of grid.voucherCap)
          for (const trickle of grid.trickle) {
            const base = { rentFreeze, propertyTax, incomeTax, voucherCap, trickle };
            const { firsts, lasts, avg, avgBand } = avgEndpoints(base);
            rows.push({
              policy: rentFreeze ? "rent_freeze" : "free_market",
              propertyTaxRate: propertyTax,
              incomeTaxRate: incomeTax,
              voucherCap,
              trickleStrength: trickle,
              start_totalSupply: Math.round(avg(firsts, supply)),
              end_totalSupply: Math.round(avg(lasts, supply)),
              supplyChangePct: pctOf(
                (avg(lasts, supply) - avg(firsts, supply)) / Math.max(1, avg(firsts, supply))
              ),
              start_housedPct: pctOf(avg(firsts, (y) => y.housedRate)),
              end_housedPct: pctOf(avg(lasts, (y) => y.housedRate)),
              end_population: Math.round(avg(lasts, (y) => y.population)),
              end_medianRent: usd(avg(lasts, (y) => y.medianRent)),
              end_medianIncome: usd(avg(lasts, (y) => y.medianIncome)),
              end_revenue: usd(avg(lasts, (y) => y.revenue)),
              end_abandoned: Math.round(avg(lasts, (y) => y.abandoned)),
              end_q1_pricedOutPct: pctOf(avgBand(lasts, 0, (b) => b.pricedOutRate)),
              end_q3_pricedOutPct: pctOf(avgBand(lasts, 2, (b) => b.pricedOutRate)),
              end_q5_pricedOutPct: pctOf(avgBand(lasts, 4, (b) => b.pricedOutRate)),
            });
          }
  return rows;
}

// ===========================================================================
// Experiment 3 — trickle-down's distributional effect by income group
// ===========================================================================

function trickleSweep(): Row[] {
  const rows: Row[] = [];
  const strengths = [0, 0.25, 0.5, 0.75, 1.0];

  for (const rentFreeze of [false, true])
    for (const trickle of strengths) {
      const base = { rentFreeze, propertyTax: 0.012, incomeTax: 0.05, voucherCap: 800, trickle };
      const { firsts, lasts, avg, avgBand } = avgEndpoints(base);
      const row: Row = {
        policy: rentFreeze ? "rent_freeze" : "free_market",
        trickleStrength: trickle,
        // Robust inequality signals (not confounded by quintile recomposition).
        start_gini: r2(avg(firsts, (y) => y.gini), 3),
        end_gini: r2(avg(lasts, (y) => y.gini), 3),
        start_topIncomeSharePct: pctOf(avg(firsts, (y) => y.topIncomeShare)),
        end_topIncomeSharePct: pctOf(avg(lasts, (y) => y.topIncomeShare)),
      };
      for (let q = 0; q < 5; q++) {
        const start = avgBand(firsts, q, (b) => b.avgIncome);
        const end = avgBand(lasts, q, (b) => b.avgIncome);
        row[`q${q + 1}_incomeGrowthPct`] = pctOf((end - start) / Math.max(1, start));
        row[`q${q + 1}_endHousedPct`] = pctOf(avgBand(lasts, q, (b) => b.housedRate));
      }
      rows.push(row);
    }
  return rows;
}

// ===========================================================================
// Console summaries
// ===========================================================================

function printSnapshot(rows: Row[]) {
  console.log("\n■ SNAPSHOT — policy × property tax (housed% | Q1 priced-out% | median rent | deadweight loss)\n");
  for (const r of rows) {
    console.log(
      `  ${String(r.policy).padEnd(20)} tax ${String(Number(r.propertyTaxRate) * 100).padStart(4)}%  ` +
        `housed ${String(r.housedPct).padStart(5)}%  Q1out ${String(r.q1_pricedOutPct).padStart(5)}%  ` +
        `rent $${String(r.medianRent).padStart(5)}  DWL $${Number(r.deadweightLoss).toLocaleString()}`
    );
  }
}

function printTrickle(rows: Row[]) {
  console.log("\n■ TRICKLE-DOWN — income growth by quintile + inequality (Gini) over 25 yrs\n");
  console.log("  policy         strength   Q1grow  Q3grow  Q5grow   Gini(start→end)");
  for (const r of rows) {
    console.log(
      `  ${String(r.policy).padEnd(13)} ${String(r.trickleStrength).padStart(6)}     ` +
        `${String(r.q1_incomeGrowthPct).padStart(5)}%  ${String(r.q3_incomeGrowthPct).padStart(5)}%  ${String(r.q5_incomeGrowthPct).padStart(5)}%   ` +
        `${r.start_gini} → ${r.end_gini}`
    );
  }
}

function printOvertimeHighlights(rows: Row[]) {
  console.log("\n■ OVER TIME — free market vs rent freeze at tax extremes (aggregates; see README on per-quintile caveats)\n");
  const pick = (policy: string, pt: number, it: number) =>
    rows.find(
      (r) =>
        r.policy === policy &&
        r.propertyTaxRate === pt &&
        r.incomeTaxRate === it &&
        r.voucherCap === 0 &&
        r.trickleStrength === 0
    );
  const show = (label: string, r?: Row) =>
    r &&
    console.log(
      `  ${label.padEnd(34)} supply ${String(r.supplyChangePct).padStart(6)}%  ` +
        `housed ${String(r.end_housedPct).padStart(5)}%  pop ${String(r.end_population).padStart(5)}  ` +
        `rev $${(Number(r.end_revenue) / 1e6).toFixed(2)}M`
    );
  show("free market, no taxes", pick("free_market", 0, 0));
  show("free market, high taxes", pick("free_market", 0.04, 0.1));
  show("rent freeze, no taxes", pick("rent_freeze", 0, 0));
  show("rent freeze, high taxes", pick("rent_freeze", 0.04, 0.1));
}

// ===========================================================================

function main() {
  console.log(`Running sweeps (pop ${POP}, ${UNITS} units, ${YEARS}y, ${SEEDS.length} seeds averaged)…`);

  const snapshot = snapshotSweep();
  writeCsv(`${OUT}/snapshot_policies.csv`, snapshot);

  const overtime = overtimeSweep();
  writeCsv(`${OUT}/overtime_endpoints.csv`, overtime);

  const trickle = trickleSweep();
  writeCsv(`${OUT}/trickle_income_groups.csv`, trickle);

  printSnapshot(snapshot);
  printOvertimeHighlights(overtime);
  printTrickle(trickle);

  console.log(
    `\n✓ Wrote ${snapshot.length}+${overtime.length}+${trickle.length} rows to ${OUT}/*.csv\n` +
      `  snapshot_policies.csv · overtime_endpoints.csv · trickle_income_groups.csv\n`
  );
}

main();
