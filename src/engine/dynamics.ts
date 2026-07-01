import { Rng } from "./rng.js";
import { generatePopulation } from "./population.js";
import { generateStock } from "./stock.js";
import { freeMarketClear } from "./clearing.js";
import { effectiveUnit, propertyTaxMonthly, incomeTaxMonthly } from "./fiscal.js";
import { gini } from "./analytics.js";
import type { Household, Unit } from "./types.js";
import type { ScenarioConfig } from "./scenario.js";

/**
 * Multi-year dynamics: the housing market re-clears every year, and this year's
 * outcomes change next year's conditions through a set of behavioural feedback
 * loops. The contested mechanisms (landlord flight, construction response,
 * trickle-down, decay) are all PARAMETERS — this is a hypothesis lab, not a
 * model that asserts which theory is right.
 */
export interface DynamicsParams {
  base: ScenarioConfig;
  years: number;

  /** Apply a rent freeze: rents are capped at year-0 market levels forever. */
  rentFreeze: boolean;

  // --- fiscal -----------------------------------------------------------
  /** Flat income-tax rate funding the government. */
  incomeTaxRate: number;
  /** Share of total tax revenue earmarked for housing assistance. */
  housingBudgetShare: number;

  // --- assistance -------------------------------------------------------
  voucherCap: number;
  voucherIncomeThreshold: number;
  /** Share of the initial stock operated as public housing. */
  publicHousingShare: number;
  /**
   * Public units the government builds per year (bond-financed, not driven by
   * private margins). This is the "build-out delivers vs. underdelivers" lever:
   * it adds supply directly, but also adds to the future maintenance liability.
   */
  publicBuildRate: number;
  /** Monthly cost to keep one public unit in good repair. */
  maintenancePerUnit: number;

  // --- behavioural feedbacks (the contested hypotheses) -----------------
  /** Fraction of distressed landlords that exit the market each year, 0–1. */
  flightSensitivity: number;
  /** Margin/cost below which a landlord counts as "distressed". */
  distressMargin: number;
  /** New units built per $1k of developer margin signal, per year. */
  constructionElasticity: number;
  /** Years between a profit signal and the new units it triggers. */
  constructionLag: number;
  /** Condition lost per year by under-maintained public/abandoned stock. */
  maintenanceDecayRate: number;
  /** Broad income growth from top-quintile prosperity (trickle-down strength). */
  trickleStrength: number;
  /** Demand/population growth generated per unit of construction (jobs). */
  jobsMultiplier: number;
  /** Baseline annual income growth, independent of any feedback. */
  baseIncomeGrowth: number;
  /** Rate at which high earners emigrate as taxes rise. */
  emigrationSensitivity: number;
}

/** Per–income-quintile outcome for a single year. */
export interface YearBand {
  /** 0 = poorest quintile … 4 = richest. */
  band: number;
  households: number;
  housed: number;
  housedRate: number;
  pricedOutRate: number;
  avgIncome: number;
}

export interface YearMetrics {
  year: number;
  population: number;
  housed: number;
  housedRate: number;
  pricedOutRate: number;
  medianRent: number;
  medianIncome: number;

  /** Income-quintile breakdown — lets us see who each policy helps or hurts. */
  bands: YearBand[];

  // Housing-stock composition — "what happens to the houses".
  privateRented: number;
  privateVacant: number;
  publicUnits: number;
  publicOccupied: number;
  ownerOccupied: number;
  warehoused: number;
  abandoned: number;
  totalStanding: number;

  // Government fiscal account.
  revenue: number;
  propertyTaxRevenue: number;
  incomeTaxRevenue: number;
  /** Portion of revenue earmarked for housing (revenue × housingBudgetShare). */
  housingBudget: number;
  spending: number;
  assistanceNeeded: number;
  assistanceFunded: number;
  /** Share of would-be voucher recipients actually funded, in [0,1]. */
  voucherCoverage: number;
  balance: number;
  reserve: number;

  // Quality & supply dynamics.
  avgEffectiveQuality: number;
  publicCondition: number;
  landlordCount: number;
  unitsBuilt: number;
  topIncomeShare: number;
  gini: number;
}

interface WorldState {
  year: number;
  households: Household[];
  privateUnits: Unit[];
  publicUnits: number;
  publicCondition: number;
  ownerOccupied: number;
  warehoused: number;
  abandoned: number;
  reserve: number;
  /** Standing stock at year 0 — anchors the land/zoning constraint on growth. */
  initialUnits: number;
  nextUnitId: number;
  nextHouseholdId: number;
  /** Construction pipeline: units[i] complete in `i` more years (lag). */
  pipeline: number[];
  /** Year-0 median rent, used as the freeze cap. */
  freezeCap: number;
}

export interface DynamicsResult {
  years: YearMetrics[];
}

export function runDynamics(params: DynamicsParams): DynamicsResult {
  const rng = new Rng(params.base.seed ^ 0x5f3759df);
  const state = initWorld(params, rng);
  const years: YearMetrics[] = [];
  for (let t = 0; t < params.years; t++) {
    years.push(stepYear(state, params, rng));
  }
  return { years };
}

function initWorld(params: DynamicsParams, rng: Rng): WorldState {
  const households = generatePopulation(params.base.population, rng);
  const allUnits = generateStock(params.base.stock, rng);

  // Carve out the public-housing share from the cheapest units up front.
  const byCost = [...allUnits].sort((a, b) => a.cost - b.cost);
  const nPublic = Math.floor(params.publicHousingShare * allUnits.length);
  const privateUnits = byCost.slice(nPublic);

  // Year-0 market rent sets the freeze cap.
  const effective = privateUnits.map((u) => effectiveUnit(u, params.base.market.propertyTaxRate));
  const r0 = freeMarketClear(households, effective, params.base.market.landlordPower);
  const rents0 = r0.unitOutcomes.filter((o) => o.occupied).map((o) => o.rent).sort((a, b) => a - b);

  return {
    year: 0,
    households,
    privateUnits,
    publicUnits: nPublic,
    publicCondition: 1,
    ownerOccupied: 0,
    warehoused: 0,
    abandoned: 0,
    reserve: 0,
    initialUnits: allUnits.length,
    nextUnitId: allUnits.length,
    nextHouseholdId: households.length,
    pipeline: [],
    freezeCap: median(rents0),
  };
}

function stepYear(s: WorldState, p: DynamicsParams, rng: Rng): YearMetrics {
  const taxRate = p.base.market.propertyTaxRate;
  const landlordPower = p.base.market.landlordPower;

  // 1. Public housing administratively houses the lowest-income households.
  const byIncome = [...s.households].sort((a, b) => a.income - b.income);
  const publicOccupied = Math.min(s.publicUnits, byIncome.length);
  const publiclyHoused = new Set(byIncome.slice(0, publicOccupied).map((h) => h.id));

  // 2. Government revenue — independent of how the private market clears.
  const propertyTaxRevenue =
    sumPropertyTax(s.privateUnits, taxRate) +
    // Owner-occupied & warehoused units still pay property tax; abandoned/public do not.
    estimateOtherTax(s, taxRate);
  const incomeTaxRevenue = incomeTaxMonthly(s.households.map((h) => h.income), p.incomeTaxRate);
  const revenue = propertyTaxRevenue + incomeTaxRevenue;

  // 3. Housing budget = a share of revenue, plus any accumulated reserve.
  //    Maintenance of the existing public stock is funded first; whatever is
  //    left funds vouchers. So when revenue falls, voucher coverage is squeezed
  //    first (fewer low-income households helped) and, if even maintenance can't
  //    be met, public housing decays. This is the core fiscal feedback loop.
  const housingBudget = revenue * p.housingBudgetShare;
  const available = housingBudget + Math.max(0, s.reserve);
  const maintenanceNeed = p.maintenancePerUnit * s.publicUnits;
  const maintenanceFunded = Math.min(maintenanceNeed, available);
  const voucherBudget = Math.max(0, available - maintenanceFunded);
  const fundedFraction = maintenanceNeed > 0 ? maintenanceFunded / maintenanceNeed : 1;

  // 4. Vouchers go to the lowest-income eligible households, up to budget.
  const remaining = s.households.filter((h) => !publiclyHoused.has(h.id));
  const eligible = remaining
    .filter((h) => h.income < p.voucherIncomeThreshold)
    .sort((a, b) => a.income - b.income);
  const nVouchers = Math.min(eligible.length, Math.floor(voucherBudget / Math.max(1, p.voucherCap)));
  const recipients = new Set(eligible.slice(0, nVouchers).map((h) => h.id));
  const boosted = remaining.map((h) =>
    recipients.has(h.id) ? { ...h, maxRent: h.maxRent + p.voucherCap } : h
  );

  // 5. Clear the private market on tax-and-condition-adjusted units.
  const effective = s.privateUnits.map((u) => effectiveUnit(u, taxRate));
  const result = freeMarketClear(boosted, effective, landlordPower);

  // Apply the rent freeze: cap each occupied rent at the year-0 level.
  const profitByUnit = new Map<number, number>();
  let privateRented = 0;
  for (const o of result.unitOutcomes) {
    if (!o.occupied) continue;
    const rent = p.rentFreeze ? Math.min(o.rent, s.freezeCap) : o.rent;
    profitByUnit.set(o.unitId, rent - o.cost);
    if (rent > 0) privateRented++;
  }

  // 6. Settle the housing fund.
  const voucherSpent = voucherDraw(result, recipients, p);
  const assistanceFunded = maintenanceFunded + voucherSpent;
  const assistanceNeeded = maintenanceNeed + eligible.length * p.voucherCap;
  const voucherCoverage = eligible.length > 0 ? nVouchers / eligible.length : 1;
  // Annual flow into the reserve = housing revenue minus what was spent.
  const balance = housingBudget - assistanceFunded;

  // ---- metrics for this year (computed before mutating state) ----
  const housed = publicOccupied + privateRented;
  const population = s.households.length;
  // Households housed this year = public tenants + private-market matches.
  const housedIds = new Set<number>(publiclyHoused);
  for (const m of result.matches) if (m.unitId !== null) housedIds.add(m.householdId);
  const rents = result.unitOutcomes
    .filter((o) => o.occupied)
    .map((o) => (p.rentFreeze ? Math.min(o.rent, s.freezeCap) : o.rent))
    .sort((a, b) => a - b);
  const incomes = s.households.map((h) => h.income).sort((a, b) => a - b);
  const metrics: YearMetrics = {
    year: s.year,
    population,
    housed,
    housedRate: housed / population,
    pricedOutRate: 1 - housed / population,
    medianRent: median(rents),
    medianIncome: median(incomes),
    bands: yearBands(s.households, housedIds),
    privateRented,
    privateVacant: s.privateUnits.length - privateRented,
    publicUnits: s.publicUnits,
    publicOccupied,
    ownerOccupied: s.ownerOccupied,
    warehoused: s.warehoused,
    abandoned: s.abandoned,
    totalStanding:
      s.privateUnits.length + s.publicUnits + s.ownerOccupied + s.warehoused + s.abandoned,
    revenue,
    propertyTaxRevenue,
    incomeTaxRevenue,
    housingBudget,
    spending: assistanceFunded,
    assistanceNeeded,
    assistanceFunded,
    voucherCoverage,
    balance,
    reserve: Math.max(0, s.reserve) + balance,
    avgEffectiveQuality: mean(s.privateUnits.map((u) => u.quality * u.condition)),
    publicCondition: s.publicCondition,
    landlordCount: s.privateUnits.length,
    unitsBuilt: 0, // filled in below
    topIncomeShare: topShare(incomes, 0.2),
    gini: gini(incomes),
  };

  // ===== evolve to next year =====
  s.reserve = Math.max(0, s.reserve) + balance;
  s.year += 1;

  // 5. Landlord flight: distressed owners exit; their units take a fate.
  const flight = applyFlight(s, profitByUnit, p, rng);
  metrics.unitsBuilt = 0;

  // 6. Construction: building responds to how profitable it is (margin relative
  //    to cost), scaled to the size of the market, with a lag — but damped by a
  //    land/zoning constraint so supply can't grow without bound. As the standing
  //    stock approaches a ceiling (here ~2.5× the initial stock), construction
  //    tapers to zero. This is the negative feedback real cities have (scarce
  //    land, zoning) and without it the jobs→demand→building loop runs away.
  const standing =
    s.privateUnits.length + s.publicUnits + s.ownerOccupied + s.warehoused + s.abandoned;
  const landFactor = Math.max(0, 1 - standing / (s.initialUnits * 2.5));
  const marginRatio = developerMarginRatio(profitByUnit, s.privateUnits);
  const triggered = Math.max(
    0,
    Math.round(p.constructionElasticity * marginRatio * s.privateUnits.length * 0.4 * landFactor)
  );
  pushPipeline(s, triggered, p.constructionLag);
  const completed = popPipeline(s);
  buildUnits(s, completed, p, rng);
  metrics.unitsBuilt = completed;

  // 6b. Public build-out: government adds public units directly (bond-financed,
  //     not margin-driven), bounded by the same land constraint. New units come
  //     in at full condition but enlarge the future maintenance liability.
  const publicBuilt = Math.round(p.publicBuildRate * landFactor);
  if (publicBuilt > 0) {
    s.publicCondition =
      (s.publicUnits * s.publicCondition + publicBuilt) / (s.publicUnits + publicBuilt);
    s.publicUnits += publicBuilt;
  }

  // 7. Maintenance & decay.
  if (fundedFraction < 1) {
    s.publicCondition = Math.max(0.2, s.publicCondition - p.maintenanceDecayRate * (1 - fundedFraction));
  } else {
    s.publicCondition = Math.min(1, s.publicCondition + 0.02); // slow recovery when funded
  }
  decayAbandoned(s, p);

  // 8. Income growth (baseline + trickle-down + jobs) and emigration.
  growIncomes(s, p, completed);
  applyJobsGrowth(s, p, completed, rng);
  applyEmigration(s, p, taxRate, rng);

  // gov acquisition feedback already folded into flight fates
  void flight;
  return metrics;
}

// ---------------------------------------------------------------------------
// behavioural helpers
// ---------------------------------------------------------------------------

/** Distressed private landlords exit; their units convert, warehouse, abandon, or are acquired. */
function applyFlight(
  s: WorldState,
  profitByUnit: Map<number, number>,
  p: DynamicsParams,
  rng: Rng
): number {
  const distressed = s.privateUnits.filter((u) => {
    const profit = profitByUnit.get(u.id);
    // Vacant (no profit recorded) or thin-margin units are distressed.
    return profit === undefined || profit < p.distressMargin * u.cost;
  });
  const nFlee = Math.floor(p.flightSensitivity * distressed.length);
  if (nFlee === 0) return 0;

  // The most distressed (lowest profit) leave first.
  distressed.sort(
    (a, b) => (profitByUnit.get(a.id) ?? -Infinity) - (profitByUnit.get(b.id) ?? -Infinity)
  );
  const fleeing = new Set(distressed.slice(0, nFlee).map((u) => u.id));
  s.privateUnits = s.privateUnits.filter((u) => !fleeing.has(u.id));

  // Disposition of fled units. Government acquires only if it has reserves.
  const govCanBuy = s.reserve > 0;
  for (let i = 0; i < nFlee; i++) {
    const r = rng.next();
    if (govCanBuy && r < 0.15) {
      s.publicUnits += 1; // becomes public housing — future maintenance burden
    } else if (r < 0.5) {
      s.ownerOccupied += 1; // sold to an owner-occupier, leaves rental stock
    } else if (r < 0.78) {
      s.warehoused += 1; // held vacant (speculation)
    } else {
      s.abandoned += 1; // left to decay
    }
  }
  return nFlee;
}

/** Profitability signal for developers: median margin as a fraction of cost. */
function developerMarginRatio(profitByUnit: Map<number, number>, units: Unit[]): number {
  const profits = [...profitByUnit.values()].filter((x) => x > 0).sort((a, b) => a - b);
  if (profits.length === 0 || units.length === 0) return 0;
  const medCost = median(units.map((u) => u.cost).sort((a, b) => a - b)) || 1;
  return median(profits) / medCost;
}

function pushPipeline(s: WorldState, n: number, lag: number) {
  const idx = Math.max(0, Math.floor(lag));
  while (s.pipeline.length <= idx) s.pipeline.push(0);
  s.pipeline[idx]! += n;
}

function popPipeline(s: WorldState): number {
  const done = s.pipeline.shift() ?? 0;
  return done;
}

function buildUnits(s: WorldState, n: number, p: DynamicsParams, rng: Rng) {
  const { minCost, maxCost } = p.base.stock;
  for (let i = 0; i < n; i++) {
    const quality = Math.min(rng.next(), rng.next());
    const cost = (minCost + quality * (maxCost - minCost)) * rng.uniform(0.92, 1.08);
    s.privateUnits.push({ id: s.nextUnitId++, quality, cost, ownership: "private", condition: 1 });
  }
}

function decayAbandoned(s: WorldState, p: DynamicsParams) {
  // Abandoned buildings deteriorate; once worthless they are demolished (leave the stock).
  if (s.abandoned > 0) {
    const lost = Math.floor(s.abandoned * p.maintenanceDecayRate * 0.5);
    s.abandoned = Math.max(0, s.abandoned - lost);
  }
}

function growIncomes(s: WorldState, p: DynamicsParams, built: number) {
  // Baseline growth + construction-jobs growth apply uniformly to everyone.
  const jobs = p.jobsMultiplier * (built / Math.max(1, s.privateUnits.length));
  const uniform = p.baseIncomeGrowth + jobs;

  // Trickle-down: extra growth whose INCIDENCE is top-weighted — the gains accrue
  // disproportionately to high earners and only partly reach the bottom (the
  // empirical critique of trickle-down). The weight runs ~0.3× at the bottom to
  // ~1.7× at the top and averages ≈1, so `trickleStrength` scales aggregate
  // growth while widening the gap between income groups. It is a FIXED rate (not
  // tied to the current income share) to avoid an unstable inequality→more-
  // trickle→more-inequality feedback. Strength 0 switches the channel off.
  const trickleBase = p.trickleStrength * 0.03;

  const sortedIncomes = s.households.map((h) => h.income).sort((a, b) => a - b);
  const n = sortedIncomes.length;
  const percentile = (income: number): number => {
    let lo = 0;
    let hi = n;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (sortedIncomes[mid]! <= income) lo = mid + 1;
      else hi = mid;
    }
    return n ? lo / n : 0;
  };

  for (const h of s.households) {
    const incidence = 0.3 + 1.4 * percentile(h.income);
    const growth = uniform + trickleBase * incidence;
    h.income *= 1 + growth;
    h.maxRent = (h.income / 12) * h.budgetShare;
  }
}

function applyJobsGrowth(s: WorldState, p: DynamicsParams, built: number, rng: Rng) {
  // Construction brings jobs, drawing in new households (demand growth).
  const newcomers = Math.round(p.jobsMultiplier * built * 3);
  if (newcomers <= 0) return;
  const sample = [...s.households];
  for (let i = 0; i < newcomers; i++) {
    const proto = sample[Math.floor(rng.next() * sample.length)]!;
    // Monotonic id source: reused ids would silently collapse households in the
    // clearing maps when the population shrinks then grows.
    s.households.push({ ...proto, id: s.nextHouseholdId++ });
  }
}

function applyEmigration(s: WorldState, p: DynamicsParams, taxRate: number, rng: Rng) {
  // High earners are the most mobile: a rising tax burden pushes some to leave,
  // eroding the income-tax base (the "the wealthy will just leave" hypothesis).
  const burden = taxRate + p.incomeTaxRate;
  const leaveFrac = p.emigrationSensitivity * burden;
  if (leaveFrac <= 0) return;
  const sorted = [...s.households].sort((a, b) => b.income - a.income);
  const nTop = Math.floor(sorted.length * 0.2);
  const nLeave = Math.floor(nTop * leaveFrac);
  if (nLeave <= 0) return;
  const leaving = new Set<number>();
  for (let i = 0; i < nLeave; i++) {
    // Bias toward the very top, with some randomness.
    const idx = Math.floor(rng.next() * rng.next() * nTop);
    leaving.add(sorted[idx]!.id);
  }
  s.households = s.households.filter((h) => !leaving.has(h.id));
}

// ---------------------------------------------------------------------------
// fiscal helpers
// ---------------------------------------------------------------------------

function sumPropertyTax(units: Unit[], rate: number): number {
  let total = 0;
  for (const u of units) total += propertyTaxMonthly(u, rate);
  return total;
}

/** Property tax from owner-occupied and warehoused stock (homogeneous approximation). */
function estimateOtherTax(s: WorldState, rate: number): number {
  // Approximate their assessed value at the median private unit's.
  if (s.privateUnits.length === 0) return 0;
  const qualities = s.privateUnits.map((u) => u.quality * u.condition).sort((a, b) => a - b);
  const medQ = qualities[Math.floor(qualities.length / 2)] ?? 0.3;
  const proxy: Unit = { id: -1, quality: medQ, cost: 0, ownership: "private", condition: 1 };
  const per = propertyTaxMonthly(proxy, rate);
  return per * (s.ownerOccupied + s.warehoused);
}

/** What voucher recipients who actually got housed draw from the fund. */
function voucherDraw(
  result: { matches: { householdId: number; unitId: number | null; rent: number }[] },
  recipients: Set<number>,
  p: DynamicsParams
): number {
  let total = 0;
  for (const m of result.matches) {
    if (m.unitId !== null && recipients.has(m.householdId)) {
      total += Math.min(p.voucherCap, m.rent);
    }
  }
  return total;
}

// ---------------------------------------------------------------------------
// small stats
// ---------------------------------------------------------------------------

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0;
}

function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** Split households into income quintiles and measure who's housed in each. */
function yearBands(households: Household[], housedIds: Set<number>): YearBand[] {
  const incomes = households.map((h) => h.income).sort((a, b) => a - b);
  const cut = (q: number) => incomes[Math.min(incomes.length - 1, Math.floor(q * incomes.length))] ?? 0;
  const cuts = [cut(0.2), cut(0.4), cut(0.6), cut(0.8)];
  const bandOf = (income: number) => {
    let b = 0;
    while (b < cuts.length && income > cuts[b]!) b++;
    return b;
  };
  const acc = Array.from({ length: 5 }, (_, band) => ({ band, households: 0, housed: 0, incomeSum: 0 }));
  for (const h of households) {
    const a = acc[bandOf(h.income)]!;
    a.households++;
    a.incomeSum += h.income;
    if (housedIds.has(h.id)) a.housed++;
  }
  return acc.map((a) => ({
    band: a.band,
    households: a.households,
    housed: a.housed,
    housedRate: a.households ? a.housed / a.households : 0,
    pricedOutRate: a.households ? 1 - a.housed / a.households : 0,
    avgIncome: a.households ? a.incomeSum / a.households : 0,
  }));
}

/** Share of total income held by the top `frac` of earners. */
function topShare(sortedAsc: number[], frac: number): number {
  const n = sortedAsc.length;
  if (n === 0) return 0;
  const cut = Math.floor((1 - frac) * n);
  let top = 0;
  let all = 0;
  for (let i = 0; i < n; i++) {
    all += sortedAsc[i]!;
    if (i >= cut) top += sortedAsc[i]!;
  }
  return all > 0 ? top / all : 0;
}
