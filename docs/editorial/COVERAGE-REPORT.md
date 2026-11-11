# Dugout 1,000-article plan: coverage and duplicate report

Generated 2026-10-26 by `scripts/editorial/coverage-report.ts`. Plan source: `docs/editorial/plan/cricfield_1000_article_titles.csv` (1,000 titles, verified against the Markdown copy).

## Coverage by franchise

| Franchise | Planned | Published | In review (localhost only) | Draft | Not started | Legacy articles | Legacy decisions reviewed | Plan slots covered by a legacy article |
|---|---|---|---|---|---|---|---|---|
| CSK | 100 | 0 | 100 | 0 | 0 | 10 | 0 | 0 |
| MI | 100 | 0 | 100 | 0 | 0 | 10 | 0 | 0 |
| RCB | 100 | 0 | 100 | 0 | 0 | 10 | 10 | 9 |
| KKR | 100 | 0 | 100 | 0 | 0 | 10 | 0 | 0 |
| SRH | 100 | 0 | 100 | 0 | 0 | 10 | 0 | 0 |
| RR | 100 | 0 | 100 | 0 | 0 | 10 | 0 | 0 |
| DC | 100 | 0 | 100 | 0 | 0 | 10 | 0 | 0 |
| PBKS | 100 | 0 | 100 | 0 | 0 | 10 | 0 | 0 |
| GT | 100 | 0 | 100 | 0 | 0 | 10 | 0 | 0 |
| LSG | 100 | 0 | 100 | 0 | 0 | 10 | 0 | 0 |
| **All** | 1000 | 0 | 1000 | 0 | 0 | 100 | 10 | 9 |

“Published” means `status: published` in the article file. Nothing is published automatically: Batch articles enter as `review` and render only on localhost until an editor changes the status.

## How duplicates are detected

- **Exact:** the legacy title equals a plan title (case-insensitive).
- **Semantic:** score = 0.45 × title-token Jaccard (franchise names and stop words removed, light stemming) + 0.47 × concept Jaccard (a cricket lexicon: venue, chase, powerplay, death, auction, pressure, history, selection, …) + 0.08 when the legacy parameter maps to the plan aspect. ≥ 0.40 is flagged as a likely duplicate, 0.25–0.40 as partial overlap.
- Automatic flags are proposals. A legacy article is only treated as covering a plan slot after a reviewed decision in `src/data/editorial/plan/legacy-decisions.json`.

## Legacy articles against the plan

### CSK

| Legacy article | Auto flag | Best plan match (score) | Decision |
|---|---|---|---|
| `art-csk-01` The Yellow Blueprint: Is CSK's Greatest Strength Its System? | partial-overlap | `cf-csk-091` The 2027 Blueprint: What Should Chennai Super Kings Build for the Next Cycle? (0.285; shared: future) | pending review |
| `art-csk-02` The Art of Controlled Aggression: How CSK Manages the Middle Overs | partial-overlap | `cf-csk-014` Middle-Overs Spin: Can Chennai Super Kings Create Pressure Without Immediate Wickets? (0.31; shared: middle, spin) | pending review |
| `art-csk-03` Spin, Pace and Patience: Decoding CSK's Bowling Combinations | partial-overlap | `cf-csk-013` Wickets Versus Economy: How Chennai Super Kings Should Judge Its Bowlers (0.282; shared: bowlingEconomy) | pending review |
| `art-csk-04` The Dhoni Effect: Can Captaincy Decisions Be Measured? | no-match | `cf-csk-030` Captaincy Under Uncertainty: Which Decisions Matter Most for Chennai Super Kings? (0.193; shared: none) | pending review |
| `art-csk-05` The Chepauk Code: Why Venue-Specific Strategy Matters | semantic-duplicate | `cf-csk-022` Home-Ground Advantage: What Makes Chepauk Different for Chennai Super Kings? (0.591; shared: venue) | pending review |
| `art-csk-06` Experience as an Asset: Does CSK's Auction Philosophy Deliver Value? | partial-overlap | `cf-csk-031` The Auction Price Puzzle: What Is a Win Worth to Chennai Super Kings? (0.36; shared: auction) | pending review |
| `art-csk-07` The Matchup Machine: How CSK Can Build an XI for Different Conditions | partial-overlap | `cf-csk-065` A Timeline of Chennai Super Kings’s Home-Ground Evolution (0.313; shared: venue, history) | pending review |
| `art-csk-08` The Generational Transition: How CSK's Cricket Has Evolved | semantic-duplicate | `cf-csk-070` Legacy Versus Recency: How Should We Rank Chennai Super Kings’s Greatest Performances? (0.55; shared: history) | pending review |
| `art-csk-09` The Dot-Ball Economy: How CSK Creates Pressure Without Taking Wickets | no-match | `cf-csk-085` Clutch or Coincidence? Testing Chennai Super Kings’s Pressure-Performance Narratives (0.232; shared: pressure) | pending review |
| `art-csk-10` Life Beyond Familiar Names: Building CSK's Next Core | partial-overlap | `cf-csk-091` The 2027 Blueprint: What Should Chennai Super Kings Build for the Next Cycle? (0.337; shared: future) | pending review |

### MI

| Legacy article | Auto flag | Best plan match (score) | Decision |
|---|---|---|---|
| `art-mi-01` The Mumbai Talent Factory: How MI Builds Its Cricketing Core | partial-overlap | `cf-mi-070` Legacy Versus Recency: How Should We Rank Mumbai Indians’s Greatest Performances? (0.315; shared: history) | pending review |
| `art-mi-02` The Death-Over Blueprint: Why MI's Batting Depth Matters | no-match | `cf-mi-100` The Future XI: Designing Mumbai Indians’s Ideal Role Balance, Not a Dream Team (0.235; shared: future, selection) | pending review |
| `art-mi-03` The Bumrah Equation: Measuring the Value of an Elite Bowler | no-match | `cf-mi-010` The 200-Run Question: Which Conditions Make Mumbai Indians a High-Scoring Side? (0.235; shared: highTotal) | pending review |
| `art-mi-04` Championship Temperament: Does MI Perform Differently Under Pressure? | semantic-duplicate | `cf-mi-066` The Matches That Built Mumbai Indians’s Reputation Under Pressure (0.56; shared: pressure) | pending review |
| `art-mi-05` The Wankhede Factor: How Venue Conditions Shape MI's Strategy | semantic-duplicate | `cf-mi-022` Home-Ground Advantage: What Makes Wankhede Different for Mumbai Indians? (0.591; shared: venue) | pending review |
| `art-mi-06` Finding the Next Star: MI's Auction Investment and Player Development | partial-overlap | `cf-mi-032` Star Premium Versus Squad Depth: Where Should Mumbai Indians Spend Its Budget? (0.35; shared: auction, star) | pending review |
| `art-mi-07` The Balance of Eleven: When Too Many Match-Winners Become a Selection Problem | partial-overlap | `cf-mi-027` Opponent-Specific Plans: Should Mumbai Indians Build a New XI for Every Match? (0.269; shared: selection) | pending review |
| `art-mi-08` From the Early Years to the Modern Era: MI's Tactical Evolution | partial-overlap | `cf-mi-070` Legacy Versus Recency: How Should We Rank Mumbai Indians’s Greatest Performances? (0.315; shared: history) | pending review |
| `art-mi-09` The Invisible Overs: Where MI Gains or Loses Matches Without Boundaries | no-match | `cf-mi-003` Boundary Dependency: How Much of Mumbai Indians’s Scoring Comes in Fours and Sixes? (0.235; shared: boundary) | pending review |
| `art-mi-10` The Next Mumbai Core: Which Player Profiles Should MI Prioritize? | no-match | `cf-mi-071` The Next Opener: What Profile Should Mumbai Indians Scout? (0.244; shared: future, scouting) | pending review |

### RCB

| Legacy article | Auto flag | Best plan match (score) | Decision |
|---|---|---|---|
| `art-rcb-01` Beyond the Superstars: What Really Defines RCB's Cricketing Identity? | partial-overlap | `cf-rcb-061` The Founding Identity: How Royal Challengers Bengaluru Became More Than an IPL Entry (0.293; shared: identity) | revise → cf-rcb-061: Identity essay overlaps 'The Founding Identity'; rewrite in the History batch keeps the legacy URL. |
| `art-rcb-02` The Anatomy of a Chase: How RCB Constructs Successful Run Pursuits | no-match | `cf-rcb-004` Middle-Overs Momentum: Where Royal Challengers Bengaluru Gains or Loses Run Rate (0.212; shared: middle) | revise → cf-rcb-006: Chase construction is the same question as 'Chasing Under Pressure'. |
| `art-rcb-03` Bowling at Chinnaswamy: Why Economy Rate Doesn't Tell the Whole Story | partial-overlap | `cf-rcb-013` Wickets Versus Economy: How Royal Challengers Bengaluru Should Judge Its Bowlers (0.318; shared: bowlingEconomy) | revise → cf-rcb-013: Economy-rate critique is the core of 'Wickets Versus Economy'. |
| `art-rcb-04` The Weight of Expectation: RCB's Performance in High-Pressure Matches | partial-overlap | `cf-rcb-066` The Matches That Built Royal Challengers Bengaluru’s Reputation Under Pressure (0.325; shared: pressure) | revise → cf-rcb-085: High-pressure performance claim is tested statistically in 'Clutch or Coincidence?' (Batch 1); the 2024 run stays as a case study. cf-rcb-066 is related reading, not a duplicate. |
| `art-rcb-05` The Chinnaswamy Effect: How Much Does the Ground Change Cricket? | partial-overlap | `cf-rcb-022` Home-Ground Advantage: What Makes Chinnaswamy Different for Royal Challengers Bengaluru? (0.337; shared: venue) | revise → cf-rcb-022: Semantic duplicate of 'Home-Ground Advantage: What Makes Chinnaswamy Different' (Batch 1). Legacy text contained unsourced physical claims (altitude, boundary metres); v2 replaces them with warehouse evidence. |
| `art-rcb-06` The Price of Star Power: RCB's Auction Spending Under the Microscope | partial-overlap | `cf-rcb-032` Star Premium Versus Squad Depth: Where Should Royal Challengers Bengaluru Spend Its Budget? (0.39; shared: auction, star) | revise → cf-rcb-032: Star-power spending maps to 'Star Premium Versus Squad Depth'. Not the same question as cf-rcb-039 (ROI model, Batch 1), which links to it as related reading. |
| `art-rcb-07` Batting Depth or Bowling Insurance: The RCB Selection Dilemma | no-match | `cf-rcb-020` The Sixth-Bowler Insurance Policy: How Much Flexibility Does Royal Challengers Bengaluru Need? (0.247; shared: selection) | revise → cf-rcb-020: Batting depth vs bowling insurance is the sixth-bowler question. |
| `art-rcb-08` From Gayle and AB to the Modern XI: RCB's Batting Evolution | no-match | `cf-rcb-065` A Timeline of Royal Challengers Bengaluru’s Home-Ground Evolution (0.238; shared: history) | keep-separate: Batting-era retrospective has no direct plan slot (closest: cf-rcb-064 captaincy eras, cf-rcb-067 squad philosophy). Kept as an archive piece. |
| `art-rcb-09` The 200-Run Illusion: When Big Totals Hide Tactical Weaknesses | partial-overlap | `cf-rcb-010` The 200-Run Question: Which Conditions Make Royal Challengers Bengaluru a High-Scoring Side? (0.299; shared: highTotal) | revise → cf-rcb-010: Same subject as 'The 200-Run Question'. |
| `art-rcb-10` The Next RCB Advantage: Finding Value Beyond Famous Names | partial-overlap | `cf-rcb-071` The Next Opener: What Profile Should Royal Challengers Bengaluru Scout? (0.363; shared: future, scouting) | revise → cf-rcb-035: Value beyond famous names maps to 'The Uncapped Advantage'. |

### KKR

| Legacy article | Auto flag | Best plan match (score) | Decision |
|---|---|---|---|
| `art-kkr-01` The Knight Riders Formula: How KKR Blends Risk and Control | semantic-duplicate | `cf-kkr-043` Jersey Economics: How Kolkata Knight Riders Can Turn Identity into Merchandise Demand (0.47; shared: identity) | pending review |
| `art-kkr-02` Opening the Floodgates: KKR's Powerplay Batting Experiments | partial-overlap | `cf-kkr-001` The Powerplay Equation: When Kolkata Knight Riders Should Attack the First Six Overs (0.36; shared: powerplay) | pending review |
| `art-kkr-03` The Spin Web: How KKR Uses Bowling Matchups to Control Innings | partial-overlap | `cf-kkr-013` Wickets Versus Economy: How Kolkata Knight Riders Should Judge Its Bowlers (0.356; shared: bowlingEconomy) | pending review |
| `art-kkr-04` The Russell Factor: What Does an Explosive All-Rounder Really Contribute? | no-match | `cf-kkr-025` Defending 160 Versus 200: Why Kolkata Knight Riders Needs Two Bowling Playbooks (0.174; shared: bowlingEconomy) | pending review |
| `art-kkr-05` The Eden Gardens Paradox: Is It a Batter's Paradise or a Tactical Battleground? | semantic-duplicate | `cf-kkr-065` A Timeline of Kolkata Knight Riders’s Home-Ground Evolution (0.47; shared: venue, history) | pending review |
| `art-kkr-06` Buying Versatility: How KKR Values Multi-Skilled Players | semantic-duplicate | `cf-kkr-033` Retention Mathematics: Which Player Roles Should Kolkata Knight Riders Protect? (0.595; shared: auction) | pending review |
| `art-kkr-07` The Floating Batting Order: Can Flexibility Outperform Fixed Roles? | no-match | `cf-kkr-024` Batting Order as a Decision Tree: Who Should Kolkata Knight Riders Promote and Why? (0.17; shared: none) | pending review |
| `art-kkr-08` From Gambhir's Era to Modern KKR: The Evolution of a Tactical Identity | semantic-duplicate | `cf-kkr-064` The Captaincy Eras: How Leadership Changed Kolkata Knight Riders’s Playing Identity (0.64; shared: history, identity) | pending review |
| `art-kkr-09` The Two-Over Swing: Identifying KKR's Most Influential Match Phases | semantic-duplicate | `cf-kkr-026` The Timeout Decision: Can Kolkata Knight Riders Interrupt an Opposition Surge? (0.47; shared: momentum) | pending review |
| `art-kkr-10` The Next Tactical Experiment: Where KKR Can Find an Edge | partial-overlap | `cf-kkr-094` The Next Tactical Edge: What Happens When Kolkata Knight Riders Models Every Delivery? (0.387; shared: future) | pending review |

### SRH

| Legacy article | Auto flag | Best plan match (score) | Decision |
|---|---|---|---|
| `art-srh-01` The Orange Revolution: How SRH Reinvented Their T20 Identity | semantic-duplicate | `cf-srh-061` The Founding Identity: How Sunrisers Hyderabad Became More Than an IPL Entry (0.443; shared: history, identity) | pending review |
| `art-srh-02` Powerplay Without Permission: The Mathematics of SRH's Batting Aggression | semantic-duplicate | `cf-srh-001` The Powerplay Equation: When Sunrisers Hyderabad Should Attack the First Six Overs (0.591; shared: powerplay) | pending review |
| `art-srh-03` The Lost Art of Defence: What Happened to SRH's Bowling-First Philosophy? | partial-overlap | `cf-srh-061` The Founding Identity: How Sunrisers Hyderabad Became More Than an IPL Entry (0.313; shared: history, identity) | pending review |
| `art-srh-04` When 200 Isn't Enough: SRH's Relationship with High-Scoring Pressure | partial-overlap | `cf-srh-010` The 200-Run Question: Which Conditions Make Sunrisers Hyderabad a High-Scoring Side? (0.347; shared: highTotal) | pending review |
| `art-srh-05` The Hyderabad Equation: Does Uppal Reward Aggression or Discipline? | partial-overlap | `cf-srh-022` Home-Ground Advantage: What Makes Hyderabad Different for Sunrisers Hyderabad? (0.315; shared: venue) | pending review |
| `art-srh-06` Buying Firepower: Has SRH's Auction Spending Matched Its Batting Ambition? | partial-overlap | `cf-srh-031` The Auction Price Puzzle: What Is a Win Worth to Sunrisers Hyderabad? (0.352; shared: auction) | pending review |
| `art-srh-07` The Sixth Bowler Problem: How Balanced Is SRH's Ideal XI? | partial-overlap | `cf-srh-020` The Sixth-Bowler Insurance Policy: How Much Flexibility Does Sunrisers Hyderabad Need? (0.335; shared: selection) | pending review |
| `art-srh-08` From Warner to the New Era: The Evolution of an Orange Identity | semantic-duplicate | `cf-srh-064` The Captaincy Eras: How Leadership Changed Sunrisers Hyderabad’s Playing Identity (0.65; shared: history, identity) | pending review |
| `art-srh-09` The Boundary Paradox: Can More Sixes Sometimes Produce Less Control? | no-match | `cf-srh-003` Boundary Dependency: How Much of Sunrisers Hyderabad’s Scoring Comes in Fours and Sixes? (0.238; shared: boundary) | pending review |
| `art-srh-10` Beyond the Big Hitters: Where Should SRH Find Its Next Competitive Advantage? | partial-overlap | `cf-srh-071` The Next Opener: What Profile Should Sunrisers Hyderabad Scout? (0.285; shared: future, scouting) | pending review |

### RR

| Legacy article | Auto flag | Best plan match (score) | Decision |
|---|---|---|---|
| `art-rr-01` The Pink Laboratory: How RR Turns Scouting into Competitive Advantage | partial-overlap | `cf-rr-070` Legacy Versus Recency: How Should We Rank Rajasthan Royals’s Greatest Performances? (0.315; shared: history) | pending review |
| `art-rr-02` The Young Batter Equation: How Early-Career Players Handle IPL Pressure | no-match | `cf-rr-003` Boundary Dependency: How Much of Rajasthan Royals’s Scoring Comes in Fours and Sixes? (0.237; shared: boundary) | pending review |
| `art-rr-03` The Bowling Balance: Can RR Combine Wicket-Taking with Run Prevention? | partial-overlap | `cf-rr-014` Middle-Overs Spin: Can Rajasthan Royals Create Pressure Without Immediate Wickets? (0.3; shared: middle, spin) | pending review |
| `art-rr-04` Talent Versus Temperament: Measuring Consistency in RR's Emerging Players | partial-overlap | `cf-rr-097` The Academy Question: Should Rajasthan Royals Invest More in Talent Development? (0.276; shared: scouting) | pending review |
| `art-rr-05` The Jaipur Advantage: What Makes Sawai Mansingh Stadium Different? | semantic-duplicate | `cf-rr-022` Home-Ground Advantage: What Makes Jaipur Different for Rajasthan Royals? (0.515; shared: venue) | pending review |
| `art-rr-06` The Value Hunter: Does RR Find Better Returns from Lesser-Known Players? | partial-overlap | `cf-rr-032` Star Premium Versus Squad Depth: Where Should Rajasthan Royals Spend Its Budget? (0.315; shared: auction, star) | pending review |
| `art-rr-07` The Flexible XI: How RR Can Optimize Its Overseas Combination | semantic-duplicate | `cf-rr-027` Opponent-Specific Plans: Should Rajasthan Royals Build a New XI for Every Match? (0.55; shared: selection) | pending review |
| `art-rr-08` From Underdogs to Contenders: Rajasthan's Strategic Evolution | semantic-duplicate | `cf-rr-061` The Founding Identity: How Rajasthan Royals Became More Than an IPL Entry (0.55; shared: history, identity) | pending review |
| `art-rr-09` The Breakout Illusion: Which Young-Player Performances Are Sustainable? | partial-overlap | `cf-rr-070` Legacy Versus Recency: How Should We Rank Rajasthan Royals’s Greatest Performances? (0.276; shared: history) | pending review |
| `art-rr-10` Finding the Next Unknown Star: RR's Future Scouting Blueprint | semantic-duplicate | `cf-rr-071` The Next Opener: What Profile Should Rajasthan Royals Scout? (0.413; shared: future, scouting) | pending review |

### DC

| Legacy article | Auto flag | Best plan match (score) | Decision |
|---|---|---|---|
| `art-dc-01` The Capitals Conundrum: Why Talent Doesn't Always Translate into Results | partial-overlap | `cf-dc-097` The Academy Question: Should Delhi Capitals Invest More in Talent Development? (0.28; shared: scouting) | pending review |
| `art-dc-02` The Middle-Over Mystery: Where Delhi's Batting Momentum Changes | semantic-duplicate | `cf-dc-004` Middle-Overs Momentum: Where Delhi Capitals Gains or Loses Run Rate (0.528; shared: middle, momentum) | pending review |
| `art-dc-03` The Wicket-Taking Trade-Off: Delhi's Bowling Risk Versus Reward | partial-overlap | `cf-dc-013` Wickets Versus Economy: How Delhi Capitals Should Judge Its Bowlers (0.309; shared: bowlingEconomy) | pending review |
| `art-dc-04` The Pressure Test: How DC Responds When Matches Become Close | semantic-duplicate | `cf-dc-066` The Matches That Built Delhi Capitals’s Reputation Under Pressure (0.56; shared: pressure) | pending review |
| `art-dc-05` The Kotla Equation: How Delhi's Home Conditions Influence Results | semantic-duplicate | `cf-dc-022` Home-Ground Advantage: What Makes Delhi Different for Delhi Capitals? (0.595; shared: venue) | pending review |
| `art-dc-06` The Auction Reset: Has DC Invested in the Right Player Profiles? | partial-overlap | `cf-dc-031` The Auction Price Puzzle: What Is a Win Worth to Delhi Capitals? (0.356; shared: auction) | pending review |
| `art-dc-07` The Missing Combination: What Does DC's Most Balanced XI Look Like? | partial-overlap | `cf-dc-027` Opponent-Specific Plans: Should Delhi Capitals Build a New XI for Every Match? (0.315; shared: selection) | pending review |
| `art-dc-08` From Daredevils to Capitals: Has the Franchise's Cricketing DNA Changed? | semantic-duplicate | `cf-dc-064` The Captaincy Eras: How Leadership Changed Delhi Capitals’s Playing Identity (0.591; shared: history, identity) | pending review |
| `art-dc-09` The Partnership Problem: Are Individual Performances Hiding Team Weaknesses? | partial-overlap | `cf-dc-088` Batting Partnerships as Networks: Mapping Delhi Capitals’s Run Creation (0.352; shared: partnership) | pending review |
| `art-dc-10` Building a Sustainable Core: What Should Delhi Prioritize Next? | partial-overlap | `cf-dc-071` The Next Opener: What Profile Should Delhi Capitals Scout? (0.37; shared: future, scouting) | pending review |

### PBKS

| Legacy article | Auto flag | Best plan match (score) | Decision |
|---|---|---|---|
| `art-pbks-01` The Punjab Paradox: Why Explosive Cricket Doesn't Always Mean Consistency | no-match | `cf-pbks-070` Legacy Versus Recency: How Should We Rank Punjab Kings’s Greatest Performances? (0.237; shared: history) | pending review |
| `art-pbks-02` Attack from Ball One: How PBKS Approaches Powerplay Batting | partial-overlap | `cf-pbks-001` The Powerplay Equation: When Punjab Kings Should Attack the First Six Overs (0.327; shared: powerplay) | pending review |
| `art-pbks-03` The Death-Overs Question: Where Punjab's Bowling Strategy Succeeds or Fails | partial-overlap | `cf-pbks-015` Death-Overs Risk: The Cost of One Missed Length for Punjab Kings (0.39; shared: death) | pending review |
| `art-pbks-04` The Chase Psychology: How PBKS Handles Required Run Rate Pressure | semantic-duplicate | `cf-pbks-006` Chasing Under Pressure: Does Punjab Kings Bat Differently When the Target Climbs? (0.505; shared: chase, pressure) | pending review |
| `art-pbks-05` The Home-Ground Puzzle: How Punjab's Venue Changes Affect Strategy | semantic-duplicate | `cf-pbks-022` Home-Ground Advantage: What Makes Mohali Different for Punjab Kings? (0.632; shared: venue) | pending review |
| `art-pbks-06` Auction Ambition: Does PBKS Spend for Balance or Star Power? | semantic-duplicate | `cf-pbks-032` Star Premium Versus Squad Depth: Where Should Punjab Kings Spend Its Budget? (0.514; shared: auction, selection, star) | pending review |
| `art-pbks-07` The XI That Fits: Building Punjab's Ideal Role Combination | partial-overlap | `cf-pbks-027` Opponent-Specific Plans: Should Punjab Kings Build a New XI for Every Match? (0.356; shared: selection) | pending review |
| `art-pbks-08` The Reinvention Cycle: How Punjab's Squad Identity Has Changed | semantic-duplicate | `cf-pbks-064` The Captaincy Eras: How Leadership Changed Punjab Kings’s Playing Identity (0.483; shared: history, identity) | pending review |
| `art-pbks-09` The Momentum Trap: When One Big Over Changes Punjab's Match Trajectory | no-match | `cf-pbks-026` The Timeout Decision: Can Punjab Kings Interrupt an Opposition Surge? (0.235; shared: momentum) | pending review |
| `art-pbks-10` From Potential to Predictability: What Should PBKS Build Around? | no-match | `cf-pbks-067` From Auction Table to Playing XI: How Punjab Kings’s Squad Philosophy Evolved (0.188; shared: auction, history) | pending review |

### GT

| Legacy article | Auto flag | Best plan match (score) | Decision |
|---|---|---|---|
| `art-gt-01` The Titans Blueprint: How GT Built a Competitive Identity So Quickly | partial-overlap | `cf-gt-061` The Founding Identity: How Gujarat Titans Became More Than an IPL Entry (0.287; shared: identity) | pending review |
| `art-gt-02` Calculated Batting: Does Gujarat Prefer Efficiency Over Aggression? | semantic-duplicate | `cf-gt-010` The 200-Run Question: Which Conditions Make Gujarat Titans a High-Scoring Side? (0.55; shared: highTotal) | pending review |
| `art-gt-03` The Bowling Foundation: How GT Controls Scoring Across Innings Phases | semantic-duplicate | `cf-gt-013` Wickets Versus Economy: How Gujarat Titans Should Judge Its Bowlers (0.591; shared: bowlingEconomy) | pending review |
| `art-gt-04` The Chase Equation: How Gujarat Handles Tight Finishes | semantic-duplicate | `cf-gt-006` Chasing Under Pressure: Does Gujarat Titans Bat Differently When the Target Climbs? (0.47; shared: chase, pressure) | pending review |
| `art-gt-05` The Ahmedabad Factor: How Narendra Modi Stadium Influences GT's Cricket | semantic-duplicate | `cf-gt-022` Home-Ground Advantage: What Makes Ahmedabad Different for Gujarat Titans? (0.587; shared: venue) | pending review |
| `art-gt-06` Value Over Visibility: What GT's Auction Choices Reveal | partial-overlap | `cf-gt-032` Star Premium Versus Squad Depth: Where Should Gujarat Titans Spend Its Budget? (0.393; shared: auction, star) | pending review |
| `art-gt-07` The Balance Sheet of Eleven: How GT Can Optimize Its Squad | no-match | `cf-gt-027` Opponent-Specific Plans: Should Gujarat Titans Build a New XI for Every Match? (0.237; shared: selection) | pending review |
| `art-gt-08` The First Five Seasons: How Gujarat's Approach Has Evolved | semantic-duplicate | `cf-gt-070` Legacy Versus Recency: How Should We Rank Gujarat Titans’s Greatest Performances? (0.55; shared: history) | pending review |
| `art-gt-09` The Quiet Match-Winners: Identifying GT's Underappreciated Contributions | no-match | `cf-gt-032` Star Premium Versus Squad Depth: Where Should Gujarat Titans Spend Its Budget? (0.157; shared: star) | pending review |
| `art-gt-10` The Next Competitive Edge: What Does Gujarat Need to Strengthen? | partial-overlap | `cf-gt-094` The Next Tactical Edge: What Happens When Gujarat Titans Models Every Delivery? (0.264; shared: future) | pending review |

### LSG

| Legacy article | Auto flag | Best plan match (score) | Decision |
|---|---|---|---|
| `art-lsg-01` The Super Giants Experiment: Searching for LSG's Cricketing Identity | semantic-duplicate | `cf-lsg-043` Jersey Economics: How Lucknow Super Giants Can Turn Identity into Merchandise Demand (0.52; shared: identity) | pending review |
| `art-lsg-02` The Tempo Debate: Is LSG's Batting Approach Built for Modern T20? | partial-overlap | `cf-lsg-003` Boundary Dependency: How Much of Lucknow Super Giants’s Scoring Comes in Fours and Sixes? (0.315; shared: boundary) | pending review |
| `art-lsg-03` The Middle-Over Squeeze: How LSG Uses Bowling to Control Matches | partial-overlap | `cf-lsg-013` Wickets Versus Economy: How Lucknow Super Giants Should Judge Its Bowlers (0.356; shared: bowlingEconomy) | pending review |
| `art-lsg-04` The Finishing Question: What Happens When LSG Enters the Final Five Overs? | partial-overlap | `cf-lsg-028` The Last Five Overs: When Lucknow Super Giants Should Preserve or Spend Resources (0.397; shared: death) | pending review |
| `art-lsg-05` The Ekana Effect: How Lucknow's Home Venue Changes Batting Expectations | semantic-duplicate | `cf-lsg-022` Home-Ground Advantage: What Makes Lucknow Different for Lucknow Super Giants? (0.591; shared: venue) | pending review |
| `art-lsg-06` Auction Economics: Does LSG Pay for Impact or Reputation? | semantic-duplicate | `cf-lsg-031` The Auction Price Puzzle: What Is a Win Worth to Lucknow Super Giants? (0.6; shared: auction) | pending review |
| `art-lsg-07` The Role-Allocation Puzzle: Finding LSG's Best Batting and Bowling Combination | partial-overlap | `cf-lsg-027` Opponent-Specific Plans: Should Lucknow Super Giants Build a New XI for Every Match? (0.315; shared: selection) | pending review |
| `art-lsg-08` The Early Years: How LSG's Tactical Identity Has Changed | semantic-duplicate | `cf-lsg-064` The Captaincy Eras: How Leadership Changed Lucknow Super Giants’s Playing Identity (0.64; shared: history, identity) | pending review |
| `art-lsg-09` The Dot-Ball Paradox: When Conservative Batting Becomes Expensive | partial-overlap | `cf-lsg-009` Dot-Ball Debt: How Lucknow Super Giants Can Price the Cost of a Quiet Over (0.31; shared: dotBall) | pending review |
| `art-lsg-10` The Next LSG Blueprint: Which Player Profiles Fit Its Future? | partial-overlap | `cf-lsg-071` The Next Opener: What Profile Should Lucknow Super Giants Scout? (0.363; shared: future, scouting) | pending review |

## Aspect key

- 1. Batting Intelligence (`batting`)
- 2. Bowling & Fielding Science (`bowling-fielding`)
- 3. Tactical & Match Intelligence (`tactical`)
- 4. Auction & Squad Economics (`auction-economics`)
- 5. Franchise Business & Revenue (`business`)
- 6. Fan Psychology & Culture (`fan-culture`)
- 7. History, Legacy & Turning Points (`history`)
- 8. Player Development & Scouting (`scouting`)
- 9. Data Science & Predictive Analytics (`data-science`)
- 10. Future Strategy & Innovation (`future`)
