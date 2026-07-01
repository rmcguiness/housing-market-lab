import { useMemo, type ReactNode } from "react";
import { useModel } from "../useModel.js";
import { householdRows, unitRows } from "../selectors.js";
import { ControlPanel } from "../components/ControlPanel.js";
import { MetricsRow } from "../components/MetricsRow.js";
import { IncomeHistogram } from "../components/IncomeHistogram.js";
import { SupplyDemandChart } from "../components/SupplyDemandChart.js";
import { BandBreakdown } from "../components/BandBreakdown.js";
import { MatchingScatter } from "../components/MatchingScatter.js";
import { LandlordChart } from "../components/LandlordChart.js";
import { WelfarePanel } from "../components/WelfarePanel.js";
import { ComparisonTable } from "../components/ComparisonTable.js";

const REGIME_NOTE: Record<string, ReactNode> = {
  freeMarket: (
    <>
      <span className="callout-lead">Free market</span>
      Rents clear supply and demand with no intervention — the{" "}
      <span className="hl-accent">efficient benchmark</span>. Note how the lowest income
      quintile is <span className="hl-bad">still largely priced out</span>: the core failure
      that motivates every policy below.
    </>
  ),
  rentCeiling: (
    <>
      <span className="callout-lead">Rent ceiling</span>
      A hard cap on rent. Watch two textbook forces: landlords whose costs exceed the cap{" "}
      <span className="hl-bad">withdraw their units</span> (supply falls), and the suppressed
      price draws excess demand that must be rationed. A{" "}
      <span className="hl-good">lucky few win cheap units</span>; more households are{" "}
      <span className="hl-bad">priced out</span>.
    </>
  ),
  rentFreeze: (
    <>
      <span className="callout-lead">Rent freeze</span>
      Rents are pinned at today's level while demand grows (incomes rise). Rents can't follow,
      so a <span className="hl-bad">shortage opens up</span> and surplus shifts from landlords
      to <span className="hl-good">whoever already holds a unit</span>.
    </>
  ),
  governmentAssistance: (
    <>
      <span className="callout-lead">Government assistance</span>
      Demand-side <span className="hl-accent">vouchers</span> lift low-income tenants' budgets
      so they can compete; supply-side <span className="hl-accent">public housing</span> rents
      below cost to the poorest. Both <span className="hl-good">pull the bottom quintile into
      housing</span> — at a <span className="hl-warn">government cost</span>. Watch how much of
      the gain landlords capture as higher rents (voucher incidence), and visit{" "}
      <strong>Over time</strong> to see whether the tax base can keep funding it.
    </>
  ),
};

export function Dashboard() {
  const model = useModel();
  const { run, benchmark, dwl, controls } = model;
  const isFreeMarket = controls.policyType === "freeMarket";

  const hRows = useMemo(() => householdRows(run), [run]);
  const uRows = useMemo(() => unitRows(run), [run]);

  return (
    <div className="dashboard">
      <ControlPanel model={model} />
      <div className="content">
        <div className="callout">{REGIME_NOTE[controls.policyType]}</div>

        <MetricsRow
          run={run}
          benchmark={benchmark}
          dwl={dwl}
          isFreeMarket={isFreeMarket}
        />

        <div className="panel-grid">
          <IncomeHistogram rows={hRows} />
          <SupplyDemandChart
            run={run}
            ceiling={controls.policyType === "rentCeiling" ? controls.ceiling : undefined}
          />
        </div>

        <div className="panel-grid">
          <MatchingScatter rows={hRows} />
          <LandlordChart rows={uRows} />
        </div>

        <div className="panel-grid">
          <BandBreakdown run={run} />
          <WelfarePanel
            run={run}
            benchmark={benchmark}
            dwl={dwl}
            isFreeMarket={isFreeMarket}
          />
        </div>

        <ComparisonTable run={run} benchmark={benchmark} isFreeMarket={isFreeMarket} />
      </div>
    </div>
  );
}
