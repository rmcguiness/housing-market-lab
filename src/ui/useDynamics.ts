import { useMemo, useState } from "react";
import { runDynamics, NYC_DEFAULTS, type DynamicsParams, type DynamicsResult } from "../engine/index.js";

/** Flat, slider-friendly view of the dynamics parameters. */
export interface DynControls {
  years: number;
  rentFreeze: boolean;

  propertyTaxRate: number;
  incomeTaxRate: number;
  landlordPower: number;
  housingBudgetShare: number;

  voucherCap: number;
  voucherIncomeThreshold: number;
  publicHousingShare: number;
  maintenancePerUnit: number;

  flightSensitivity: number;
  constructionElasticity: number;
  trickleStrength: number;
  jobsMultiplier: number;
  emigrationSensitivity: number;
  maintenanceDecayRate: number;
  baseIncomeGrowth: number;
}

export const DEFAULT_DYN: DynControls = {
  years: 25,
  rentFreeze: false,
  propertyTaxRate: 0.012,
  incomeTaxRate: 0.05,
  landlordPower: 0.6,
  housingBudgetShare: 0.15,
  voucherCap: 800,
  voucherIncomeThreshold: 50000,
  publicHousingShare: 0.1,
  maintenancePerUnit: 600,
  flightSensitivity: 0.15,
  constructionElasticity: 0.6,
  trickleStrength: 0,
  jobsMultiplier: 0.4,
  // Empirical millionaire-migration studies find small responses to tax; keep
  // the default modest and let the user crank it to test the "they'll flee" case.
  emigrationSensitivity: 0.4,
  maintenanceDecayRate: 0.08,
  baseIncomeGrowth: 0.02,
};

function toParams(c: DynControls): DynamicsParams {
  return {
    base: {
      // Scaled-down agent counts keep ~25 yearly clearings interactive.
      seed: NYC_DEFAULTS.seed,
      population: { ...NYC_DEFAULTS.population, count: 2000 },
      stock: { ...NYC_DEFAULTS.stock, count: 1760 },
      market: { landlordPower: c.landlordPower, propertyTaxRate: c.propertyTaxRate },
    },
    years: c.years,
    rentFreeze: c.rentFreeze,
    incomeTaxRate: c.incomeTaxRate,
    housingBudgetShare: c.housingBudgetShare,
    voucherCap: c.voucherCap,
    voucherIncomeThreshold: c.voucherIncomeThreshold,
    publicHousingShare: c.publicHousingShare,
    publicBuildRate: 0,
    maintenancePerUnit: c.maintenancePerUnit,
    flightSensitivity: c.flightSensitivity,
    distressMargin: 0.06,
    constructionElasticity: c.constructionElasticity,
    constructionLag: 2,
    maintenanceDecayRate: c.maintenanceDecayRate,
    trickleStrength: c.trickleStrength,
    jobsMultiplier: c.jobsMultiplier,
    baseIncomeGrowth: c.baseIncomeGrowth,
    emigrationSensitivity: c.emigrationSensitivity,
  };
}

export interface DynState {
  controls: DynControls;
  set: <K extends keyof DynControls>(key: K, value: DynControls[K]) => void;
  reset: () => void;
  result: DynamicsResult;
}

export function useDynamics(): DynState {
  const [controls, setControls] = useState<DynControls>(DEFAULT_DYN);
  const result = useMemo(() => runDynamics(toParams(controls)), [controls]);
  const set = <K extends keyof DynControls>(key: K, value: DynControls[K]) =>
    setControls((prev) => ({ ...prev, [key]: value }));
  const reset = () => setControls(DEFAULT_DYN);
  return { controls, set, reset, result };
}
