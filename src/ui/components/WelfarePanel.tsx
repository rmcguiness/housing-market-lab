import type { ScenarioRun } from "../../engine/index.js";
import { COLORS, usdCompact, pct } from "../format.js";

/**
 * Stacked surplus bars: the policy's consumer + producer surplus, and the
 * deadweight loss (surplus the benchmark realised but the policy destroyed),
 * drawn to the same scale so the efficiency loss is visible as a missing slice.
 */
export function WelfarePanel({
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
  const a = run.analytics;
  const scale = Math.max(benchmark.analytics.totalSurplus, a.totalSurplus + dwl, 1);
  const w = (v: number) => pct(v / scale, 1);

  const bars = [
    {
      key: "policy",
      label: isFreeMarket ? "Free market" : "This policy",
      cs: a.consumerSurplus,
      ps: a.producerSurplus,
      dwl: isFreeMarket ? 0 : dwl,
    },
  ];
  if (!isFreeMarket) {
    bars.unshift({
      key: "bench",
      label: "Free-market benchmark",
      cs: benchmark.analytics.consumerSurplus,
      ps: benchmark.analytics.producerSurplus,
      dwl: 0,
    });
  }

  return (
    <div className="panel">
      <h2>Welfare: surplus &amp; deadweight loss</h2>
      <p className="sub">
        Total surplus = gains from trade, split between tenants (consumer) and
        landlords (producer). A policy that shrinks the total destroys value —
        the deadweight loss.
      </p>

      {bars.map((b) => (
        <div key={b.key} style={{ marginBottom: 16 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
              color: "var(--text-dim)",
              marginBottom: 5,
            }}
          >
            <span>{b.label}</span>
            <span style={{ fontFamily: "var(--mono)" }}>
              {usdCompact(b.cs + b.ps)}/mo
            </span>
          </div>
          <div
            style={{
              display: "flex",
              height: 26,
              borderRadius: 6,
              overflow: "hidden",
              background: "var(--bg)",
            }}
          >
            <div
              style={{ width: w(b.cs), background: COLORS.consumer }}
              title={`Consumer surplus ${usdCompact(b.cs)}`}
            />
            <div
              style={{ width: w(b.ps), background: COLORS.producer }}
              title={`Producer surplus ${usdCompact(b.ps)}`}
            />
            {b.dwl > 0 && (
              <div
                style={{
                  width: w(b.dwl),
                  background:
                    "repeating-linear-gradient(45deg, var(--bad), var(--bad) 4px, transparent 4px, transparent 8px)",
                }}
                title={`Deadweight loss ${usdCompact(b.dwl)}`}
              />
            )}
          </div>
        </div>
      ))}

      <div className="legend">
        <span>
          <i className="swatch" style={{ background: COLORS.consumer }} /> Consumer
          surplus (tenants)
        </span>
        <span>
          <i className="swatch" style={{ background: COLORS.producer }} /> Producer
          surplus (landlords)
        </span>
        {!isFreeMarket && (
          <span>
            <i
              className="swatch"
              style={{
                background:
                  "repeating-linear-gradient(45deg, var(--bad), var(--bad) 3px, transparent 3px, transparent 6px)",
              }}
            />{" "}
            Deadweight loss
          </span>
        )}
      </div>
    </div>
  );
}
