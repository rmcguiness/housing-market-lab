import { InlineMath, BlockMath } from "react-katex";

function Eq({ children }: { children: string }) {
  return (
    <div className="katex-block">
      <BlockMath math={children} />
    </div>
  );
}

export function Documentation() {
  return (
    <div className="docs">
      <h1>Methodology &amp; Theory</h1>
      <p className="lede">
        This simulator is an agent-based competitive model of a housing market.
        Below is the full specification — every distribution, theorem, and welfare
        measure the dashboard relies on, written so a curious non-economist can
        follow the logic and an economist can check the math.
      </p>

      <nav className="toc">
        {[
          ["households", "1. Households & the income distribution"],
          ["valuation", "2. Housing valuation & supermodularity"],
          ["assignment", "3. The assignment model & assortative matching"],
          ["prices", "4. Prices: market power θ"],
          ["welfare", "5. Welfare: consumer & producer surplus"],
          ["dwl", "6. Deadweight loss"],
          ["ceiling", "7. Rent ceiling"],
          ["freeze", "8. Rent freeze"],
          ["tax", "9. Property tax & capitalisation"],
          ["assistance", "10. Government assistance & incidence"],
          ["fiscal", "11. The fiscal feedback loop"],
          ["construction", "12. Construction & supply elasticity"],
          ["decay", "13. Depreciation & maintenance"],
          ["trickle", "14. Trickle-down as a testable parameter"],
          ["gini", "15. Inequality: the Gini coefficient"],
          ["supplydemand", "16. Supply & demand reconstruction"],
          ["limits", "17. Limitations & extensions"],
          ["refs", "References"],
        ].map(([id, label]) => (
          <a key={id} href={"#" + id}>
            {label}
          </a>
        ))}
      </nav>

      <section id="households">
        <h2>1. Households &amp; the income distribution</h2>
        <p>
          We draw <InlineMath math="N" /> households. Income is{" "}
          <strong>log-normal</strong>, the standard model for earnings: it is
          positive, right-skewed, and has a fat upper tail — unlike a symmetric
          bell curve, which would understate inequality.
        </p>
        <Eq>{String.raw`y_i \sim \mathrm{LogNormal}(\mu, \sigma), \qquad \text{median}(y) = e^{\mu}`}</Eq>
        <p>
          So <InlineMath math="\mu = \ln(\text{median income})" /> sets the centre
          and <InlineMath math="\sigma" /> (the inequality slider) sets the spread.
          Each household commits a share <InlineMath math="\beta_i" /> of income to
          housing, giving its <strong>housing budget</strong> — the most it would
          pay for an ideal home:
        </p>
        <Eq>{String.raw`W_i = \frac{y_i}{12}\,\beta_i, \qquad \beta_i \sim \mathcal{N}(\bar\beta, s_\beta)\ \text{clamped to } [0.1, 0.7]`}</Eq>
      </section>

      <section id="valuation">
        <h2>2. Housing valuation &amp; supermodularity</h2>
        <p>
          A unit has a quality score <InlineMath math="q \in [0,1]" />. Household{" "}
          <InlineMath math="i" />’s gross monthly value for occupying it is shelter
          (a necessity, valued even at <InlineMath math="q=0" />) plus a quality
          premium:
        </p>
        <Eq>{String.raw`v_i(q) = W_i\,\bigl(\,\underbrace{b}_{\text{shelter}} + \underbrace{(1-b)\,q}_{\text{quality}}\,\bigr), \qquad b = 0.6`}</Eq>
        <p>
          The decisive property is the cross-partial derivative:
        </p>
        <Eq>{String.raw`\frac{\partial^2 v_i(q)}{\partial W_i \, \partial q} = (1-b) > 0`}</Eq>
        <p>
          Value is <strong>supermodular</strong> in (budget, quality): richer
          households gain more from quality. This single inequality is what makes
          the efficient allocation sort cleanly — see the next section.
        </p>
      </section>

      <section id="assignment">
        <h2>3. The assignment model &amp; assortative matching</h2>
        <p>
          The market is a two-sided <em>assignment problem</em> (Shapley &amp;
          Shubik, 1971; Becker, 1973). A social planner maximising the gains from
          trade chooses a matching <InlineMath math="\pi" /> to solve
        </p>
        <Eq>{String.raw`\max_{\pi}\ \sum_{i}\bigl[v_i\!\left(q_{\pi(i)}\right) - c_{\pi(i)}\bigr]`}</Eq>
        <p>
          where <InlineMath math="c_j" /> is unit <InlineMath math="j" />’s landlord
          carrying cost. Because <InlineMath math="v" /> is supermodular, the{" "}
          <strong>rearrangement inequality</strong> guarantees the optimum is{" "}
          <strong>positive assortative</strong>: rank households by budget and
          units by quality and match them in order.
        </p>
        <Eq>{String.raw`W_{(1)} \ge W_{(2)} \ge \dots \quad\longleftrightarrow\quad q_{(1)} \ge q_{(2)} \ge \dots`}</Eq>
        <p className="note">
          The engine implements this greedily, skipping any unit whose cost exceeds
          even the richest remaining household’s value (occupying it would create
          negative surplus, so it is left vacant). A competitive equilibrium of
          this market exists and is efficient — the First Welfare Theorem holds.
        </p>
      </section>

      <section id="prices">
        <h2>4. Prices: market power θ</h2>
        <p>
          Matching decides <em>who lives where</em>; price decides{" "}
          <em>how the surplus is split</em>. Each matched pair shares a surplus{" "}
          <InlineMath math="s = v_i(q) - c_j" />. Rent divides it by the landlord’s
          market power <InlineMath math="\theta \in [0,1]" /> (a Nash-bargaining
          weight that rises with market tightness):
        </p>
        <Eq>{String.raw`r = c_j + \theta\,\bigl(v_i(q) - c_j\bigr)`}</Eq>
        <p>
          With <InlineMath math="\theta \to 1" /> (tight market) rents approach
          tenants’ full willingness to pay; with{" "}
          <InlineMath math="\theta \to 0" /> (slack market) they approach cost. The
          key point — and a slider you can verify on the dashboard:{" "}
          <strong>
            θ changes only the transfer, never the matching
          </strong>
          . Total surplus and deadweight loss are independent of θ; it moves
          distribution, not efficiency.
        </p>
      </section>

      <section id="welfare">
        <h2>5. Welfare: consumer &amp; producer surplus</h2>
        <p>For every occupied unit, the gains from trade split into two parts:</p>
        <Eq>{String.raw`\underbrace{CS = \sum_i \bigl(v_i(q) - r_i\bigr)}_{\text{tenants}}, \qquad \underbrace{PS = \sum_j \bigl(r_j - c_j\bigr)}_{\text{landlords}}`}</Eq>
        <Eq>{String.raw`TS = CS + PS = \sum_{\text{matched}} \bigl(v_i(q) - c_j\bigr)`}</Eq>
        <p>
          Notice the rent <InlineMath math="r" /> cancels in total surplus: it is a
          pure transfer between the two sides. <InlineMath math="TS" /> measures{" "}
          <em>efficiency</em>; the <InlineMath math="CS/PS" /> split measures{" "}
          <em>distribution</em>.
        </p>
      </section>

      <section id="dwl">
        <h2>6. Deadweight loss</h2>
        <p>
          Since the free-market equilibrium maximises total surplus, any policy
          that lowers it has destroyed value that no one captures — the{" "}
          <strong>deadweight loss</strong>:
        </p>
        <Eq>{String.raw`DWL = TS_{\text{free market}} - TS_{\text{policy}} \ \ge\ 0`}</Eq>
        <p className="note">
          For a freeze the benchmark is the free market facing the <em>same</em>{" "}
          demand shock, so the comparison is apples-to-apples.
        </p>
      </section>

      <section id="ceiling">
        <h2>7. Rent ceiling</h2>
        <p>
          A ceiling <InlineMath math="\bar r" /> caps rent. Two classic effects
          follow mechanically from the model:
        </p>
        <ul>
          <li>
            <strong>Supply contraction.</strong> Any landlord with{" "}
            <InlineMath math="c_j > \bar r" /> cannot cover cost and{" "}
            <strong>withdraws</strong> the unit. Supply falls.
          </li>
          <li>
            <strong>Excess demand &amp; rationing.</strong> At the suppressed price{" "}
            <InlineMath math="Q_d(\bar r) > Q_s(\bar r)" />. Price can no longer
            ration, so units are allocated by <em>lottery</em> or{" "}
            <em>income-priority</em>. Random allocation breaks the assortative
            match, so quality flows to households that value it less — pure
            allocative deadweight loss, on top of the lost withdrawn units.
          </li>
        </ul>
        <p>
          Result: a lucky minority enjoy below-market rent (a transfer to them),
          but more households are priced out and total surplus falls.
        </p>
      </section>

      <section id="freeze">
        <h2>8. Rent freeze</h2>
        <p>
          A freeze pins each unit’s rent at its current market level, then demand
          grows: incomes rise by <InlineMath math="g" />, so{" "}
          <InlineMath math="W_i \to (1+g)W_i" />. Rents cannot follow, so the gap
          between what tenants would pay and what they do pay widens — a transfer
          to incumbents — while newcomers face a shortage. No landlord withdraws
          (frozen rent still covers cost), distinguishing it from a hard ceiling.
        </p>
      </section>

      <section id="tax">
        <h2>9. Property tax &amp; capitalisation</h2>
        <p>
          Property tax is <em>value-based</em>: a unit of quality{" "}
          <InlineMath math="q" /> has an assessed value{" "}
          <InlineMath math="A(q)" /> (a capitalisation of its desirability), and the
          monthly tax is added to the landlord’s carrying cost:
        </p>
        <Eq>{String.raw`c_j' = c_j + \frac{\tau \, A(q_j)}{12}`}</Eq>
        <p>
          Raising <InlineMath math="\tau" /> lifts <InlineMath math="c_j'" />, so
          units whose tenants’ valuations no longer cover cost fall out of the
          market. The tax is partly <strong>capitalised</strong> — split between
          lower landlord profit and higher rents according to market power{" "}
          <InlineMath math="\theta" /> — and partly borne as reduced supply.
        </p>
      </section>

      <section id="assistance">
        <h2>10. Government assistance &amp; incidence</h2>
        <h3>Demand side — vouchers</h3>
        <p>
          An eligible household (income below a threshold) has its budget topped up
          by a voucher <InlineMath math="\nu" />, so{" "}
          <InlineMath math="W_i \to W_i + \nu" />. This raises its valuation and lets
          it compete for units. But because demand rises against fixed supply, part
          of the voucher is <strong>capitalised into higher rents</strong> — the
          classic incidence question (how much of the subsidy lands with tenants vs.
          landlords), which you can read off the consumer/producer surplus split.
        </p>
        <h3>Supply side — public housing</h3>
        <p>
          A share of the stock is operated by the government, rented below cost to
          the lowest-income households and allocated administratively rather than by
          price. It guarantees low-income supply at a continuing subsidy{" "}
          <InlineMath math="\sum_j (c_j - r_j)" />, funded from the budget below.
        </p>
      </section>

      <section id="fiscal">
        <h2>11. The fiscal feedback loop</h2>
        <p>
          This is the engine behind “tax the landlords and they’ll leave.”
          Government revenue is property tax plus income tax:
        </p>
        <Eq>{String.raw`R = \sum_{j \in \text{taxable}} \frac{\tau A(q_j)}{12} \;+\; t \sum_i \frac{y_i}{12}`}</Eq>
        <p>
          A fixed share funds housing. Maintenance of existing public stock is paid
          first; whatever remains funds vouchers. So the loop is:{" "}
          <strong>
            high taxes → distressed landlords exit and high earners emigrate → both
            tax bases shrink → revenue falls → the housing budget falls → fewer
            vouchers can be funded and public housing decays → more priced out.
          </strong>{" "}
          The reserve buffers the gap for a while; when it is exhausted, voucher
          coverage drops below 100% — the funding shortfall you can watch open up on
          the <em>Over&nbsp;time</em> page.
        </p>
      </section>

      <section id="construction">
        <h2>12. Construction &amp; supply elasticity</h2>
        <p>
          New supply responds to how profitable building is. Each year developers
          add units in proportion to the margin ratio (profit relative to cost) and
          the size of the market, scaled by an <strong>elasticity</strong>{" "}
          <InlineMath math="\eta" /> and realised after a construction lag:
        </p>
        <Eq>{String.raw`\Delta \text{supply}_{t+\ell} \;\propto\; \eta \cdot \frac{\text{median profit}_t}{\text{median cost}_t} \cdot N^{\text{units}}_t`}</Eq>
        <p>
          This is “let landlords profit and they’ll build.” With{" "}
          <InlineMath math="\eta = 0" /> the stock only erodes; with a high{" "}
          <InlineMath math="\eta" /> construction can outpace flight and supply
          grows. The elasticity is yours to set — empirical estimates vary enormously
          by city and regulatory regime, which is exactly why it is a slider.
        </p>
      </section>

      <section id="decay">
        <h2>13. Depreciation &amp; maintenance</h2>
        <p>
          A unit’s effective quality is{" "}
          <InlineMath math="q \cdot \kappa" />, where condition{" "}
          <InlineMath math="\kappa \in [0,1]" /> starts at 1 and decays when upkeep
          is unfunded:
        </p>
        <Eq>{String.raw`\kappa_{t+1} = \kappa_t - \delta \,(1 - f_t), \qquad f_t = \frac{\text{maintenance funded}_t}{\text{maintenance needed}_t}`}</Eq>
        <p>
          This is the “the projects fall apart” channel: when revenue can’t cover
          upkeep, <InlineMath math="f_t < 1" />, condition slips, valuations fall, and
          the public stock deteriorates — a spiral that feeds back into the fiscal
          loop above.
        </p>
      </section>

      <section id="trickle">
        <h2>14. Trickle-down as a testable parameter</h2>
        <p>
          “If the wealthy do well, everyone does better” is a contested claim, so the
          model does not assume it — it exposes it as a dial. Annual income growth is
        </p>
        <Eq>{String.raw`g_t = g_0 \;+\; \underbrace{\lambda \max(0,\, s^{\text{top}}_t - 0.4)}_{\text{trickle-down}} \;+\; \underbrace{\mu \cdot \frac{\text{built}_t}{N^{\text{units}}_t}}_{\text{construction jobs}}`}</Eq>
        <p>
          where <InlineMath math="s^{\text{top}}" /> is the income share of the top
          quintile, <InlineMath math="\lambda" /> the trickle-down strength, and{" "}
          <InlineMath math="\mu" /> a jobs multiplier (construction also draws in new
          residents, raising demand). Set <InlineMath math="\lambda = 0" /> for the
          skeptic’s world and compare trajectories. The point is not to settle the
          debate but to make its assumptions explicit and their consequences
          visible.
        </p>
      </section>

      <section id="gini">
        <h2>15. Inequality: the Gini coefficient</h2>
        <p>
          We summarise income inequality with the Gini coefficient, computed from
          sorted incomes <InlineMath math="x_{(1)} \le \dots \le x_{(n)}" />:
        </p>
        <Eq>{String.raw`G = \frac{\sum_{i=1}^{n}(2i - n - 1)\,x_{(i)}}{n\sum_{i=1}^{n} x_{(i)}}`}</Eq>
        <p className="note">
          <InlineMath math="G = 0" /> is perfect equality;{" "}
          <InlineMath math="G \to 1" /> is total concentration. The NYC default
          (<InlineMath math="\sigma = 0.85" />) lands near{" "}
          <InlineMath math="G \approx 0.46" />, in line with the metro area.
        </p>
      </section>

      <section id="supplydemand">
        <h2>16. Supply &amp; demand reconstruction</h2>
        <p>
          The familiar cross is rebuilt from the very same agents, so the textbook
          picture and the micro-simulation can never disagree:
        </p>
        <Eq>{String.raw`Q_d(p) = \#\{\,i : W_i \ge p\,\}, \qquad Q_s(p) = \#\{\,j : c_j \le p\,\}`}</Eq>
        <p>
          Demand slopes down (fewer households can afford higher rents), supply
          slopes up (more landlords participate), and equilibrium is where they
          meet. A ceiling drawn below that crossing shows the shortage directly as
          the horizontal gap <InlineMath math="Q_d - Q_s" />.
        </p>
      </section>

      <section id="limits">
        <h2>17. Limitations — please read before quoting numbers</h2>
        <p>
          This is a <strong>teaching tool, not a forecasting model.</strong> The
          static comparative statics (sections 1–10) rest on textbook theory with
          strong empirical support — rent ceilings cause shortages and
          misallocation, price controls create deadweight loss, subsidies partly
          capitalise into rents. Trust those <em>directions</em>. The multi-year{" "}
          <em>trajectories</em> are illustrations of mechanisms, not predictions.
        </p>
        <ul>
          <li>
            <strong>The dynamics are assumption-driven.</strong> The 25-year paths
            hinge on contested parameters (landlord-flight and wealthy-emigration
            sensitivity, construction elasticity, trickle-down). Plausible values
            flip the conclusion: a freeze-plus-tax can shrink or grow the stock
            depending purely on how strongly you assume landlords and high earners
            leave — and empirical millionaire-migration responses to tax are
            generally <em>small</em>. Always read a trajectory against the
            no-policy baseline, and treat magnitudes as scenarios, not estimates.
          </li>
          <li>
            <strong>Rent freeze is modelled as universal.</strong> In reality a
            freeze applies to the rent-stabilised subset (~half of NYC rentals),
            creating a dual market; the model overstates its reach.
          </li>
          <li>
            <strong>Assistance is modelled as locally funded.</strong> The largest
            voucher program (Section 8) is federal, so the “tax base erodes →
            vouchers get cut” loop is weaker for real cities than the model shows.
          </li>
          <li>
            <strong>Exclusion, not over-burden.</strong> Households never pay above
            budget, so low-income distress appears as being <em>priced out</em>{" "}
            rather than rent-burdened; real households double up, commute, or stretch.
          </li>
          <li>
            <strong>Stylised pricing &amp; no homeownership.</strong> Rent is a
            bargaining split of match surplus (not a full competitive price
            vector); there is no owner-occupier tenure choice, no search frictions,
            one quality dimension, and no neighbourhoods.
          </li>
          <li>
            <strong>Generalisable.</strong> The engine names its agents generically,
            so swapping the generators lets the same machinery model other markets.
          </li>
        </ul>
      </section>

      <section id="refs">
        <h2>References</h2>
        <p className="ref">
          Becker, G. (1973). “A Theory of Marriage: Part I.” <em>JPE</em>. ·
          Shapley, L. &amp; Shubik, M. (1971). “The Assignment Game I: The Core.”{" "}
          <em>Int. J. Game Theory</em>. · Arnott, R. (1995). “Time for Revisionism
          on Rent Control?” <em>JEP</em>. · Diamond, McQuade &amp; Qian (2019).
          “The Effects of Rent Control… San Francisco.” <em>AER</em>. · Glaeser
          &amp; Luttmer (2003). “The Misallocation of Housing Under Rent Control.”{" "}
          <em>AER</em>. · Tiebout, C. (1956). “A Pure Theory of Local Expenditures.”{" "}
          <em>JPE</em>. · Saiz, A. (2010). “The Geographic Determinants of Housing
          Supply.” <em>QJE</em>. · Glaeser &amp; Gyourko (2018). “The Economic
          Implications of Housing Supply.” <em>JEP</em>. · Susin, S. (2002).
          “Rent Vouchers and the Price of Low-Income Housing.” <em>J. Public Econ.</em>{" "}
          (voucher incidence) · Mian &amp; Sufi (2014), <em>House of Debt</em>{" "}
          (demand &amp; local jobs).
        </p>
      </section>
    </div>
  );
}
