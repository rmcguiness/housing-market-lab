import { useMemo, useState } from "react";
import {
  runScenario,
  deadweightLoss,
  NYC_DEFAULTS,
  type ScenarioConfig,
  type Policy,
  type ScenarioRun,
  type Rationing,
} from "../engine/index.js";

/** Flat, slider-friendly view of every tunable input. */
export interface Controls {
  policyType: Policy["type"];
  ceiling: number;
  incomeGrowth: number;
  rationing: Rationing;

  seed: number;
  households: number;
  medianIncome: number;
  incomeSigma: number;
  budgetShareMean: number;

  units: number;
  minCost: number;
  maxCost: number;

  landlordPower: number;
  propertyTaxRate: number;

  // Government-assistance controls
  voucherCap: number;
  voucherIncomeThreshold: number;
  publicHousingShare: number;
  publicRentDiscount: number;
}

export const DEFAULT_CONTROLS: Controls = {
  policyType: "freeMarket",
  ceiling: 1500,
  incomeGrowth: 0.2,
  rationing: "lottery",
  seed: NYC_DEFAULTS.seed,
  households: NYC_DEFAULTS.population.count,
  medianIncome: NYC_DEFAULTS.population.medianIncome,
  incomeSigma: NYC_DEFAULTS.population.incomeSigma,
  budgetShareMean: NYC_DEFAULTS.population.budgetShareMean,
  units: NYC_DEFAULTS.stock.count,
  minCost: NYC_DEFAULTS.stock.minCost,
  maxCost: NYC_DEFAULTS.stock.maxCost,
  landlordPower: NYC_DEFAULTS.market.landlordPower,
  propertyTaxRate: NYC_DEFAULTS.market.propertyTaxRate,
  voucherCap: 800,
  voucherIncomeThreshold: 50000,
  publicHousingShare: 0.1,
  publicRentDiscount: 0.4,
};

function toConfig(c: Controls): ScenarioConfig {
  return {
    seed: c.seed,
    population: {
      count: c.households,
      medianIncome: c.medianIncome,
      incomeSigma: c.incomeSigma,
      budgetShareMean: c.budgetShareMean,
      budgetShareSigma: NYC_DEFAULTS.population.budgetShareSigma,
    },
    stock: {
      count: c.units,
      minCost: c.minCost,
      maxCost: c.maxCost,
    },
    market: { landlordPower: c.landlordPower, propertyTaxRate: c.propertyTaxRate },
  };
}

function toPolicy(c: Controls): Policy {
  switch (c.policyType) {
    case "freeMarket":
      return { type: "freeMarket" };
    case "rentCeiling":
      return { type: "rentCeiling", ceiling: c.ceiling, rationing: c.rationing };
    case "rentFreeze":
      return { type: "rentFreeze", incomeGrowth: c.incomeGrowth, rationing: c.rationing };
    case "governmentAssistance":
      return {
        type: "governmentAssistance",
        voucherCap: c.voucherCap,
        voucherIncomeThreshold: c.voucherIncomeThreshold,
        publicHousingShare: c.publicHousingShare,
        publicRentDiscount: c.publicRentDiscount,
      };
  }
}

/**
 * The efficient counterfactual a policy should be judged against:
 *  - free market on the same config (for a ceiling), or
 *  - the free market facing the same demand shock (for a freeze).
 * The free-market policy is its own benchmark.
 */
function benchmarkRun(c: Controls): ScenarioRun {
  if (c.policyType === "rentFreeze") {
    const shocked = toConfig({
      ...c,
      medianIncome: c.medianIncome * (1 + c.incomeGrowth),
    });
    return runScenario(shocked, { type: "freeMarket" });
  }
  return runScenario(toConfig(c), { type: "freeMarket" });
}

export interface ModelState {
  controls: Controls;
  set: <K extends keyof Controls>(key: K, value: Controls[K]) => void;
  reset: () => void;
  run: ScenarioRun;
  benchmark: ScenarioRun;
  dwl: number;
}

export function useModel(): ModelState {
  const [controls, setControls] = useState<Controls>(DEFAULT_CONTROLS);

  const run = useMemo(() => runScenario(toConfig(controls), toPolicy(controls)), [controls]);
  const benchmark = useMemo(() => benchmarkRun(controls), [controls]);
  const dwl = useMemo(
    () => deadweightLoss(benchmark.analytics, run.analytics),
    [benchmark, run]
  );

  const set = <K extends keyof Controls>(key: K, value: Controls[K]) =>
    setControls((prev) => ({ ...prev, [key]: value }));

  const reset = () => setControls(DEFAULT_CONTROLS);

  return { controls, set, reset, run, benchmark, dwl };
}
