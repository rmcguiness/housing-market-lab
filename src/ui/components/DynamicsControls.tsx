import type { DynState } from "../useDynamics.js";
import { Slider } from "./Slider.js";
import { Sidebar } from "./Sidebar.js";
import { usd, pct } from "../format.js";

export function DynamicsControls({ dyn }: { dyn: DynState }) {
  const { controls: c, set, reset } = dyn;
  return (
    <Sidebar>
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
          info={"How many years the simulation runs forward."}
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
          info={"Annual tax as a share of a unit's assessed value, added to the landlord's carrying cost. Higher rates push marginal landlords out of the market."}
          value={c.propertyTaxRate}
          min={0}
          max={0.05}
          step={0.001}
          display={pct(c.propertyTaxRate, 1) + "/yr"}
          onChange={(v) => set("propertyTaxRate", v)}
        />
        <Slider
          label="Income-tax rate"
          info={"Flat tax on household income that funds the government budget. Higher rates raise revenue but can accelerate wealthy emigration."}
          value={c.incomeTaxRate}
          min={0}
          max={0.15}
          step={0.005}
          display={pct(c.incomeTaxRate, 1)}
          onChange={(v) => set("incomeTaxRate", v)}
        />
        <Slider
          label="Housing share of budget"
          info={"Share of total tax revenue earmarked for housing — maintenance of public units is funded first, vouchers from whatever is left."}
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
          info={"Monthly subsidy added to an eligible low-income household's housing budget so it can compete for units. Part of it can be captured by landlords as higher rent."}
          value={c.voucherCap}
          min={0}
          max={2000}
          step={50}
          display={usd(c.voucherCap) + "/mo"}
          onChange={(v) => set("voucherCap", v)}
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
          label="Upkeep per public unit"
          info={"Monthly cost to keep one public unit in good repair. When revenue can't cover it, public housing condition decays."}
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
          info={"How readily loss-making landlords exit each year. Higher = faster loss of rental supply under stress. Empirically uncertain."}
          value={c.flightSensitivity}
          min={0}
          max={0.6}
          step={0.01}
          display={c.flightSensitivity.toFixed(2)}
          onChange={(v) => set("flightSensitivity", v)}
        />
        <Slider
          label="Construction response"
          info={"How strongly developers build when rentals are profitable. 0 = no new supply; high = construction can outpace landlord exits."}
          value={c.constructionElasticity}
          min={0}
          max={2.5}
          step={0.05}
          display={c.constructionElasticity.toFixed(2)}
          onChange={(v) => set("constructionElasticity", v)}
        />
        <Slider
          label="Trickle-down strength"
          info={"Extra income growth whose gains flow disproportionately to top earners. Higher = more overall growth but wider inequality (rising Gini)."}
          value={c.trickleStrength}
          min={0}
          max={1}
          step={0.05}
          display={c.trickleStrength.toFixed(2)}
          onChange={(v) => set("trickleStrength", v)}
        />
        <Slider
          label="Jobs from construction"
          info={"How much new building draws in residents and jobs, raising demand. A contested feedback — set to 0 to switch it off."}
          value={c.jobsMultiplier}
          min={0}
          max={1.5}
          step={0.05}
          display={c.jobsMultiplier.toFixed(2)}
          onChange={(v) => set("jobsMultiplier", v)}
        />
        <Slider
          label="Wealthy-emigration sensitivity"
          info={"How readily high earners leave as taxes rise, eroding the tax base. Real-world tax-driven migration is generally small."}
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
          info={"How each rental's surplus splits between tenant and landlord. θ→1: rents near the tenant's full willingness to pay; θ→0: rents near cost. It changes who captures value, NOT who gets housed."}
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
    </Sidebar>
  );
}
