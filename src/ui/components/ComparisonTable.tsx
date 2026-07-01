import type { ScenarioRun } from "../../engine/index.js";
import { usd, usdCompact, pct, num } from "../format.js";

export function ComparisonTable({
  run,
  benchmark,
  isFreeMarket,
}: {
  run: ScenarioRun;
  benchmark: ScenarioRun;
  isFreeMarket: boolean;
}) {
  if (isFreeMarket) return null;

  const rows: { label: string; a: string; b: string }[] = [
    {
      label: "Households housed",
      a: num(benchmark.metrics.housed),
      b: num(run.metrics.housed),
    },
    {
      label: "Priced out",
      a: pct(benchmark.metrics.pricedOutRate),
      b: pct(run.metrics.pricedOutRate),
    },
    {
      label: "Median rent",
      a: usd(benchmark.metrics.medianRent),
      b: usd(run.metrics.medianRent),
    },
    {
      label: "Units withdrawn",
      a: num(benchmark.metrics.withdrawnUnits),
      b: num(run.metrics.withdrawnUnits),
    },
    {
      label: "Consumer surplus",
      a: usdCompact(benchmark.analytics.consumerSurplus),
      b: usdCompact(run.analytics.consumerSurplus),
    },
    {
      label: "Producer surplus",
      a: usdCompact(benchmark.analytics.producerSurplus),
      b: usdCompact(run.analytics.producerSurplus),
    },
    {
      label: "Total surplus",
      a: usdCompact(benchmark.analytics.totalSurplus),
      b: usdCompact(run.analytics.totalSurplus),
    },
  ];

  return (
    <div className="panel">
      <h2>Policy vs. free-market benchmark</h2>
      <p className="sub">
        The free market here is the efficient counterfactual (same population and
        stock, prices left to clear).
      </p>
      <table className="compare">
        <thead>
          <tr>
            <th>Measure</th>
            <th>Free market</th>
            <th>This policy</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <td>{r.label}</td>
              <td>{r.a}</td>
              <td>{r.b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
