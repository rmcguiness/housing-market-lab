import type { ScenarioRun } from "../../engine/index.js";
import { usd, usdCompact, pct, num } from "../format.js";

interface MetricSpec {
  label: string;
  value: string;
  delta?: { text: string; dir: "up" | "down" | "neutral" };
}

function delta(
  cur: number,
  base: number,
  fmt: (n: number) => string,
  goodIsUp: boolean
): MetricSpec["delta"] {
  const d = cur - base;
  if (Math.abs(d) < 1e-9) return { text: "= baseline", dir: "neutral" };
  const better = goodIsUp ? d > 0 : d < 0;
  const sign = d > 0 ? "+" : "−";
  return { text: `${sign}${fmt(Math.abs(d))} vs free mkt`, dir: better ? "up" : "down" };
}

export function MetricsRow({
  run,
  benchmark,
  dwl,
  isFreeMarket,
}: {
  run: ScenarioRun;
  benchmark: ScenarioRun;
  dwl: number;
  isFreeMarket: boolean;
}) {
  const m = run.metrics;
  const a = run.analytics;
  const bm = benchmark.metrics;

  const cards: MetricSpec[] = [
    {
      label: "Households housed",
      value: pct(1 - m.pricedOutRate, 0),
      delta: isFreeMarket
        ? undefined
        : delta(m.housed, bm.housed, (n) => num(n), true),
    },
    {
      label: "Priced out",
      value: num(m.pricedOut),
      delta: isFreeMarket
        ? undefined
        : delta(m.pricedOut, bm.pricedOut, (n) => num(n), false),
    },
    {
      label: "Median rent",
      value: usd(m.medianRent),
      delta: isFreeMarket
        ? undefined
        : delta(m.medianRent, bm.medianRent, (n) => usd(n), false),
    },
    {
      label: "Units withdrawn",
      value: num(m.withdrawnUnits),
    },
    {
      label: "Landlord profit",
      value: usdCompact(m.totalLandlordProfit) + "/mo",
      delta: isFreeMarket
        ? undefined
        : delta(
            m.totalLandlordProfit,
            bm.totalLandlordProfit,
            (n) => usdCompact(n),
            true
          ),
    },
    {
      label: "Income Gini",
      value: a.giniIncome.toFixed(3),
    },
    {
      label: "Total surplus",
      value: usdCompact(a.totalSurplus) + "/mo",
    },
    {
      label: "Deadweight loss",
      value: isFreeMarket ? "—" : usdCompact(dwl) + "/mo",
      delta: isFreeMarket
        ? { text: "efficient benchmark", dir: "neutral" }
        : {
            text: pct(dwl / Math.max(1, benchmark.analytics.totalSurplus), 1) + " of surplus",
            dir: dwl > 0 ? "down" : "neutral",
          },
    },
  ];

  return (
    <div className="metrics-row">
      {cards.map((c) => (
        <div className="metric-card" key={c.label}>
          <div className="label">{c.label}</div>
          <div className="value">{c.value}</div>
          {c.delta && <div className={`delta ${c.delta.dir}`}>{c.delta.text}</div>}
        </div>
      ))}
    </div>
  );
}
