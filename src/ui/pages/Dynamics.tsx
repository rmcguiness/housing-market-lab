import { useDynamics } from "../useDynamics.js";
import { DynamicsControls } from "../components/DynamicsControls.js";
import {
  StockCompositionChart,
  FiscalChart,
  HousedChart,
  SupplyChart,
  QualityChart,
  IncomeRentChart,
} from "../components/DynamicsCharts.js";
import { pct, num } from "../format.js";

export function Dynamics() {
  const dyn = useDynamics();
  const years = dyn.result.years;
  const first = years[0]!;
  const last = years[years.length - 1]!;

  const revChange = (last.revenue - first.revenue) / Math.max(1, first.revenue);
  const stockChange = (last.landlordCount - first.landlordCount) / Math.max(1, first.landlordCount);
  const housedChange = last.housedRate - first.housedRate;
  const popChange = (last.population - first.population) / Math.max(1, first.population);
  const crisisYear = years.find((y) => y.voucherCoverage < 0.999 && y.year > 0);

  return (
    <div className="dashboard">
      <DynamicsControls dyn={dyn} />
      <div className="content">
        <div className="callout">
          <strong>Over {last.year + 1} years.</strong> The private rental stock{" "}
          {stockChange >= 0 ? "grew" : "shrank"} {pct(Math.abs(stockChange), 0)} (
          {num(first.landlordCount)} → {num(last.landlordCount)} units) and the
          population {popChange >= 0 ? "grew" : "shrank"} {pct(Math.abs(popChange), 0)}{" "}
          ({num(first.population)} → {num(last.population)} households
          {popChange < 0 ? ", as residents left" : ""}). Government revenue{" "}
          {revChange >= 0 ? "rose" : "fell"} {pct(Math.abs(revChange), 0)}, and the
          housed rate {housedChange >= 0 ? "rose" : "fell"}{" "}
          {pct(Math.abs(housedChange), 0)} to {pct(last.housedRate, 0)}
          {housedChange > 0 && popChange < 0 ? " (of a shrunken city)" : ""}.{" "}
          {crisisYear
            ? `Voucher coverage first fell short in year ${crisisYear.year}, reaching ${pct(
                last.voucherCoverage,
                0
              )} by the end — the funding gap the tax base could no longer close.`
            : "Assistance stayed fully funded throughout."}{" "}
          By the end, {num(last.ownerOccupied)} units had converted to owner-occupied,{" "}
          {num(last.warehoused)} were warehoused vacant, and {num(last.abandoned)} were
          abandoned.
        </div>

        <div className="panel-grid">
          <StockCompositionChart years={years} />
          <FiscalChart years={years} />
        </div>
        <div className="panel-grid">
          <SupplyChart years={years} />
          <HousedChart years={years} />
        </div>
        <div className="panel-grid">
          <IncomeRentChart years={years} />
          <QualityChart years={years} />
        </div>
      </div>
    </div>
  );
}
