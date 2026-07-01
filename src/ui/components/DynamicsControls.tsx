import type { DynState } from "../useDynamics.js";
import { Slider } from "./Slider.js";
import { usd, pct } from "../format.js";

export function DynamicsControls({ dyn }: { dyn: DynState }) {
  const { controls: c, set, reset } = dyn;
  return (
    <aside className="sidebar">
      <div className="control-group">
        <h3>Rent regime</h3>
        <div className="seg">
          <button className={!c.rentFreeze ? "on" : ""} onClick={() => set("rentFreeze", false)}>
            Free market
          </button>
          <button className={c.rentFreeze ? "on" : ""} onClick={() => set("rentFreeze", true)}>
            Rent freeze
          </button>
        </div>
        <div style={{ height: 10 }} />
        <Slider
          label="Time horizon"
          value={c.years}
          min={5}
          max={40}
          step={1}
          display={c.years + " yrs"}
          onChange={(v) => set("years", v)}
        />
      </div>

      <div className="control-group">
        <h3>Taxes &amp; budget</h3>
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
          label="Income-tax rate"
          value={c.incomeTaxRate}
          min={0}
          max={0.15}
          step={0.005}
          display={pct(c.incomeTaxRate, 1)}
          onChange={(v) => set("incomeTaxRate", v)}
        />
        <Slider
          label="Housing share of budget"
          value={c.housingBudgetShare}
          min={0.02}
          max={0.4}
          step={0.01}
          display={pct(c.housingBudgetShare, 0)}
          onChange={(v) => set("housingBudgetShare", v)}
        />
      </div>

      <div className="control-group">
        <h3>Assistance</h3>
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
          label="Public-housing share"
          value={c.publicHousingShare}
          min={0}
          max={0.4}
          step={0.01}
          display={pct(c.publicHousingShare, 0)}
          onChange={(v) => set("publicHousingShare", v)}
        />
        <Slider
          label="Upkeep per public unit"
          value={c.maintenancePerUnit}
          min={100}
          max={1500}
          step={50}
          display={usd(c.maintenancePerUnit) + "/mo"}
          onChange={(v) => set("maintenancePerUnit", v)}
        />
      </div>

      <div className="control-group">
        <h3>Behavioural hypotheses</h3>
        <p
          style={{
            fontSize: 11,
            color: "var(--text-faint)",
            margin: "-4px 0 12px",
          }}
        >
          Contested mechanisms — set each to taste and watch the trajectory change.
        </p>
        <Slider
          label="Landlord-flight sensitivity"
          value={c.flightSensitivity}
          min={0}
          max={0.6}
          step={0.01}
          display={c.flightSensitivity.toFixed(2)}
          onChange={(v) => set("flightSensitivity", v)}
        />
        <Slider
          label="Construction response"
          value={c.constructionElasticity}
          min={0}
          max={2.5}
          step={0.05}
          display={c.constructionElasticity.toFixed(2)}
          onChange={(v) => set("constructionElasticity", v)}
        />
        <Slider
          label="Trickle-down strength"
          value={c.trickleStrength}
          min={0}
          max={1}
          step={0.05}
          display={c.trickleStrength.toFixed(2)}
          onChange={(v) => set("trickleStrength", v)}
        />
        <Slider
          label="Jobs from construction"
          value={c.jobsMultiplier}
          min={0}
          max={1.5}
          step={0.05}
          display={c.jobsMultiplier.toFixed(2)}
          onChange={(v) => set("jobsMultiplier", v)}
        />
        <Slider
          label="Wealthy-emigration sensitivity"
          value={c.emigrationSensitivity}
          min={0}
          max={3}
          step={0.1}
          display={c.emigrationSensitivity.toFixed(1)}
          onChange={(v) => set("emigrationSensitivity", v)}
        />
      </div>

      <div className="control-group">
        <Slider
          label="Landlord market power (θ)"
          value={c.landlordPower}
          min={0}
          max={1}
          step={0.01}
          display={c.landlordPower.toFixed(2)}
          onChange={(v) => set("landlordPower", v)}
        />
      </div>

      <button className="btn-reset" onClick={reset}>
        ↺ Reset dynamics
      </button>
    </aside>
  );
}
