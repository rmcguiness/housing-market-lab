import {
  AreaChart,
  Area,
  LineChart,
  Line,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import type { YearMetrics } from "../../engine/index.js";
import { COLORS, FATE_COLORS, FATE_LABELS, usdCompact, pct, num } from "../format.js";

const axis = { fill: "var(--text-faint)", fontSize: 10 };
const grid = "var(--line-soft)";
const xLabel = {
  value: "Year",
  position: "insideBottom" as const,
  offset: -4,
  fill: "var(--text-faint)",
  fontSize: 10,
};

function Panel({
  title,
  sub,
  children,
}: {
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <div className="panel">
      <h2>{title}</h2>
      <p className="sub">{sub}</p>
      {children}
    </div>
  );
}

const FATE_ORDER = [
  "privateRented",
  "publicOccupied",
  "privateVacant",
  "ownerOccupied",
  "warehoused",
  "abandoned",
] as const;

export function StockCompositionChart({ years }: { years: YearMetrics[] }) {
  return (
    <Panel
      title="Where the housing goes"
      sub="Every standing unit, year by year. As landlords exit, homes convert to owner-occupied, get warehoused vacant, or decay — they don't disappear."
    >
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={years} margin={{ top: 6, right: 8, bottom: 14, left: 4 }}>
          <CartesianGrid stroke={grid} vertical={false} />
          <XAxis dataKey="year" tick={axis} label={xLabel} />
          <YAxis tick={axis} tickFormatter={num} />
          <Tooltip
            formatter={(v: number, key) => [num(v) + " units", FATE_LABELS[key as string] ?? key]}
            labelFormatter={(l) => "Year " + l}
            contentStyle={{ maxWidth: 240 }}
          />
          {FATE_ORDER.map((k) => (
            <Area
              key={k}
              dataKey={k}
              stackId="1"
              stroke={FATE_COLORS[k]}
              fill={FATE_COLORS[k]}
              fillOpacity={0.85}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
      <div className="legend">
        {FATE_ORDER.map((k) => (
          <span key={k}>
            <i className="swatch" style={{ background: FATE_COLORS[k] }} /> {FATE_LABELS[k]}
          </span>
        ))}
      </div>
    </Panel>
  );
}

export function FiscalChart({ years }: { years: YearMetrics[] }) {
  return (
    <Panel
      title="Government fiscal feedback"
      sub="Revenue funds a housing budget; maintenance is paid first, vouchers from the rest. When the tax base erodes, the budget can't cover what's needed."
    >
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={years} margin={{ top: 6, right: 8, bottom: 14, left: 4 }}>
          <CartesianGrid stroke={grid} vertical={false} />
          <XAxis dataKey="year" tick={axis} label={xLabel} />
          <YAxis tick={axis} tickFormatter={usdCompact} />
          <Tooltip
            formatter={(v: number, n) => [usdCompact(v) + "/mo", n]}
            labelFormatter={(l) => "Year " + l}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line dataKey="revenue" name="Total revenue" stroke={COLORS.accent} dot={false} strokeWidth={2} />
          <Line dataKey="housingBudget" name="Housing budget" stroke={COLORS.supply} dot={false} strokeWidth={2} />
          <Line
            dataKey="assistanceNeeded"
            name="Assistance needed"
            stroke={COLORS.demand}
            dot={false}
            strokeWidth={2}
            strokeDasharray="4 3"
          />
          <Line dataKey="assistanceFunded" name="Assistance funded" stroke={COLORS.housed} dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </Panel>
  );
}

export function HousedChart({ years }: { years: YearMetrics[] }) {
  return (
    <Panel
      title="Who's housed, and who gets help"
      sub="Share of households housed, and the share of eligible low-income households the voucher budget can actually cover."
    >
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={years} margin={{ top: 6, right: 8, bottom: 14, left: 4 }}>
          <CartesianGrid stroke={grid} vertical={false} />
          <XAxis dataKey="year" tick={axis} label={xLabel} />
          <YAxis tick={axis} domain={[0, 1]} tickFormatter={(v) => pct(v, 0)} />
          <Tooltip formatter={(v: number, n) => [pct(v), n]} labelFormatter={(l) => "Year " + l} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line dataKey="housedRate" name="Housed" stroke={COLORS.housed} dot={false} strokeWidth={2} />
          <Line dataKey="voucherCoverage" name="Voucher coverage" stroke={COLORS.demand} dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </Panel>
  );
}

export function SupplyChart({ years }: { years: YearMetrics[] }) {
  return (
    <Panel
      title="Supply: flight vs. construction"
      sub="The private rental stock (line) is the tug-of-war between landlords exiting and developers building new units (bars)."
    >
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={years} margin={{ top: 6, right: 8, bottom: 14, left: 4 }}>
          <CartesianGrid stroke={grid} vertical={false} />
          <XAxis dataKey="year" tick={axis} label={xLabel} />
          <YAxis tick={axis} tickFormatter={num} />
          <Tooltip labelFormatter={(l) => "Year " + l} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="unitsBuilt" name="Built this year" fill={COLORS.supply} opacity={0.6} />
          <Line dataKey="landlordCount" name="Private rental units" stroke={COLORS.housed} dot={false} strokeWidth={2} />
        </ComposedChart>
      </ResponsiveContainer>
    </Panel>
  );
}

export function QualityChart({ years }: { years: YearMetrics[] }) {
  return (
    <Panel
      title="Housing quality over time"
      sub="Average effective quality of private stock and the condition of public housing — which decays when the government can't fund upkeep."
    >
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={years} margin={{ top: 6, right: 8, bottom: 14, left: 4 }}>
          <CartesianGrid stroke={grid} vertical={false} />
          <XAxis dataKey="year" tick={axis} label={xLabel} />
          <YAxis tick={axis} domain={[0, 1]} tickFormatter={(v) => v.toFixed(1)} />
          <Tooltip formatter={(v: number, n) => [(v as number).toFixed(2), n]} labelFormatter={(l) => "Year " + l} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line dataKey="avgEffectiveQuality" name="Private quality" stroke={COLORS.consumer} dot={false} strokeWidth={2} />
          <Line dataKey="publicCondition" name="Public condition" stroke={COLORS.withdrawn} dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </Panel>
  );
}

export function IncomeRentChart({ years }: { years: YearMetrics[] }) {
  return (
    <Panel
      title="Median income vs. median rent"
      sub="Whether housing costs track, outrun, or lag household incomes — and how trickle-down/jobs and rent freezes pull them apart."
    >
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={years} margin={{ top: 6, right: 8, bottom: 14, left: 4 }}>
          <CartesianGrid stroke={grid} vertical={false} />
          <XAxis dataKey="year" tick={axis} label={xLabel} />
          <YAxis yAxisId="l" tick={axis} tickFormatter={usdCompact} />
          <YAxis yAxisId="r" orientation="right" tick={axis} tickFormatter={usdCompact} />
          <Tooltip formatter={(v: number, n) => [usdCompact(v), n]} labelFormatter={(l) => "Year " + l} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line yAxisId="l" dataKey="medianIncome" name="Median income (yr)" stroke={COLORS.accent} dot={false} strokeWidth={2} />
          <Line yAxisId="r" dataKey="medianRent" name="Median rent (mo)" stroke={COLORS.demand} dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </Panel>
  );
}
