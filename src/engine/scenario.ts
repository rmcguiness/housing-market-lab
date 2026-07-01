/**
 * Scenario configuration: the tunable inputs that the UI sliders will eventually
 * drive. Defaults are rough NYC estimates, documented inline so they are easy to
 * challenge and adjust.
 */

export interface PopulationConfig {
  /** Number of synthetic households to generate. */
  count: number;
  /**
   * Target median annual household income (USD). NYC ~ $76k (ACS, all five
   * boroughs). Median = exp(mu) for the log-normal, so this maps directly.
   */
  medianIncome: number;
  /**
   * Sigma of the underlying normal. Controls inequality / tail fatness.
   * ~0.85 yields a right-skewed spread with a Gini in the ~0.45–0.50 range,
   * consistent with NYC's high inequality.
   */
  incomeSigma: number;
  /** Mean of the housing budget share (fraction of income). ~0.30 rule. */
  budgetShareMean: number;
  /** Spread of budget share across households. */
  budgetShareSigma: number;
}

export interface StockConfig {
  /**
   * Number of housing units. Deliberately < household count to reflect NYC's
   * chronic supply shortage; the deficit is what produces priced-out households.
   */
  count: number;
  /**
   * Monthly carrying cost (mortgage + maintenance + taxes) for the lowest- and
   * highest-quality units. Costs scale with quality between these bounds.
   */
  minCost: number;
  maxCost: number;
}

export interface MarketConfig {
  /**
   * Landlord market power θ ∈ [0,1]: the share of each match's surplus
   * (valuation − cost) captured by the landlord as rent. θ→1 = a tight,
   * landlord's market (rents near tenants' full willingness to pay); θ→0 = a
   * slack, tenant's market (rents near cost). Tightness rises with the
   * housing shortage, so ~0.6 is a reasonable default for supply-short NYC.
   *
   * θ moves only the price (a transfer between tenant and landlord); it does
   * NOT change who is matched to what, so total surplus and deadweight loss are
   * independent of it. This cleanly separates DISTRIBUTION from EFFICIENCY.
   */
  landlordPower: number;
  /**
   * Annual property-tax rate as a fraction of a unit's assessed value. The
   * monthly tax is added to the landlord's carrying cost (see fiscal.ts), so a
   * higher rate pushes marginal landlords out of the market. NYC's effective
   * rate is roughly 0.9% of market value; ~0.012 here is a reasonable default.
   */
  propertyTaxRate: number;
}

export interface ScenarioConfig {
  seed: number;
  population: PopulationConfig;
  stock: StockConfig;
  market: MarketConfig;
}

/**
 * NYC-flavoured defaults. Counts are scaled down (thousands, not millions) so a
 * run is instant; ratios are what matter for the economics.
 */
export const NYC_DEFAULTS: ScenarioConfig = {
  seed: 1,
  population: {
    count: 5000,
    medianIncome: 76_000,
    incomeSigma: 0.85,
    budgetShareMean: 0.3,
    budgetShareSigma: 0.06,
  },
  stock: {
    // ~12% fewer units than households: a structural shortage.
    count: 4400,
    minCost: 600,
    maxCost: 4200,
  },
  market: {
    landlordPower: 0.6,
    propertyTaxRate: 0.012,
  },
};
