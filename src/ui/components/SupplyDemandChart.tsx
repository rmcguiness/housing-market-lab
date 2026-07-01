import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { marketSchedule, type ScenarioRun } from "../../engine/index.js";
import { COLORS, usd, num } from "../format.js";

export function SupplyDemandChart({
  run,
  ceiling,
}: {
  run: ScenarioRun;
  ceiling?: number;
}) {
  const { data, equilibrium } = useMemo(() => {
    const sched = marketSchedule(run.households, run.units, 70);
    const data = sched.map((p) => ({
      price: Math.round(p.price),
      demand: p.demand,
      supply: p.supply,
    }));
    // Equilibrium = first price where supply meets/overtakes demand.
    let eq = data[data.length - 1];
    for (const p of data) {
      if (p.supply >= p.demand) {
        eq = p;
        break;
      }
    }
    return { data, equilibrium: eq };
  }, [run]);

  return (
    <div className="panel">
      <h2>Supply &amp; demand</h2>
      <p className="sub">
        Reconstructed from the same agents. Demand = households able to pay each
        rent; supply = units willing to rent at it. They cross at equilibrium.
      </p>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 6, right: 10, bottom: 16, left: 4 }}>
          <CartesianGrid stroke="var(--line-soft)" />
          <XAxis
            dataKey="price"
            type="number"
            domain={["dataMin", "dataMax"]}
            tick={{ fill: "var(--text-faint)", fontSize: 10 }}
            tickFormatter={(v) => usd(v)}
            label={{
              value: "Monthly rent",
              position: "insideBottom",
              offset: -8,
              fill: "var(--text-faint)",
              fontSize: 11,
            }}
          />
          <YAxis tick={{ fill: "var(--text-faint)", fontSize: 10 }} />
          <Tooltip
            formatter={(v: number, n) => [num(v) + " units/households", n]}
            labelFormatter={(l) => "Rent " + usd(l)}
          />
          <Line
            dataKey="demand"
            stroke={COLORS.demand}
            dot={false}
            strokeWidth={2}
            name="Demand"
          />
          <Line
            dataKey="supply"
            stroke={COLORS.supply}
            dot={false}
            strokeWidth={2}
            name="Supply"
          />
          {equilibrium && (
            <ReferenceLine
              x={equilibrium.price}
              stroke="var(--text-faint)"
              strokeDasharray="3 3"
              label={{
                value: "eq ≈ " + usd(equilibrium.price),
                fill: "var(--text-dim)",
                fontSize: 10,
                position: "top",
              }}
            />
          )}
          {ceiling !== undefined && (
            <ReferenceLine
              x={ceiling}
              stroke={COLORS.pricedOut}
              strokeWidth={1.5}
              label={{
                value: "ceiling",
                fill: COLORS.pricedOut,
                fontSize: 10,
                position: "insideTopLeft",
              }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
      <div className="legend">
        <span>
          <i className="swatch" style={{ background: COLORS.demand }} /> Demand
        </span>
        <span>
          <i className="swatch" style={{ background: COLORS.supply }} /> Supply
        </span>
        {ceiling !== undefined && (
          <span>
            <i className="swatch" style={{ background: COLORS.pricedOut }} /> Ceiling
            → shortage = horizontal gap below the cap
          </span>
        )}
      </div>
    </div>
  );
}
