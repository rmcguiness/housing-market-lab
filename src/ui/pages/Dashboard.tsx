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
      <strong>Free market.</strong> Rents clear supply and demand with no
      intervention. This is the efficient benchmark — note how the lowest income
      quintile is still largely priced out, the core failure that motivates every
      policy below.
    </>
  ),
  rentCeiling: (
    <>
      <strong>Rent ceiling.</strong> A hard cap on rent. Watch two textbook
      forces: landlords whose costs exceed the cap <em>withdraw</em> their units
      (supply falls), and the suppressed price draws excess demand that must be
      rationed. A lucky few win cheap units; more households are priced out.
    </>
  ),
  rentFreeze: (
    <>
      <strong>Rent freeze.</strong> Rents are pinned at today's level while demand
      grows (incomes rise). Rents can't follow, so a shortage opens up and surplus
      shifts from landlords to whoever already holds a unit.
    </>
  ),
  governmentAssistance: (
    <>
      <strong>Government assistance.</strong> Demand-side <em>vouchers</em> lift
      low-income tenants' budgets so they can compete; supply-side{" "}
      <em>public housing</em> rents below cost to the poorest. Both pull the bottom
      quintile into housing — at a government cost. See how much of the gain is
      captured by landlords as higher rents (the voucher-incidence question), and
      visit <strong>Over time</strong> to see whether the tax base can keep funding it.
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
