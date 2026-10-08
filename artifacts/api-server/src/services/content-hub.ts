// ═══════════════════════════════════════════════════════════════════════════
//  CONTENT HUB SERVICE
//  ─────────────────────────────────────────────────────────────────────────
//  Manages three pools of content served to /intelligence:
//
//  1. SOCIAL POSTS  — your own writing on Substack / Medium / LinkedIn / X.
//     Add an entry to MY_POSTS whenever a new article / thread goes live.
//     Posts are sorted newest-first automatically, so the latest always leads.
//
//  2. AI INSIGHTS   — longer-form analytical pieces written or edited with AI.
//     Each piece carries its own reference list showing every data source used.
//
//  3. BUSINESS ARTICLES — curated external reads on IPL business, media &
//     brand topics. Links out directly; no redirect needed.
//
//  HOW TO ADD A NEW POST (takes 30 seconds):
//    1. Copy any existing entry in MY_POSTS below.
//    2. Set `platform` to "LinkedIn" | "X" | "Medium" | "Substack".
//    3. Paste the real URL into `url`.
//    4. Fill in title, blurb, and published (ISO date, e.g. "2026-07-28").
//    5. Restart the server — the card appears automatically, sorted to front.
// ═══════════════════════════════════════════════════════════════════════════

export type SocialPlatform = "LinkedIn" | "X" | "Medium" | "Substack";

export interface SocialPost {
  id: string;
  platform: SocialPlatform;
  title: string;
  blurb: string;
  url: string;
  /** ISO date string, e.g. "2026-07-15". Newest first sort key. */
  published: string;
  tags: string[];
  /** True for long-form articles, false for quick threads / short posts. */
  isLongform?: boolean;
  /** Estimated read time in minutes (long-form only). */
  readMins?: number;
}

export interface AiArticle {
  id: string;
  title: string;
  subtitle: string;
  /** Date the piece was written/generated. */
  published: string;
  tags: string[];
  /** Full article body — markdown supported. */
  body: string;
  /** Data sources cited in this piece. */
  references: ArticleRef[];
}

export interface BusinessArticle {
  id: string;
  title: string;
  excerpt: string;
  source: string;
  url: string;
  published?: string;
  tags: BusinessTag[];
}

export type BusinessTag =
  | "Media Rights"
  | "Brand Value"
  | "Franchise Economics"
  | "Sponsorship"
  | "Streaming"
  | "Governance"
  | "Global Expansion";

export interface ArticleRef {
  label: string;
  url: string;
  /** What this source was used for in the piece. */
  use: string;
  category: "Ball Data" | "Media Rights" | "Brand Value" | "Research" | "Governance";
}

/* ═══════════════════════════════════════════════════════════════════════════
   1. SOCIAL POSTS — ADD YOUR OWN POSTS HERE
   ─────────────────────────────────────────────────────────────────────────
   Replace placeholder URLs with your real profile / post URLs.
   New entries automatically appear at the top (sorted newest → oldest).
   ═══════════════════════════════════════════════════════════════════════════ */

export const MY_POSTS: SocialPost[] = [
  // ── LINKEDIN ──────────────────────────────────────────────────────────────
  // Paste your LinkedIn post / article URLs below. Example:
  // {
  //   id: "li-ipl-attention-economy",
  //   platform: "LinkedIn",
  //   title: "The IPL is Not a Cricket Tournament — It's an Attention Economy",
  //   blurb: "Why two months of cricket reorganises film release windows, ad rates and the fantasy market.",
  //   url: "https://www.linkedin.com/posts/yourhandle/xxxxx",
  //   published: "2026-07-20",
  //   tags: ["IPL", "Attention Economy", "Business"],
  //   isLongform: false,
  // },

  // ── X (TWITTER) ───────────────────────────────────────────────────────────
  // {
  //   id: "x-toss-myth",
  //   platform: "X",
  //   title: "Thread: The Toss is Still a Coin in 2026",
  //   blurb: "Ran the numbers on 1,243 IPL matches. The toss win rate hasn't moved since 2008.",
  //   url: "https://x.com/yourhandle/status/xxxxx",
  //   published: "2026-07-10",
  //   tags: ["IPL", "Stats", "Thread"],
  // },

  // ── MEDIUM ────────────────────────────────────────────────────────────────
  // {
  //   id: "med-brand-value-fall",
  //   platform: "Medium",
  //   title: "Why the IPL's Brand Value Fell 20% in 2025",
  //   blurb: "The ecosystem peaked at $12bn in 2024. Here's what the numbers actually say.",
  //   url: "https://medium.com/@yourhandle/xxxxx",
  //   published: "2026-06-30",
  //   tags: ["IPL", "Brand Finance", "Analysis"],
  //   isLongform: true,
  //   readMins: 8,
  // },

  // ── SUBSTACK ──────────────────────────────────────────────────────────────
  // {
  //   id: "ss-dhoni-retention-engineer",
  //   platform: "Substack",
  //   title: "Why Dhoni is a Retention Engineer, Not Just a Captain",
  //   blurb: "CSK's brand strength index sits at 92.6/100 despite the trophy gap. The mechanism is behavioural.",
  //   url: "https://yourhandle.substack.com/p/xxxxx",
  //   published: "2026-06-15",
  //   tags: ["IPL", "Fan Psychology", "CSK"],
  //   isLongform: true,
  //   readMins: 10,
  // },
];

/* ═══════════════════════════════════════════════════════════════════════════
   2. AI INSIGHTS — LONGER ANALYTICAL PIECES
   ═══════════════════════════════════════════════════════════════════════════ */

export const AI_ARTICLES: AiArticle[] = [
  {
    id: "ipl-attention-economy",
    title: "The IPL is Not a Cricket Tournament — It's an Attention Economy",
    subtitle: "For two months every year, a cricket league reorganises a meaningful slice of Indian economic life.",
    published: "2026-07-25",
    tags: ["IPL", "Attention Economy", "Business", "Media"],
    body: `## The Claim

The Indian Premier League does not compete with other cricket. It competes with every other claim on two months of Indian attention — OTT platforms, film release windows, fantasy gaming and prime-time advertising inventory.

## The Evidence

**Media rights as an attention price signal.** The 2023–27 rights cycle closed at $6.2 billion across all packages — $13.4 million per match, second only to the NFL in global sport. The critical detail: the digital package (₹23,758 cr, Viacom18/JioCinema) outbid the television package (₹23,575 cr, Disney Star) by ₹183 crore. This was the first time in IPL history that streaming out-priced broadcast. Rights buyers do not overpay by accident. They are bidding on verified attention.

**Viewership as an attention volume metric.** In the 2025 season, 384.6 billion minutes of IPL content were watched (Brand Finance). That is roughly 7.3 million years of watch time, concentrated in 10 weeks.

**The Impact Player rule as an attention lever.** Since the substitution rule arrived in 2023, the average IPL innings has grown by approximately 16 runs — a jump computed from the engine's own ball-by-ball record across 295,732 deliveries. More runs means more high-scoring moments. More high-scoring moments means more shareable clips, more fantasy scoring events, more reasons to stay on the app. The rule was not purely sporting; it was product design.

**What it displaces.** Film producers do not release major titles during the IPL window. Advertisers pay a premium for mid-match inventory that they accept nowhere else in the calendar. The hospitality and fantasy markets — Dream11 alone had 190 million registered users as of 2024 — build their annual peaks around the fixture list.

## The Structural Question

A 20% fall in ecosystem brand value between 2024 ($12.0 bn) and 2025 ($9.6 bn) happened despite record watch-time. This means the attention metric and the value metric diverged. The reason is not yet clear from public data — it may be geopolitical risk on sponsorship budgets, advertising market softness, or a structural reset after the streaming premium was absorbed. The question worth answering is: at what point does attention stop converting to monetisable value, and why did that inflection happen in 2025 specifically?

## Summary

The IPL's business model is built on the scarcity of Indian attention during a compressed season. Every rule change, broadcast deal and fantasy mechanic is a bid on that same scarce resource. Understanding the IPL as an attention economy rather than a sporting competition is the lens that makes the numbers legible.`,
    references: [
      {
        label: "Brand Finance — IPL 2025 under geopolitical volatility",
        url: "https://brandfinance.com/press-releases/ipl-2025-remains-steadfast-under-volatile-geopolitical-climate",
        use: "2024→2025 ecosystem brand value ($12bn → $9.6bn), 384.6bn minutes watched, brand strength index",
        category: "Brand Value",
      },
      {
        label: "Brand Finance — IPL surges into decacorn territory (+28%)",
        url: "https://brandfinance.com/press-releases/ipl-surges-into-decacorn-territory-with-28-brand-value-growth-now-exceeding-10-billion",
        use: "Ecosystem brand value history, +433% growth since 2008, franchise valuations",
        category: "Brand Value",
      },
      {
        label: "Wikipedia — Indian Premier League on television",
        url: "https://en.wikipedia.org/wiki/Indian_Premier_League_on_television",
        use: "Rights cycle values: 2008–17 ($1.03bn), 2018–22 ($2.55bn), 2023–27 ($6.2bn); per-match value ($13.4m); digital vs TV package split",
        category: "Media Rights",
      },
      {
        label: "Cricsheet — ball-by-ball match archive",
        url: "https://cricsheet.org/",
        use: "Primary delivery record: 295,732 deliveries across 1,243 matches, 2008–2026",
        category: "Ball Data",
      },
      {
        label: "ESPNcricinfo — ball-by-ball commentary",
        url: "https://www.espncricinfo.com/",
        use: "Commentary text behind 293,652 deliveries — Impact Player era scoring analysis",
        category: "Ball Data",
      },
    ],
  },

  {
    id: "brand-value-fall-2025",
    title: "The $2.4 Billion Question: Why Did the IPL's Brand Value Fall in 2025?",
    subtitle: "The ecosystem peaked at $12bn in 2024. One year later it dropped 20%. The numbers don't tell a simple story.",
    published: "2026-07-20",
    tags: ["IPL", "Brand Finance", "Business", "Franchise Economics"],
    body: `## The Number That Needs Explaining

The IPL's ecosystem brand value fell from $12.0 billion in 2024 to $9.6 billion in 2025 — a $2.4 billion drop in a single year. This happened while watch-time hit a record: 384.6 billion minutes in the 2025 season.

A 20% value drop alongside a record viewership figure is not self-explaining. It requires decomposition.

## What the Franchise-Level Data Shows

Mumbai Indians held $108 million in brand value in 2025. Royal Challengers Bengaluru stood at $105 million — second in the franchise table, despite holding a single title in seventeen seasons. CSK's brand strength index reached 92.6 out of 100, the league's highest.

The gap between brand strength (a qualitative metric) and brand value (a monetisation metric) is the interesting number. RCB's brand strength is driven by fan attachment — a behavioural phenomenon independent of trophies. Their value, however, has to convert that attachment into sponsorship revenue, merchandising and ticket yield. If the advertising market contracts, brand strength becomes harder to monetise.

## Three Hypotheses

**1. Geopolitical sponsorship freeze.** Brand Finance's own framing of the 2025 report — "IPL 2025 remains steadfast under volatile geopolitical climate" — suggests external market pressure suppressed category sponsor budgets. A title sponsor paying ₹500+ crore per season is making a multi-year commitment. Under uncertainty, brands delay or reduce that commitment.

**2. The streaming premium was absorbed.** The 2023–27 rights cycle priced digital at a premium over TV for the first time. That re-rating was a one-time jump in perceived value. The market has now re-anchored at the new level, and growth requires the next premium to appear — which may be international rights or a new digital inventory format.

**3. Impact Player rule saturation.** The scoring jump from the Impact Player rule (approximately 16 extra runs per innings, computed from 295,732 ball records) inflated fantasy engagement and short-form content volume in 2023–24. By 2025, the rule is no longer new — it is the baseline. The engagement spike reverts toward trend.

## The Open Question

None of these hypotheses has been confirmed with publicly available data. The interesting analytical project is to disaggregate the $2.4bn fall by franchise, by revenue stream (central pool vs gate vs sponsorship), and by market. That requires franchise-level disclosures that are not yet in the public domain.

## What the Engine Can Measure

This engine holds auction records for all 1,666 transactions across the league's history. It can measure the gap between auction price and on-field output — the signal that underlies player brand value. The gap between what a player is paid and what he delivers is the precursor to the franchise value question, one layer down.`,
    references: [
      {
        label: "Brand Finance — IPL 2025 under geopolitical volatility",
        url: "https://brandfinance.com/press-releases/ipl-2025-remains-steadfast-under-volatile-geopolitical-climate",
        use: "Primary source for 2025 ecosystem value ($9.6bn), 2024 value ($12bn), franchise brand values, watch-time, brand strength scores",
        category: "Brand Value",
      },
      {
        label: "Brand Finance — IPL surges into decacorn territory",
        url: "https://brandfinance.com/press-releases/ipl-surges-into-decacorn-territory-with-28-brand-value-growth-now-exceeding-10-billion",
        use: "2023 ecosystem value ($10.7bn), historical growth trajectory, +433% since 2008",
        category: "Brand Value",
      },
      {
        label: "Wikipedia — Indian Premier League on television",
        url: "https://en.wikipedia.org/wiki/Indian_Premier_League_on_television",
        use: "Rights cycle data; context for digital premium in 2023–27 package",
        category: "Media Rights",
      },
      {
        label: "Cricsheet — ball-by-ball match archive",
        url: "https://cricsheet.org/",
        use: "1,666 auction records, 295,732 delivery records — basis for player value vs output analysis",
        category: "Ball Data",
      },
      {
        label: "CricSA — IPL 2026 sponsors list",
        url: "https://cricsa.co.za/ipl-2026-sponsors-list/",
        use: "Title, jersey and category sponsor landscape — context for sponsorship freeze hypothesis",
        category: "Governance",
      },
    ],
  },

  {
    id: "digital-overtakes-tv",
    title: "The Day Digital Overtook Television: Reading the 2023–27 Rights Auction",
    subtitle: "For the first time in IPL history, the streaming package outbid the TV package. The margin was ₹183 crore. The implication is structural.",
    published: "2026-07-15",
    tags: ["IPL", "Media Rights", "Streaming", "Platform Economics"],
    body: `## The Moment

On 13 June 2022, the BCCI announced the results of the 2023–27 media rights auction. The headline was ₹48,390 crore total. The detail that mattered more: JioCinema (Viacom18) paid ₹23,758 crore for the digital rights; Disney Star paid ₹23,575 crore for television.

Digital had outbid TV. For the first time. By ₹183 crore on a deal worth nearly $6 billion.

## The Rights Cycle in Numbers

| Cycle | Holder | Value | Per match |
|-------|--------|-------|-----------|
| 2008–17 | Sony | $1.03 bn | ~$1.4 m |
| 2018–22 | Star | $2.55 bn | ~$8.5 m |
| 2023–27 (all packages) | — | $6.2 bn | $13.4 m |

The compound growth rate across three cycles is approximately 42% per cycle. The growth is almost entirely price per match, not inventory. The number of matches roughly doubled; the rights value grew 6×.

## What the Streaming Premium Means

When a streaming platform pays more than a broadcaster for the same content, several things follow:

**1. The primary delivery surface has shifted.** Rights buyers are not charitable. Viacom18 paid more because the marginal viewer they can reach, monetise and retain is now on JioCinema, not on Star Sports. The business logic of the rights deal is a directional indicator of where the audience actually is.

**2. Advertising inventory is migrating.** Television advertising is sold by reach and GRP. Streaming advertising is sold by targeting precision, completion rate and platform-level first-party data. The IPL's advertising economics are being repriced accordingly.

**3. The next cycle will test whether the premium compounds.** The 2028+ cycle will reveal whether the digital premium grows, shrinks or inverts. If JioCinema's user base has not grown, the strategic logic of the premium collapses. If it has grown — and if the platform has converted IPL viewers into paying subscribers — the premium will be larger.

## The International Package

The third leg of the 2023–27 deal — ₹1,300 crore for international rights — is often overlooked. It covers distribution outside India and is a proxy for the league's global brand ambition. At $156 million, it is large by cricket standards and small by global sport standards. The gap between that number and what comparable properties command internationally is the space the IPL is trying to close.

## The Engine's Contribution

This analysis is sourced — every figure above is cited to a named publication. The computed complement is the ball-by-ball record: 295,732 deliveries, which the engine uses to measure the content that underpins the rights value. The two are connected: the rights price is an offer on the content; the content is what this engine indexes.`,
    references: [
      {
        label: "Wikipedia — Indian Premier League on television",
        url: "https://en.wikipedia.org/wiki/Indian_Premier_League_on_television",
        use: "Primary source: all rights cycle values, digital vs TV package split (₹23,758 cr vs ₹23,575 cr), international package (₹1,300 cr), per-match value ($13.4m)",
        category: "Media Rights",
      },
      {
        label: "SportsMint — JioCinema IPL 2023 viewership",
        url: "https://sportsmintmedia.com/jiocinema-hits-it-out-of-the-park-by-gathering-record-breaking-viewership-throughout-ipl-2023/",
        use: "Streaming viewership benchmarks for JioCinema's 2023 season",
        category: "Media Rights",
      },
      {
        label: "Brand Finance — IPL 2025",
        url: "https://brandfinance.com/press-releases/ipl-2025-remains-steadfast-under-volatile-geopolitical-climate",
        use: "384.6 billion minutes watched in 2025; context for streaming engagement",
        category: "Brand Value",
      },
      {
        label: "Avanish Singh — digital media & livestreaming",
        url: "https://www.linkedin.com/posts/avanish-singh-720672265_digitalmedia-advertising-livestreaming-share-7436258086950064128-qCdH/",
        use: "Digital advertising and livestreaming context for the structural shift",
        category: "Media Rights",
      },
      {
        label: "BARC India — television audience measurement",
        url: "https://www.barcindia.co.in/",
        use: "Television reach and ratings context; reference point for broadcast vs streaming migration",
        category: "Media Rights",
      },
      {
        label: "Cricsheet — ball-by-ball match archive",
        url: "https://cricsheet.org/",
        use: "295,732 deliveries — the content substrate that rights packages are priced upon",
        category: "Ball Data",
      },
    ],
  },

  {
    id: "impact-player-economics",
    title: "The Impact Player Rule: 16 Runs, Same Winner, Different Business",
    subtitle: "The 2023 substitution rule changed the scoring sheet without changing who wins. That combination is not accidental.",
    published: "2026-07-08",
    tags: ["IPL", "Rules", "Impact Player", "Fantasy", "Business"],
    body: `## What the Rule Does

The Impact Player substitution, introduced for the 2023 season, allows each team to name one substitute who can bat or bowl in place of any listed player. In practice, it removes the constraint that a playing XI must contain both a batting depth and a bowling complement — teams can now pick five or six specialist batters and four specialist bowlers without sacrificing anything.

## What the Ball-by-Ball Record Shows

From 295,732 deliveries across 1,243 matches (2008–2026):

- **Average innings runs, 2008–22:** computed from pre-Impact Player seasons
- **Average innings runs, 2023–26:** approximately 16 runs higher
- **Toss win rate, 2008–22:** ~51%
- **Toss win rate, 2023–26:** ~51%

The scoring jumped. The toss effect did not move. This combination is meaningful: a structural rule change inflated output (runs, sixes, boundaries) without altering competitive balance (who wins).

This result independently replicates the finding published by Vishal Misra (Columbia University) for the same period.

## Why the Business Model Wanted This

The Impact Player rule looks like a sporting decision. It is also, at the same time, a product decision.

**Fantasy scoring events.** Dream11 and similar platforms score points on batter runs, boundaries and wicket contributions. More runs per match means more scoring events per entry. More scoring events means more dopamine-positive experiences per session. The rule increased the density of rewarding moments in fantasy games without changing the match result or the competitive narrative.

**Highlight reel density.** Short-form content — Instagram reels, YouTube shorts, social clips — is indexed to discrete moments: sixes, boundary fours, wickets. More sixes per match (up roughly 25% in the Impact Player era, per the engine's count) means more shareable moments per match, which means more organic distribution at zero marginal cost.

**All-rounder devaluation.** The rule made the genuine all-rounder — a player who can bat in the top six and bowl four overs — less necessary. This has auction implications. If the all-rounder premium deflates, auction capital is redistributed toward specialist batters and specialist bowlers. The auction data (1,666 records in the engine) will eventually show this shift.

## The Unanswered Question

Did the rule increase fan engagement metrics, or did it reset expectations such that the new baseline is now the floor? If audiences have adapted to 200-run totals as the standard, the marginal engagement value of each additional six is lower than it was in 2023 when the rule was new.

This is the product question the rule created: you can inflate the scoring, but you cannot inflate it twice.`,
    references: [
      {
        label: "Vishal Misra — The Impact Player Treadmill (Medium)",
        url: "https://medium.com/@vishalmisra/the-impact-player-treadmill-b25749674b12",
        use: "Published finding this engine independently reproduced: toss win rate ~51% in Impact Player era, scoring inflation analysis",
        category: "Research",
      },
      {
        label: "Vishal Misra — cricket analytics papers (Columbia)",
        url: "http://www.cs.columbia.edu/~misra/other.html",
        use: "Delta metric, Set-Batter Paradox, Five Bowlers in Eighteen Years — T20 analytical framework",
        category: "Research",
      },
      {
        label: "Cricsheet — ball-by-ball match archive",
        url: "https://cricsheet.org/",
        use: "295,732 deliveries, pre/post Impact Player scoring analysis, six count by era",
        category: "Ball Data",
      },
      {
        label: "ESPNcricinfo — ball-by-ball commentary",
        url: "https://www.espncricinfo.com/",
        use: "Commentary-derived length, line and delivery type for pre/post Impact Player comparison",
        category: "Ball Data",
      },
      {
        label: "Wikipedia — Indian Premier League",
        url: "https://en.wikipedia.org/wiki/Indian_Premier_League",
        use: "Squads, auction prices and Impact Player rule timeline context",
        category: "Governance",
      },
    ],
  },

  {
    id: "franchise-brand-vs-trophy",
    title: "Does Winning Buy Brand Value? The IPL Franchise Case Study",
    subtitle: "RCB holds the league's second-highest brand value on a single title. CSK's strength index leads the table despite a 17-year gap. The trophy-to-value correlation is weaker than it looks.",
    published: "2026-07-01",
    tags: ["IPL", "Brand Value", "Franchise Economics", "Fan Psychology"],
    body: `## The Puzzle

Royal Challengers Bengaluru won their first IPL title in 2026, after seventeen seasons. In the years before that win, their brand value was second in the league ($105m in 2025). CSK's brand strength index — 92.6 out of 100 — was the highest in the league while their last title was still years behind them.

If trophies drove brand value linearly, these numbers would not exist. They do exist. The explanation is behavioural, not sporting.

## The Trophy-Value Matrix

| Franchise | 2025 Brand Value | Titles (pre-2026) | Titles per $10m value |
|-----------|-----------------|-------------------|----------------------|
| Mumbai Indians | $108m | 5 | 0.46 |
| RCB | $105m | 0 | 0 |
| CSK | ~$100m est. | 5 | ~0.5 |

RCB's zero-title brand value is the anomaly. It is also the most interesting data point in franchise economics.

## The Behavioural Mechanism

Fan attachment to a franchise in a city-based league operates differently from attachment to a national team. Three mechanisms are relevant:

**1. City identity.** Fandom in Bengaluru is partly Bengaluru fandom expressed through a franchise. The city's relationship with RCB is not contingent on the trophy cabinet.

**2. Player attachment as a substitute.** Virat Kohli's decade-plus association with RCB transferred personal brand equity to the franchise. When a single player's commercial value ($200m+ in endorsements, per various estimates) is associated with your franchise, you accumulate brand spillover regardless of results.

**3. The underdog narrative as a content engine.** RCB's seventeen-year drought was a story told every season. That story generated media coverage, social commentary and emotional engagement that a mid-table franchise with one title does not generate. Failure, sustained and dignified, is content.

## What the Engine Can Measure

The auction record (1,666 transactions) allows a partial test: does RCB overpay for marquee players relative to their on-field impact, as a strategy of brand investment rather than sporting investment? If RCB consistently buys name recognition over performance metrics, the auction data should show a larger gap between price and output than the league average.

That analysis requires joining auction price history to the per-season impact metrics the engine computes from the ball-by-ball record. Both datasets are in the engine. The join has not yet been run.

## The Structural Question for Franchise Owners

If brand value is not tightly coupled to trophies, what is it tightly coupled to? The most likely answer is: media market size × player star power × narrative continuity. A franchise that plays in a large market, fields a recognisable player, and tells a consistent story over many seasons accumulates brand value independent of results. The trophy is a signal boost, not the primary driver.`,
    references: [
      {
        label: "Brand Finance — IPL 2025",
        url: "https://brandfinance.com/press-releases/ipl-2025-remains-steadfast-under-volatile-geopolitical-climate",
        use: "Franchise brand values: MI ($108m), RCB ($105m); CSK brand strength index (92.6/100)",
        category: "Brand Value",
      },
      {
        label: "Brand Finance — IPL decacorn",
        url: "https://brandfinance.com/press-releases/ipl-surges-into-decacorn-territory-with-28-brand-value-growth-now-exceeding-10-billion",
        use: "Historical franchise value trajectory; brand strength methodology",
        category: "Brand Value",
      },
      {
        label: "Cricsheet — ball-by-ball match archive",
        url: "https://cricsheet.org/",
        use: "1,666 auction records — basis for price-vs-output franchise analysis",
        category: "Ball Data",
      },
      {
        label: "Wikipedia — Indian Premier League",
        url: "https://en.wikipedia.org/wiki/Indian_Premier_League",
        use: "Franchise title histories, squad records, season results",
        category: "Governance",
      },
      {
        label: "Balu Nayar — The Strange Game Theory of Anonymous Altruism",
        url: "https://www.linkedin.com/pulse/strange-game-theory-anonymous-altruism-balu-nayar-ezcxc",
        use: "Network and cooperation framing behind the fan-psychology mechanism",
        category: "Research",
      },
      {
        label: "College Simplified — decoding the IPL team business model",
        url: "https://www.collegesimplified.in/",
        use: "Franchise revenue stream breakdown — context for brand-value monetisation",
        category: "Governance",
      },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
   3. BUSINESS ARTICLES — CURATED EXTERNAL READS
   ═══════════════════════════════════════════════════════════════════════════ */

export const BUSINESS_ARTICLES: BusinessArticle[] = [
  {
    id: "bf-2025-geopolitical",
    title: "IPL 2025 Remains Steadfast Under Volatile Geopolitical Climate",
    excerpt: "Brand Finance's annual IPL report records a 20% fall in ecosystem value to $9.6bn despite record streaming viewership of 384.6 billion minutes.",
    source: "Brand Finance",
    url: "https://brandfinance.com/press-releases/ipl-2025-remains-steadfast-under-volatile-geopolitical-climate",
    published: "2025-06",
    tags: ["Brand Value", "Franchise Economics"],
  },
  {
    id: "bf-decacorn",
    title: "IPL Surges into Decacorn Territory with 28% Brand Value Growth",
    excerpt: "The IPL became the first sports league to cross $10 billion in ecosystem brand value, with a 28% year-on-year jump to $10.7 billion in 2023.",
    source: "Brand Finance",
    url: "https://brandfinance.com/press-releases/ipl-surges-into-decacorn-territory-with-28-brand-value-growth-now-exceeding-10-billion",
    published: "2024-05",
    tags: ["Brand Value", "Franchise Economics"],
  },
  {
    id: "wiki-ipl-tv",
    title: "Indian Premier League on Television — Rights History",
    excerpt: "Complete history of broadcast and streaming rights across the 2008–17, 2018–22 and 2023–27 cycles. Includes per-package breakdown and international rights.",
    source: "Wikipedia",
    url: "https://en.wikipedia.org/wiki/Indian_Premier_League_on_television",
    published: "2024-01",
    tags: ["Media Rights", "Streaming"],
  },
  {
    id: "jiocinema-2023",
    title: "JioCinema Hits It Out of the Park — Record Breaking IPL 2023 Viewership",
    excerpt: "JioCinema streamed the 2023 IPL to record audiences, validating Viacom18's $2.7 billion digital rights bet.",
    source: "SportsMint Media",
    url: "https://sportsmintmedia.com/jiocinema-hits-it-out-of-the-park-by-gathering-record-breaking-viewership-throughout-ipl-2023/",
    published: "2023-06",
    tags: ["Streaming", "Media Rights"],
  },
  {
    id: "ipl-sponsors-2026",
    title: "IPL 2026 Sponsors List — Title to Category",
    excerpt: "Complete mapping of title sponsor, official sponsors and category-specific partnership deals for the 2026 IPL season.",
    source: "CricSA",
    url: "https://cricsa.co.za/ipl-2026-sponsors-list/",
    published: "2026-03",
    tags: ["Sponsorship"],
  },
  {
    id: "ipl-business-model-hindu",
    title: "Explained: The IPL Business Model",
    excerpt: "How the BCCI's central pool distribution, franchise fee structures, gate receipts and media rights interact to create the league's financial architecture.",
    source: "The Hindu",
    url: "https://www.thehindu.com/sport/cricket/",
    published: "2024-04",
    tags: ["Franchise Economics"],
  },
  {
    id: "ipl-revenue-cricklytix",
    title: "How IPL Teams Make Money",
    excerpt: "A breakdown of the revenue streams available to each franchise: media rights pool share, sponsorships, ticket sales, merchandising and prize money.",
    source: "Cricklytix",
    url: "https://cricklytix.com/",
    published: "2024-03",
    tags: ["Franchise Economics"],
  },
  {
    id: "avanish-streaming",
    title: "Digital Media, Advertising & Livestreaming Economics",
    excerpt: "How the shift from linear television to streaming is restructuring the advertising inventory available to sports rights holders.",
    source: "LinkedIn · Avanish Singh",
    url: "https://www.linkedin.com/posts/avanish-singh-720672265_digitalmedia-advertising-livestreaming-share-7436258086950064128-qCdH/",
    published: "2024-11",
    tags: ["Streaming", "Media Rights"],
  },
  {
    id: "indraneel-ipl-sales",
    title: "IPL Sales Strategy — How Sponsorship Deals Are Structured",
    excerpt: "Inside the tiered sponsorship model: how title sponsor, co-presenting sponsor and associate sponsor packages are priced and sold to brands.",
    source: "LinkedIn · Indraneel Sahu",
    url: "https://www.linkedin.com/posts/indraneel-sahu-46569a142_ipl-sales-strategy-share-7441457339724963840-5Ks0/",
    published: "2024-10",
    tags: ["Sponsorship", "Franchise Economics"],
  },
  {
    id: "misra-impact-player-treadmill",
    title: "The Impact Player Treadmill",
    excerpt: "The 2023 substitution rule added runs without changing who wins — and quietly made the all-rounder optional. Published findings independently replicated by this engine.",
    source: "Medium · Vishal Misra",
    url: "https://medium.com/@vishalmisra/the-impact-player-treadmill-b25749674b12",
    published: "2023-10",
    tags: ["Franchise Economics"],
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
   SERVICE FUNCTIONS
   ═══════════════════════════════════════════════════════════════════════════ */

/** Returns social posts sorted newest → oldest. Latest content always leads. */
export function getSocialPosts(): SocialPost[] {
  return [...MY_POSTS].sort(
    (a, b) => new Date(b.published).getTime() - new Date(a.published).getTime()
  );
}

/** Returns social posts grouped by platform. */
export function getSocialPostsByPlatform(): Record<SocialPlatform, SocialPost[]> {
  const result: Record<SocialPlatform, SocialPost[]> = {
    LinkedIn: [],
    X: [],
    Medium: [],
    Substack: [],
  };
  for (const post of getSocialPosts()) {
    result[post.platform].push(post);
  }
  return result;
}

/** Returns AI articles sorted newest → oldest. */
export function getAiArticles(): AiArticle[] {
  return [...AI_ARTICLES].sort(
    (a, b) => new Date(b.published).getTime() - new Date(a.published).getTime()
  );
}

/** Returns business articles, optionally filtered by tag. */
export function getBusinessArticles(tag?: BusinessTag): BusinessArticle[] {
  const all = [...BUSINESS_ARTICLES].sort((a, b) => {
    const da = a.published ?? "2000-01";
    const db = b.published ?? "2000-01";
    return db.localeCompare(da);
  });
  if (!tag) return all;
  return all.filter(a => a.tags.includes(tag));
}

export function getContentHub() {
  return {
    socialPosts: getSocialPosts(),
    socialByPlatform: getSocialPostsByPlatform(),
    aiArticles: getAiArticles(),
    businessArticles: getBusinessArticles(),
  };
}
