import type { ModelState } from "../useModel.js";
import { Slider } from "./Slider.js";
import { Sidebar } from "./Sidebar.js";
import { usd, pct, num } from "../format.js";

const POLICIES: {
  id: "freeMarket" | "rentCeiling" | "rentFreeze" | "governmentAssistance";
  label: string;
}[] = [
  { id: "freeMarket", label: "Free" },
  { id: "rentCeiling", label: "Ceiling" },
  { id: "rentFreeze", label: "Freeze" },
  { id: "governmentAssistance", label: "Assistance" },
];

export function ControlPanel({ model }: { model: ModelState }) {
  const { controls: c, set, reset } = model;

  return (
    <Sidebar>
      <div className="control-group">
        <h3>Policy regime</h3>
        <div className="seg">
          {POLICIES.map((p) => (
            <button
              key={p.id}
              className={c.policyType === p.id ? "on" : ""}
              onClick={() => set("policyType", p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {c.policyType === "rentCeiling" && (
        <div className="control-group">
          <h3>Ceiling settings</h3>
          <Slider
            label="Rent ceiling"
            info={"The maximum monthly rent any unit may legally charge. Set below the market rate it caps rents for the lucky, but pushes thin-margin landlords to withdraw units."}
            value={c.ceiling}
            min={500}
            max={5000}
            step={50}
            display={usd(c.ceiling) + "/mo"}
            onChange={(v) => set("ceiling", v)}
          />
          <RationingToggle model={model} />
        </div>
      )}

      {c.policyType === "rentFreeze" && (
        <div className="control-group">
          <h3>Freeze settings</h3>
          <Slider
            label="Demand shock (income growth)"
            info={"How much household incomes rise after rents are frozen. Models demand growing while frozen rents can't follow — the source of the resulting shortage."}
            value={c.incomeGrowth}
            min={0}
            max={0.6}
            step={0.01}
            display={"+" + pct(c.incomeGrowth, 0)}
            onChange={(v) => set("incomeGrowth", v)}
          />
          <RationingToggle model={model} />
        </div>
      )}

      {c.policyType === "governmentAssistance" && (
        <div className="control-group">
          <h3>Assistance settings</h3>
          <Slider
            label="Voucher amount"
            info={"Monthly subsidy added to an eligible low-income household's housing budget so it can compete for units. Part of it can be captured by landlords as higher rent."}
            value={c.voucherCap}
            min={0}
            max={2000}
            step={50}
            display={usd(c.voucherCap) + "/mo"}
            onChange={(v) => set("voucherCap", v)}
          />
          <Slider
            label="Voucher income cutoff"
            info={"Households earning below this qualify for vouchers and public housing."}
            value={c.voucherIncomeThreshold}
            min={20000}
            max={100000}
            step={5000}
            display={usd(c.voucherIncomeThreshold)}
            onChange={(v) => set("voucherIncomeThreshold", v)}
          />
          <Slider
            label="Public-housing share"
            info={"Fraction of the housing stock the government operates and rents below cost to the lowest-income households."}
            value={c.publicHousingShare}
            min={0}
            max={0.4}
            step={0.01}
            display={pct(c.publicHousingShare, 0)}
            onChange={(v) => set("publicHousingShare", v)}
          />
          <Slider
            label="Public rent discount"
            info={"How far below carrying cost public units are rented. Higher = cheaper for tenants, but a larger ongoing subsidy for the government."}
            value={c.publicRentDiscount}
            min={0}
            max={0.9}
            step={0.05}
            display={pct(c.publicRentDiscount, 0)}
            onChange={(v) => set("publicRentDiscount", v)}
          />
        </div>
      )}

      <div className="control-group">
        <h3>Households (demand)</h3>
        <Slider
          label="Median income"
          info={"The midpoint of the income distribution — half of households earn more, half less. NYC ≈ $76k."}
          value={c.medianIncome}
          min={30000}
          max={150000}
          step={1000}
          display={usd(c.medianIncome)}
          onChange={(v) => set("medianIncome", v)}
        />
        <Slider
          label="Income inequality (σ)"
          info={"Spread of the log-normal income distribution. Higher σ = a fatter tail of high earners and more inequality (a higher Gini)."}
          value={c.incomeSigma}
          min={0.3}
          max={1.3}
          step={0.01}
          display={c.incomeSigma.toFixed(2)}
          onChange={(v) => set("incomeSigma", v)}
        />
        <Slider
          label="Avg housing budget share"
          info={"Average share of income households are willing to spend on housing — the '30% of income' rule of thumb."}
          value={c.budgetShareMean}
          min={0.2}
          max={0.5}
          step={0.01}
          display={pct(c.budgetShareMean, 0)}
          onChange={(v) => set("budgetShareMean", v)}
        />
        <Slider
          label="Number of households"
          info={"How many households compete for housing (the demand side)."}
          value={c.households}
          min={1000}
          max={8000}
          step={100}
          display={num(c.households)}
          onChange={(v) => set("households", v)}
        />
      </div>

      <div className="control-group">
        <h3>Housing stock (supply)</h3>
        <Slider
          label="Number of units"
          info={"Total housing units in the market (the supply side). Fewer units than households creates a structural shortage."}
          value={c.units}
          min={1000}
          max={8000}
          step={100}
          display={num(c.units)}
          onChange={(v) => set("units", v)}
        />
        <Slider
          label="Cheapest unit cost"
          info={"The landlord's monthly carrying cost (mortgage + upkeep) for the lowest-quality units — the rent floor below which they won't rent."}
          value={c.minCost}
          min={300}
          max={2000}
          step={50}
          display={usd(c.minCost) + "/mo"}
          onChange={(v) => set("minCost", v)}
        />
        <Slider
          label="Priciest unit cost"
          info={"The landlord's monthly carrying cost for the highest-quality units."}
          value={c.maxCost}
          min={2500}
          max={9000}
          step={100}
          display={usd(c.maxCost) + "/mo"}
          onChange={(v) => set("maxCost", v)}
        />
      </div>

      <div className="control-group">
        <h3>Market structure</h3>
        <Slider
          label="Landlord market power (θ)"
          info={"How each rental's surplus splits between tenant and landlord. θ→1: rents near the tenant's full willingness to pay; θ→0: rents near cost. It changes who captures value, NOT who gets housed."}
          value={c.landlordPower}
          min={0}
          max={1}
          step={0.01}
          display={c.landlordPower.toFixed(2)}
          onChange={(v) => set("landlordPower", v)}
        />
        <Slider
          label="Property-tax rate"
          info={"Annual tax as a share of a unit's assessed value, added to the landlord's carrying cost. Higher rates push marginal landlords out of the market."}
          value={c.propertyTaxRate}
          min={0}
          max={0.05}
          step={0.001}
          display={pct(c.propertyTaxRate, 1) + "/yr"}
          onChange={(v) => set("propertyTaxRate", v)}
        />
        <Slider
          label="Random seed"
          info={"Selects which random draw of households and units is generated. The same seed always reproduces the same result."}
          value={c.seed}
          min={1}
          max={50}
          step={1}
          display={"#" + c.seed}
          onChange={(v) => set("seed", v)}
        />
      </div>

      <div className="control-group">
        <div className="callout" style={{ margin: 0 }}>
          Supply/demand ratio:{" "}
          <strong>{(c.units / c.households).toFixed(2)}</strong> units per household.
          {c.units < c.households ? " A structural shortage." : " Slack market."}
        </div>
      </div>

      <button className="btn-reset" onClick={reset}>
        ↺ Reset to NYC defaults
      </button>
    </Sidebar>
  );
}

function RationingToggle({ model }: { model: ModelState }) {
  const { controls: c, set } = model;
  return (
    <div className="control">
      <div className="control-label">
        <span>Rationing rule</span>
      </div>
      <div className="seg">
        <button
          className={c.rationing === "lottery" ? "on" : ""}
          onClick={() => set("rationing", "lottery")}
        >
          Lottery
        </button>
        <button
          className={c.rationing === "income-priority" ? "on" : ""}
          onClick={() => set("rationing", "income-priority")}
        >
          Income-priority
        </button>
      </div>
    </div>
  );
}
