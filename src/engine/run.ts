import { Rng } from "./rng.js";
import { generatePopulation } from "./population.js";
import { generateStock } from "./stock.js";
import { computeMetrics, type Metrics } from "./metrics.js";
import { computeAnalytics, type Analytics } from "./analytics.js";
import { effectiveUnit } from "./fiscal.js";
import {
  freeMarket,
  rentCeiling,
  rentFreeze,
  governmentAssistance,
  type AppliedPolicy,
  type Rationing,
  type AssistanceOptions,
} from "./policies.js";
import type { ScenarioConfig } from "./scenario.js";
import type { Household, Unit, MarketResult } from "./types.js";

export type Policy =
  | { type: "freeMarket" }
  | { type: "rentCeiling"; ceiling: number; rationing?: Rationing }
  | { type: "rentFreeze"; incomeGrowth: number; rationing?: Rationing }
  | ({ type: "governmentAssistance" } & AssistanceOptions);

export interface ScenarioRun {
  households: Household[];
  units: Unit[];
  result: MarketResult;
  metrics: Metrics;
  analytics: Analytics;
  /** Monthly government outlay, when the policy is government assistance. */
  assistanceCost: number;
}

/**
 * Build a world from `config`, clear it under `policy`, and return the cleared
 * market plus its metrics. The same seed always produces the same world, so two
 * policies can be compared on an identical population/stock.
 */
export function runScenario(config: ScenarioConfig, policy: Policy): ScenarioRun {
  // Separate RNG streams for generation vs. policy so that, e.g., changing the
  // lottery draw does not reshuffle the underlying population.
  const genRng = new Rng(config.seed);
  const policyRng = new Rng(config.seed ^ 0x9e3779b9);

  const households = generatePopulation(config.population, genRng);
  const baseUnits = generateStock(config.stock, genRng);
  // Property tax + physical condition fold into the unit the market actually sees.
  const units = baseUnits.map((u) => effectiveUnit(u, config.market.propertyTaxRate));

  const applied = applyPolicy(households, units, policy, policyRng, config.market.landlordPower);
  const metrics = computeMetrics(applied.households, applied.units, applied.result);
  const analytics = computeAnalytics(applied.households, applied.units, applied.result);

  return {
    households: applied.households,
    units: applied.units,
    result: applied.result,
    metrics,
    analytics,
    assistanceCost: applied.assistanceCost ?? 0,
  };
}

function applyPolicy(
  households: Household[],
  units: Unit[],
  policy: Policy,
  rng: Rng,
  landlordPower: number
): AppliedPolicy {
  switch (policy.type) {
    case "freeMarket":
      return freeMarket(households, units, landlordPower);
    case "rentCeiling":
      return rentCeiling(households, units, policy, rng, landlordPower);
    case "rentFreeze":
      return rentFreeze(households, units, policy, rng, landlordPower);
    case "governmentAssistance":
      return governmentAssistance(households, units, policy, landlordPower);
  }
}
