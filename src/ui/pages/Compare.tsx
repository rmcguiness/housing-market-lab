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
          <span className="callout-lead">The whole plan rides on one thing: does it build?</span>
          The same NYC under a low-tax <span className="hl-accent">free market</span> vs.{" "}
          <span style={{ color: PLAN, fontWeight: 600 }}>Mamdani's plan</span> (rent freeze +
          higher taxes + a public build-out + vouchers). Flip the build-out between{" "}
          <span className="hl-good">delivers</span> and{" "}
          <span className="hl-bad">underdelivers</span> and watch the plan's line jump above
          or below the market.
        </div>

        <div className="panel">
          <h2>What is “the plan”?</h2>
          <p className="sub" style={{ marginBottom: 12 }}>
            A stylized version of Mayor Zohran Mamdani's housing platform. Reasonable people
            disagree about it — this tool lets you <em>test</em> it rather than take a side.
          </p>
          <div className="plan-pillars">
            <div>
              <strong>1. Freeze the rent.</strong> Halt increases on NYC's ~1&nbsp;million
              rent-stabilized apartments to stop displacement of current tenants.
            </div>
            <div>
              <strong>2. Build ~200,000 homes.</strong> A decade-long public build-out of
              permanently affordable, rent-stabilized units — the supply side of the plan.
            </div>
            <div>
              <strong>3. Tax the top to pay for it.</strong> Higher taxes on corporations and
              the highest earners (plus city bonds) fund construction and assistance.
            </div>
            <div>
              <strong>4. Expand assistance.</strong> Vouchers and public units to house
              low-income New Yorkers directly.
            </div>
          </div>
          <p style={{ marginTop: 14 }}>
            <span className="hl-accent">The goal:</span> make the city affordable for working-
            and low-income residents and stop rent-driven displacement.{" "}
            <span className="hl-accent">The intended outcome:</span> rents stop rising for
            stabilized tenants while a wave of new affordable supply houses more people — paid
            for by those “who can afford it.”
          </p>
          <div className="callout" style={{ borderLeftColor: PLAN, marginTop: 6 }}>
            <span className="hl-warn">What this tool stress-tests:</span> the freeze and taxes
            reliably <span className="hl-bad">shrink private rental supply</span> (the
            rent-control evidence), and public housing adds a{" "}
            <span className="hl-bad">maintenance liability</span> (see NYCHA's repair backlog).
            The plan only comes out ahead if the{" "}
            <span className="hl-good">200k-unit build-out actually delivers</span> — so the
            whole result turns on <strong>execution</strong>, not on the freeze itself.
          </div>
          <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 10, marginBottom: 0 }}>
            Model simplifications: the freeze here applies to the whole rental market (real
            freezes hit only stabilized units), and “higher taxes” are represented via property
            + income tax rather than his specific corporate / millionaire surcharges. The
            directions hold; treat magnitudes as scenarios, not forecasts.
          </p>
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
          <span className="callout-lead">Reading it honestly</span>
          The <span className="hl-accent">free market</span> grows the stock but leaves the{" "}
          <span className="hl-bad">poorest priced out</span> — that's the problem the plan
          exists to solve. The plan can <span className="hl-good">house more people</span>, but
          only if the build-out delivers. Set it to{" "}
          <span className="hl-bad">underdelivers</span> — historically the norm — and you get
          the squeeze (freeze + tax shrink supply) with nothing to replace it. The lever that
          decides it isn't the freeze; it's <strong>whether you build</strong>.
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
          info={"How readily loss-making landlords exit each year. Higher = faster loss of rental supply under stress. Empirically uncertain."}
          value={c.flightSensitivity}
          min={0}
          max={0.6}
          step={0.01}
          display={c.flightSensitivity.toFixed(2)}
          onChange={(v) => set("flightSensitivity", v)}
        />
        <Slider
          label="Wealthy-emigration sensitivity"
          info={"How readily high earners leave as taxes rise, eroding the tax base. Real-world tax-driven migration is generally small."}
          value={c.emigrationSensitivity}
          min={0}
          max={3}
          step={0.1}
          display={c.emigrationSensitivity.toFixed(1)}
          onChange={(v) => set("emigrationSensitivity", v)}
        />
        <Slider
          label="Time horizon"
          info={"How many years the simulation runs forward."}
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
