/**
 * METHODOLOGY — how every number on the site is produced.
 * Each metric: definition → formula → data fields → calculation → limitations,
 * with the parameters the code actually uses
 * (artifacts/api-server/src/services/decision/*).
 */

import { Bullets, Callout, Chips, Field, Formula, InLink, InfoPage, Panel, Section, Steps } from "@/components/site/info-page";

const TOC = [
  { id: "conventions", label: "Ground rules" },
  { id: "basics", label: "Core cricket measures" },
  { id: "impact", label: "Impact (runs above average)" },
  { id: "win-probability", label: "Chase win probability" },
  { id: "simulation", label: "Match simulation engine" },
  { id: "pressure", label: "Pressure index" },
  { id: "weakness", label: "Hidden weakness test" },
  { id: "playing-xi", label: "Playing XI optimizer" },
  { id: "squad-dna", label: "Squad DNA" },
  { id: "similarity", label: "Player similarity" },
  { id: "intelligence", label: "Player Intelligence" },
  { id: "auction", label: "2026 auction backtest" },
  { id: "validation", label: "How the models are checked" },
];

export default function MethodologyPage() {
  return (
    <InfoPage
      eyebrow="Methodology"
      title="How every number is calculated"
      intro={<>Each metric below is set out the same way: what it means, the formula, the warehouse fields it reads, how it is calculated and where it falls short. The parameters are the ones the code uses. For where the data comes from, see <InLink href="/data-sources">Data Sources</InLink>.</>}
      updated="8 October 2026"
      toc={TOC}
    >
      <Section id="conventions" title="Ground rules applied everywhere">
        <Bullets items={[
          <><b className="text-white">Phases.</b> Powerplay = overs 1–6, middle = 7–15, death = 16–20. In a rain-shortened innings the simulator maps each over onto its 20-over equivalent, so the last overs still count as the death.</>,
          <><b className="text-white">Seasons</b> are labelled by the year the tournament was played (2007/08 → 2008, 2009/10 → 2010, 2020/21 → 2020).</>,
          <><b className="text-white">Super overs</b> (innings 3 and later) are excluded from every statistic.</>,
          <><b className="text-white">Chase targets</b> come from the scorecard, including Duckworth–Lewis–Stern revisions; otherwise the target is the first-innings total + 1 from 120 balls.</>,
          <><b className="text-white">Balls faced</b> exclude wides. <b className="text-white">Legal balls</b> exclude wides and no-balls. A bowler's runs conceded exclude byes, leg-byes and penalty runs.</>,
          <><b className="text-white">Bowler wickets</b> are bowled, caught, caught and bowled, lbw, stumped and hit wicket. Run-outs and retirements are not credited to the bowler.</>,
          <><b className="text-white">Pace or spin.</b> A bowler whose fastest recorded delivery is at least 124 km/h is pace; otherwise the listed bowling style decides.</>,
          <><b className="text-white">Names.</b> Players are matched across sources by exact name, or by initial + surname only when exactly one player fits. Anything feeding a hard rule (overseas limit, wicketkeeper) uses exact matches only.</>,
          <><b className="text-white">No look-ahead.</b> Anything valued "as of" a season uses that season and earlier only, so historical what-ifs and backtests never see the future.</>,
          <><b className="text-white">Small samples</b> are shrunk toward the league (or toward zero) by adding a fixed amount of league-average data. The amount is given for each metric below.</>,
        ]} />
      </Section>

      <Section id="basics" title="Core cricket measures">
        <Formula>{`Strike rate        = 100 × runs ÷ balls faced
Economy            = 6 × runs conceded ÷ legal balls
Batting average    = runs ÷ dismissals
Balls per dismissal = balls faced ÷ dismissals        (bowling: legal balls ÷ wickets)
Dot %              = 100 × scoreless balls ÷ balls
Boundary %         = 100 × (fours + sixes) ÷ balls
Run rate           = 6 × team runs ÷ legal balls`}</Formula>
        <Field label="Data fields"><Chips items={["deliveries.batter_runs", "deliveries.total_runs", "deliveries.extra_runs", "is_wide", "is_noball", "is_bye", "is_legbye", "is_penalty", "dismissals.kind", "dismissals.player_out_id"]} /></Field>
      </Section>

      <Panel id="impact" kicker="Player value" title="Impact — runs above an average IPL player, per match">
        <Field label="Definition">The runs a player adds to a match, batting and bowling combined, compared with an average IPL player in the same season. Used by the Playing XI optimizer and the Auction War Room.</Field>
        <Field label="Formula">
          <Formula>{`W        = 0.25 × league runs per ball × league balls per dismissal   (a wicket's run value)
batting  = runs − balls × lgRPB − (outs − balls ÷ lgBPO) × W
bowling  = balls × lgRPB − runs conceded + (wickets − balls ÷ lgBPW) × W
per match (each side) = (Σ w_s · value_s − 4 × 1.5) ÷ (Σ w_s · matches_s + 4)
w_s      = 0.55 ^ (target season − season s)`}</Formula>
        </Field>
        <Field label="Data fields"><Chips items={["batter_runs", "is_wide", "total_runs", "byes / leg-byes / penalties", "dismissals.kind", "matches.season_id"]} /></Field>
        <Field label="Calculation">
          <Steps items={[
            "Total each player's season lines: runs, balls, dismissals, balls bowled, runs conceded, wickets, matches.",
            "Value each season against that season's league rates, so a 2010 strike rate and a 2026 strike rate are judged on their own terms.",
            "Weight seasons by recency (each year back counts 0.55×) and add four matches of slightly below-average prior (−1.5 runs/match) to each side, so three good games don't outrank a proven record.",
            "Credit bowling only for players who bowl regularly (about 0.4 overs a match or more, recency-weighted).",
          ]} />
        </Field>
        <Field label="Limitations"><Bullets items={["Fielding and captaincy are not counted.", "Phase and match situation are not weighted: 30 off 20 in the death and in the powerplay score the same.", "The wicket value is a fixed share of the season's runs per wicket."]} /></Field>
      </Panel>

      <Panel id="win-probability" kicker="State model" title="Chase win probability">
        <Field label="Definition">The chance the chasing side wins from a given state (balls left, runs needed, wickets lost), for league-average teams of that era. Shown ball by ball on match pages and in the Decision Replay.</Field>
        <Field label="Formula">
          <Formula>{`P(b, r, w) = Σ_outcomes p(o | era, over band, wickets, required-rate band) · P(b − legal_o, r − runs_o, w + wicket_o)
P(·, r ≤ 0, ·) = 1     P(0, r > 0, ·) = 0     P(·, ·, 10) = 0     tie (r = 1 at the end) = 0.5
calibrated  = 1 ÷ (1 + e^−(a · logit(P) + b))          (Platt scaling)`}</Formula>
        </Field>
        <Field label="Data fields"><Chips items={["over_num", "total_runs", "is_wide", "is_noball", "dismissals", "matches.winner_id", "chase target (incl. DLS)"]} /></Field>
        <Field label="Calculation">
          <Steps items={[
            "Count how often each ball ends as a dot, 1, 2, 3, 4, 6, wicket, wide or no-ball, split by era (2008–12, 2013–17, 2018–22, 2023–), over band, wickets down and required-rate band. Thin cells are shrunk toward their parent cells.",
            "Solve the chase exactly by dynamic programming over every (balls, runs, wickets) state. Wides and no-balls add a run without using up a ball.",
            "The raw model is too pessimistic for chases that fall behind, because real batting is streakier than independent balls. A raw 15% won about 31% of the time. A two-parameter logistic recalibration, fitted on the start of every over of every 20-over IPL chase, corrects this.",
          ]} />
        </Field>
        <Field label="Limitations"><Bullets items={["League-average teams: the players, pitch and dew are not in this number. Player-specific questions go through the simulator below.", "First-innings states are not modelled directly; the chart starts with the chase."]} /></Field>
      </Panel>

      <Panel id="simulation" kicker="Monte Carlo" title="Match simulation engine">
        <Field label="Definition">Plays the rest of an innings ball by ball, thousands of times, with specific batters and bowlers. Powers the <InLink href="/ai-analyst/strategy-sim">Strategy Simulator</InLink>, <InLink href="/ai-analyst/alt-universe">Alternate Universe</InLink>, <InLink href="/ai-analyst/decision-replay">Decision Replay</InLink> and <InLink href="/ai-analyst/opposition-map">Opposition Map</InLink>.</Field>
        <Field label="Formula">
          <Formula>{`wicket   = base_W × batter out-mult × bowler wicket-mult            (capped at 25%)
4s, 6s   = base × batter boundary-mult × bowler boundary-mult × venue factor × season factor
dots     = base × batter dot-mult × bowler dot-mult
extras   = base × bowler extras-mult
1s/2s/3s = whatever probability is left, in their base proportions
multiplier = ((player count + 60 × league rate) ÷ (player balls + 60)) ÷ league rate
recency weight = 0.6 ^ years back`}</Formula>
        </Field>
        <Field label="Data fields"><Chips items={["batter_id", "bowler_id", "non_striker_id", "over_num", "batter_runs", "dismissals.player_out_id", "bowling type", "venue_id"]} /></Field>
        <Field label="Calculation">
          <Steps items={[
            "Start from the league outcome table for the ball's context (as in win probability).",
            "Scale it by the batter's rates against pace or spin in that phase and the bowler's rates in that phase, each relative to the league in the same slot and shrunk toward 1 with 60 balls of league data. Profiles use only seasons up to the one being simulated.",
            "Apply a venue boundary factor and a season boundary factor (boundary rates rose sharply within the latest era).",
            "Choose bowlers under the real rules: a four-over cap (scaled in shortened innings) and no bowler in consecutive overs. Policies: data-optimal rotation (plans the remaining overs to minimise expected runs net of wickets), save the best for the death, hunt the matchup, or the bowlers who actually bowled.",
            "Compared plans or what-ifs share the same seeded random numbers, so the difference between them is the decision, not noise.",
          ]} />
        </Field>
        <Field label="Limitations"><Bullets items={["Balls are independent given their context, so momentum is only partly captured.", "Batting order follows each player's usual position; field settings and captaincy beyond bowling choice are not modelled.", "Pitch and dew enter only through the venue's long-run boundary rate."]} /></Field>
      </Panel>

      <Panel id="pressure" kicker="Pressure Genome" title="Pressure index and pressure lift">
        <Field label="Definition">How a player performs when it matters, judged against the league in the same situations. The index is a 0–100 percentile; lift is the change from the player's own calm phases.</Field>
        <Field label="Formula">
          <Formula>{`value per 100 balls = 100 × [(runs/ball − league runs/ball) − W_ctx × (outs/ball − league outs/ball)]
W_ctx  = 0.3 × league runs per wicket in that context          (bowlers: mirror image)
shrunk = value × balls ÷ (balls + 40)
pressure index = percentile of pooled pressure value among players with 120+ pressure balls
pressure lift  = pressure value − calm value`}</Formula>
        </Field>
        <Field label="Data fields"><Chips items={["over_num", "wickets before ball", "required rate", "match stage (playoff / final)", "batter_runs", "dismissals"]} /></Field>
        <Field label="Calculation">
          <Steps items={[
            <>Tag every ball with its pressure contexts: <b className="text-white">death</b> (overs 16–20), <b className="text-white">knockout</b> (playoffs and finals), <b className="text-white">close finish</b> (last 5 overs of a live chase, required rate 6–14, 8 or fewer down), <b className="text-white">steep chase</b> (required rate above 12, batting), <b className="text-white">rescue</b> (4+ down inside 12 overs, batting) and <b className="text-white">defending</b> (chase on track at 8.5 an over or less from over 11, 6 or fewer down, bowling).</>,
            "Compare the player with the league in exactly those balls, so the death overs don't look good just because everyone scores faster there.",
            "Pool the pressure contexts, shrink, and rank against every qualified player.",
          ]} />
        </Field>
        <Field label="Limitations"><Bullets items={["Contexts overlap (a knockout death over counts in both).", "Knockout samples are small for most players.", "Players under 120 pressure balls get a provisional index."]} /></Field>
      </Panel>

      <Panel id="weakness" kicker="Hidden Weakness Detector" title="Weakness test (with multiple-comparison correction)">
        <Field label="Definition">A situation where a player is clearly worse than their own record elsewhere, by enough to matter, after allowing for the fact that many situations are tested at once.</Field>
        <Field label="Formula">
          <Formula>{`per-ball value v = runs − W × out        (W = 0.3 × league runs per wicket; bowlers mirrored)
z = (mean v in cell − mean v elsewhere) ÷ standard error
p = one-sided normal p-value of z
confidence = 1 − min(1, p × number of cells tested)        (Bonferroni)
report if  confidence ≥ 80%  and  (|effect| ≥ 12 runs per 100 balls  or  dismissal rate ≥ 1.5× elsewhere)`}</Formula>
        </Field>
        <Field label="Data fields"><Chips items={["bowler type / batter hand", "over_num", "innings_number", "batter_runs", "dismissals"]} /></Field>
        <Field label="Calculation">
          <Steps items={[
            "Split the player's balls into cells: bowler type × over window (1–6, 7–10, 11–15, 16–20) for batters, batter hand × over window for bowlers, each dimension alone, and batting first vs chasing. Cells need 30+ balls.",
            "Test each cell against the rest of the player's own balls.",
            "Correct for the number of cells tested, then require a practical effect as well as statistical confidence. Overlapping parent and child cells are not both reported.",
            "If nothing passes, the weakest cells are shown as a watch list, labelled as not significant.",
          ]} />
        </Field>
        <Field label="Limitations"><Bullets items={["Bonferroni is conservative: real but small weaknesses can be missed.", "Bowler type is a broad class; specific deliveries (slower balls, bouncers) are not recorded for most balls."]} /></Field>
      </Panel>

      <Panel id="playing-xi" kicker="Optimisation" title="Playing XI optimizer">
        <Field label="Definition">The eleven from a squad with the highest combined expected impact that still satisfies the playing rules and balance requirements.</Field>
        <Field label="Formula">
          <Formula>{`maximise   Σ adjustedImpact_i · x_i            x_i ∈ {0, 1}
subject to Σ x_i = 11
           Σ overseas_i · x_i ≤ 4
           Σ keeper_i · x_i ≥ 1
           Σ bowlingCapacity_i · x_i ≥ 20 overs     (≤ 4 per bowler)
           bowling options, batting options, spinners, pacers ≥ chosen minimums
           locked players = 1, excluded players = 0`}</Formula>
        </Field>
        <Field label="Data fields"><Chips items={["impact", "overseas flag", "keeper flag", "overs per match", "balls faced per match", "pace / spin"]} /></Field>
        <Field label="Calculation">
          <Steps items={[
            "adjustedImpact is the impact above plus a pitch adjustment (batting, pace or spin-friendly).",
            "Solved exactly as a mixed-integer linear program.",
            "Each chosen player's marginal value is found by re-solving with that player removed: the drop in the objective is what they are worth to this XI.",
          ]} />
        </Field>
        <Field label="Limitations"><Bullets items={["Impacts add up; partnerships and batting-order fit are not modelled.", "Overseas status and keeper role come from exact-matched sources only and can be overridden in the tool."]} /></Field>
      </Panel>

      <Panel id="squad-dna" kicker="Team profile" title="Squad DNA, importance and vulnerability">
        <Field label="Definition">A franchise-season measured on 38 dimensions of how it played (phase scoring and bowling, spin and pace game, depth, composition, results), each compared with the same season's league.</Field>
        <Field label="Formula">
          <Formula>{`z_d        = (value_d − season mean_d) ÷ season sd_d
percentile = rank of z_d among all team-seasons (8+ matches)
score_d    = percentile, flipped when lower is better (e.g. economy)
importance = Pearson r between z_d and win-% z across all team-seasons
vulnerability = 100 × Σ r_d · max(0, 50 − score_d) ÷ 50  ÷  Σ r_d      (dimensions with r > 0.1)
twins      = cosine similarity of the z vectors (results excluded)`}</Formula>
        </Field>
        <Field label="Data fields"><Chips items={["innings.batting_team_id", "innings.bowling_team_id", "over_num", "total_runs", "dismissals", "matches.winner_id", "margin_type / margin_value", "appearances"]} /></Field>
        <Field label="Calculation">
          <Steps items={[
            "Aggregate every ball by franchise and season (renamed franchises keep one identity).",
            "Standardise each dimension within its season, then rank across all team-seasons.",
            "Group dimensions into 12 fingerprint axes (the mean of their scores). Style dimensions such as left-hander share are shown but never scored good or bad.",
          ]} />
        </Field>
        <Field label="Limitations"><Bullets items={["Importance is a correlation, not a cause: winning teams change fewer players, for example, so 'players used' correlates with winning partly in reverse.", "One season is 14–17 matches, so single dimensions are noisy."]} /></Field>
      </Panel>

      <Panel id="similarity" kicker="Player Pool Graph" title="Player similarity and archetypes">
        <Field label="Definition">How alike two players are in role (when they bat or bowl, pace or spin) and output (how well they do it), measured against the league in the same phases and against the same bowling types.</Field>
        <Field label="Formula">
          <Formula>{`feature z = (feature − pool mean) ÷ pool sd                  (pace/spin weighted ×2 for bowlers)
role, output = mean squared difference of z across that group of features
similarity  = e^−(0.45 × role + 0.55 × output)                   (100% = identical)`}</Formula>
        </Field>
        <Field label="Data fields"><Chips items={["over_num", "batter_runs", "conceded runs", "dismissals", "bowling type", "pressure value"]} /></Field>
        <Field label="Calculation">
          <Steps items={[
            "Qualify players: 300 balls faced or 240 bowled in a career (150 / 120 for the last three seasons).",
            "Role features: share of balls in each phase (and pace or spin). Output features: strike rate or economy, dismissal or wicket rate, boundary % and dot %, each against what the league did in the same phase mix, plus phase-by-phase rates and pressure value. Phase rates are shrunk with 60 balls of league data.",
            "Archetypes come from simple rules on the same features (for example, 38%+ of balls in the powerplay = top order; scoring 8+ runs per 100 balls above expected = aggressor).",
          ]} />
        </Field>
        <Field label="Limitations"><Bullets items={["Similarity describes how players played, not how good they are overall.", "Players with very unusual profiles have no close neighbours; the scores say so rather than forcing a match."]} /></Field>
      </Panel>

      <Panel id="intelligence" kicker="Shared by every page" title="Player Intelligence: four separate questions">
        <Field label="Definition">Performance, market price, franchise-specific value and retention outlook are calculated apart and never blended into one score. All pages read one published, versioned snapshot, so a player reads the same everywhere. Live figures, including the live War Room board, come from here.</Field>
        <Field label="Performance">
          <Formula>{`run value      = runs + RE(next state) − RE(state)     RE from legal balls × wickets, seasons s−2 to s only
adjusted value = run value − context (season, phase, innings) − venue − opposition
rating         = (Σ decay^age × value + k × prior) ÷ (Σ decay^age × balls + k)     decay 0.5
k              = per-ball variance ÷ talent variance     talent variance = year-to-year covariance of a player's rate
Runs Above Replacement = (rating − replacement) × usual balls per match
replacement    = median rating of role peers who played 5 or fewer matches in a season`}</Formula>
        </Field>
        <Field label="Market price">Average of a ridge regression and gradient-boosted trees on the log of the sale price, trained on rupee auction sales from 2014. Every feature is cut off before the auction it predicts. The figure is the expected price if sold, with an 80% range from out-of-time errors. Tested season by season on auctions the model had not seen, with the live numbers on the <a className="underline" href="/ai-analyst/squad-builder">model record</a>.</Field>
        <Field label="Value read">Performance percentile minus price percentile, within the role. Undervalued at +20, overvalued at −20. Two rankings are compared because no validated conversion from runs to rupees exists, so no rupee value of output is published.</Field>
        <Field label="Franchise value">The change in a team's best XII: twelve players under the overseas limit, seven batting slots with at most three each for top order, middle order and finishers, and a 20-over bowling plan by phase. Overs nobody in the squad can bowl count against the side, which is why the same player is worth more to some teams. This measures composition. Pre-season strength has not been shown to predict results.</Field>
        <Field label="Retention">A model of whether a franchise keeps a player between mini-auctions. It failed its calibration test on the latest holdout season, so it appears as a provisional rank and not a percentage. Season simulation is off for the same reason of evidence: no playoff or title odds are published.</Field>
        <Field label="Not included"><Chips items={["Fielding runs saved", "Unsold players before 2026", "2027 retentions and purses", "Injury and availability", "Wins Above Replacement"]} /></Field>
      </Panel>

      <Panel id="auction" kicker="2026 backtest board" title="Comparable-sales benchmark: expected price, value, signal and max bid">
        <Field label="Definition">The earlier benchmark, kept only for the 2026 backtest board. What a player was likely to cost from comparable sales, and what their output was worth at the market's going rate. The live board uses Player Intelligence above.</Field>
        <Field label="Formula">
          <Formula>{`IAR            = impact − replacement level      (20th-percentile impact among players with 5+ matches that season)
expected price = weighted geometric mean of the 15 most similar sales in the last five auctions
                 distance on (IAR ÷ 1.5, overseas × 1.5, ln(1 + IPL matches) ÷ 0.8, all-rounder × 0.6, keeper × 0.6)
                 weight = e^(−d² ÷ 2) × 0.85 ^ years since the sale
going rate     = median of fee ÷ reliable IAR among buys with IAR ≥ 1 and 10+ matches (Indian and overseas separately)
value          = max(0, IAR × n ÷ (n + 8)) × going rate,  capped at the record fee     (n = recency-weighted matches)
BUY   if value ≥ 1.25 × price  and  value − price ≥ ₹1 Cr
AVOID if IAR ≤ 0,  or value ≤ 0.75 × price and price − value ≥ ₹1 Cr,  or value < reserve price
SCOUT if fewer than 5 IPL matches;  otherwise HOLD
max bid = value rounded down to the bid increment`}</Formula>
        </Field>
        <Field label="Data fields"><Chips items={["impact (as of the auction)", "sale fee (₹ lakh)", "overseas flag", "IPL matches", "role", "reserve price (2026 list)"]} /></Field>
        <Field label="Calculation">
          <Steps items={[
            "Value each player only on data available before the auction in question.",
            "Price them from the closest real sales rather than a single formula, because fees for similar output vary enormously (reputation, scarcity, bidding wars).",
            "Discount small samples, and never value anyone above the highest fee actually paid.",
            "For a franchise, rank players by how well their features cover that squad's weakest winning-linked Squad DNA dimensions.",
          ]} />
        </Field>
        <Field label="Limitations"><Bullets items={["Price estimates are typically off by about ×2 either way; few stars reach auction, so top-end prices are least certain.", "Only sold players are in the training data; unsold players and retentions are not.", "Uncapped and new players get SCOUT: there is no IPL basis for a value."]} /></Field>
      </Panel>

      <Section id="validation" title="How the models are checked">
        <Bullets items={[
          <><b className="text-white">Win probability</b> is checked against every over-start state of every 20-over IPL chase: after recalibration, predicted and actual win rates agree within about 3 percentage points in each decile.</>,
          <><b className="text-white">Simulations</b> re-play real innings with the bowlers who actually bowled, and the Alternate Universe reports where the real total fell in that simulated range, on every run.</>,
          <><b className="text-white">Auction prices</b> are tested by leave-one-out on past sales and by a backtest on the real 2026 auction, valued on data to 2025. At the time of writing, expected prices ranked the actual 2026 fees with a rank correlation of 0.71. The live figures are on the <InLink href="/ai-analyst/auction-war-room?view=backtest">backtest board</InLink>.</>,
          <><b className="text-white">Weakness findings</b> carry a multiple-comparison correction, and anything below the bar is labelled as not significant.</>,
          <><b className="text-white">Warehouse totals</b> are reconciled ball by ball against the batting and bowling scorecards; the checks are listed on the <InLink href="/data-sources#health">Data Sources</InLink> page.</>,
        ]} />
        <Callout>Every model here is an estimate built from past IPL matches. The site shows its error ranges and sample sizes so you can judge how much weight a number deserves.</Callout>
      </Section>
    </InfoPage>
  );
}
