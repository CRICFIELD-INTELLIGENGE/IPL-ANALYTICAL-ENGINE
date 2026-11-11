// Editorial eras from the earlier My Dugout page. Kept for reference, NOT rendered.
//
// These are hand-written summaries and are not checked against the ball-by-ball
// record. Some conflict with it (for example, the 2026 title is described here as
// the franchise's first, while the warehouse also records a 2025 final win). The
// Dugout now draws its history from the warehouse, see components/dugout/season-timeline.tsx.

import type { TeamCode } from "@/lib/team-context";

export const FRANCHISE_ERAS: Record<TeamCode, Array<{ era: string; year: string; title: string; highlight: string; outcome: string; badge: string; milestoneKey?: string }>> = {
  RCB: [
    { era: "Inception Era", year: "2008–2010", title: "Early Foundation & Kumble Final Run", highlight: "Rebuilt squad around Anil Kumble's captaincy leading to the 2009 Johannesburg final run.", outcome: "Runners-Up 2009", badge: "FOUNDATION" },
    { era: "The Gayle-Kohli-AB Storm", year: "2011–2016", title: "Record 263/5 & Historic 2016 Campaign", highlight: "Virat Kohli's historic 973-run season with 4 centuries, carrying RCB to the epic 2016 Chinnaswamy final.", outcome: "Runners-Up 2016", badge: "PEAK VIOLENCE", milestoneKey: "RCB_2016" },
    { era: "Bowling Rebuild", year: "2020–2024", title: "Playoffs Consistency & Siraj-Chahal Axis", highlight: "Qualifying for playoffs 4 seasons out of 5 with death-overs discipline and elite spin economy.", outcome: "Playoffs Regulars", badge: "BALANCE" },
    { era: "Championship Glory", year: "2026", title: "Maiden TATA IPL Title Triumph", highlight: "11 wins - 4 losses campaign. Kohli leads run-scoring with 741 runs, sealing the elusive first trophy.", outcome: "CHAMPIONS 2026 ★", badge: "MAIDEN TITLE", milestoneKey: "RCB_2026" }
  ],
  CSK: [
    { era: "First Dynasty", year: "2010–2011", title: "Back-to-Back Championships", highlight: "Dhoni and Fleming establish the Chepauk spin stranglehold, winning back-to-back IPL titles.", outcome: "CHAMPIONS 2010, 2011 ★", badge: "DYNASTY" },
    { era: "The Fairytale Return", year: "2018", title: "The Dad's Army Miracle", highlight: "After two years away, Watson's final blitz seals an emotional fairytale third title for the yellow army.", outcome: "CHAMPIONS 2018 ★", badge: "FAIRYTALE", milestoneKey: "CSK_2018" },
    { era: "Title Number 4 & 5", year: "2021–2023", title: "Ahmedabad Rain Thriller & 5th Star", highlight: "Ravindra Jadeja strikes 10 runs off the final 2 balls at 1:35 AM to equal MI with 5 IPL titles.", outcome: "CHAMPIONS 2021, 2023 ★", badge: "RECORD 5 TITLES", milestoneKey: "CSK_2023" },
    { era: "Succession Era", year: "2024–2026", title: "Ruturaj Era & Strategic Succession", highlight: "Smooth captaincy transition to Gaikwad while preserving the core Dhoni tactical blueprint.", outcome: "Playoff Contenders", badge: "SUCCESSION" }
  ],
  MI: [
    { era: "The Breakthrough", year: "2013", title: "Rohit Takes the Armband", highlight: "Rohit Sharma named captain mid-season, defeating CSK at Eden Gardens to lift MI's first title.", outcome: "CHAMPIONS 2013 ★", badge: "FIRST STAR", milestoneKey: "MI_2013" },
    { era: "Odd-Year Juggernaut", year: "2015–2019", title: "Four Titles in Seven Years", highlight: "Bumrah, Malinga, Pollard, and the Pandya brothers dominate high-pressure playoff finals.", outcome: "CHAMPIONS 2015, 2017, 2019 ★", badge: "PRESSURE DOMINANCE", milestoneKey: "MI_2019" },
    { era: "Greatest T20 Team", year: "2020", title: "The Undisputed 2020 Campaign", highlight: "Clinical domination from match one to the final in Dubai, crowned five-time champions.", outcome: "CHAMPIONS 2020 ★", badge: "RECORD 5 TITLES", milestoneKey: "MI_2020" },
    { era: "Transition Matrix", year: "2024–2026", title: "Core Regeneration & Hardik Leadership", highlight: "Rebuilding the pace battery around Bumrah with emerging Indian domestic all-rounders.", outcome: "Rebuilding Core", badge: "NEW GENERATION" }
  ],
  KKR: [
    { era: "Gambhir Revolution", year: "2012–2014", title: "Two Titles Under Gautam Gambhir", highlight: "Sunil Narine mystery spin and aggressive top-order revolution yields two championships.", outcome: "CHAMPIONS 2012, 2014 ★", badge: "TWICE CHAMPIONS", milestoneKey: "KKR_2014" },
    { era: "The Boundary Engine", year: "2018–2023", title: "Andre Russell Era & High-Risk Cricket", highlight: "Pioneering ultra-high strike rate cricket and death overs blitzes across Indian venues.", outcome: "Runners-Up 2021", badge: "BOUNDARY POWER" },
    { era: "The 2024 Masterclass", year: "2024", title: "Narine-Salt Opening Rampage", highlight: "Unstoppable run-rate blitz through 2024 with Mitchell Starc's playoff masterclass lifting 3rd cup.", outcome: "CHAMPIONS 2024 ★", badge: "3RD STAR", milestoneKey: "KKR_2024" },
    { era: "Title Defense", year: "2025–2026", title: "Retaining All-Phase Dominance", highlight: "Preserving spin duo Narine-Varun while grooming young Indian domestic anchors.", outcome: "Top-4 Contenders", badge: "SPIN ARSENAL" }
  ],
  SRH: [
    { era: "Deccan Roots", year: "2009", title: "Gilchrist's South Africa Triumph", highlight: "Deccan Chargers roar from last place to tournament champions in South Africa.", outcome: "CHAMPIONS 2009 ★", badge: "FIRST TITLE" },
    { era: "Warner's Fortress", year: "2016", title: "Defending Low Totals & 2016 Win", highlight: "David Warner scores 848 runs, defending 208 against RCB at Chinnaswamy for the trophy.", outcome: "CHAMPIONS 2016 ★", badge: "CHAMPIONS 2016", milestoneKey: "RCB_2016" },
    { era: "Bowling Citadel", year: "2018", title: "Kane Williamson Final Run", highlight: "Rashid Khan and Bhuvneshwar Kumar choke oppositions under 140 regularly throughout 2018.", outcome: "Runners-Up 2018", badge: "BOWLING CITADEL", milestoneKey: "CSK_2018" },
    { era: "287/3 Boundary Revolution", year: "2024–2026", title: "Head-Abhishek Historic Scoring Spikes", highlight: "Shattered all-time IPL scoring records with 277 and 287/3 totals under Pat Cummins.", outcome: "Runners-Up 2024", badge: "WORLD RECORD" }
  ],
  RR: [
    { era: "Shane Warne Magic", year: "2008", title: "Inaugural Fairytale Champions", highlight: "Shane Warne leads an unheralded young squad to win the first ever IPL tournament.", outcome: "CHAMPIONS 2008 ★", badge: "INAUGURAL TITLE", milestoneKey: "RR_2008" },
    { era: "Young Gun Nursery", year: "2013–2021", title: "Developing India's Next Generation", highlight: "Pioneering the discovery of Sanju Samson, Karun Nair, and dynamic domestic talent.", outcome: "Playoffs Regulars", badge: "SCOUTING" },
    { era: "Jaiswal-Buttler Reign", year: "2022–2024", title: "Jos Buttler 4 Centuries & Final Run", highlight: "Jos Buttler scores 863 runs in 2022 taking RR to the final; Yashasvi Jaiswal explodes.", outcome: "Runners-Up 2022", badge: "TOP-3 POWER", milestoneKey: "GT_2022" },
    { era: "Championship Quest", year: "2025–2026", title: "Balancing Finishing Explosiveness", highlight: "Pairing elite powerplay pacing with tandem spin control in middle overs.", outcome: "Contenders", badge: "CHAMPIONSHIP PUSH" }
  ],
  DC: [
    { era: "Daredevils Era", year: "2008–2012", title: "Sehwag & Gambhir Top-Order Blasts", highlight: "Topping the league stage in 2009 and 2012 with devastating powerplay boundary hitting.", outcome: "Semi-Finalists", badge: "ORIGINAL RUN" },
    { era: "The Capitals Rebrand", year: "2019–2020", title: "Ponting-Iyer Duo & Dubai Final", highlight: "Rebranding to Delhi Capitals, reaching their first ever IPL Grand Final in 2020.", outcome: "Runners-Up 2020", badge: "GRAND FINAL", milestoneKey: "MI_2020" },
    { era: "Pant's Return", year: "2024", title: "Rishabh Pant Inspirational Comeback", highlight: "Heroic return to competitive cricket post-rehabilitation, rallying the capital franchise.", outcome: "Inspirational Run", badge: "RESILIENCE" },
    { era: "2027 Blueprint", year: "2025–2026", title: "Mega-Auction Pace Battery Focus", highlight: "Constructing high-ceiling Indian batting depth backed by express international quicks.", outcome: "Core Rebuild", badge: "BLUEPRINT" }
  ],
  PBKS: [
    { era: "Early Firepower", year: "2008", title: "Yuvraj & Marsh Orange Cap", highlight: "Shaun Marsh's breakout 616-run season leads Kings XI to the inaugural semi-finals.", outcome: "Semi-Finalists 2008", badge: "INAUGURAL RUN" },
    { era: "Maxwell-Miller Carnage", year: "2014", title: "The 2014 Table-Topping Rampage", highlight: "Glenn Maxwell's hurricane hitting and Wriddhiman Saha's final century taking Punjab to the final.", outcome: "Runners-Up 2014", badge: "FINAL RUN", milestoneKey: "KKR_2014" },
    { era: "KL Rahul Orange Dominance", year: "2018–2021", title: "Record Individual Boundary Seasons", highlight: "Fastest ever IPL fifty (14 balls) and consecutive 600+ season run tallies.", outcome: "Top Batter Honors", badge: "INDIVIDUAL GLORY" },
    { era: "Aggression Matrix", year: "2024–2026", title: "Uncapped Match-Winners Emerge", highlight: "Ashutosh Sharma and Shashank Singh engineer historic run-chases from impossible depths.", outcome: "Record Chasers", badge: "FEARLESS CORE" }
  ],
  GT: [
    { era: "Inaugural Sensation", year: "2022", title: "Maiden Season Championship Victory", highlight: "Hardik Pandya and Ashish Nehra steer new franchise to title glory at Narendra Modi Stadium.", outcome: "CHAMPIONS 2022 ★", badge: "DEBUT TITLE", milestoneKey: "GT_2022" },
    { era: "Consecutive Finalists", year: "2023", title: "Shubman Gill 890 Runs Masterclass", highlight: "Three playoff centuries from Gill taking Titans within one ball of back-to-back titles.", outcome: "Runners-Up 2023", badge: "FINALISTS", milestoneKey: "CSK_2023" },
    { era: "Shubman Captaincy Era", year: "2024–2026", title: "Tactical Discipline & Pace Assembly", highlight: "Youngest franchise captain implementing data-driven bowling plans and disciplined powerplays.", outcome: "Solid Contenders", badge: "NEW CAPTAINCY" }
  ],
  LSG: [
    { era: "Dual Playoff Starts", year: "2022–2023", title: "Back-to-Back Playoff Qualifications", highlight: "New franchise reaches playoffs in consecutive debut years under KL Rahul.", outcome: "Eliminator Finalists", badge: "DUAL PLAYOFFS" },
    { era: "Mayank Velocity Shock", year: "2024", title: "156.7 km/h Express Pace Arrival", highlight: "Mayank Yadav breaks tournament speedometers, bowling consecutive player-of-the-match spells.", outcome: "Breakout Sensation", badge: "EXPRESS VELOCITY" },
    { era: "2027 Reset", year: "2025–2026", title: "Ekana Spin-Pace Fortress Blueprint", highlight: "Engineering pitch-customized lineups for red/black soil flexibility in Lucknow.", outcome: "War Room Planning", badge: "TACTICAL PIVOT" }
  ]
};
