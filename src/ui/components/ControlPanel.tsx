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
            value={c.voucherCap}
            min={0}
            max={2000}
            step={50}
            display={usd(c.voucherCap) + "/mo"}
            onChange={(v) => set("voucherCap", v)}
          />
          <Slider
            label="Voucher income cutoff"
            value={c.voucherIncomeThreshold}
            min={20000}
            max={100000}
            step={5000}
            display={usd(c.voucherIncomeThreshold)}
            onChange={(v) => set("voucherIncomeThreshold", v)}
          />
          <Slider
            label="Public-housing share"
            value={c.publicHousingShare}
            min={0}
            max={0.4}
            step={0.01}
            display={pct(c.publicHousingShare, 0)}
            onChange={(v) => set("publicHousingShare", v)}
          />
          <Slider
            label="Public rent discount"
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
          value={c.medianIncome}
          min={30000}
          max={150000}
          step={1000}
          display={usd(c.medianIncome)}
          onChange={(v) => set("medianIncome", v)}
        />
        <Slider
          label="Income inequality (σ)"
          value={c.incomeSigma}
          min={0.3}
          max={1.3}
          step={0.01}
          display={c.incomeSigma.toFixed(2)}
          onChange={(v) => set("incomeSigma", v)}
        />
        <Slider
          label="Avg housing budget share"
          value={c.budgetShareMean}
          min={0.2}
          max={0.5}
          step={0.01}
          display={pct(c.budgetShareMean, 0)}
          onChange={(v) => set("budgetShareMean", v)}
        />
        <Slider
          label="Number of households"
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
          value={c.units}
          min={1000}
          max={8000}
          step={100}
          display={num(c.units)}
          onChange={(v) => set("units", v)}
        />
        <Slider
          label="Cheapest unit cost"
          value={c.minCost}
          min={300}
          max={2000}
          step={50}
          display={usd(c.minCost) + "/mo"}
          onChange={(v) => set("minCost", v)}
        />
        <Slider
          label="Priciest unit cost"
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
          value={c.landlordPower}
          min={0}
          max={1}
          step={0.01}
          display={c.landlordPower.toFixed(2)}
          onChange={(v) => set("landlordPower", v)}
        />
        <Slider
          label="Property-tax rate"
          value={c.propertyTaxRate}
          min={0}
          max={0.05}
          step={0.001}
          display={pct(c.propertyTaxRate, 1) + "/yr"}
          onChange={(v) => set("propertyTaxRate", v)}
        />
        <Slider
          label="Random seed"
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
