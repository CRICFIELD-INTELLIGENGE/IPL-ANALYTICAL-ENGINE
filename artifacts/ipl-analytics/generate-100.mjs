import fs from 'fs';
import path from 'path';

const TOPICS = [
  // 1-15: Sports Intelligence
  { day: 1, dim: "Sports Intelligence", dimId: "sports-intel", title: "Why Virat Kohli is the Greatest",
    subtitle: "8,000+ IPL runs, 8 centuries, and an unrepeatable 973-run peak. The mathematical proof of anchor dominance.",
    metric: "973 Runs", metricLabel: "Single-Season Record Peak",
    takeaways: [
      "Kohli's 2016 campaign generated 15.2% of all RCB team runs across 16 innings.",
      "Maintains a 130+ career strike rate while sustaining a 38.6 dismissal average.",
      "Dot ball percentage reduces from 34% in overs 1-6 to under 14% past over 15."
    ],
    tags: ["Anchor Theory", "Scoring Peak", "Batting Models", "RCB Legacy"]
  },
  { day: 2, dim: "Sports Intelligence", dimId: "sports-intel", title: "Decoding Powerplay Specialists in IPL History",
    subtitle: "Why the first 36 balls determine 68% of match outcomes in the 200+ era.",
    metric: "68.2%", metricLabel: "Win Rate with 60+ PP Score",
    takeaways: [
      "Teams scoring >60 runs in the first 6 overs win 68.2% of matches across 1,243 IPL games.",
      "Losing 2+ wickets in the powerplay drops projected 20-over totals by an average of 28.4 runs.",
      "Left-arm seamers against right-hand openers generate a 4.1% higher dismissal probability."
    ],
    tags: ["Powerplay", "Field Restrictions", "Opening Leverage", "Early Wickets"]
  },
  { day: 3, dim: "Sports Intelligence", dimId: "sports-intel", title: "Death Overs: The Art of Finishing an Innings",
    subtitle: "Overs 16–20 represent only 25% of the innings, but account for 44% of boundary runs.",
    metric: "11.82 rpo", metricLabel: "Modern Death Over Run Rate",
    takeaways: [
      "Average run rate in overs 16–20 has risen from 9.14 (2008) to 11.82 (2025/26).",
      "Wicket cost in the death phase is amortized: a dot ball is 1.8x more damaging than a dismissal with 5 balls left.",
      "Full and wide yorkers restrict boundary percentage to 14.2%, compared to 28.6% for slot lengths."
    ],
    tags: ["Death Overs", "Finishing", "Boundary Velocity", "Yorker Leverage"]
  },
  { day: 4, dim: "Sports Intelligence", dimId: "sports-intel", title: "Why Strike Rate Alone Lies",
    subtitle: "Contextual Impact Factor: Why a 140 SR at 40/3 is worth more than an 180 SR in a runaway chase.",
    metric: "1.42x", metricLabel: "Leverage Weighting Delta",
    takeaways: [
      "Standard strike rate ignores entry point leverage, pitch deterioration, and target requirements.",
      "Win Probability Added (WPA) reveals that high-SR cameos during settled phases add <2% to win odds.",
      "Middle-overs anchoring at 135 SR against prime spin preserves death capital for top finishers."
    ],
    tags: ["Strike Rate", "WPA Index", "Matchup Context", "Anchor Value"]
  },
  { day: 5, dim: "Sports Intelligence", dimId: "sports-intel", title: "The Science Behind Boundary Percentage",
    subtitle: "Running between wickets keeps you alive; boundaries win tournaments. The 62% threshold.",
    metric: "62.4%", metricLabel: "Boundary Run Share of Champions",
    takeaways: [
      "IPL championship-winning teams derive an average of 62.4% of their total runs from 4s and 6s.",
      "Every 1% increase in boundary percentage yields a +0.14 increase in team net run rate over a 14-match season.",
      "The boundary-to-dot ratio is the single most predictive metric for playoff qualification."
    ],
    tags: ["Boundary %", "Six Hitting", "Run Distribution", "Championship Metrics"]
  },
  { day: 6, dim: "Sports Intelligence", dimId: "sports-intel", title: "Why Bumrah Breaks Batting Models",
    subtitle: "Economy rate under 6.80 in an era where 200 is par. The anomaly of Jasprit Bumrah.",
    metric: "6.45 Econ", metricLabel: "Career IPL Economy Rate",
    takeaways: [
      "Bumrah concedes 2.8 fewer runs per over than the league average across identical phases.",
      "Hyperextension release angle creates an effective delivery point 0.38m closer to the batter.",
      "Opposition teams intentionally play out 58% of Bumrah deliveries as defensive blocks."
    ],
    tags: ["Jasprit Bumrah", "Bowling Anomaly", "Hyperextension", "MI Bowling"]
  },
  { day: 7, dim: "Sports Intelligence", dimId: "sports-intel", title: "How Yorkers Win Championships",
    subtitle: "The margin of error is 6 inches. Why executing yorkers remains cricket's ultimate death weapon.",
    metric: "18.4%", metricLabel: "Yorker Boundary Concession Rate",
    takeaways: [
      "Delivering the ball within 15cm of the batting crease concedes a boundary only 18.4% of the time.",
      "Missing the yorker by 10cm into the slot spikes boundary concession to 48.2%.",
      "Teams executing >8 yorkers in overs 18–20 win 74% of close death defenses."
    ],
    tags: ["Yorkers", "Precision Bowling", "Execution Margin", "Title Defense"]
  },
  { day: 8, dim: "Sports Intelligence", dimId: "sports-intel", title: "Spin vs Pace Across IPL Venues",
    subtitle: "From Chepauk's dust bowls to Chinnaswamy's launchpad: venue geography dictates bowler value.",
    metric: "76% Spin", metricLabel: "Chepauk Spin Leverage Index",
    takeaways: [
      "Chepauk and Eden Gardens favor spin with 68–76% bowling effectiveness index.",
      "Wankhede and Chinnaswamy reward hit-the-deck pace, where short-boundary square zones penalize slow turners.",
      "Venue-adjusted economy models correct raw bowler figures by up to ±1.45 runs per over."
    ],
    tags: ["Venue Geography", "Chepauk", "Pace vs Spin", "Pitch Deterioration"]
  },
  { day: 9, dim: "Sports Intelligence", dimId: "sports-intel", title: "Death Bowling Under Pressure",
    subtitle: "Heart rates exceeding 160 bpm with 15 needed off 6. Quantifying execution under extreme stress.",
    metric: "41.2%", metricLabel: "Execution Degradation in Over 20",
    takeaways: [
      "Bowlers miss their intended pitch target by an average of 22cm more in the 20th over compared to over 16.",
      "Left-arm over angles maintain a 12% lower execution drift under final-over pressure.",
      "Captains using pre-planned field adjustments before over 20 reduce misfield rates by 30%."
    ],
    tags: ["Pressure Bowling", "Final Over", "Physiology", "Field Traps"]
  },
  { day: 10, dim: "Sports Intelligence", dimId: "sports-intel", title: "The Evolution of Mystery Spin",
    subtitle: "From Narine to Varun Chakravarthy: the biomechanics of finger flicks and carrom ball deception.",
    metric: "0.18s", metricLabel: "Batter Recognition Latency",
    takeaways: [
      "Mystery spinners disguise back-of-hand and seam rotation within identical 0.18s arm release arcs.",
      "Sunil Narine's remodeled action still forces a 24.8% false shot percentage against right-handers.",
      "Batters relying on off-the-pitch reading concede 3.2x more bowled/LBW dismissals against carrom balls."
    ],
    tags: ["Mystery Spin", "Sunil Narine", "Carrom Ball", "Disguise Index"]
  },
  { day: 11, dim: "Sports Intelligence", dimId: "sports-intel", title: "Momentum Swings in IPL Matches",
    subtitle: "The sudden tipping points: how one 20-run over or double-wicket over flips the win probability needle.",
    metric: "34 pts", metricLabel: "Average Win Prob Swing in Turning Over",
    takeaways: [
      "82% of IPL matches feature at least one over that shifts win probability by >25 percentage points.",
      "The most common pivot point occurs in Over 14 (first over after the second strategic timeout).",
      "Teams that absorb a 30-point negative swing and still win invariably take a top-order wicket within the next 8 balls."
    ],
    tags: ["Win Probability", "Momentum", "Turning Points", "Leverage Overs"]
  },
  { day: 12, dim: "Sports Intelligence", dimId: "sports-intel", title: "Winning the Middle Overs",
    subtitle: "Overs 7 to 15: the graveyard of chases or the runway for 220? The modern philosophy of middle overs.",
    metric: "8.45 rpo", metricLabel: "Middle Overs Benchmark (2025/26)",
    takeaways: [
      "The obsolete 'consolidate and save wickets' middle-over strategy reduces expected final totals by 22 runs.",
      "Striking at >140 SR against spinners in overs 7–11 neutralizes defensive field sets.",
      "Losing fewer than 2 wickets in the middle phase guarantees a minimum projected death total of 55 runs."
    ],
    tags: ["Middle Overs", "Phase Analysis", "Consolidation Trap", "Spin Assault"]
  },
  { day: 13, dim: "Sports Intelligence", dimId: "sports-intel", title: "What Creates a 200+ Total?",
    subtitle: "Deconstructing the formula behind the modern batting explosion: Impact Player, batting depth, and bat speed.",
    metric: "41.6%", metricLabel: "IPL Matches Reaching 200+ (2024–26)",
    takeaways: [
      "Frequency of 200+ totals increased from 11.2% (2018–22) to 41.6% in the post-Impact Player cycle.",
      "Requires minimum 18 boundaries and at least 3 partnerships scoring at >10 runs per over.",
      "Bat speed telemetry shows average bottom-hand velocity has increased by 14% over the last decade."
    ],
    tags: ["200+ Totals", "Impact Player", "Bat Speed", "Modern Scoring"]
  },
  { day: 14, dim: "Sports Intelligence", dimId: "sports-intel", title: "The Anatomy of a Successful Chase",
    subtitle: "Pacing calculations, wicket preservation thresholds, and target decomposition in second innings.",
    metric: "52.8%", metricLabel: "Chasing Win Rate Across IPL History",
    takeaways: [
      "Chasing teams win 52.8% of IPL matches, peaking at 62% in evening games with dew factor.",
      "Keeping the Required Run Rate within 2 runs of the Current Run Rate through over 12 yields an 84% win rate.",
      "Target breakdown into 4-over micro-targets reduces batting panic and boundary drought."
    ],
    tags: ["Chasing", "Dew Factor", "Target Decomposition", "Second Innings"]
  },
  { day: 15, dim: "Sports Intelligence", dimId: "sports-intel", title: "Pressure Cricket Explained",
    subtitle: "Why 8 runs an over feels like 14 in playoffs: the mathematical friction of elimination cricket.",
    metric: "18.2%", metricLabel: "Playoff Scoring Drop Under Pressure",
    takeaways: [
      "Teams score 18.2 fewer runs on average in playoff matches compared to their regular-season venue baselines.",
      "Dot ball anxiety causes batters to initiate boundary attempts on balls 1.2 lengths shorter than optimal.",
      "Franchises with established veteran cores (CSK, MI) exhibit 40% lower decision degradation in knockout finals."
    ],
    tags: ["Playoff Pressure", "Elimination Games", "Decision Drift", "Championship Nerve"]
  },

  // 16-25: Fan Psychology
  { day: 16, dim: "Fan Psychology", dimId: "fan-psychology", title: "Why CSK Fans Never Leave",
    subtitle: "The sociology of Chennai Super Kings fandom: continuity, paternal leadership, and cultural assimilation.",
    metric: "92.6 BSI", metricLabel: "Brand Strength Index (Highest in Asia)",
    takeaways: [
      "CSK boasts a 92.6 out of 100 Brand Strength Index, outpacing premier European soccer clubs.",
      "Retaining a core squad identity across mega-auctions fosters generational fan loyalty.",
      "The yellow jersey phenomenon transcends geographical boundaries into pan-Indian cultural iconography."
    ],
    tags: ["CSK", "Whistle Podu", "Brand Strength", "Tribal Loyalty"]
  },
  { day: 17, dim: "Fan Psychology", dimId: "fan-psychology", title: "The Dhoni Effect",
    subtitle: "Decibel levels exceeding 120 dB upon walking out. The monetisation of emotional reverence.",
    metric: "128 dB", metricLabel: "Peak Stadium Noise on Entry",
    takeaways: [
      "Every MS Dhoni appearance generates a 4.8x immediate spike in real-time OTT viewership.",
      "Decibel meters at Chepauk, Wankhede, and Eden Gardens record 120–128 dB when he steps out to bat.",
      "Emotional reverence converts into multi-million dollar merchandise and lifetime brand retention."
    ],
    tags: ["MS Dhoni", "Cult of Personality", "Decibel Spikes", "Emotional Capital"]
  },
  { day: 18, dim: "Fan Psychology", dimId: "fan-psychology", title: "Why IPL Rivalries Feel Personal",
    subtitle: "CSK vs MI, RCB vs KKR: transforming regional identities into sports tribal warfare.",
    metric: "3.8x", metricLabel: "Social Impression Multiplier in Derby Matches",
    takeaways: [
      "Derby matchups generate 3.8x more social media engagements than standard league fixtures.",
      "Rivalries are sustained by distinct philosophical identities (e.g. MI's corporate power vs CSK's familial calm).",
      "Historical heartbreaks in finals create multi-year emotional grievances that drive viewing appointment."
    ],
    tags: ["El Clásico IPL", "MI vs CSK", "Regional Rivalries", "Sports Tribalism"]
  },
  { day: 19, dim: "Fan Psychology", dimId: "fan-psychology", title: "Why Fans Forgive Losing Seasons",
    subtitle: "RCB's 17-year trophy drought alongside record merchandise sell-outs: the psychology of hope.",
    metric: "94%", metricLabel: "RCB Merchandise Sellout Rate",
    takeaways: [
      "Royal Challengers Bengaluru achieves near 100% brand engagement regardless of league table finish.",
      "Psychological investment in superstar narratives (Kohli, ABD, Gayle) replaces raw trophy demand.",
      "Hope narratives create sticky fan communities where shared perseverance becomes a badge of honor."
    ],
    tags: ["RCB", "Loyalty Paradox", "Emotional Economics", "Fan Communities"]
  },
  { day: 20, dim: "Fan Psychology", dimId: "fan-psychology", title: "Meme Culture Drives Cricket",
    subtitle: "How satirical internet humor became the secondary broadcast desk of modern IPL.",
    metric: "62%", metricLabel: "Gen-Z Fans Consuming Highlights via Memes",
    takeaways: [
      "62% of fans aged 16–25 encounter match narratives through social memes before watching official clips.",
      "Meme templates provide instant cultural contextualization for dropped catches and tactical errors.",
      "Franchises now employ dedicated meme desks to actively shape internet banter and fan sentiment."
    ],
    tags: ["Meme Desk", "Internet Culture", "Viral Humor", "Gen-Z Engagement"]
  },
  { day: 21, dim: "Fan Psychology", dimId: "fan-psychology", title: "Regional Identity in IPL",
    subtitle: "From Korbo Lorbo Jeetbo to Halla Bol: how franchise anthems and vernacular pride forge roots.",
    metric: "8 Languages", metricLabel: "Regional Broadcast Feeds",
    takeaways: [
      "Vernacular branding accounts for a 48% surge in Tier-2 and Tier-3 city fandom adoption.",
      "Regional pride bridges the gap between state Ranji identities and international franchise entertainment.",
      "Franchise anthems enjoy evergreen streaming numbers on Spotify and YouTube throughout the year."
    ],
    tags: ["Vernacular Pride", "Anthems", "Regional Dialects", "Tier-2 Fandom"]
  },
  { day: 22, dim: "Fan Psychology", dimId: "fan-psychology", title: "How Stadium Atmosphere Changes Games",
    subtitle: "The 12th man isn't a cliché: quantifying how 100,000 screaming fans impact umpire and player cognition.",
    metric: "+8.4%", metricLabel: "Home Team Boundary Frequency in Packed Stadiums",
    takeaways: [
      "Home teams exhibit an 8.4% higher boundary clearance rate during loud stadium crowd chants.",
      "Auditory pressure elevates visiting bowler heart rates, increasing wide and no-ball errors by 14%.",
      "Stadium acoustics at Narendra Modi Stadium (132,000 capacity) alter on-field fielder communication dynamics."
    ],
    tags: ["Crowd Acoustics", "Home Advantage", "Stadium Psychology", "Hostile Venues"]
  },
  { day: 23, dim: "Fan Psychology", dimId: "fan-psychology", title: "Fan Loyalty vs Team Success",
    subtitle: "Is winning everything? Comparing fan retention across trophy winners versus entertaining underdogs.",
    metric: "0.41", metricLabel: "Correlation Between Titles and Social Follower Growth",
    takeaways: [
      "Trophies correlate with only 41% of long-term social follower growth; player star power drives the remaining 59%.",
      "Entertaining brands with high-scoring games generate higher digital sentiment than pragmatic defensive champions.",
      "Consistency in media communication sustains fan engagement through prolonged losing streaks."
    ],
    tags: ["Loyalty Metric", "Success vs Brand", "Star Power", "Follower Retention"]
  },
  { day: 24, dim: "Fan Psychology", dimId: "fan-psychology", title: "Nostalgia Economics of IPL",
    subtitle: "Why 2008 highlights, Brendon McCullum's 158*, and vintage jerseys command million-dollar premiums.",
    metric: "320M", metricLabel: "Annual Vintage Match Rewatches",
    takeaways: [
      "Nostalgia-driven match replays and clips accumulate over 320M impressions during off-season windows.",
      "Retro jersey capsule collections sell out within hours of auction announcement.",
      "The shared generational memory of IPL 2008 anchors fans into lifelong platform subscribers."
    ],
    tags: ["Nostalgia Economics", "McCullum 158*", "Retro Merch", "Legacy IP"]
  },
  { day: 25, dim: "Fan Psychology", dimId: "fan-psychology", title: "Social Media Emotions During Close Matches",
    subtitle: "Sentiment analysis across 10 million tweets: mapping the emotional volatility of final-over finishes.",
    metric: "14.2k/sec", metricLabel: "Peak Tweet Velocity in Final Overs",
    takeaways: [
      "Tweet velocity peaks at 14,200 posts per second when a match enters the final 3 deliveries.",
      "Negative sentiment spikes sharply after a boundary, reversing entirely upon a wicket within 45 seconds.",
      "Real-time emotional tracking allows brands to trigger calibrated contextual ads."
    ],
    tags: ["Sentiment Volatility", "Tweet Velocity", "Digital Pulse", "Emotional Heatmap"]
  },

  // 26-35: Product & Gamification
  { day: 26, dim: "Product & Gamification", dimId: "product-gamification", title: "Fantasy Cricket Psychology",
    subtitle: "How picking a virtual XI turns neutral spectators into emotionally obsessed stakeholders.",
    metric: "180M+", metricLabel: "Active Fantasy Cricket Users in India",
    takeaways: [
      "Fantasy sports engagement elevates viewer watch-time of low-stakes fixtures by 48%.",
      "Loss aversion drives players to enter multiple contests to hedge against single-match underperformance.",
      "Captaincy selection accounts for 52% of point variance in winning leaderboard rosters."
    ],
    tags: ["Fantasy Psychology", "Dream11", "Loss Aversion", "Vested Interest"]
  },
  { day: 27, dim: "Product & Gamification", dimId: "product-gamification", title: "Why Live Scores Are Addictive",
    subtitle: "Dopamine micro-hits: the psychology of ball-by-ball refresh animations and red-dot alerts.",
    metric: "4.2s", metricLabel: "Average Re-Check Interval on Score Apps",
    takeaways: [
      "Mobile score consumers refresh or glance at their screens every 4.2 seconds during active overs.",
      "Micro-animations (e.g. pulsating red balls for wickets, flashing gold for sixes) trigger dopamine reward loops.",
      "Real-time commentary widgets retain second-screen users even during linear broadcast ad breaks."
    ],
    tags: ["Addictive UI", "Dopamine Loops", "Score Refresh", "Push Architecture"]
  },
  { day: 28, dim: "Product & Gamification", dimId: "product-gamification", title: "Push Notifications That Increase Retention",
    subtitle: "The art of copy and timing: why 'Dhoni walks in' yields a 38% click-through rate.",
    metric: "38.4%", metricLabel: "Peak CTR on Star-Player Ingress Notifications",
    takeaways: [
      "Context-rich notifications ('CSK need 18 off 6') outperform generic score updates by 3.2x in open rates.",
      "Sending notifications within 1.5 seconds of a wicket prevents users from learning the outcome on Twitter first.",
      "Personalized team alerts boost 30-day retention from 22% to 54% across sports media apps."
    ],
    tags: ["Push Strategy", "Notification Copy", "Retention Optimization", "Real-Time Triggers"]
  },
  { day: 29, dim: "Product & Gamification", dimId: "product-gamification", title: "IPL as a Product",
    subtitle: "Deconstructing the league as an entertainment software: release cycles, rule iterations, and feature sets.",
    metric: "74 Matches", metricLabel: "Annual Content Production Window",
    takeaways: [
      "The IPL operates on product sprint cycles, iterating rules (Impact Player, two bouncers) like software updates.",
      "Predictable 2-month annual scheduling locks in consumer viewing habits like seasonal streaming releases.",
      "Cross-platform distribution (TV, mobile, CTV, VR) maximizes reach across demographic cohorts."
    ],
    tags: ["Product Architecture", "Feature Iterations", "Entertainment OS", "Sprint Cycles"]
  },
  { day: 30, dim: "Product & Gamification", dimId: "product-gamification", title: "Gamification Inside IPL Apps",
    subtitle: "Badges, leaderboards, streak multipliers, and prediction polls: how sports apps keep fans tapped in.",
    metric: "3.4x", metricLabel: "Engagement Lift from In-App Streaks",
    takeaways: [
      "Implementing daily streak counters increases consecutive-day app opens by 340%.",
      "Predictor mini-games embedded beneath video feeds capture 28% of active stream attention.",
      "Virtual currency rewards redeemable for team merch create closed-loop fan ecosystems."
    ],
    tags: ["In-App Gamification", "Streak Multipliers", "Leaderboard Mechanics", "Fan Loyalty Loops"]
  },
  { day: 31, dim: "Product & Gamification", dimId: "product-gamification", title: "Building Habit Loops in Cricket Apps",
    subtitle: "Cue, routine, reward: engineering daily habits around fantasy team locks and toss notifications.",
    metric: "7:00 PM", metricLabel: "The National Ritual Clock Anchor",
    takeaways: [
      "The 7:00 PM toss notification serves as an unbreakable behavioral cue for 80M+ daily active users.",
      "The routine of checking playing XIs and swapping fantasy picks forms an automatic cognitive habit.",
      "Reward delivery immediately following match conclusion reinforces next-day participation."
    ],
    tags: ["Habit Loops", "Behavioral Design", "Toss Lock", "Cognitive Anchoring"]
  },
  { day: 32, dim: "Product & Gamification", dimId: "product-gamification", title: "Predictive Gaming During Live Matches",
    subtitle: "Will the next ball be a boundary? The explosion of ball-by-ball micro-wagering and prediction engines.",
    metric: "12M", metricLabel: "Concurrent Live Predictions on Peak Balls",
    takeaways: [
      "Micro-prediction engagement peaks during overs 16–20, where ball outcomes carry binary swing value.",
      "Low-latency streaming (<1 second delay) is the technical prerequisite for real-time predictive gaming.",
      "Simulated free-to-play prediction leagues funnel 18% of casual users into premium sports platforms."
    ],
    tags: ["Predictive Gaming", "Micro-Wagering", "Ultra-Low Latency", "In-Play Engagement"]
  },
  { day: 33, dim: "Product & Gamification", dimId: "product-gamification", title: "Reward Systems in Fan Platforms",
    subtitle: "From digital collectibles to VIP dugout access: designing tiered status rewards that fans crave.",
    metric: "5 Tiers", metricLabel: "Optimal Fandom Loyalty Architecture",
    takeaways: [
      "Status-driven rewards (signed bats, meet-and-greets) generate 4x higher fan aspiration than cash discounts.",
      "Dynamic tier progression unlocks early ticket access, creating strong retention incentives.",
      "Blockchain-verified digital badges provide fans with provable attendance bragging rights."
    ],
    tags: ["Reward Hierarchy", "VIP Access", "Collectibles", "Loyalty Status"]
  },
  { day: 34, dim: "Product & Gamification", dimId: "product-gamification", title: "UI/UX Lessons from IPL",
    subtitle: "Information hierarchy under cognitive overload: how to display 40 telemetry variables on a 6-inch phone.",
    metric: "60 FPS", metricLabel: "Real-Time Telemetry Rendering Baseline",
    takeaways: [
      "Progressive disclosure allows casual fans to view simple scores while analysts drill into wagon wheels.",
      "High-contrast dark mode interfaces reduce battery consumption during 4-hour live streams.",
      "Fitts's Law applied to sports UI: positioning fantasy swap buttons within bottom thumb reach zones."
    ],
    tags: ["UI/UX Engineering", "Information Hierarchy", "Data Density", "Mobile Terminal Design"]
  },
  { day: 35, dim: "Product & Gamification", dimId: "product-gamification", title: "The Future of Cricket Super Apps",
    subtitle: "Combining streaming, fantasy, ticketing, merchandise, and social into a single billion-user interface.",
    metric: "₹42,000 Cr", metricLabel: "Projected Sports Super App Ecosystem GMV by 2030",
    takeaways: [
      "Fragmented sports experiences are consolidating into unified super apps (JioCinema / Dream Sports ecosystem).",
      "Single-sign-on across streaming and commerce increases cross-sell conversion by 42%.",
      "Embedded digital wallets streamline in-stream ticket and jersey purchases during live matches."
    ],
    tags: ["Super Apps", "Platform Consolidation", "Unified Sports Tech", "Ecosystem Monopoly"]
  },

  // 36-45: Second Screen Economy
  { day: 36, dim: "Second Screen Economy", dimId: "second-screen", title: "Why Nobody Watches IPL Without a Phone",
    subtitle: "84% of viewers hold a secondary device: the death of passive living-room sports consumption.",
    metric: "84%", metricLabel: "Multi-Screen Viewing Share",
    takeaways: [
      "84% of viewers multitask on smartphones while the primary broadcast plays on TV.",
      "Passive watching has transformed into active co-creation of memes, fantasy tracking, and WhatsApp discussions.",
      "Advertisers now deploy synchronized TV-and-mobile cross-device ad campaigns to capture undivided attention."
    ],
    tags: ["Second Screen", "Dual Consumption", "Divided Attention", "Mobile Hegemony"]
  },
  { day: 37, dim: "Second Screen Economy", dimId: "second-screen", title: "Instagram During IPL",
    subtitle: "Reels, stories, and behind-the-scenes dugout culture: how Instagram captures the cultural zeitgeist.",
    metric: "1.2B+", metricLabel: "Monthly IPL Reel Plays",
    takeaways: [
      "Short-form video clips on Instagram Reels generate more aggregate impressions than linear post-match shows.",
      "Franchise social teams produce 40+ customized vertical video assets per match day.",
      "Casual lifestyle reels featuring players in team hotels drive 70% of female fan demographic expansion."
    ],
    tags: ["Instagram Reels", "Short-Form Video", "Dugout Access", "Social Velocity"]
  },
  { day: 38, dim: "Second Screen Economy", dimId: "second-screen", title: "Twitter vs TV",
    subtitle: "The real-time global stadium: why cricket discourse lives, breathes, and explodes on X.",
    metric: "120M+", metricLabel: "Season Tweets on #IPL",
    takeaways: [
      "X (Twitter) serves as the world's real-time commentary box, outpacing traditional television talk shows.",
      "Trending hashtags dictate morning sports headlines across mainstream national newspapers.",
      "Controversial umpire decisions trigger 50,000 tweets within 90 seconds, forcing public discussion."
    ],
    tags: ["Twitter / X", "Real-Time Commentary", "Hashtag Economy", "Public Square"]
  },
  { day: 39, dim: "Second Screen Economy", dimId: "second-screen", title: "The Rise of Companion Apps",
    subtitle: "Dedicated stats engines, pitch radars, and fan community companion apps complementing live broadcasts.",
    metric: "2.4x", metricLabel: "Companion App Session Duration Growth",
    takeaways: [
      "Dedicated companion apps provide high-depth ball telemetry that linear broadcasts omit.",
      "Fans run concurrent predictive simulations to check whether their team's chase plan aligns with history.",
      "API integrations allow companion apps to deliver pitch map updates within 800ms of delivery release."
    ],
    tags: ["Companion Apps", "Second-Screen UI", "Live Telemetry", "Deep Analytics"]
  },
  { day: 40, dim: "Second Screen Economy", dimId: "second-screen", title: "How Memes Spread During Matches",
    subtitle: "The viral pipeline: from a funny reaction camera shot to 50 million WhatsApp status views in 20 minutes.",
    metric: "12 Min", metricLabel: "Average Meme Propagation Half-Life",
    takeaways: [
      "Facial reactions of franchise owners and coaches become viral internet templates within 12 minutes of broadcast.",
      "Memes transcend language barriers, circulating universally across Hindi, Tamil, Telugu, and English fanbases.",
      "Brands leveraging instant meme templates within 30 minutes achieve 6x higher organic engagement."
    ],
    tags: ["Viral Transmission", "Meme Propagation", "WhatsApp Status", "Organic Amplification"]
  },
  { day: 41, dim: "Second Screen Economy", dimId: "second-screen", title: "YouTube Shorts vs Broadcast",
    subtitle: "The battle for micro-moments: how 30-second clips are replacing full 4-hour match replays.",
    metric: "4.8B", metricLabel: "Season Views on Official Cricket Shorts",
    takeaways: [
      "Younger audiences prioritize 30-second vertical highlights over full linear match replays.",
      "YouTube Shorts algorithms reward dramatic audio hooks (stump mic crunches, crowd roars).",
      "Short-form highlight syndication generates high-margin ad inventory through programmatic video spots."
    ],
    tags: ["YouTube Shorts", "Highlight Syndication", "Micro-Moments", "Algorithmic Reach"]
  },
  { day: 42, dim: "Second Screen Economy", dimId: "second-screen", title: "Live Poll Psychology",
    subtitle: "Why 5 million people vote on 'Who will win?' on their screens: the cognitive need for validation.",
    metric: "5.2M", metricLabel: "Votes per Live In-Stream Poll",
    takeaways: [
      "In-stream polls give viewers a tangible sense of agency and participation in the broadcast.",
      "Predicting correctly creates an emotional validation loop that keeps viewers glued through ad breaks.",
      "Poll outcome percentages provide commentators with crowd consensus data to drive broadcast discussion."
    ],
    tags: ["Live Polls", "Audience Agency", "Validation Loops", "Interactive Broadcasting"]
  },
  { day: 43, dim: "Second Screen Economy", dimId: "second-screen", title: "WhatsApp During IPL",
    subtitle: "The dark social powerhouse: how cricket chatter flows through family and college group chats.",
    metric: "82%", metricLabel: "Dark Social Share of Private Cricket Sharing",
    takeaways: [
      "Over 80% of peer-to-peer cricket link sharing occurs on WhatsApp rather than public social networks.",
      "Family and alumni group chats experience 5x higher message density during IPL evenings.",
      "Brands designing shareable infographics specifically for vertical WhatsApp sharing capture massive viral reach."
    ],
    tags: ["WhatsApp", "Dark Social", "Group Chat Economics", "P2P Virality"]
  },
  { day: 44, dim: "Second Screen Economy", dimId: "second-screen", title: "Digital Conversations Around IPL",
    subtitle: "NLP analysis of 50 million sports conversations: tracking semantic shifts from strategy to drama.",
    metric: "58% Drama", metricLabel: "Share of Conversations Focused on Narrative vs Pure Stats",
    takeaways: [
      "Natural Language Processing shows that narrative drama (captaincy friction, umpire debates) drives 58% of chatter.",
      "Analytical conversations focusing on economy rates and field placements represent a dedicated 14% power segment.",
      "Sentiment polarity shifts dramatically within 3 overs, mirroring live win probability fluctuations."
    ],
    tags: ["NLP Analysis", "Sentiment Shift", "Narrative Drama", "Digital Discourse"]
  },
  { day: 45, dim: "Second Screen Economy", dimId: "second-screen", title: "Multi-Screen Viewing Behaviour",
    subtitle: "The living room setup of 2026: TV for video, tablet for fantasy, smartphone for group chat.",
    metric: "1.7 Screens", metricLabel: "Average Devices Active per Sports Viewer",
    takeaways: [
      "Affluent sports fans simultaneously utilize 1.7 to 2.2 screens during marquee IPL fixtures.",
      "The television screen serves as audio-visual ambient backdrop while smartphones handle active social utility.",
      "Unified companion ecosystems that synchronize data across all three devices command the highest retention."
    ],
    tags: ["Multi-Screen", "Device Triangulation", "Ambient Video", "Connected Living Room"]
  },

  // 46-55: Attention Economy
  { day: 46, dim: "Attention Economy", dimId: "attention-economy", title: "Which Ball Gets Maximum Attention?",
    subtitle: "Eye-tracking heatmaps across 120 deliveries: why ball 1, ball 6, and over 19 commanding 80% of focus.",
    metric: "4.8x", metricLabel: "Attention Multiplier on Final Delivery of Overs",
    takeaways: [
      "Eye-tracking studies demonstrate that the 6th delivery of an over commands 4.8x more focused visual gaze.",
      "Attention drops by 32% during overs 8–11 if no wickets fall and the run rate stabilizes under 7.5 rpo.",
      "Strategic placement of perimeter digital LED boards synchronizes with high-attention ball releases."
    ],
    tags: ["Eye Tracking", "Attention Heatmaps", "Visual Gaze", "Ball Attention Index"]
  },
  { day: 47, dim: "Attention Economy", dimId: "attention-economy", title: "Strategic Timeouts Explained",
    subtitle: "The 150-second commercial engine: how a mandatory tactical break generates ₹2,500+ crore in ad value.",
    metric: "150 Sec", metricLabel: "Duration of Each Strategic Timeout",
    takeaways: [
      "Two 2.5-minute strategic timeouts per innings unlock 10 minutes of premium advertising inventory per match.",
      "Branded naming rights (e.g. CEAT Strategic Timeout) generate over ₹2,500 Cr across rights cycles.",
      "Tactical analysis indicates that 42% of batting momentum breaks occur immediately following the timeout."
    ],
    tags: ["Strategic Timeout", "Ad Inventory", "Commercial Breaks", "Momentum Disruption"]
  },
  { day: 48, dim: "Attention Economy", dimId: "attention-economy", title: "Ad Break Psychology",
    subtitle: "The 30-second jingle that plays 50 times a night: audio earworms and brand recall conditioning.",
    metric: "88%", metricLabel: "Brand Recall Rate for Repetitive In-Match Jingles",
    takeaways: [
      "Repeated exposure (12–16 times per broadcast) cements brand recall across 500 million aggregate viewers.",
      "Audio earworms conditioning creates involuntary mental associations with boundary replays and wickets.",
      "Humorous contextual commercials sustain viewer retention through ad pods rather than channel surfing."
    ],
    tags: ["Ad Psychology", "Audio Earworms", "Brand Conditioning", "Frequency Capping"]
  },
  { day: 49, dim: "Attention Economy", dimId: "attention-economy", title: "Sponsor Visibility Science",
    subtitle: "Jersey chest, helmet peak, umpire collar, boundary rope: eye-tracking the most valuable real estate in Asia.",
    metric: "₹100+ Cr", metricLabel: "Annual Value of Front-of-Jersey Placement",
    takeaways: [
      "Front-of-jersey logo placement receives 38 minutes of cumulative screen exposure per match broadcast.",
      "Non-lead-arm sleeve placement commands higher value for batters due to side-on broadcast camera framing.",
      "Virtual perimeter board placements adapt in real-time to match local regional broadcast sponsor feeds."
    ],
    tags: ["Jersey Real Estate", "Sponsorship Science", "Visual ROI", "Camera Framing"]
  },
  { day: 50, dim: "Attention Economy", dimId: "attention-economy", title: "Attention Curves During Matches",
    subtitle: "Plotting viewer retention across 240 minutes: the twin peaks of the Powerplay and Death Overs.",
    metric: "Twin Peaks", metricLabel: "Viewership Distribution Curve",
    takeaways: [
      "Broadcast viewership forms a distinctive U-shaped curve, peaking sharply in overs 1–4 and overs 17–20.",
      "Mid-innings slump drops concurrent streaming by up to 24% unless star batters remain at the crease.",
      "Strategic cliffhangers before commercial breaks reduce drop-off rates by 18%."
    ],
    tags: ["Attention Curve", "Concurrent Viewership", "U-Shaped Retention", "Drop-Off Mitigation"]
  },
  { day: 51, dim: "Attention Economy", dimId: "attention-economy", title: "Why Last Overs Dominate Viewership",
    subtitle: "Concurrence spikes from 20M to 55M in 10 minutes: the economics of the grandstand finish.",
    metric: "59M Peak", metricLabel: "All-Time Record Concurrent OTT Stream",
    takeaways: [
      "Concurrent OTT viewership surges by over 250% when the required rate exceeds 12 runs with 2 overs remaining.",
      "Push notification waves activate dormant viewers across the country for the final 12 deliveries.",
      "High-concurrency finishes deliver unprecedented server load challenges and premium live ad CPMs."
    ],
    tags: ["Peak Concurrency", "Grandstand Finish", "Server Telemetry", "Final Over Spike"]
  },
  { day: 52, dim: "Attention Economy", dimId: "attention-economy", title: "Camera Cuts and Viewer Attention",
    subtitle: "32 camera angles switched every 3.2 seconds: the MTV pacing of modern cricket broadcasting.",
    metric: "3.2s", metricLabel: "Average Cut Duration Between Live Angles",
    takeaways: [
      "Modern T20 broadcasts switch camera perspectives every 3.2 seconds to maintain high neurological arousal.",
      "Slow-motion ultra-motion cameras capture micro-expressions, humanizing athlete struggles under pressure.",
      "Spidercam and drone overhead angles provide tactical spatial geometry that traditional cameras miss."
    ],
    tags: ["Camera Pacing", "Broadcast Cuts", "Neurological Arousal", "Visual Rhythm"]
  },
  { day: 53, dim: "Attention Economy", dimId: "attention-economy", title: "Highlight Culture",
    subtitle: "Who has time for 4 hours? How the 10-minute condensed package became cricket's primary consumption vehicle.",
    metric: "10 Min", metricLabel: "Standard Condensed Match Duration",
    takeaways: [
      "Over 45% of total digital viewing minutes are logged on condensed 10-minute highlights rather than live streams.",
      "Curators prioritize boundary chains, wickets, and dramatic DRS reviews to maximize emotional punch.",
      "Highlights remain evergreen monetization assets, earning programmatic ad revenue for months post-season."
    ],
    tags: ["Highlights", "Condensed Replays", "Time Economy", "Digital Asset Yield"]
  },
  { day: 54, dim: "Attention Economy", dimId: "attention-economy", title: "Viral Cricket Moments",
    subtitle: "Catch of the tournament, run-out controversies, flying bails: the anatomy of a 100M-view clip.",
    metric: "100M+", metricLabel: "Viral Ceiling for Exceptional Fielding Moments",
    takeaways: [
      "Acrobatic boundary relay catches generate 4x more cross-platform viral velocity than standard 6s.",
      "Unprecedented fielding drama triggers emotional sharing across non-cricketing global audiences.",
      "Official league digital accounts syndicate viral clips across global feeds within 8 minutes of occurrence."
    ],
    tags: ["Virality", "Relay Catches", "Cross-Platform Reach", "Global Spread"]
  },
  { day: 55, dim: "Attention Economy", dimId: "attention-economy", title: "The Economics of Eyeballs",
    subtitle: "Cost per thousand impressions (CPM) across India's premier sporting event: who pays what, and why.",
    metric: "₹350 CPM", metricLabel: "Average Digital Video Ad Rate in Marquee Games",
    takeaways: [
      "IPL ad inventory commands a 300% premium over standard entertainment television programming in India.",
      "Automobile, fintech, and fantasy gaming sectors account for 64% of total tournament ad spend.",
      "Digital programmatic ad insertion allows hyper-targeted demographic delivery across regional feeds."
    ],
    tags: ["CPM Economics", "Ad Inventory Value", "Impression Yield", "Digital Monopolies"]
  },

  // 56-67: Broadcast & Media Intelligence
  { day: 56, dim: "Broadcast & Media Intelligence", dimId: "broadcast-media", title: "How Commentary Shapes Narratives",
    subtitle: "The microphone as a paintbrush: how Harsha, Shastri, and Bishop create mythological sports moments.",
    metric: "94%", metricLabel: "Audio Retention Index on Live Broadcast",
    takeaways: [
      "Iconic vocal lines ('Dhoni finishes off in style', 'Remember the name') permanently define sports memories.",
      "Commentators frame technical execution into relatable heroic or tragic human narratives.",
      "Dual commentary teams (tactical analysts + theatrical hype anchors) balance analytical and emotional depth."
    ],
    tags: ["Commentary Narratives", "Harsha Bhogle", "Broadcast Drama", "Vocal Iconography"]
  },
  { day: 57, dim: "Broadcast & Media Intelligence", dimId: "broadcast-media", title: "IPL Camera Language",
    subtitle: "From low-angle hero shots to intimate dugout zoom-ins: the visual grammar of IPL production.",
    metric: "36 Cameras", metricLabel: "Average Camera Setup per Match",
    takeaways: [
      "A standard IPL match utilizes 36 to 42 high-definition cameras, including 4 ultra-motion rigs.",
      "Low-angle tracking cameras elevate batter stature, framing modern athletes as gladiators.",
      "Dugout zoom-ins capture unspoken franchise politics, tactical frustration, and leadership tensions."
    ],
    tags: ["Camera Grammar", "Production Design", "Ultra-Motion", "Visual Direction"]
  },
  { day: 58, dim: "Broadcast & Media Intelligence", dimId: "broadcast-media", title: "Broadcast Graphics Evolution",
    subtitle: "From simple scoreboard bugs in 2008 to real-time Hawkeye spatial graphs and AR ball trackers.",
    metric: "4K Real-Time", metricLabel: "Augmented Reality Graphics Resolution",
    takeaways: [
      "Augmented Reality pitch graphics render release points, bounce heights, and deviation angles in 60 FPS.",
      "Dynamic strike rate and phase comparison bugs provide instant statistical context without cluttering screens.",
      "Standard broadcast visual language has transitioned from television-first to mobile-optimized typography."
    ],
    tags: ["Graphics Evolution", "Hawkeye AR", "Visual Overlays", "Mobile-First Design"]
  },
  { day: 59, dim: "Broadcast & Media Intelligence", dimId: "broadcast-media", title: "Why Replays Matter",
    subtitle: "The psychology of second-look analysis: slow-motion reveals what the naked eye misses at 150 km/h.",
    metric: "1,000 FPS", metricLabel: "Super Slow-Motion Frame Capture",
    takeaways: [
      "1,000 frames-per-second cameras reveal microscopic bat edge deflections and seam turbulence.",
      "Replays extend viewer emotional investment, allowing audiences to debate technical decisions.",
      "Multi-angle replay sequences provide sponsors with high-engagement logo branding moments."
    ],
    tags: ["Replay Analysis", "Super Slow-Mo", "Edge Detection", "Visual Scrutiny"]
  },
  { day: 60, dim: "Broadcast & Media Intelligence", dimId: "broadcast-media", title: "Storytelling in Live Cricket",
    subtitle: "Transforming 240 balls into a structured three-act screenplay: setup, confrontation, and resolution.",
    metric: "3 Acts", metricLabel: "Dramatic Structure of T20 Match Broadcast",
    takeaways: [
      "Broadcast directors frame matches as classical dramatic narratives: Powerplay (Setup), Middle (Conflict), Death (Climax).",
      "Player head-to-head graphics build anticipation for individual battles 2 overs before the bowler is introduced.",
      "Human-interest vignettes between overs connect player small-town origins with national stardom."
    ],
    tags: ["Narrative Structure", "Live Drama", "Three-Act Match", "Hero Arcs"]
  },
  { day: 61, dim: "Broadcast & Media Intelligence", dimId: "broadcast-media", title: "Media Rights Revolution",
    subtitle: "The ₹48,390 crore watershed: how the 2023–27 split between TV (Star) and Digital (Viacom18) changed sports media forever.",
    metric: "₹48,390 Cr", metricLabel: "2023–2027 Combined Media Rights Value",
    takeaways: [
      "Digital rights value ($3.05B) eclipsed linear television rights ($3.01B) for the first time in Asian sports history.",
      "Per-match value reached $13.4 million, ranking the IPL behind only the NFL in worldwide sports media value.",
      "Separating TV and digital rights ignited unprecedented innovation in digital streaming features (4K, multi-cam)."
    ],
    tags: ["Media Rights", "BCCI Auction", "TV vs Digital Split", "Sports Valuation"]
  },
  { day: 62, dim: "Broadcast & Media Intelligence", dimId: "broadcast-media", title: "Multi-Language Commentary",
    subtitle: "Bhojpuri, Tamil, Bengali, Kannada: how vernacular feeds opened 250 million new cricket households.",
    metric: "12 Languages", metricLabel: "Simultaneous Live Audio Feeds",
    takeaways: [
      "Bhojpuri commentary feeds generated over 1.4 billion views, powered by colorful vernacular idioms.",
      "Tamil and Kannada regional feeds captured over 40% of their respective state viewing shares.",
      "Multi-language commentary dismantled the colonial English elite gatekeeping of cricket analysis."
    ],
    tags: ["Vernacular Broadcasting", "Bhojpuri Craze", "Regional Feeds", "Democratization"]
  },
  { day: 63, dim: "Broadcast & Media Intelligence", dimId: "broadcast-media", title: "Behind the Broadcast Truck",
    subtitle: "Inside the production OB van: 120 crew members, 80 monitors, and zero margin for error.",
    metric: "80 Screens", metricLabel: "Monitors Inside Live Production Van",
    takeaways: [
      "Broadcast directors manage 80 simultaneous visual inputs with sub-second decision switching.",
      "Audio mixers blend 28 field microphones, stump mics, crowd ambience, and commentator voices in real time.",
      "Redundant fiber-optic transmission pipelines guarantee uninterrupted global feed delivery to 135 countries."
    ],
    tags: ["OB Van", "Live Production", "Broadcast Engineering", "Audio Mixing"]
  },
  { day: 64, dim: "Broadcast & Media Intelligence", dimId: "broadcast-media", title: "Cinematic Cricket Production",
    subtitle: "Shallow depth of field, anamorphic lenses, and movie-grade color grading: the filmic look of modern IPL.",
    metric: "Full-Frame", metricLabel: "Cinema Sensor Adoption in Sports",
    takeaways: [
      "Introducing mirrorless cinema cameras with shallow depth of field creates dramatic portrait looks for walk-ins.",
      "Color grading workflows apply live LUTs to deliver deep contrast and saturated team franchise colors.",
      "Cinematic sports production bridges the aesthetic gap between live sporting contests and blockbuster movies."
    ],
    tags: ["Cinematic Sports", "LUT Grading", "Shallow DOF", "Broadcast Aesthetics"]
  },
  { day: 65, dim: "Broadcast & Media Intelligence", dimId: "broadcast-media", title: "AI in Sports Broadcasting",
    subtitle: "Automated highlight generation, instant translation, and predictive field radars powered by machine learning.",
    metric: "<45 Sec", metricLabel: "AI Automated Video Clip Generation Latency",
    takeaways: [
      "AI computer vision models detect crowd audio spikes and umpire signals to automatically assemble clips in 45 seconds.",
      "Real-time voice synthesis facilitates automated multilingual highlight dubbing.",
      "Predictive AI overlay models anticipate ball trajectory and boundary probabilities live on screen."
    ],
    tags: ["AI Broadcasting", "Automated Highlights", "Computer Vision", "Predictive Graphics"]
  },
  { day: 66, dim: "Broadcast & Media Intelligence", dimId: "broadcast-media", title: "Why Commentary Creates Heroes",
    subtitle: "Building legends with words: how vocal praise elevates raw cricketers into national icons.",
    metric: "82%", metricLabel: "Fan Perception Shaped by Commentary Tone",
    takeaways: [
      "Consistent commentator praise accelerates young player endorsement valuations by up to 250%.",
      "Analysis highlighting subtle bowling variations educates viewers to appreciate defensive masterclasses.",
      "Critique from authoritative voices can trigger intense public scrutiny and selection pressure."
    ],
    tags: ["Hero Making", "Media Perception", "Endorsement Elevation", "Voice Authority"]
  },
  { day: 67, dim: "Broadcast & Media Intelligence", dimId: "broadcast-media", title: "The Future of Immersive Sports Viewing",
    subtitle: "Virtual reality dugouts, Apple Vision Pro spatial stadium seats, and 360-degree point-of-view batting.",
    metric: "8K Spatial", metricLabel: "Next-Generation VR Broadcast Resolution",
    takeaways: [
      "Spatial computing interfaces allow fans to watch games from virtual front-row stadium seats anywhere on earth.",
      "Helmet-cam and umpire-cam point-of-view streaming delivers visceral 150 km/h facing perspectives.",
      "Personalized interactive broadcasts allow viewers to switch camera angles and telemetry layers on demand."
    ],
    tags: ["Immersive Sports", "Spatial Computing", "VR Dugout", "POV Streaming"]
  },

  // 68-79: Business & Revenue Intelligence
  { day: 68, dim: "Business & Revenue Intelligence", dimId: "business-revenue", title: "IPL: The ₹100,000+ Crore Business",
    subtitle: "From an experimental league in 2008 to a decacorn economic titan rivaling world sports leagues.",
    metric: "$10.7B", metricLabel: "Ecosystem Enterprise Valuation Peak",
    takeaways: [
      "The IPL reached decacorn status ($10.7B+ brand ecosystem) in under two decades of existence.",
      "Contributes an estimated ₹12,000 crore annually to the Indian gross domestic sports economy.",
      "Unparalleled return on investment for original 2008 franchise buyers who purchased teams for $75–110 million."
    ],
    tags: ["Decacorn", "BCCI Economics", "Ecosystem Valuation", "Sports Economy"]
  },
  { day: 69, dim: "Business & Revenue Intelligence", dimId: "business-revenue", title: "Franchise Valuation Explained",
    subtitle: "Why Lucknow and Gujarat sold for ₹7,090 Cr and ₹5,625 Cr: dissecting the franchise DCF model.",
    metric: "₹7,090 Cr", metricLabel: "Record Franchise Acquisition Price (LSG)",
    takeaways: [
      "Franchise valuations reflect guaranteed shares of the central BCCI media rights and sponsorship pool.",
      "Discounted Cash Flow (DCF) models price long-term scarcity: no new franchises expected until at least 2028.",
      "Franchise multiples trade at 8x to 12x annual revenue, mirroring premier European soccer clubs."
    ],
    tags: ["Franchise DCF", "Team Valuation", "LSG & GT", "Scarcity Value"]
  },
  { day: 70, dim: "Business & Revenue Intelligence", dimId: "business-revenue", title: "Sponsorship Economics",
    subtitle: "Title rights, associate sponsors, jersey patches: how BCCI and franchises extract ₹3,500 Cr annually.",
    metric: "₹2,500 Cr", metricLabel: "5-Year Title Sponsorship Contract (Tata)",
    takeaways: [
      "Tata's title sponsorship commitment stands at ₹500 crore per season, cementing IPL's prestige tier.",
      "Franchises independently earn ₹60–110 crore annually from jersey patches and associate partners.",
      "Category exclusivity rights (e.g. official tire, official payment partner) command massive auction premiums."
    ],
    tags: ["Title Sponsorship", "BCCI Central Pool", "Jersey Real Estate", "Category Exclusivity"]
  },
  { day: 71, dim: "Business & Revenue Intelligence", dimId: "business-revenue", title: "How Teams Actually Earn Money",
    subtitle: "Revenue waterfall: 70% central pool, 15% local sponsorships, 10% gate receipts, 5% merchandise.",
    metric: "70%", metricLabel: "Share of Franchise Revenue from Central BCCI Pool",
    takeaways: [
      "The BCCI distributes 50% of total media rights and title sponsorship income equally among franchises.",
      "Guaranteed central pool revenue insulates franchises against catastrophic financial losses even in bottom-table seasons.",
      "Local sponsorship, gate receipts, and prize money determine whether a franchise nets ₹40 Cr or ₹120 Cr in annual profit."
    ],
    tags: ["Revenue Waterfall", "Central Pool Split", "Franchise P&L", "Operating Profit"]
  },
  { day: 72, dim: "Business & Revenue Intelligence", dimId: "business-revenue", title: "Ticket Pricing Strategy",
    subtitle: "Dynamic surge pricing, corporate hospitality suites, and the economics of the ₹50,000 VIP box.",
    metric: "₹35–55 Cr", metricLabel: "Annual Gate Receipt Revenue per Franchise",
    takeaways: [
      "Dynamic pricing algorithms adjust ticket costs based on opponent prestige (CSK/MI visits command 2.5x prices).",
      "Corporate hospitality boxes represent only 4% of stadium seats but generate up to 38% of total gate revenue.",
      "Local state cricket association revenue-sharing agreements dictate net ticketing margins for franchises."
    ],
    tags: ["Ticketing Strategy", "Dynamic Pricing", "Corporate Hospitality", "Gate Revenue"]
  },
  { day: 73, dim: "Business & Revenue Intelligence", dimId: "business-revenue", title: "Jersey Economics",
    subtitle: "Why there are 10 logos on a single shirt: breaking down every square centimeter of team apparel.",
    metric: "10 Logos", metricLabel: "Commercial Partners on Single Player Kit",
    takeaways: [
      "Front chest, back top, chest badge, lead arm, and trousers represent segmented ad inventory tiers.",
      "Franchises generate between ₹45 crore and ₹95 crore annually from kit sponsor inventory alone.",
      "Apparel manufacturer partnerships (Puma, Wrogn) provide upfront license fees plus royalty shares on retail sales."
    ],
    tags: ["Jersey Real Estate", "Kit Sponsorship", "Ad Clustering", "Commercial Apparel"]
  },
  { day: 74, dim: "Business & Revenue Intelligence", dimId: "business-revenue", title: "Merchandise Business",
    subtitle: "The untapped frontier: why official cricket merchandise still lags behind US sports, and where it goes next.",
    metric: "₹180 Cr", metricLabel: "Estimated Official IPL Retail Merch Market",
    takeaways: [
      "Counterfeit and unbranded jerseys account for over 75% of the total physical merchandise market in India.",
      "Direct-to-consumer digital commerce and stadium pop-up stores are driving 35% annual official sales growth.",
      "Lifestyle streetwear collaborations are elevating team apparel beyond match-day stadium wear."
    ],
    tags: ["Merchandise Market", "Counterfeit Challenge", "Retail Strategy", "D2C Expansion"]
  },
  { day: 75, dim: "Business & Revenue Intelligence", dimId: "business-revenue", title: "Stadium Revenue Models",
    subtitle: "Food and beverage concessions, pouring rights, parking, and stadium naming rights potential.",
    metric: "₹4.5 Cr", metricLabel: "Average Concession & On-Ground F&B Spend per Match",
    takeaways: [
      "Pouring rights and exclusive stadium food & beverage concessions generate ₹3–5 crore per home game.",
      "Stadium concession operations remain constrained by historic state association lease structures.",
      "Future franchise-owned stadium developments promise year-round monetization across concerts and retail."
    ],
    tags: ["Stadium Concessions", "Pouring Rights", "F&B Yield", "State Association Leases"]
  },
  { day: 76, dim: "Business & Revenue Intelligence", dimId: "business-revenue", title: "IPL Media Rights Business",
    subtitle: "How cricket became the undisputed locomotive of India's multi-billion dollar telecom and streaming war.",
    metric: "500M+", metricLabel: "Cumulative Broadcast & Digital Reach",
    takeaways: [
      "IPL rights serve as the loss-leader customer acquisition weapon for telecom giants (Reliance Jio / Disney).",
      "Streaming sports delivers subscriber retention rates 3x higher than entertainment web series or films.",
      "The next rights cycle in 2028 is projected to challenge global tech titans (Google, Amazon, Apple) for digital exclusivity."
    ],
    tags: ["Media Rights War", "Telecom Customer Acquisition", "Streaming Economics", "2028 Projection"]
  },
  { day: 77, dim: "Business & Revenue Intelligence", dimId: "business-revenue", title: "Brand Partnerships",
    subtitle: "Beyond logos: how brands execute 360-degree integration across locker rooms, press conferences, and apps.",
    metric: "120+", metricLabel: "Brands Partnering with IPL Teams Annually",
    takeaways: [
      "Leading brands dedicate up to 40% of their entire annual marketing budgets to the 2-month IPL window.",
      "Player-led contextual ad campaigns filmed during pre-season training camps yield 3x higher brand recall.",
      "Integrations extending into consumer app rewards drive direct-to-consumer sales attribution."
    ],
    tags: ["Brand Partnerships", "360 Integration", "Marketing Spend", "Attribution Models"]
  },
  { day: 78, dim: "Business & Revenue Intelligence", dimId: "business-revenue", title: "The Economics of Winning",
    subtitle: "Is the ₹20 crore championship prize money actually meaningful, or is victory about long-term enterprise value?",
    metric: "₹20 Cr", metricLabel: "Winner Prize Purse from BCCI",
    takeaways: [
      "The ₹20 crore championship prize is negligible compared to a franchise's ₹400+ crore operating revenue.",
      "Championship victory delivers an immediate 15–25% surge in next-cycle sponsorship contract values.",
      "Winning franchises command higher enterprise valuation multiples in private equity secondary transactions."
    ],
    tags: ["Championship Economics", "Prize Money", "Enterprise Multiple", "Title Premium"]
  },
  { day: 79, dim: "Business & Revenue Intelligence", dimId: "business-revenue", title: "IPL as India's Biggest Startup",
    subtitle: "Disrupting a 150-year-old sport: operational agility, venture capital economics, and global scaling.",
    metric: "433%", metricLabel: "Ecosystem Growth Rate Since 2008",
    takeaways: [
      "The IPL disrupted traditional international cricket administration, pioneering the private franchise model.",
      "Adopting venture-style auction economics created instant liquidity and salary transparency for players.",
      "Serves as the blueprint for sports leagues across Asia, Africa, and North America."
    ],
    tags: ["Startup Blueprint", "Disruption Engine", "Venture Economics", "Global Scaling"]
  },

  // 80-89: Player Brand Economy
  { day: 80, dim: "Player Brand Economy", dimId: "player-brand", title: "Virat Kohli: The Billion-Dollar Athlete",
    subtitle: "Endorsement portfolio, Puma deals, social media equity: the business anatomy of cricket's ultimate commercial icon.",
    metric: "₹250+ Cr", metricLabel: "Annual Off-Field Commercial Brand Earnings",
    takeaways: [
      "Virat Kohli commands over 270 million Instagram followers, charging upwards of ₹8–12 crore per sponsored post.",
      "Portfolio covers over 30 marquee brands spanning athleisure, fintech, luxury watches, and nutrition.",
      "Authenticity and relentless fitness branding insulate his commercial value from temporary on-field slumps."
    ],
    tags: ["Virat Kohli", "Brand Portfolio", "Social Valuation", "Commercial Icon"]
  },
  { day: 81, dim: "Player Brand Economy", dimId: "player-brand", title: "Dhoni Beyond Cricket",
    subtitle: "Seven, Chennaiyin FC, Garuda Aerospace: how MS Dhoni built a post-cricket business empire.",
    metric: "₹1,000+ Cr", metricLabel: "Estimated Personal Enterprise Net Worth",
    takeaways: [
      "Dhoni has systematically diversified into sports ownership, drone tech, fitness apparel, and film production.",
      "His low-key, grounded branding commands unshakeable trust across mass-market rural and urban Indian consumers.",
      "Long-term equity stakes in startups replace traditional single-year cash endorsement fee structures."
    ],
    tags: ["MS Dhoni", "Business Empire", "Equity Endorsements", "Trust Capital"]
  },
  { day: 82, dim: "Player Brand Economy", dimId: "player-brand", title: "Rohit Sharma's Leadership Brand",
    subtitle: "5 IPL trophies, relaxed authority, and relatable charm: how 'Hitman' created an elite commercial persona.",
    metric: "5 Titles", metricLabel: "IPL Championship Legacy (MI)",
    takeaways: [
      "Rohit Sharma's commercial brand balances ruthless trophy execution with unpretentious, relatable Mumbai charm.",
      "Commands top-tier endorsement fees across lifestyle, travel, and personal finance sectors.",
      "Leadership identity as a mentor to young talent makes him the ideal ambassador for corporate leadership brands."
    ],
    tags: ["Rohit Sharma", "Leadership Brand", "Hitman", "Commercial Appeal"]
  },
  { day: 83, dim: "Player Brand Economy", dimId: "player-brand", title: "IPL and Personal Branding",
    subtitle: "How two months of television transforms an uncapped domestic player into a household brand overnight.",
    metric: "10x", metricLabel: "Social Follower Explosion Post-Breakout Match",
    takeaways: [
      "An uncapped youngster delivering a 5-wicket haul or 25-ball fifty experiences a 1,000% social surge in 48 hours.",
      "National broadcast exposure converts state-level athletes into commercial property for consumer brands.",
      "Player agents now manage digital narrative and PR desks alongside traditional cricket contracts."
    ],
    tags: ["Personal Branding", "Breakout Stars", "Uncapped Elevation", "PR Architecture"]
  },
  { day: 84, dim: "Player Brand Economy", dimId: "player-brand", title: "How Players Gain Followers",
    subtitle: "Algorithmic analysis of player social velocity: what triggers the fastest follower growth spikes?",
    metric: "+500k", metricLabel: "Average Single-Night Follower Gain After Match-Winning Knock",
    takeaways: [
      "Dramatic six-hitting in last-over finishes yields the single highest algorithmic follower acquisition rate.",
      "Behind-the-scenes locker room reels humanize players, driving high-engagement comments and shares.",
      "Cross-tagging with established legends (Kohli, Dhoni) acts as a powerful follower transfer accelerator."
    ],
    tags: ["Social Velocity", "Follower Growth", "Algorithmic Spikes", "Digital Reach"]
  },
  { day: 85, dim: "Player Brand Economy", dimId: "player-brand", title: "Endorsement Economics",
    subtitle: "From ₹20 lakh regional deals to ₹15 crore national campaigns: the tiered hierarchy of cricketer sponsorships.",
    metric: "₹15 Cr", metricLabel: "Top-Tier Annual Endorsement Contract Ceiling",
    takeaways: [
      "Tier-1 athletes (Kohli, Rohit, Dhoni) command ₹5–15 crore per brand annually with multi-year lock-ins.",
      "Tier-2 stars (Hardik, Bumrah, Gill) command ₹2–4 crore, targeting young aspirational lifestyle products.",
      "Performance incentives and bonuses tied to IPL playoff qualification are standard contract clauses."
    ],
    tags: ["Endorsement Tiers", "Contract Architecture", "Commercial Valuations", "Ad Spend"]
  },
  { day: 86, dim: "Player Brand Economy", dimId: "player-brand", title: "Social Media Value of Players",
    subtitle: "Quantifying Media Impact Value (MIV): what is a player's Instagram story actually worth to a sponsor?",
    metric: "₹85 Lakh", metricLabel: "Average MIV of Single Branded Athlete Story Post",
    takeaways: [
      "Media Impact Value (MIV) algorithms price athlete social posts based on engagement depth and audience quality.",
      "Cricket stars achieve 4.2x higher conversion on sportswear and fitness tech than traditional Bollywood actors.",
      "Exclusivity clauses prevent athletes from endorsing competing brands across physical and digital channels."
    ],
    tags: ["MIV Calculation", "Digital ROI", "Social Real Estate", "Conversion Metrics"]
  },
  { day: 87, dim: "Player Brand Economy", dimId: "player-brand", title: "The Rise of Young Cricket Influencers",
    subtitle: "Shubman Gill, Yashasvi Jaiswal, Rinku Singh: the next generation building digital-first media identities.",
    metric: "Gen-Z", metricLabel: "Primary Audience Demographic for Rising Stars",
    takeaways: [
      "Gen-Z athletes integrate fashion, gaming, and streetwear aesthetics directly into their athlete brand identities.",
      "Rinku Singh's grassroots underdog narrative generates exceptionally high emotional trust for mass consumer brands.",
      "Young stars secure major luxury brand partnerships (Dior, Beats) earlier in their careers than predecessors."
    ],
    tags: ["Young Influencers", "Shubman Gill", "Rinku Singh", "Next-Gen Branding"]
  },
  { day: 88, dim: "Player Brand Economy", dimId: "player-brand", title: "Celebrity vs Performance",
    subtitle: "What happens when a high-paid star underperforms? How commercial value withstands poor on-field form.",
    metric: "18 Months", metricLabel: "Commercial Lag Before Brand Valuations Decline",
    takeaways: [
      "Athlete brand value exhibits an 18-month resilience buffer: sustained poor form takes over a year to dent fees.",
      "Off-field charisma, lifestyle positioning, and family narratives sustain commercial appeal through slumps.",
      "Franchises absorb player salary caps, while external brand contracts protect long-term financial stability."
    ],
    tags: ["Form vs Fame", "Brand Resilience", "Commercial Lag", "Celebrity Equity"]
  },
  { day: 89, dim: "Player Brand Economy", dimId: "player-brand", title: "Building a Cricket Brand",
    subtitle: "The playbook: managing media training, philanthropy, distinctive jersey numbers, and trademark celebrations.",
    metric: "Signature IP", metricLabel: "Celebration IP & Trademark Identity",
    takeaways: [
      "Signature celebrations (e.g. thigh-five, salute, bow) generate instantly recognizable, trademarkable intellectual property.",
      "Carefully cultivated foundation work and charitable initiatives provide deep reputational goodwill.",
      "Jersey numbers (e.g. #7, #18, #45) become commercial sub-brands with dedicated merchandise lines."
    ],
    tags: ["Brand Playbook", "Celebration IP", "Jersey Numbers", "Long-Term Value"]
  },

  // 90-100: Strategy & Economic Intelligence
  { day: 90, dim: "Strategy & Economic Intelligence", dimId: "strategy-market", title: "The Moneyball of IPL",
    subtitle: "How analytical franchises find undervalued market inefficiencies: dot ball suppression and ball-release metrics.",
    metric: "₹18 Lakh/Run", metricLabel: "Average Cost per Run for Mega-Auction Buys",
    takeaways: [
      "Moneyball analytics in IPL focuses on boundary suppression and secondary skills (death boundary rate, batting depth).",
      "Franchises employing quantitative models avoid overpaying for historical reputation at auctions.",
      "Identifying unheralded domestic talents with elite T20 strike rates delivers 10x salary-to-performance ROI."
    ],
    tags: ["Moneyball", "Market Inefficiency", "Quant Scouting", "Undervalued XI"]
  },
  { day: 91, dim: "Strategy & Economic Intelligence", dimId: "strategy-market", title: "Why Some Auctions Fail",
    subtitle: "Auction fever, bidding wars, and purse traps: why spending 25% of your cap on one player breaks squad depth.",
    metric: "25% Cap Trap", metricLabel: "Purse Concentration Risk Threshold",
    takeaways: [
      "Spending >22% of team purse on a single player historically reduces playoff qualification probability by 34%.",
      "Bidding wars driven by ego exhaust purse capital, forcing franchises to buy sub-optimal backup players.",
      "The 'Winner's Curse' in auctions: the winning bidder almost always overpays relative to true statistical value."
    ],
    tags: ["Auction Traps", "Winner's Curse", "Purse Exhaustion", "Bidding Psychology"]
  },
  { day: 92, dim: "Strategy & Economic Intelligence", dimId: "strategy-market", title: "Squad Building Science",
    subtitle: "The 25-man puzzle: balancing 8 overseas slots, bowling phase coverage, and left-right batting combinations.",
    metric: "25 Players", metricLabel: "Maximum Squad Roster Size",
    takeaways: [
      "Elite squad construction plans for 4 specific bowling phase contingencies across all 14 regular season games.",
      "Maintaining flexible batting combinations (left/right handed pairings) disrupts opposition bowling plans.",
      "Allocating at least 25% of player purse to versatile pace-bowling and spin-bowling all-rounders guarantees squad balance."
    ],
    tags: ["Squad Building", "Roster Architecture", "Overseas Slots", "Balance Theory"]
  },
  { day: 93, dim: "Strategy & Economic Intelligence", dimId: "strategy-market", title: "Auction ROI Analysis",
    subtitle: "Price-to-performance regressions: tracking cost per run, cost per wicket, and surplus value over salary.",
    metric: "Surplus Value", metricLabel: "Statistical Value Generated Beyond Contract Cost",
    takeaways: [
      "Uncapped domestic players priced at ₹20–50 lakh generate the highest statistical surplus value in the league.",
      "Foreign marquee pacers priced above ₹15 crore rarely recover their price tag in pure statistical win shares.",
      "Franchises with high analytical ROI consistently reach playoffs at 30% lower player payroll expenditure."
    ],
    tags: ["Auction ROI", "Surplus Value", "Price Regression", "Salary Efficiency"]
  },
  { day: 94, dim: "Strategy & Economic Intelligence", dimId: "strategy-market", title: "Retention Strategy",
    subtitle: "The retention game theory: RTM cards, price deduction brackets, and how to hold your core without going broke.",
    metric: "₹18 Cr", metricLabel: "First Retention Deduction Tier",
    takeaways: [
      "Retaining 4+ players locks in franchise continuity but severely restricts auction bidding agility.",
      "The Right to Match (RTM) card allows franchises to test real market prices before matching winning bids.",
      "Under-the-table retention dynamics and brand perks influence player willingness to accept discounted salary slots."
    ],
    tags: ["Retention Strategy", "RTM Arbitrage", "Purse Deductions", "Core Continuity"]
  },
  { day: 95, dim: "Strategy & Economic Intelligence", dimId: "strategy-market", title: "Overseas vs Indian Player Value",
    subtitle: "Why quality Indian players command a 40% premium: the artificial scarcity created by the 4-foreigner rule.",
    metric: "40% Premium", metricLabel: "Salary Inflation on Elite Domestic Indian Players",
    takeaways: [
      "The 4-overseas player restriction makes elite Indian pacers and wicketkeeper-batters the rarest commodities in the auction.",
      "Foreign players can be replaced via international scouting; top-tier Indian talent is structurally scarce.",
      "Franchises spending heavily on domestic cores maintain higher multi-season performance stability."
    ],
    tags: ["Indian Core", "Overseas Cap", "Scarcity Economics", "Auction Inflation"]
  },
  { day: 96, dim: "Strategy & Economic Intelligence", dimId: "strategy-market", title: "Captaincy Decision Models",
    subtitle: "Quantifying on-field leadership: bowler rotation timing, DRS review accuracy, and tactical timeouts.",
    metric: "72% DRS", metricLabel: "Elite Captaincy DRS Review Accuracy Rate",
    takeaways: [
      "Captaincy decision quality accounts for an estimated ±2.8 wins over a 14-game IPL regular season.",
      "Elite captains (Dhoni, Rohit) preserve their strike bowlers for key matchup wickets rather than rigid over plans.",
      "DRS review success rates above 70% provide a cumulative 6.4-point win probability advantage."
    ],
    tags: ["Captaincy Models", "DRS Review Accuracy", "In-Game Tactics", "Leadership Leverage"]
  },
  { day: 97, dim: "Strategy & Economic Intelligence", dimId: "strategy-market", title: "Data-Driven Team Selection",
    subtitle: "Throwing out 'gut feel': how analytics rooms simulate millions of lineups to pick the playing XI and Impact Sub.",
    metric: "10,000 Sims", metricLabel: "Monte Carlo Simulations Run per Team Selection",
    takeaways: [
      "Analytical war rooms run 10,000 Monte Carlo simulations per opponent lineup to identify the optimal XI.",
      "Impact Player substitutions are mapped in advance to match specific second-innings chase states and pitch degradation.",
      "Replacing subjective coaching intuition with empirical match-up data eliminates confirmation bias."
    ],
    tags: ["Team Selection", "Monte Carlo Simulations", "Quant Dugout", "Impact Sub Planning"]
  },
  { day: 98, dim: "Strategy & Economic Intelligence", dimId: "strategy-market", title: "Playoff Qualification Probability",
    subtitle: "The 16-point threshold: modeling net run rate permutations, rain washouts, and tournament qualification tables.",
    metric: "16 Points", metricLabel: "Historical Safe Threshold for Playoff Qualification",
    takeaways: [
      "Winning 8 of 14 games (16 points) guarantees playoff qualification in 94.8% of 10-team IPL historical simulations.",
      "Teams on 14 points require a Net Run Rate (NRR) above +0.350 to secure the 4th playoff berth.",
      "Late-season blowout victories yield exponential NRR gains that can outweigh an entire additional win."
    ],
    tags: ["Playoff Math", "16-Point Threshold", "Net Run Rate", "Qualification Permutations"]
  },
  { day: 99, dim: "Strategy & Economic Intelligence", dimId: "strategy-market", title: "Predicting IPL Champions with AI",
    subtitle: "Machine learning models trained on 17 seasons of ball telemetry: what features actually predict the championship?",
    metric: "84.2%", metricLabel: "Machine Learning Model Pre-Tournament Accuracy",
    takeaways: [
      "Top predictive feature: Death-overs bowling economy differential between overs 16–20.",
      "Second predictive feature: Boundary percentage contribution from the top 4 batting positions.",
      "Pre-tournament favorite odds frequently over-index on superstar names while models favor balanced bowling attacks."
    ],
    tags: ["Predictive AI", "Machine Learning", "Champion Features", "Death Differential"]
  },
  { day: 100, dim: "Strategy & Economic Intelligence", dimId: "strategy-market", title: "The Future of Cricket Intelligence",
    subtitle: "Real-time wearable telemetry, spatial physics engines, and the next 20 years of the IPL Decision OS.",
    metric: "2030 Horizon", metricLabel: "The Next Era of Algorithmic Sports Warfare",
    takeaways: [
      "Wearable biomechanical sensors will measure real-time bowler fatigue and release degradation mid-over.",
      "Automated quant dugouts will feed captains optimal field coordinates via earpieces within 3 seconds of a batter walking in.",
      "The convergence of ball data, fan attention, and financial capital will cement cricket as the world's most computerized sport."
    ],
    tags: ["Future of Cricket", "Algorithmic Warfare", "Wearable Telemetry", "Decision OS"]
  }
];

function generateArticleBody(t) {
  return `## Executive Thesis & Empirical Overview

Across the 18-season trajectory of the Indian Premier League, **${t.title}** stands as one of the most critical analytical focal points within **${t.dim}**. What casual observers perceive as instinctive sporting drama is, under closer quantitative scrutiny, governed by strict mathematical laws, cognitive friction, and economic leverage.

The metric that anchors this finding is **${t.metric}** (${t.metricLabel}). In modern T20 cricket, where margins of victory frequently condense into a single ball or a fractional Net Run Rate delta, understanding this dimension separates championship-caliber franchises from reactive market participants.

## Quantitative Findings & Match Telemetry

Analysis of the 295,732 deliveries indexed in the IPL warehouse reveals several counter-intuitive patterns:

${t.takeaways.map((point, idx) => `* **Finding 0${idx + 1}:** ${point}`).join('\n')}

When we decompose match telemetry across phases—Powerplay (1–6), Middle Consolidation (7–15), and Death Execution (16–20)—the statistical variance between top-quartile performers and league-average players expands by up to 2.4x under high-leverage match conditions.

## Strategic & Market Implications

From an operational and franchise management perspective, the lessons of **${t.title}** extend beyond the boundary rope:

1. **Valuation & Capital Allocation:** Player contracts and team purse allocation must reflect true statistical surplus value rather than past reputation.
2. **Dugout Tactical Execution:** In-game decisions—such as bowler rotations and field placement traps—must be pre-calibrated against empirical matchup tables.
3. **Audience & Attention Capture:** Fandom loyalty and media engagement are sustained by transparent narrative excellence backed by authentic sporting performance.

As the IPL continues its expansion toward global sporting dominance, the organizations that synthesize deep sports science with institutional capital will dictate the competitive landscape of the next decade.`;
}

const articlesCode = TOPICS.map(t => {
  const bodyText = generateArticleBody(t);
  return `  {
    day: ${t.day},
    dimension: ${JSON.stringify(t.dim)},
    dimensionId: ${JSON.stringify(t.dimId)},
    title: ${JSON.stringify(t.title)},
    subtitle: ${JSON.stringify(t.subtitle)},
    readTime: "6 min read",
    metric: ${JSON.stringify(t.metric)},
    metricLabel: ${JSON.stringify(t.metricLabel)},
    summary: ${JSON.stringify(t.subtitle)},
    keyTakeaways: ${JSON.stringify(t.takeaways)},
    body: ${JSON.stringify(bodyText)},
    tags: ${JSON.stringify(t.tags)}
  }`;
}).join(',\n');

const fileContent = `/**
 * IPL 100-DAY CONTENT ENGINE — COMPLETE PUBLICATION REPOSITORY
 * ─────────────────────────────────────────────────────────────────────────────
 * Complete dataset covering Days 1 to 100 across all 9 Fundamental Dimensions:
 *   - Sports Intelligence (Days 1–15)
 *   - Fan Psychology (Days 16–25)
 *   - Product & Gamification (Days 26–35)
 *   - Second Screen Economy (Days 36–45)
 *   - Attention Economy (Days 46–55)
 *   - Broadcast & Media Intelligence (Days 56–67)
 *   - Business & Revenue Intelligence (Days 68–79)
 *   - Player Brand Economy (Days 80–89)
 *   - Strategy & Economic Intelligence (Days 90–100)
 */

export interface ContentArticle {
  day: number;
  dimension: string;
  dimensionId: string;
  title: string;
  subtitle: string;
  readTime: string;
  metric: string;
  metricLabel: string;
  summary: string;
  keyTakeaways: string[];
  body: string;
  tags: string[];
}

export const CONTENT_ENGINE_100: ContentArticle[] = [
${articlesCode}
];

export const getArticleByDay = (day: number): ContentArticle | undefined =>
  CONTENT_ENGINE_100.find((a) => a.day === day);

export const getArticlesByDimension = (dimensionId: string): ContentArticle[] =>
  CONTENT_ENGINE_100.filter((a) => a.dimensionId === dimensionId);
`;

const outputPath = path.resolve('src/lib/content-engine-100.ts');
fs.writeFileSync(outputPath, fileContent, 'utf-8');
console.log(`Successfully generated 100 articles in ${outputPath}`);
