# Housing Market Lab

An agent-based simulator of how economic policy reshapes a housing market,
calibrated to rough New York City estimates — an interactive tool for exploring
rent control, rent freezes, property taxes, and housing assistance, with
master's-level welfare analysis under the hood.

It has two layers:

- A pure, dependency-free **TypeScript economic engine** (`src/engine/`) with a
  property-based test suite. UI-agnostic, so the same model could drive other
  markets.
- A **React + Recharts** front end (`src/ui/`) with four views:
  - **Dashboard** — a single-year snapshot with live sliders (income
    distribution, matching, landlord P&L, welfare/deadweight-loss).
  - **Plan vs. market** — a side-by-side of a low-tax free market vs. an
    intervention (freeze + taxes + public housing + vouchers), with a build-out
    “delivers vs. underdelivers” toggle.
  - **Over time** — a multi-year dynamics simulation with feedback loops
    (landlord flight, tax-base erosion, construction, decay).
  - **Methodology** — every formula and theorem, rendered with KaTeX.

> **Please read:** this is a **teaching tool, not a forecasting model.** The
> static comparative statics rest on well-supported theory; the multi-year
> trajectories are *illustrations of mechanisms* and are sensitive to contested
> parameters. See the in-app Methodology → “Limitations” section before quoting
> any number.

## Quick start

```bash
npm install
npm run dev       # launch the interactive app (Vite)
npm test          # run the property-based test suite (45 tests)
npm run demo      # CLI: free-market vs ceiling vs freeze comparison table
npm run build     # production build to dist/
npm run typecheck
```

## The model

Rather than draw textbook supply/demand curves, the engine simulates thousands of
individual **households** and **housing units** and clears a market between them.
This is what lets us answer "who gets priced out?" and "which landlords lose
money?" rather than just "what's the equilibrium price?".

### Agents

- **Households** (`population.ts`) — income drawn from a **log-normal**
  distribution (real income is right-skewed; a symmetric bell curve would
  understate inequality). Each household will spend up to a share of income on
  rent (the ~30% affordability rule, with spread) — a hard budget ceiling.
- **Units** (`stock.ts`) — a quality score in [0,1], right-skewed so most stock
  is modest with a thin luxury tail. Each has a landlord **carrying cost**
  (mortgage + maintenance + taxes) that rises with quality. Landlords won't rent
  below cost.

Defaults (`scenario.ts`) target NYC: ~$76k median household income, high
inequality, and ~12% fewer units than households (a structural shortage).

### Clearing (`clearing.ts`)

A free market clears via **positive assortative matching with competitive
pricing**: highest-budget households take highest-quality units, and each unit's
rent is bid up to the runner-up household's budget, floored at the landlord's
cost. Households who can't afford any unit at its clearing price are **priced
out**.

### Policies (`policies.ts`)

- **Free market** — the baseline.
- **Rent ceiling** — caps rent. Landlords whose cost exceeds the cap **withdraw**
  (supply contracts); the suppressed price creates excess demand, so the scarce
  remaining units are allocated by `rationing` (lottery or income-priority). A
  lucky minority win cheap units; the priced-out count rises.
- **Rent freeze** — pins rents at today's level, then demand grows (incomes
  rise). Rents can't follow, so a shortage emerges and surplus shifts from
  landlords to incumbent tenants.

### Metrics (`metrics.ts`)

Turns a cleared market into the aggregates a UI will chart: priced-out rate, rent
burden (>30% / >50% of income), landlord profit/loss, and an **income-quintile
breakdown** (who's housed, what quality they captured, what they pay) — the basis
for the planned colour-coded views.

## Illustrative output

From `npm run demo` (numbers are scaled-down but ratios are what matter):

| Policy | Priced out | Median rent | Units withdrawn | Landlord profit |
|---|---|---|---|---|
| Free market | 24% | $2,501 | 0 | baseline |
| Rent ceiling (−30%) | 75% | $1,375 | 3,132 | collapses |
| Rent freeze (+20% demand) | 18% | frozen | 0 | compressed |

## Extending to other markets

The engine names its agents generically (`Household`, `Unit`, `Match`). To model
groceries or fuel, supply a new scenario config and swap the generators —
the clearing and policy machinery is unchanged. Housing is simply the first
scenario.

## Layout

```
src/engine/
  rng.ts          seedable RNG + log-normal/normal samplers (reproducible runs)
  types.ts        core domain types
  scenario.ts     tunable config + NYC defaults
  population.ts   household generator
  stock.ts        housing-unit generator
  clearing.ts     free-market matching + pricing
  policies.ts     free market, rent ceiling, rent freeze
  metrics.ts      aggregates for visualization
  run.ts          config -> world -> clearing -> metrics
  demo.ts         CLI comparison table
  *.test.ts       property-based tests (economic invariants)
```
