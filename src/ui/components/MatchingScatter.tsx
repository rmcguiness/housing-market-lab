import { useMemo } from "react";
import type { HouseholdRow } from "../selectors.js";
import { sample } from "../selectors.js";
import { BAND_COLORS, BAND_LABELS, COLORS, usd, usdCompact } from "../format.js";

const W = 640;
const H = 320;
const M = { top: 16, right: 16, bottom: 40, left: 52 };

export function MatchingScatter({ rows }: { rows: HouseholdRow[] }) {
  const { housed, pricedOut, xTicks, yTicks, sx, sy, plotW, plotH } = useMemo(() => {
    const plotW = W - M.left - M.right;
    const plotH = H - M.top - M.bottom;

    const incomes = rows.map((r) => r.income).sort((a, b) => a - b);
    const xMin = Math.max(5000, incomes[0] ?? 5000);
    const xMax = incomes[Math.floor(incomes.length * 0.98)] ?? 200000;
    const rents = rows.filter((r) => r.housed).map((r) => r.rent);
    const yMax = Math.max(1000, ...rents) * 1.05;

    const lx = (v: number) => Math.log10(Math.max(xMin, Math.min(xMax, v)));
    const sx = (v: number) =>
      M.left + ((lx(v) - lx(xMin)) / (lx(xMax) - lx(xMin) || 1)) * plotW;
    const sy = (v: number) => M.top + plotH - (v / yMax) * plotH;

    const housed = sample(rows.filter((r) => r.housed), 2000);
    const pricedOut = sample(rows.filter((r) => !r.housed), 1200);

    const xTicks = [10000, 25000, 50000, 100000, 200000].filter(
      (t) => t >= xMin && t <= xMax
    );
    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * yMax));

    return { housed, pricedOut, xTicks, yTicks, sx, sy, plotW, plotH };
  }, [rows]);

  return (
    <div className="panel">
      <h2>Household matching: who gets what</h2>
      <p className="sub">
        Each dot is a household — income (log) vs. rent paid, coloured by income
        quintile. Priced-out households sit on the red floor.
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img">
        {/* y grid + ticks */}
        {yTicks.map((t) => (
          <g key={"y" + t}>
            <line
              x1={M.left}
              x2={M.left + plotW}
              y1={sy(t)}
              y2={sy(t)}
              stroke="var(--line-soft)"
            />
            <text x={M.left - 8} y={sy(t) + 3} fill="var(--text-faint)" fontSize="9" textAnchor="end">
              {usd(t)}
            </text>
          </g>
        ))}
        {/* x ticks */}
        {xTicks.map((t) => (
          <text
            key={"x" + t}
            x={sx(t)}
            y={H - M.bottom + 16}
            fill="var(--text-faint)"
            fontSize="9"
            textAnchor="middle"
          >
            {usdCompact(t)}
          </text>
        ))}
        <text
          x={M.left + plotW / 2}
          y={H - 6}
          fill="var(--text-dim)"
          fontSize="11"
          textAnchor="middle"
        >
          Household income (log scale)
        </text>

        {/* priced-out floor */}
        <rect
          x={M.left}
          y={M.top + plotH - 6}
          width={plotW}
          height={6}
          fill={COLORS.pricedOut}
          opacity={0.12}
        />
        {pricedOut.map((r) => (
          <circle
            key={"p" + r.id}
            cx={sx(r.income)}
            cy={M.top + plotH - 2 - (r.id % 4)}
            r={1.4}
            fill={COLORS.pricedOut}
            opacity={0.5}
          />
        ))}
        {/* housed */}
        {housed.map((r) => (
          <circle
            key={r.id}
            cx={sx(r.income)}
            cy={sy(r.rent)}
            r={2}
            fill={BAND_COLORS[r.band]}
            opacity={0.7}
          />
        ))}
      </svg>
      <div className="legend">
        {BAND_LABELS.map((l, i) => (
          <span key={i}>
            <i className="swatch" style={{ background: BAND_COLORS[i] }} /> {l}
          </span>
        ))}
        <span>
          <i className="swatch" style={{ background: COLORS.pricedOut }} /> priced out
        </span>
      </div>
    </div>
  );
}
