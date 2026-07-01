import { useMemo, useState } from "react";
import { runDynamics, NYC_DEFAULTS, type DynamicsParams, type YearMetrics } from "../engine/index.js";

/**
 * Curated comparison: a low-tax free market vs. "the plan" (freeze + higher taxes
 * + build + vouchers). Only the genuinely contested levers are exposed — above
 * all, whether the build-out *delivers*. Everything else is fixed at defensible
 * scenario defaults so the one variable that decides the outcome stays in focus.
 */
export interface CompareControls {
  buildOut: "delivers" | "underdelivers";
  flightSensitivity: number;
  emigrationSensitivity: number;
  years: number;
}

export const DEFAULT_COMPARE: CompareControls = {
  buildOut: "delivers",
  flightSensitivity: 0.2,
  emigrationSensitivity: 0.4,
  years: 25,
};

const world = {
  seed: NYC_DEFAULTS.seed,
  population: { ...NYC_DEFAULTS.population, count: 2000 },
  stock: { ...NYC_DEFAULTS.stock, count: 1760 },
};

function shared(c: CompareControls) {
  return {
    years: c.years,
    voucherIncomeThreshold: 50000,
    maintenancePerUnit: 600,
    distressMargin: 0.06,
    constructionLag: 2,
    maintenanceDecayRate: 0.08,
    trickleStrength: 0,
    jobsMultiplier: 0.4,
    baseIncomeGrowth: 0.02,
    flightSensitivity: c.flightSensitivity,
    emigrationSensitivity: c.emigrationSensitivity,
  };
}

function freeMarketParams(c: CompareControls): DynamicsParams {
  return {
    base: { ...world, market: { landlordPower: 0.6, propertyTaxRate: 0.005 } },
    rentFreeze: false,
    incomeTaxRate: 0.02,
    housingBudgetShare: 0.1,
    voucherCap: 0,
    publicHousingShare: 0.02,
    publicBuildRate: 0, // market builds, not the government
    constructionElasticity: 0.8, // consumer-driven building
    ...shared(c),
  };
}

function planParams(c: CompareControls): DynamicsParams {
  const delivers = c.buildOut === "delivers";
  return {
    base: { ...world, market: { landlordPower: 0.6, propertyTaxRate: 0.025 } },
    rentFreeze: true,
    incomeTaxRate: 0.08,
    housingBudgetShare: 0.2,
    voucherCap: 1000,
    // The decisive lever: does the public build-out actually happen? "Delivers"
    // ≈ ~70 new public units/yr on this 1,760-unit scale (a 200k-unit pledge);
    // "underdelivers" is the historical norm of a fraction of that.
    publicHousingShare: delivers ? 0.15 : 0.1,
    publicBuildRate: delivers ? 70 : 8,
    constructionElasticity: 0.4,
    ...shared(c),
  };
}

export interface CompareState {
  controls: CompareControls;
  set: <K extends keyof CompareControls>(key: K, value: CompareControls[K]) => void;
  reset: () => void;
  free: YearMetrics[];
  plan: YearMetrics[];
}

export function useCompare(): CompareState {
  const [controls, setControls] = useState<CompareControls>(DEFAULT_COMPARE);
  const free = useMemo(() => runDynamics(freeMarketParams(controls)).years, [controls]);
  const plan = useMemo(() => runDynamics(planParams(controls)).years, [controls]);
  const set = <K extends keyof CompareControls>(key: K, value: CompareControls[K]) =>
    setControls((p) => ({ ...p, [key]: value }));
  const reset = () => setControls(DEFAULT_COMPARE);
  return { controls, set, reset, free, plan };
}
