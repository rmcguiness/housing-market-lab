import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import type { ScenarioRun } from "../../engine/index.js";
import { COLORS, BAND_COLORS, pct, usd } from "../format.js";

export function BandBreakdown({ run }: { run: ScenarioRun }) {
  const data = run.metrics.bands.map((b, i) => ({
    name: ["Q1", "Q2", "Q3", "Q4", "Q5"][i],
    pricedOutRate: b.pricedOutRate,
    housed: b.housed,
    pricedOut: b.pricedOut,
    avgRent: b.avgRent,
    avgQuality: b.avgQualityHoused,
    avgIncome: b.avgIncome,
  }));

  return (
    <div className="panel">
      <h2>Who gets priced out, by income</h2>
      <p className="sub">
        Share of each income quintile excluded from housing. The burden falls
        almost entirely on the bottom of the distribution.
      </p>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 6, right: 8, bottom: 4, left: 4 }}>
          <CartesianGrid stroke="var(--line-soft)" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: "var(--text-dim)", fontSize: 11 }} />
          <YAxis
            tickFormatter={(v) => pct(v, 0)}
            domain={[0, 1]}
            tick={{ fill: "var(--text-faint)", fontSize: 10 }}
          />
          <Tooltip
            formatter={(v: number, _n, p) => {
              const d = p.payload;
              return [
                `${pct(v)} priced out · avg income ${usd(d.avgIncome)} · avg rent ${usd(
                  d.avgRent
                )}`,
                "",
              ];
            }}
            labelFormatter={(l) => "Quintile " + l}
          />
          <Bar dataKey="pricedOutRate" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={BAND_COLORS[i]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="legend">
        <span>
          <i className="swatch" style={{ background: COLORS.pricedOut }} /> Bar height
          = % of that quintile priced out
        </span>
      </div>
    </div>
  );
}
