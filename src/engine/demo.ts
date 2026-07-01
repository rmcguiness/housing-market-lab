/**
 * Quick CLI sanity check: run the three policies on the NYC defaults and print a
 * comparison table. `npm run demo`.
 */
import { runScenario, type Policy } from "./run.js";
import { NYC_DEFAULTS } from "./scenario.js";

const free = runScenario(NYC_DEFAULTS, { type: "freeMarket" });
const ceilingValue = Math.round(free.metrics.medianRent * 0.7);

const scenarios: { label: string; policy: Policy }[] = [
  { label: "Free market", policy: { type: "freeMarket" } },
  {
    label: `Rent ceiling $${ceilingValue}`,
    policy: { type: "rentCeiling", ceiling: ceilingValue, rationing: "lottery" },
  },
  {
    label: "Rent freeze (+20% incomes)",
    policy: { type: "rentFreeze", incomeGrowth: 0.2, rationing: "lottery" },
  },
];

const usd = (n: number) => "$" + Math.round(n).toLocaleString();
const pct = (n: number) => (n * 100).toFixed(1) + "%";

console.log("\nNYC housing model — policy comparison\n");
for (const { label, policy } of scenarios) {
  const m = runScenario(NYC_DEFAULTS, policy).metrics;
  console.log(`■ ${label}`);
  console.log(`    housed ............ ${m.housed.toLocaleString()} / ${m.totalHouseholds.toLocaleString()}`);
  console.log(`    priced out ........ ${pct(m.pricedOutRate)}`);
  console.log(`    median rent ....... ${usd(m.medianRent)}`);
  console.log(`    rent-burdened ..... ${pct(m.rentBurdenedRate)}  (severe ${pct(m.severelyBurdenedRate)})`);
  console.log(`    units withdrawn ... ${m.withdrawnUnits.toLocaleString()}`);
  console.log(`    landlord profit ... ${usd(m.totalLandlordProfit)} /mo total`);
  console.log(
    `    priced-out by band  ${m.bands.map((b) => pct(b.pricedOutRate)).join("  ")}`
  );
  console.log();
}
