import { useMemo } from "react";
import type { UnitRow } from "../selectors.js";
import { sample } from "../selectors.js";
import { COLORS, usd, usdCompact } from "../format.js";

const W = 640;
const H = 320;
const M = { top: 16, right: 16, bottom: 40, left: 56 };

const STATUS_COLOR: Record<UnitRow["status"], string> = {
  occupied: COLORS.profit,
  vacant: COLORS.vacant,
  withdrawn: COLORS.withdrawn,
};

export function LandlordChart({ rows }: { rows: UnitRow[] }) {
  const { pts, axisMax, ticks, s } = useMemo(() => {
    const plotW = W - M.left - M.right;
    const plotH = H - M.top - M.bottom;
    const axisMax =
      Math.max(1000, ...rows.map((r) => Math.max(r.cost, r.rent))) * 1.05;
    const sx = (v: number) => M.left + (v / axisMax) * plotW;
    const sy = (v: number) => M.top + plotH - (v / axisMax) * plotH;
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * axisMax));
    // Put occupied (the interesting margins) on top of vacant/withdrawn.
    const ordered = [...rows].sort(
      (a, b) => (a.status === "occupied" ? 1 : 0) - (b.status === "occupied" ? 1 : 0)
    );
    return { pts: sample(ordered, 2600), axisMax, ticks, s: { sx, sy, plotW, plotH } };
  }, [rows]);

  return (
    <div className="panel">
      <h2>Landlord profit &amp; loss</h2>
      <p className="sub">
        Each dot is a unit — carrying cost vs. rent. The diagonal is break-even:
        above it the landlord profits, on the floor the unit earns nothing.
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img">
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={M.left}
              x2={M.left + s.plotW}
              y1={s.sy(t)}
              y2={s.sy(t)}
              stroke="var(--line-soft)"
            />
            <text
              x={M.left - 8}
              y={s.sy(t) + 3}
              fill="var(--text-faint)"
              fontSize="9"
              textAnchor="end"
            >
              {usd(t)}
            </text>
            <text
              x={s.sx(t)}
              y={H - M.bottom + 16}
              fill="var(--text-faint)"
              fontSize="9"
              textAnchor="middle"
            >
              {usdCompact(t)}
            </text>
          </g>
        ))}
        {/* break-even diagonal */}
        <line
          x1={s.sx(0)}
          y1={s.sy(0)}
          x2={s.sx(axisMax)}
          y2={s.sy(axisMax)}
          stroke="var(--text-faint)"
          strokeDasharray="4 4"
        />
        <text
          x={s.sx(axisMax) - 6}
          y={s.sy(axisMax) + 14}
          fill="var(--text-faint)"
          fontSize="9"
          textAnchor="end"
        >
          break-even (rent = cost)
        </text>

        {pts.map((r) => (
          <circle
            key={r.id}
            cx={s.sx(r.cost)}
            cy={s.sy(r.rent)}
            r={2}
            fill={STATUS_COLOR[r.status]}
            opacity={r.status === "occupied" ? 0.7 : 0.55}
          />
        ))}

        <text
          x={M.left + s.plotW / 2}
          y={H - 4}
          fill="var(--text-dim)"
          fontSize="11"
          textAnchor="middle"
        >
          Landlord carrying cost (mortgage + maintenance + taxes)
        </text>
      </svg>
      <div className="legend">
        <span>
          <i className="swatch" style={{ background: COLORS.profit }} /> occupied
          (profit = height above diagonal)
        </span>
        <span>
          <i className="swatch" style={{ background: COLORS.vacant }} /> vacant
        </span>
        <span>
          <i className="swatch" style={{ background: COLORS.withdrawn }} /> withdrawn
        </span>
      </div>
    </div>
  );
}
