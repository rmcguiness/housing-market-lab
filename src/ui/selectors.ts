import type { ScenarioRun } from "../engine/index.js";

export interface HouseholdRow {
  id: number;
  income: number;
  housed: boolean;
  rent: number;
  quality: number; // quality of unit obtained (0 if priced out)
  band: number; // income quintile 0..4
  burden: number; // annual rent / income (0 if priced out)
}

export interface UnitRow {
  id: number;
  cost: number;
  rent: number;
  profit: number;
  quality: number;
  status: "occupied" | "vacant" | "withdrawn";
}

/** Quintile cut points of an array (returns the 4 interior cut values). */
function quintileCuts(sorted: number[]): number[] {
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]!;
  return [at(0.2), at(0.4), at(0.6), at(0.8)];
}

export function householdRows(run: ScenarioRun): HouseholdRow[] {
  const incomes = run.households.map((h) => h.income).sort((a, b) => a - b);
  const cuts = quintileCuts(incomes);
  const bandOf = (income: number) => {
    let b = 0;
    while (b < cuts.length && income > cuts[b]!) b++;
    return b;
  };

  const qualityByUnit = new Map(run.units.map((u) => [u.id, u.quality]));
  const matchByHh = new Map(run.result.matches.map((m) => [m.householdId, m]));

  return run.households.map((h) => {
    const m = matchByHh.get(h.id);
    const housed = !!m && m.unitId !== null;
    const quality = housed ? qualityByUnit.get(m!.unitId!) ?? 0 : 0;
    const rent = housed ? m!.rent : 0;
    return {
      id: h.id,
      income: h.income,
      housed,
      rent,
      quality,
      band: bandOf(h.income),
      burden: housed && h.income > 0 ? (rent * 12) / h.income : 0,
    };
  });
}

export function unitRows(run: ScenarioRun): UnitRow[] {
  return run.result.unitOutcomes.map((o) => ({
    id: o.unitId,
    cost: o.cost,
    rent: o.rent,
    profit: o.profit,
    quality: run.units.find((u) => u.id === o.unitId)?.quality ?? 0,
    status: o.withdrawn ? "withdrawn" : o.occupied ? "occupied" : "vacant",
  }));
}

/** Down-sample an array to at most `max` items, preserving distribution. */
export function sample<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr;
  const step = arr.length / max;
  const out: T[] = [];
  for (let i = 0; i < max; i++) out.push(arr[Math.floor(i * step)]!);
  return out;
}
