// Public surface of the economic engine. The eventual React UI imports only
// from here.
export * from "./types.js";
export * from "./scenario.js";
export * from "./rng.js";
export { generatePopulation } from "./population.js";
export { generateStock } from "./stock.js";
export { freeMarketClear } from "./clearing.js";
export {
  freeMarket,
  rentCeiling,
  rentFreeze,
  governmentAssistance,
  type Rationing,
  type AppliedPolicy,
  type RentCeilingOptions,
  type RentFreezeOptions,
  type AssistanceOptions,
} from "./policies.js";
export {
  assessedValue,
  propertyTaxMonthly,
  effectiveUnit,
  fiscalAccount,
  incomeTaxMonthly,
  type FiscalAccount,
  type FiscalInputs,
} from "./fiscal.js";
export { computeMetrics, type Metrics, type BandMetrics } from "./metrics.js";
export {
  computeAnalytics,
  deadweightLoss,
  gini,
  marketSchedule,
  type Analytics,
  type SchedulePoint,
} from "./analytics.js";
export { runScenario, type Policy, type ScenarioRun } from "./run.js";
export {
  runDynamics,
  type DynamicsParams,
  type DynamicsResult,
  type YearMetrics,
} from "./dynamics.js";
