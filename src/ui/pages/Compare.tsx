import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { useCompare, type CompareState } from "../useCompare.js";
import { Slider } from "../components/Slider.js";
import { Sidebar } from "../components/Sidebar.js";
import { COLORS, num, pct, usdCompact } from "../format.js";

const FREE = COLORS.supply; // blue
const PLAN = COLORS.demand; // orange

export function Compare() {
  const cmp = useCompare();
  const { free, plan } = cmp;

  // Total housing supply = private rental + public units (fair to a plan that
  // deliberately shifts homes into the public column).
  const supply = (y: { landlordCount: number; publicUnits: number }) =>
    y.landlordCount + y.publicUnits;

  const rows = useMemo(
    () =>
      free.map((f, i) => ({
        year: f.year,
        freeStock: supply(f),
        planStock: plan[i] ? supply(plan[i]!) : 0,
        freeHoused: f.housedRate,
        planHoused: plan[i]?.housedRate ?? 0,
      })),
    [free, plan]
  );

  const f0 = free[0]!;
  const fL = free[free.length - 1]!;
  const p0 = plan[0]!;
  const pL = plan[plan.length - 1]!;
  const chg = (a: number, b: number) => (b - a) / Math.max(1, a);

  return (
    <div className="dashboard">
      <CompareControls cmp={cmp} />
      <div className="content">
        <div className="callout">
          <strong>The whole plan rides on one thing: does it build?</strong> Below is
          the same NYC under a low-tax <span style={{ color: FREE }}>free market</span>{" "}
          and under <span style={{ color: PLAN }}>the plan</span> (rent freeze + higher
          taxes + public housing + vouchers). Flip the build-out between{" "}
          <em>delivers</em> and <em>underdelivers</em> and watch the plan's line jump
          above or below the market.
        </div>

        <div className="metrics-row">
          <ScenarioCard
            title="Free market (low tax)"
            color={FREE}
            stock={chg(supply(f0), supply(fL))}
            housed={fL.housedRate}
            abandoned={fL.abandoned}
            revenue={fL.revenue}
          />
          <ScenarioCard
            title={`The plan — build ${cmp.controls.buildOut === "delivers" ? "delivers" : "underdelivers"}`}
            color={PLAN}
            stock={chg(supply(p0), supply(pL))}
            housed={pL.housedRate}
            abandoned={pL.abandoned}
            revenue={pL.revenue}
          />
        </div>

        <div className="panel">
          <h2>Total housing supply over time</h2>
          <p className="sub">
            Private rental + public units. Under the plan this holds up only if the
            public build-out actually materialises — otherwise the freeze and taxes
            shrink private supply with nothing replacing it.
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 16, left: 4 }}>
              <CartesianGrid stroke="var(--line-soft)" vertical={false} />
              <XAxis
                dataKey="year"
                tick={{ fill: "var(--text-faint)", fontSize: 11 }}
                label={{ value: "Year", position: "insideBottom", offset: -6, fill: "var(--text-faint)", fontSize: 11 }}
              />
              <YAxis tick={{ fill: "var(--text-faint)", fontSize: 11 }} tickFormatter={num} />
              <Tooltip formatter={(v: number, n) => [num(v) + " units", n]} labelFormatter={(l) => "Year " + l} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line dataKey="freeStock" name="Free market" stroke={FREE} dot={false} strokeWidth={2.5} />
              <Line dataKey="planStock" name="The plan" stroke={PLAN} dot={false} strokeWidth={2.5} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="panel">
          <h2>Share of households housed</h2>
          <p className="sub">
            The plan houses more of the poor up front (vouchers + public units); the
            question is whether it can sustain that as the stock and tax base evolve.
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 16, left: 4 }}>
              <CartesianGrid stroke="var(--line-soft)" vertical={false} />
              <XAxis
                dataKey="year"
                tick={{ fill: "var(--text-faint)", fontSize: 11 }}
                label={{ value: "Year", position: "insideBottom", offset: -6, fill: "var(--text-faint)", fontSize: 11 }}
              />
              <YAxis domain={[0, 1]} tickFormatter={(v) => pct(v, 0)} tick={{ fill: "var(--text-faint)", fontSize: 11 }} />
              <Tooltip formatter={(v: number, n) => [pct(v), n]} labelFormatter={(l) => "Year " + l} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line dataKey="freeHoused" name="Free market" stroke={FREE} dot={false} strokeWidth={2.5} />
              <Line dataKey="planHoused" name="The plan" stroke={PLAN} dot={false} strokeWidth={2.5} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="callout" style={{ borderLeftColor: PLAN }}>
          <strong>Reading it honestly:</strong> the free market grows the stock but
          leaves the poorest priced out — that's the problem the plan exists to solve.
          The plan can house more people, but only if the build-out delivers. Set it to{" "}
          <em>underdelivers</em> — historically the norm — and you get the squeeze
          (freeze + tax shrink supply) without the offsetting construction. The lever
          that decides it isn't the freeze; it's whether you build.
        </div>
      </div>
    </div>
  );
}

function ScenarioCard({
  title,
  color,
  stock,
  housed,
  abandoned,
  revenue,
}: {
  title: string;
  color: string;
  stock: number;
  housed: number;
  abandoned: number;
  revenue: number;
}) {
  return (
    <div className="metric-card" style={{ borderTop: `3px solid ${color}` }}>
      <div className="label" style={{ color }}>{title}</div>
      <div className="value" style={{ fontSize: 19 }}>
        {stock >= 0 ? "+" : ""}
        {pct(stock, 0)} stock
      </div>
      <div className="delta neutral">
        {pct(housed, 0)} housed · {num(abandoned)} abandoned · {usdCompact(revenue)}/mo rev
      </div>
    </div>
  );
}

function CompareControls({ cmp }: { cmp: CompareState }) {
  const { controls: c, set, reset } = cmp;
  return (
    <Sidebar>
      <div className="control-group">
        <h3>The decisive lever</h3>
        <div className="seg">
          <button
            className={c.buildOut === "delivers" ? "on" : ""}
            onClick={() => set("buildOut", "delivers")}
          >
            Build delivers
          </button>
          <button
            className={c.buildOut === "underdelivers" ? "on" : ""}
            onClick={() => set("buildOut", "underdelivers")}
          >
            Underdelivers
          </button>
        </div>
        <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 8 }}>
          Does the promised 200k-unit build-out actually happen?
        </p>
      </div>

      <div className="control-group">
        <h3>Stress-test the contested assumptions</h3>
        <p style={{ fontSize: 11, color: "var(--text-faint)", margin: "-4px 0 12px" }}>
          These apply to both scenarios equally. Empirically, tax-driven flight is
          modest — but don't take my word for it, move them.
        </p>
        <Slider
          label="Landlord-flight sensitivity"
          value={c.flightSensitivity}
          min={0}
          max={0.6}
          step={0.01}
          display={c.flightSensitivity.toFixed(2)}
          onChange={(v) => set("flightSensitivity", v)}
        />
        <Slider
          label="Wealthy-emigration sensitivity"
          value={c.emigrationSensitivity}
          min={0}
          max={3}
          step={0.1}
          display={c.emigrationSensitivity.toFixed(1)}
          onChange={(v) => set("emigrationSensitivity", v)}
        />
        <Slider
          label="Time horizon"
          value={c.years}
          min={5}
          max={40}
          step={1}
          display={c.years + " yrs"}
          onChange={(v) => set("years", v)}
        />
      </div>

      <button className="btn-reset" onClick={reset}>
        ↺ Reset comparison
      </button>
    </Sidebar>
  );
}
