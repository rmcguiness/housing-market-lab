import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { HouseholdRow } from "../selectors.js";
import { COLORS, usdCompact, num } from "../format.js";

const BINS = 32;

export function IncomeHistogram({ rows }: { rows: HouseholdRow[] }) {
  const data = useMemo(() => {
    const incomes = rows.map((r) => r.income).sort((a, b) => a - b);
    // Cap the axis at the 98th percentile so the long log-normal tail doesn't
    // squash the bulk of the distribution.
    const cap = incomes[Math.floor(incomes.length * 0.98)] ?? 1;
    const width = cap / BINS;
    const bins = Array.from({ length: BINS }, (_, i) => ({
      x: i * width,
      label: usdCompact(i * width),
      housed: 0,
      pricedOut: 0,
    }));
    for (const r of rows) {
      const idx = Math.min(BINS - 1, Math.floor(r.income / width));
      if (r.housed) bins[idx]!.housed++;
      else bins[idx]!.pricedOut++;
    }
    return bins;
  }, [rows]);

  return (
    <div className="panel">
      <h2>Income distribution & exclusion</h2>
      <p className="sub">
        Log-normal household incomes. Red shows who is priced out — concentrated at
        the bottom, fading as income rises.
      </p>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 6, right: 8, bottom: 4, left: 4 }}>
          <CartesianGrid stroke="var(--line-soft)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--text-faint)", fontSize: 10 }}
            interval={4}
          />
          <YAxis tick={{ fill: "var(--text-faint)", fontSize: 10 }} />
          <Tooltip
            formatter={(v: number, name) => [num(v), name === "housed" ? "Housed" : "Priced out"]}
            labelFormatter={(l) => "Income ≈ " + l}
          />
          <Bar dataKey="housed" stackId="a" fill={COLORS.housed} />
          <Bar dataKey="pricedOut" stackId="a" fill={COLORS.pricedOut} />
        </BarChart>
      </ResponsiveContainer>
      <div className="legend">
        <span>
          <i className="swatch" style={{ background: COLORS.housed }} /> Housed
        </span>
        <span>
          <i className="swatch" style={{ background: COLORS.pricedOut }} /> Priced out
        </span>
      </div>
    </div>
  );
}
