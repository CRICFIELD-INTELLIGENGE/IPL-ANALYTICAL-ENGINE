import React, { useState, useMemo, useEffect } from "react";
import { Filter, Calendar, Users, Target, Zap, Activity, ArrowUpRight, Flame, Shield } from "lucide-react";
import { useSquadsBySeason } from "../../lib/aggregates";

const TEAM_NAMES: Record<string, string> = {
  "CSK": "Chennai Super Kings",
  "MI": "Mumbai Indians",
  "RCB": "Royal Challengers Bengaluru",
  "KKR": "Kolkata Knight Riders",
  "SRH": "Sunrisers Hyderabad",
  "DC": "Delhi Capitals",
  "PBKS": "Punjab Kings",
  "RR": "Rajasthan Royals",
  "GT": "Gujarat Titans",
  "LSG": "Lucknow Super Giants"
};

export function SankeyDiagram(props: any) {
  return <TransferFlowSankey onSelectPlayer={props.onSelectPlayer} />;
}

function getPlayerTransferBackstory(name: string, link: any) {
  const cleanName = name.toLowerCase();

  if (cleanName.includes("jadeja")) {
    return {
      price: "₹16.00 Cr ($2.0M)",
      type: "🛡️ Draft Allocation & Key Retention",
      hype: "Marquee Championship Winner",
      story: "Drafted to Gujarat Lions during CSK's 2016-17 suspension, returned to CSK in 2018. Scored 10 runs off final 2 balls in IPL 2023 Final to win the title for CSK.",
      role: "Spin All-Rounder & Gun Fielder",
      stats: "2,950+ Runs | 160+ Wkts | 100+ Catches"
    };
  }
  if (cleanName.includes("suryakumar") || cleanName.includes("sky")) {
    return {
      price: "₹8.00 Cr ➔ ₹16.30 Cr",
      type: "⚡ Mega Auction Acquisition",
      hype: "360-Degree T20 Maestro",
      story: "Moved from KKR to Mumbai Indians in 2018. Transformed into the world's #1 T20 batter, scoring 300+ runs every season for MI.",
      role: "360-Degree Top-Order Batter",
      stats: "3,500+ Runs | 145.3 SR | 2 100s"
    };
  }
  if (cleanName.includes("pant")) {
    return {
      price: "₹27.00 Cr ($3.2M)",
      type: "🔥 Record Breaking Mega Auction Pick",
      hype: "Highest Auction Price in IPL History",
      story: "Starred for Delhi Capitals (2016-24) as captain. Acquired by Lucknow Super Giants in 2025 Mega Auction for a record ₹27.00 Cr.",
      role: "Wicket-Keeper Batter & Captain",
      stats: "3,284 Runs | 148.5 SR | 1 100"
    };
  }
  if (cleanName.includes("iyer")) {
    return {
      price: "₹26.75 Cr ($3.1M)",
      type: "🏆 Championship Captain Auction Pick",
      hype: "IPL 2024 Winning Captain Trade",
      story: "Captained Delhi Capitals to 2020 Final, led KKR to the IPL 2024 Trophy, then acquired by Punjab Kings for ₹26.75 Cr in 2025.",
      role: "Top-Order Batter & Champion Captain",
      stats: "3,127 Runs | 127.5 SR | 21 50s"
    };
  }
  if (cleanName.includes("samson")) {
    return {
      price: "₹18.00 Cr",
      type: "👑 Retained Captain Cornerstone",
      hype: "Rajasthan Royals Franchise Leader",
      story: "Played for RR (2013-15), moved to Delhi Daredevils (2016-17), returned to RR in 2018, leading them to the 2022 IPL Final.",
      role: "Wicket-Keeper Batter & Captain",
      stats: "4,419 Runs | 138.9 SR | 3 100s"
    };
  }
  if (cleanName.includes("hardik")) {
    return {
      price: "₹15.00 Cr ($1.8M)",
      type: "🔥 All-Cash Franchise Trade",
      hype: "Historic Marquee Captain Trade",
      story: "Led Gujarat Titans to the IPL 2022 Title & 2023 Final. Traded back to Mumbai Indians in an historic all-cash deal in 2024 to take over as MI Captain.",
      role: "Pace All-Rounder & Captain",
      stats: "2,500+ Runs | 60+ Wkts | 145.8 SR"
    };
  }
  if (cleanName.includes("rohit")) {
    return {
      price: "₹13.00 Cr ($1.6M)",
      type: "⚡ Mega Auction Acquisition",
      hype: "Franchise Cornerstone Movement",
      story: "Transferred from Deccan Chargers to Mumbai Indians ahead of the 2011 Mega Auction. Appointed captain in 2013, guiding MI to 5 IPL titles.",
      role: "Top-Order Batter & 5x Champion Captain",
      stats: "6,600+ Runs | 257 Matches | 42 50s"
    };
  }
  if (cleanName.includes("dhawan")) {
    return {
      price: "₹8.25 Cr",
      type: "🔄 IPL Trade & Retention",
      hype: "Record Transfer Veteran",
      story: "Played for DD (2008), MI (2009-10), Deccan (2011-12), SRH (2013-18), DC (2019-21), and PBKS (2022-24). Highest boundary hitter in IPL history.",
      role: "Opener / Left-Hand Batter",
      stats: "6,769 Runs | 51 50s | 2 100s"
    };
  }
  if (cleanName.includes("rahul")) {
    return {
      price: "₹17.00 Cr ($2.2M)",
      type: "💎 Draft / Marquee Auction Buy",
      hype: "Record Franchise Captain Pick",
      story: "Moved from SRH to RCB in 2016, became Punjab Kings Captain in 2018, then drafted as inaugural Lucknow Super Giants Captain in 2022.",
      role: "Wicket-Keeper Batter & Captain",
      stats: "4,683 Runs | 134.6 SR | 4 100s"
    };
  }
  if (cleanName.includes("dhoni")) {
    return {
      price: "₹12.50 Cr",
      type: "🛡️ Suspension Allocation & Return",
      hype: "CSK Legendary Return",
      story: "Drafted to Rising Pune Supergiant during CSK's 2016-17 suspension, then returned in 2018 to lead CSK to 3 more IPL titles.",
      role: "Wicket-Keeper Batter & 5x Champion Captain",
      stats: "5,243 Runs | 137.5 SR | 142 Stumpings/Catches"
    };
  }
  if (cleanName.includes("gayle")) {
    return {
      price: "₹3.20 Cr",
      type: "🚀 Replacement Sign & Trade",
      hype: "Universe Boss Movement",
      story: "Replaced Dirk Nannes at RCB in 2011 and scored 175* (highest T20 score). Later transferred to PBKS in 2018.",
      role: "Opening Power Hitter",
      stats: "4,965 Runs | 148.9 SR | 357 Sixes"
    };
  }
  if (cleanName.includes("villiers")) {
    return {
      price: "₹5.50 Cr",
      type: "⭐ Mega Auction Draft",
      hype: "Hall of Fame Transfer",
      story: "Transferred from Delhi Daredevils to Royal Challengers Bengaluru in 2011, forging the legendary partnership with Virat Kohli.",
      role: "360-Degree Batter & Wicket-Keeper",
      stats: "5,162 Runs | 151.7 SR | 251 Sixes"
    };
  }

  // Fallback template generator for any player
  return {
    price: "Auction Fee / Retained",
    type: `Franchise Shift (${link?.source || 'Origin'} ➔ ${link?.target || 'Destination'})`,
    hype: "Official IPL Squad Transfer",
    story: `${name} officially transferred from ${link?.source || 'previous franchise'} to ${link?.target || 'new franchise'} in Season ${link?.year || '2008-26'}.`,
    role: "Batter / Bowler / All-Rounder",
    stats: "Official Cricsheet Telemetry Record"
  };
}

// ----------------------------------------------------------------------
// CARD 1: 3D HOLOGRAPHIC MAGNIFICENT TEMPLATE (PLAYER TRANSFERS 2008 – 2026)
// ----------------------------------------------------------------------
export function TransferFlowSankey({ onSelectPlayer }: { onSelectPlayer?: (player: string) => void }) {
  const [fromYear, setFromYear] = useState<string>("2008");
  const [toYear, setToYear] = useState<string>("2026");
  const [selectedTeam, setSelectedTeam] = useState<string>("All");
  const [searchPlayer, setSearchPlayer] = useState<string>("");
  const [viewMode, setViewMode] = useState<"3d" | "grid">("3d");
  const [hoveredLink, setHoveredLink] = useState<number | null>(null);
  const [selectedLink, setSelectedLink] = useState<number | null>(null);
  const [activePlayerSubCard, setActivePlayerSubCard] = useState<{ name: string; link: any } | null>(null);
  const [dynamicLinks, setDynamicLinks] = useState<any[]>([]);

  const squadsQuery = useSquadsBySeason();
  const ALL_YEARS = Array.from({ length: 19 }, (_, i) => String(2008 + i));

  // Team Brand Colors Mapping
  const teamColorsMap: Record<string, string> = {
    'Deccan Chargers': '#f97316',
    'Mumbai Indians': '#1d4ed8',
    'Chennai Super Kings': '#eab308',
    'Royal Challengers Bengaluru': '#dc2626',
    'Royal Challengers Bangalore': '#dc2626',
    'Sunrisers Hyderabad': '#ea580c',
    'Gujarat Titans': '#1e293b',
    'Lucknow Super Giants': '#0284c7',
    'Kolkata Knight Riders': '#6b21a8',
    'Delhi Capitals': '#2563eb',
    'Delhi Daredevils': '#2563eb',
    'Rajasthan Royals': '#db2777',
    'Punjab Kings': '#DD1F2D',
    'Kings XI Punjab': '#DD1F2D',
    'Rising Pune Supergiant': '#9333ea',
    'Gujarat Lions': '#f97316'
  };

  // Compute transfers directly from 2008-2026 squad database
  const computedSquadTransfers = useMemo(() => {
    if (!squadsQuery.data) return [];
    
    const playerJourneys = new Map<string, Array<{ season: number; team: string }>>();

    for (const [seasonStr, teamsObj] of Object.entries(squadsQuery.data)) {
      const season = parseInt(seasonStr);
      if (isNaN(season)) continue;

      for (const [teamName, playerList] of Object.entries(teamsObj as Record<string, any[]>)) {
        for (const p of playerList) {
          const playerName = p.name || p.cricsheetName;
          if (!playerName) continue;
          if (!playerJourneys.has(playerName)) {
            playerJourneys.set(playerName, []);
          }
          playerJourneys.get(playerName)!.push({ season, team: teamName });
        }
      }
    }

    const linksMap = new Map<string, { source: string; target: string; year: number; players: Set<string>; sourceColor: string; targetColor: string }>();

    for (const [playerName, journey] of playerJourneys.entries()) {
      journey.sort((a, b) => a.season - b.season);
      for (let i = 0; i < journey.length - 1; i++) {
        const curr = journey[i];
        const next = journey[i + 1];
        if (curr.team !== next.team) {
          const srcName = curr.team;
          const tgtName = next.team;
          const key = `${srcName}_${curr.season}->${tgtName}_${next.season}`;

          if (!linksMap.has(key)) {
            linksMap.set(key, {
              source: `${srcName} '${String(curr.season).slice(2)}`,
              target: `${tgtName} '${String(next.season).slice(2)}`,
              year: next.season,
              players: new Set<string>(),
              sourceColor: teamColorsMap[srcName] || "#3b82f6",
              targetColor: teamColorsMap[tgtName] || "#a855f7"
            });
          }
          linksMap.get(key)!.players.add(playerName);
        }
      }
    }

    return Array.from(linksMap.values()).map(l => ({
      source: l.source,
      target: l.target,
      year: l.year,
      value: l.players.size,
      players: Array.from(l.players),
      sourceColor: l.sourceColor,
      targetColor: l.targetColor
    }));
  }, [squadsQuery.data]);

  // Fetch full 2008-2026 dataset fallback
  useEffect(() => {
    fetch("/data/sankey.json")
      .then(res => {
        if (!res.ok) return fetch("/api/ipl/sankey");
        return res;
      })
      .then(res => res.json())
      .then(data => {
        if (data?.nodes && data?.links) {
          const nodeMap = new Map(data.nodes.map((n: any) => [n.id, n]));
          const parsed = data.links.map((l: any) => {
            const srcNode: any = nodeMap.get(l.source) || { name: l.source, season: "2011" };
            const tgtNode: any = nodeMap.get(l.target) || { name: l.target, season: "2012" };
            const srcYear = parseInt(srcNode.season) || 2011;
            const tgtYear = parseInt(tgtNode.season) || 2012;
            const srcName = srcNode.name || l.source;
            const tgtName = tgtNode.name || l.target;

            return {
              source: `${srcName} '${String(srcYear).slice(2)}`,
              target: `${tgtName} '${String(tgtYear).slice(2)}`,
              value: l.value || (l.players ? l.players.length : 1),
              players: l.players || [],
              sourceColor: teamColorsMap[srcName] || "#3b82f6",
              targetColor: teamColorsMap[tgtName] || "#a855f7",
              year: tgtYear
            };
          });
          setDynamicLinks(parsed);
        }
      })
      .catch(err => {
        console.warn("Using built-in transfer dataset:", err);
      });
  }, []);

  // Comprehensive 2008 - 2026 Fallback Player Transfers Dataset matching IPLens Database
  const rawTransferLinks = [
    { source: "Deccan Chargers '10", target: "Mumbai Indians '11", value: 3, players: ["Rohit Sharma", "Andrew Symonds", "TL Suman"], sourceColor: "#f97316", targetColor: "#1d4ed8", year: 2011 },
    { source: "Delhi Capitals '08", target: "Mumbai Indians '09", value: 1, players: ["Shikhar Dhawan"], sourceColor: "#2563eb", targetColor: "#1d4ed8", year: 2009 },
    { source: "Mumbai Indians '10", target: "Deccan Chargers '11", value: 2, players: ["Shikhar Dhawan", "JP Duminy"], sourceColor: "#1d4ed8", targetColor: "#f97316", year: 2011 },
    { source: "Deccan Chargers '12", target: "Sunrisers Hyderabad '13", value: 12, players: ["Shikhar Dhawan", "Parthiv Patel", "Kumar Sangakkara", "Cameron White", "Amit Mishra", "Dale Steyn"], sourceColor: "#f97316", targetColor: "#ea580c", year: 2013 },
    { source: "Sunrisers Hyderabad '18", target: "Delhi Capitals '19", value: 1, players: ["Shikhar Dhawan"], sourceColor: "#ea580c", targetColor: "#2563eb", year: 2019 },
    { source: "Delhi Capitals '21", target: "Punjab Kings '22", value: 2, players: ["Shikhar Dhawan", "Kagiso Rabada"], sourceColor: "#2563eb", targetColor: "#DD1F2D", year: 2022 },
    { source: "Delhi Capitals '13", target: "Sunrisers Hyderabad '14", value: 3, players: ["David Warner", "Naman Ojha", "Irfan Pathan"], sourceColor: "#2563eb", targetColor: "#ea580c", year: 2014 },
    { source: "Sunrisers Hyderabad '21", target: "Delhi Capitals '22", value: 3, players: ["David Warner", "Mitchell Marsh", "Khaleel Ahmed"], sourceColor: "#ea580c", targetColor: "#2563eb", year: 2022 },
    { source: "Chennai Super Kings '15", target: "Gujarat Lions '16", value: 5, players: ["Suresh Raina", "Ravindra Jadeja", "Brendon McCullum", "Dwayne Smith", "Dwayne Bravo"], sourceColor: "#eab308", targetColor: "#f97316", year: 2016 },
    { source: "Gujarat Lions '17", target: "Chennai Super Kings '18", value: 2, players: ["Suresh Raina", "Ravindra Jadeja"], sourceColor: "#f97316", targetColor: "#eab308", year: 2018 },
    { source: "Chennai Super Kings '15", target: "Rising Pune Supergiant '16", value: 3, players: ["MS Dhoni", "Faf du Plessis", "Ravichandran Ashwin"], sourceColor: "#eab308", targetColor: "#9333ea", year: 2016 },
    { source: "Rising Pune Supergiant '17", target: "Chennai Super Kings '18", value: 5, players: ["MS Dhoni", "Faf du Plessis", "Shardul Thakur", "Deepak Chahar", "Imran Tahir"], sourceColor: "#9333ea", targetColor: "#eab308", year: 2018 },
    { source: "Royal Challengers Bengaluru '13", target: "Sunrisers Hyderabad '14", value: 2, players: ["KL Rahul", "Moises Henriques"], sourceColor: "#dc2626", targetColor: "#ea580c", year: 2014 },
    { source: "Sunrisers Hyderabad '15", target: "Royal Challengers Bengaluru '16", value: 2, players: ["KL Rahul", "Parvez Rasool"], sourceColor: "#ea580c", targetColor: "#dc2626", year: 2016 },
    { source: "Royal Challengers Bengaluru '16", target: "Punjab Kings '18", value: 1, players: ["KL Rahul"], sourceColor: "#dc2626", targetColor: "#DD1F2D", year: 2018 },
    { source: "Punjab Kings '21", target: "Lucknow Super Giants '22", value: 4, players: ["KL Rahul", "Deepak Hooda", "K Krishnappa", "Ravi Bishnoi"], sourceColor: "#DD1F2D", targetColor: "#0284c7", year: 2022 },
    { source: "Lucknow Super Giants '24", target: "Delhi Capitals '25", value: 1, players: ["KL Rahul"], sourceColor: "#0284c7", targetColor: "#2563eb", year: 2025 },
    { source: "Delhi Capitals '10", target: "Royal Challengers Bengaluru '11", value: 4, players: ["AB de Villiers", "Tillakaratne Dilshan", "Daniel Vettori", "Dirk Nannes"], sourceColor: "#2563eb", targetColor: "#dc2626", year: 2011 },
    { source: "Mumbai Indians '09", target: "Rajasthan Royals '11", value: 2, players: ["Ajinkya Rahane", "Pinal Shah"], sourceColor: "#1d4ed8", targetColor: "#db2777", year: 2011 },
    { source: "Rajasthan Royals '15", target: "Rising Pune Supergiant '16", value: 4, players: ["Ajinkya Rahane", "Steve Smith", "Rajat Bhatia", "Ankit Sharma"], sourceColor: "#db2777", targetColor: "#9333ea", year: 2016 },
    { source: "Rising Pune Supergiant '17", target: "Rajasthan Royals '18", value: 5, players: ["Ajinkya Rahane", "Rahul Tripathi", "Ben Stokes", "Jaydev Unadkat", "Ankit Sharma"], sourceColor: "#9333ea", targetColor: "#db2777", year: 2018 },
    { source: "Rajasthan Royals '19", target: "Delhi Capitals '21", value: 1, players: ["Ajinkya Rahane"], sourceColor: "#db2777", targetColor: "#2563eb", year: 2021 },
    { source: "Delhi Capitals '21", target: "Kolkata Knight Riders '22", value: 2, players: ["Ajinkya Rahane", "Shreyas Iyer"], sourceColor: "#2563eb", targetColor: "#6b21a8", year: 2022 },
    { source: "Kolkata Knight Riders '22", target: "Chennai Super Kings '23", value: 1, players: ["Ajinkya Rahane"], sourceColor: "#6b21a8", targetColor: "#eab308", year: 2023 },
    { source: "Chennai Super Kings '24", target: "Kolkata Knight Riders '25", value: 2, players: ["Ajinkya Rahane", "Moeen Ali"], sourceColor: "#eab308", targetColor: "#6b21a8", year: 2025 },
    { source: "Kolkata Knight Riders '10", target: "Royal Challengers Bengaluru '11", value: 3, players: ["Chris Gayle", "Cheteshwar Pujara", "Charl Langeveldt"], sourceColor: "#6b21a8", targetColor: "#dc2626", year: 2011 },
    { source: "Royal Challengers Bengaluru '17", target: "Punjab Kings '18", value: 1, players: ["Chris Gayle"], sourceColor: "#dc2626", targetColor: "#DD1F2D", year: 2018 },
    { source: "Mumbai Indians '08", target: "Royal Challengers Bengaluru '09", value: 2, players: ["Robin Uthappa", "Manish Pandey"], sourceColor: "#1d4ed8", targetColor: "#dc2626", year: 2009 },
    { source: "Royal Challengers Bengaluru '10", target: "Pune Warriors '11", value: 2, players: ["Robin Uthappa", "Manish Pandey"], sourceColor: "#dc2626", targetColor: "#64748b", year: 2011 },
    { source: "Pune Warriors '13", target: "Kolkata Knight Riders '14", value: 2, players: ["Robin Uthappa", "Manish Pandey"], sourceColor: "#64748b", targetColor: "#6b21a8", year: 2014 },
    { source: "Kolkata Knight Riders '19", target: "Rajasthan Royals '21", value: 1, players: ["Robin Uthappa"], sourceColor: "#6b21a8", targetColor: "#db2777", year: 2021 },
    { source: "Rajasthan Royals '21", target: "Chennai Super Kings '22", value: 1, players: ["Robin Uthappa"], sourceColor: "#db2777", targetColor: "#eab308", year: 2022 },
    { source: "Delhi Capitals '10", target: "Punjab Kings '11", value: 1, players: ["Dinesh Karthik"], sourceColor: "#2563eb", targetColor: "#DD1F2D", year: 2011 },
    { source: "Punjab Kings '11", target: "Mumbai Indians '12", value: 1, players: ["Dinesh Karthik"], sourceColor: "#DD1F2D", targetColor: "#1d4ed8", year: 2012 },
    { source: "Mumbai Indians '13", target: "Delhi Capitals '14", value: 2, players: ["Dinesh Karthik", "Nathan Coulter-Nile"], sourceColor: "#1d4ed8", targetColor: "#2563eb", year: 2014 },
    { source: "Delhi Capitals '14", target: "Royal Challengers Bengaluru '15", value: 1, players: ["Dinesh Karthik"], sourceColor: "#2563eb", targetColor: "#dc2626", year: 2015 },
    { source: "Royal Challengers Bengaluru '15", target: "Gujarat Lions '16", value: 1, players: ["Dinesh Karthik"], sourceColor: "#dc2626", targetColor: "#f97316", year: 2016 },
    { source: "Gujarat Lions '17", target: "Kolkata Knight Riders '18", value: 1, players: ["Dinesh Karthik"], sourceColor: "#f97316", targetColor: "#6b21a8", year: 2018 },
    { source: "Kolkata Knight Riders '21", target: "Royal Challengers Bengaluru '22", value: 1, players: ["Dinesh Karthik"], sourceColor: "#6b21a8", targetColor: "#dc2626", year: 2022 },
    { source: "Chennai Super Kings '21", target: "Royal Challengers Bengaluru '22", value: 2, players: ["Faf du Plessis", "Josh Hazlewood"], sourceColor: "#eab308", targetColor: "#dc2626", year: 2022 },
    { source: "Royal Challengers Bengaluru '24", target: "Delhi Capitals '25", value: 1, players: ["Faf du Plessis"], sourceColor: "#dc2626", targetColor: "#2563eb", year: 2025 },
    { source: "Rajasthan Royals '15", target: "Delhi Capitals '16", value: 3, players: ["Sanju Samson", "Karun Nair", "Chris Morris"], sourceColor: "#db2777", targetColor: "#2563eb", year: 2016 },
    { source: "Delhi Capitals '17", target: "Rajasthan Royals '18", value: 1, players: ["Sanju Samson"], sourceColor: "#2563eb", targetColor: "#db2777", year: 2018 },
    { source: "Mumbai Indians '17", target: "Chennai Super Kings '18", value: 3, players: ["Ambati Rayudu", "Harbhajan Singh", "Karn Sharma"], sourceColor: "#1d4ed8", targetColor: "#eab308", year: 2018 },
    { source: "Mumbai Indians '12", target: "Kolkata Knight Riders '14", value: 1, players: ["Suryakumar Yadav"], sourceColor: "#1d4ed8", targetColor: "#6b21a8", year: 2014 },
    { source: "Kolkata Knight Riders '17", target: "Mumbai Indians '18", value: 1, players: ["Suryakumar Yadav"], sourceColor: "#6b21a8", targetColor: "#1d4ed8", year: 2018 },
    { source: "Delhi Capitals '10", target: "Kolkata Knight Riders '11", value: 3, players: ["Gautam Gambhir", "Rajat Bhatia", "Shrikant Ladda"], sourceColor: "#2563eb", targetColor: "#6b21a8", year: 2011 },
    { source: "Kolkata Knight Riders '17", target: "Delhi Capitals '18", value: 2, players: ["Gautam Gambhir", "Trent Boult"], sourceColor: "#6b21a8", targetColor: "#2563eb", year: 2018 },
    { source: "Mumbai Indians '17", target: "Rajasthan Royals '18", value: 1, players: ["Jos Buttler"], sourceColor: "#1d4ed8", targetColor: "#db2777", year: 2018 },
    { source: "Rajasthan Royals '24", target: "Gujarat Titans '25", value: 1, players: ["Jos Buttler"], sourceColor: "#db2777", targetColor: "#1e293b", year: 2025 },
    { source: "Kolkata Knight Riders '21", target: "Gujarat Titans '22", value: 2, players: ["Shubman Gill", "Lockie Ferguson"], sourceColor: "#6b21a8", targetColor: "#1e293b", year: 2022 },
    { source: "Kolkata Knight Riders '24", target: "Punjab Kings '25", value: 1, players: ["Shreyas Iyer"], sourceColor: "#6b21a8", targetColor: "#DD1F2D", year: 2025 },
    { source: "Delhi Capitals '24", target: "Lucknow Super Giants '25", value: 2, players: ["Rishabh Pant", "Mitchell Marsh"], sourceColor: "#2563eb", targetColor: "#0284c7", year: 2025 },
    { source: "Mumbai Indians '21", target: "Gujarat Titans '22", value: 1, players: ["Hardik Pandya"], sourceColor: "#1d4ed8", targetColor: "#1e293b", year: 2022 },
    { source: "Gujarat Titans '23", target: "Mumbai Indians '24", value: 1, players: ["Hardik Pandya"], sourceColor: "#1e293b", targetColor: "#1d4ed8", year: 2024 },
    { source: "Lucknow Super Giants '22", target: "Royal Challengers Bengaluru '26", value: 3, players: ["Krunal Pandya", "Marcus Stoinis", "Nicholas Pooran"], sourceColor: "#0284c7", targetColor: "#dc2626", year: 2026 }
  ];

  const activeDataset = computedSquadTransfers.length > 0 ? computedSquadTransfers : (dynamicLinks.length > 0 ? dynamicLinks : rawTransferLinks);

  const filteredLinks = useMemo(() => {
    const fYr = parseInt(fromYear);
    const tYr = parseInt(toYear);
    const q = searchPlayer.toLowerCase().trim();

    return activeDataset.filter(l => {
      const yearMatch = l.year >= Math.min(fYr, tYr) && l.year <= Math.max(fYr, tYr);
      const teamMatch = selectedTeam === "All" || l.source.includes(selectedTeam) || l.target.includes(selectedTeam);
      const playerMatch = !q || l.players.some((p: string) => p.toLowerCase().includes(q)) || l.source.toLowerCase().includes(q) || l.target.toLowerCase().includes(q);
      return yearMatch && teamMatch && playerMatch;
    });
  }, [activeDataset, fromYear, toYear, selectedTeam, searchPlayer]);

  const teams = ["CSK", "MI", "RCB", "KKR", "SRH", "DC", "PBKS", "RR", "GT", "LSG"];

  // Sort by value descending for top view
  const displayLinks = useMemo(() => {
    if (viewMode === "3d") {
      return [...filteredLinks].sort((a, b) => b.value - a.value).slice(0, 12);
    }
    return filteredLinks;
  }, [filteredLinks, viewMode]);

  const totalCount = displayLinks.length;
  const stepY = totalCount > 1 ? (340 - 30) / (totalCount - 1) : 0;

  const activeTelemetryLink = selectedLink !== null && displayLinks[selectedLink] ? displayLinks[selectedLink] : (displayLinks[0] || null);

  return (
    <div className="w-full bg-[#070a14] border border-[#1e293b] rounded-xl p-5 shadow-2xl flex flex-col gap-4 relative overflow-hidden">
      
      {/* GLOW DECORATIONS */}
      <div className="absolute -top-20 -left-20 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* HEADER & CONTROLS */}
      <div className="flex flex-col gap-3 relative z-10">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-br from-amber-500/20 to-purple-600/20 border border-amber-400/30 rounded-lg">
              <Zap className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-extrabold text-white uppercase tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-yellow-200 to-purple-400">
                  Transfer Constellation Telemetry
                </span>
                <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                  {filteredLinks.length} MOVEMENTS
                </span>
              </div>
              <p className="text-xs text-[#94a3b8] font-medium">
                Interactive Arc Routing & Live Franchise Squad Movements
              </p>
            </div>
          </div>

          {/* VIEW MODE TOGGLE BUTTONS */}
          <div className="flex items-center bg-[#0f172a] border border-[#1e293b] p-1 rounded-lg">
            <button
              onClick={() => setViewMode("3d")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-all ${
                viewMode === "3d"
                  ? "bg-gradient-to-r from-amber-500 to-purple-600 text-white shadow-md"
                  : "text-[#94a3b8] hover:text-white"
              }`}
            >
              <Activity className="w-3.5 h-3.5" /> 3D Arc View
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-all ${
                viewMode === "grid"
                  ? "bg-gradient-to-r from-amber-500 to-purple-600 text-white shadow-md"
                  : "text-[#94a3b8] hover:text-white"
              }`}
            >
              <Users className="w-3.5 h-3.5" /> All Transfers Grid ({filteredLinks.length})
            </button>
          </div>
        </div>

        {/* Compact Filter Controls Strip */}
        <div className="flex flex-wrap items-center gap-3 bg-[#0b0f19] border border-[#1e293d] p-3 rounded-lg">
          
          {/* Player Search Input */}
          <div className="flex items-center gap-2 bg-[#172033] border border-[#334155] px-3 py-1.5 rounded-md flex-1 sm:flex-initial">
            <span className="text-xs font-bold text-amber-400">Search:</span>
            <input
              type="text"
              placeholder="Search player or team..."
              value={searchPlayer}
              onChange={(e) => setSearchPlayer(e.target.value)}
              className="bg-transparent text-white text-xs outline-none w-36 font-mono"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#94a3b8] uppercase">From:</span>
            <select
              value={fromYear}
              onChange={(e) => setFromYear(e.target.value)}
              className="bg-[#172033] border border-[#334155] text-white text-xs font-bold rounded px-2.5 py-1.5 outline-none cursor-pointer"
            >
              {ALL_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#94a3b8] uppercase">To:</span>
            <select
              value={toYear}
              onChange={(e) => setToYear(e.target.value)}
              className="bg-[#172033] border border-[#334155] text-white text-xs font-bold rounded px-2.5 py-1.5 outline-none cursor-pointer"
            >
              {ALL_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-xs font-semibold text-[#94a3b8] uppercase">Franchise:</span>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="bg-[#172033] border border-[#334155] text-purple-300 text-xs font-bold rounded px-2.5 py-1.5 outline-none cursor-pointer"
            >
              <option value="All">All 10 Franchises</option>
              {teams.map(t => <option key={t} value={t}>{t} - {TEAM_NAMES[t]}</option>)}
            </select>
          </div>

          <span className="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 px-3 py-1.5 rounded-full border border-amber-400/20 ml-auto">
            {filteredLinks.length} Active Movements
          </span>
        </div>
      </div>

      {/* VIEW MODE 1: 3D HOLOGRAPHIC ARC MATRIX VIEW */}
      {viewMode === "3d" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch relative z-10">
          
          {/* LEFT: 3D HOLOGRAPHIC SVG ARC CANVAS */}
          <div className="lg:col-span-8 bg-[#04060d] border border-[#1e293b] rounded-xl p-4 h-[360px] flex items-center justify-center relative overflow-hidden group shadow-inner">
            
            {/* 3D Grid Perspective Background */}
            <div 
              className="absolute inset-0 opacity-15 pointer-events-none"
              style={{
                backgroundImage: `radial-gradient(#3b82f6 1px, transparent 1px), radial-gradient(#a855f7 1px, transparent 1px)`,
                backgroundSize: '24px 24px',
                backgroundPosition: '0 0, 12px 12px'
              }}
            />

            <svg viewBox="0 0 760 380" className="w-full h-full relative z-10">
              <defs>
                {displayLinks.map((link, idx) => (
                  <linearGradient id={`sankey3dGrad-${idx}`} key={idx} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={link.sourceColor} stopOpacity={0.9} />
                    <stop offset="50%" stopColor="#ffffff" stopOpacity={0.6} />
                    <stop offset="100%" stopColor={link.targetColor} stopOpacity={0.9} />
                  </linearGradient>
                ))}
                <filter id="glow3d">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              {/* 3D Arc Bezier Flow Ribbons */}
              {displayLinks.map((link, idx) => {
                const y1 = 30 + idx * stepY;
                const y2 = 30 + idx * stepY;
                const isHovered = hoveredLink === idx || selectedLink === idx;
                const strokeW = Math.min(22, Math.max(6, link.value * 4));
                const depthOffset = Math.sin((idx / Math.max(1, totalCount)) * Math.PI) * 40;

                return (
                  <g 
                    key={`flow-3d-${idx}`} 
                    onMouseEnter={() => setHoveredLink(idx)} 
                    onMouseLeave={() => setHoveredLink(null)}
                    onClick={() => setSelectedLink(idx)}
                    className="cursor-pointer"
                  >
                    {/* Glowing 3D Shadow Ribbon */}
                    <path
                      d={`M 175 ${y1} C ${360} ${y1 - depthOffset}, ${400} ${y2 - depthOffset}, 585 ${y2}`}
                      fill="none"
                      stroke={link.sourceColor}
                      strokeWidth={strokeW + 4}
                      opacity={isHovered ? 0.35 : 0.08}
                      className="transition-all duration-300"
                    />

                    {/* Main 3D Bezier Arc Curve */}
                    <path
                      d={`M 175 ${y1} C ${360} ${y1 - depthOffset}, ${400} ${y2 - depthOffset}, 585 ${y2}`}
                      fill="none"
                      stroke={`url(#sankey3dGrad-${idx})`}
                      strokeWidth={strokeW}
                      opacity={isHovered ? 1.0 : (hoveredLink === null ? 0.75 : 0.15)}
                      filter={isHovered ? "url(#glow3d)" : "none"}
                      className="transition-all duration-300"
                    />

                    {/* Transfer Player Count Indicator */}
                    <rect 
                      x="345" 
                      y={y1 - depthOffset / 2 - 10} 
                      width="70" 
                      height="18" 
                      rx="9" 
                      fill="#0f172a" 
                      stroke={isHovered ? "#f59e0b" : "#334155"} 
                      strokeWidth="1.5"
                    />
                    <text 
                      x="380" 
                      y={y1 - depthOffset / 2 + 2} 
                      fill="#f59e0b" 
                      fontSize="9" 
                      fontWeight="800" 
                      fontFamily="sans-serif" 
                      textAnchor="middle"
                    >
                      {link.value} Players
                    </text>
                  </g>
                );
              })}

              {/* 3D Holographic Left Source Nodes */}
              {displayLinks.map((link, idx) => {
                const y = 30 + idx * stepY;
                const isHovered = hoveredLink === idx || selectedLink === idx;

                return (
                  <g key={`src-3d-${idx}`} onClick={() => setSelectedLink(idx)} className="cursor-pointer">
                    <rect 
                      x="150" 
                      y={y - 12} 
                      width="20" 
                      height="24" 
                      rx="5" 
                      fill={link.sourceColor} 
                      stroke={isHovered ? "#ffffff" : "#000000"} 
                      strokeWidth={isHovered ? "2" : "1"}
                      filter={isHovered ? "url(#glow3d)" : "none"}
                    />
                    <text x="140" y={y + 4} fill="#f8fafc" fontSize="11" fontWeight="800" fontFamily="sans-serif" textAnchor="end">
                      {link.source}
                    </text>
                  </g>
                );
              })}

              {/* 3D Holographic Right Target Nodes */}
              {displayLinks.map((link, idx) => {
                const y = 30 + idx * stepY;
                const isHovered = hoveredLink === idx || selectedLink === idx;

                return (
                  <g key={`tgt-3d-${idx}`} onClick={() => setSelectedLink(idx)} className="cursor-pointer">
                    <rect 
                      x="585" 
                      y={y - 12} 
                      width="20" 
                      height="24" 
                      rx="5" 
                      fill={link.targetColor} 
                      stroke={isHovered ? "#ffffff" : "#000000"} 
                      strokeWidth={isHovered ? "2" : "1"}
                      filter={isHovered ? "url(#glow3d)" : "none"}
                    />
                    <text x="612" y={y + 4} fill="#f8fafc" fontSize="11" fontWeight="800" fontFamily="sans-serif" textAnchor="start">
                      {link.target}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* RIGHT: REAL-TIME TELEMETRY INSPECTOR PANEL */}
          <div className="lg:col-span-4 bg-[#04060d] border border-[#1e293b] rounded-xl p-4 flex flex-col justify-between h-[360px] relative overflow-hidden shadow-xl">
            {activeTelemetryLink ? (
              <div className="flex flex-col gap-4 h-full">
                <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-amber-400" /> Transfer Telemetry
                  </span>
                  <span className="text-[11px] font-mono font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                    Season {activeTelemetryLink.year}
                  </span>
                </div>

                {/* Team Flow Header */}
                <div className="bg-[#0b0f19] border border-[#1e293d] rounded-lg p-3 flex items-center justify-between gap-2">
                  <div className="flex flex-col flex-1">
                    <span className="text-[10px] text-[#64748b] font-mono uppercase">Origin</span>
                    <span className="text-xs font-extrabold text-white truncate" style={{ color: activeTelemetryLink.sourceColor }}>
                      {activeTelemetryLink.source}
                    </span>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-amber-400 shrink-0" />
                  <div className="flex flex-col flex-1 text-right">
                    <span className="text-[10px] text-[#64748b] font-mono uppercase">Destination</span>
                    <span className="text-xs font-extrabold text-white truncate" style={{ color: activeTelemetryLink.targetColor }}>
                      {activeTelemetryLink.target}
                    </span>
                  </div>
                </div>

                {/* Player List Card */}
                <div className="flex-1 bg-[#0b0f19] border border-[#1e293d] rounded-lg p-3 flex flex-col min-h-0">
                  <div className="flex items-center justify-between text-xs font-bold text-[#94a3b8] mb-2">
                    <span>Transferred Players</span>
                    <span className="text-amber-400 font-mono">{activeTelemetryLink.value} Players (Click for details)</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 overflow-y-auto pr-1 flex-1">
                    {activeTelemetryLink.players.map((p: string, pIdx: number) => (
                      <button
                        key={pIdx}
                        onClick={() => setActivePlayerSubCard({ name: p, link: activeTelemetryLink })}
                        className="bg-[#172033] border border-[#334155] text-amber-300 text-xs font-semibold px-2.5 py-1 rounded-md shadow-sm hover:border-amber-400 hover:bg-amber-400/10 transition-all text-left flex items-center gap-1 cursor-pointer"
                      >
                        <Users className="w-3 h-3 text-amber-400" />
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-[10px] text-[#64748b] text-center font-mono">
                  Click any player name to view transfer backstory & profile card
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-xs text-[#64748b] gap-2">
                <Users className="w-8 h-8 opacity-40 text-amber-400" />
                Select a 3D transfer flow to inspect player details
              </div>
            )}
          </div>

        </div>
      ) : (
        /* VIEW MODE 2: MULTI-TIER ALL TRANSFERS GRID CONSTELLATION */
        <div className="bg-[#04060d] border border-[#1e293b] rounded-xl p-4 min-h-[440px] max-h-[580px] overflow-y-auto relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredLinks.map((link, idx) => (
              <div
                key={idx}
                onMouseEnter={() => setHoveredLink(idx)}
                onMouseLeave={() => setHoveredLink(null)}
                className="bg-[#0b0f19] border border-[#1e293d] hover:border-amber-400/60 rounded-lg p-3 transition-all cursor-pointer shadow-md"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold text-white truncate font-mono" style={{ backgroundColor: link.sourceColor }}>
                      {link.source}
                    </span>
                    <span className="text-[#64748b] text-xs">➔</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold text-white truncate font-mono" style={{ backgroundColor: link.targetColor }}>
                      {link.target}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-amber-400 font-mono shrink-0">
                    {link.value} Players
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {link.players.map((p: string, pIdx: number) => (
                    <button 
                      key={pIdx} 
                      onClick={() => setActivePlayerSubCard({ name: p, link })}
                      className="bg-[#172033] hover:bg-amber-400/20 hover:border-amber-400 text-[#94a3b8] hover:text-amber-300 text-[10px] font-medium px-2 py-0.5 rounded border border-[#334155] transition-all cursor-pointer"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TRANSFERRED PLAYER SUB-CARD BACKSTORY MODAL */}
      {activePlayerSubCard && (() => {
        const info = getPlayerTransferBackstory(activePlayerSubCard.name, activePlayerSubCard.link);
        return (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
            <div className="bg-[#0b0f19] border border-amber-400/50 rounded-2xl p-6 max-w-lg w-full shadow-2xl flex flex-col gap-4 relative animate-in fade-in zoom-in duration-200">
              
              {/* Close Button */}
              <button
                onClick={() => setActivePlayerSubCard(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white bg-[#1e293b] w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>

              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-amber-500/20 to-purple-600/20 border border-amber-400/40 rounded-xl">
                  <Users className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">{activePlayerSubCard.name}</h3>
                  <span className="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                    {info.type}
                  </span>
                </div>
              </div>

              {/* Transfer Flow Banner */}
              <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-3.5 flex items-center justify-between gap-2">
                <div className="flex flex-col">
                  <span className="text-[10px] text-[#64748b] uppercase font-mono">From</span>
                  <span className="text-xs font-bold text-white" style={{ color: activePlayerSubCard.link?.sourceColor }}>
                    {activePlayerSubCard.link?.source || 'Origin Squad'}
                  </span>
                </div>
                <ArrowUpRight className="w-5 h-5 text-amber-400" />
                <div className="flex flex-col text-right">
                  <span className="text-[10px] text-[#64748b] uppercase font-mono">To</span>
                  <span className="text-xs font-bold text-white" style={{ color: activePlayerSubCard.link?.targetColor }}>
                    {activePlayerSubCard.link?.target || 'Target Squad'}
                  </span>
                </div>
              </div>

              {/* Backstory & News Heat Moment */}
              <div className="bg-[#172033] border border-[#334155] rounded-xl p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-extrabold text-amber-300 uppercase tracking-wide">
                    {info.hype}
                  </span>
                </div>
                <p className="text-xs text-[#cbd5e1] leading-relaxed font-sans">
                  {info.story}
                </p>
              </div>

              {/* Stats & Price Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#111827] border border-[#1f293d] p-3 rounded-lg flex flex-col">
                  <span className="text-[10px] text-[#64748b] uppercase font-mono">Transfer Fee / Valuation</span>
                  <span className="text-xs font-extrabold text-amber-400 font-mono mt-0.5">{info.price}</span>
                </div>
                <div className="bg-[#111827] border border-[#1f293d] p-3 rounded-lg flex flex-col">
                  <span className="text-[10px] text-[#64748b] uppercase font-mono">Player Primary Role</span>
                  <span className="text-xs font-bold text-purple-300 mt-0.5 truncate">{info.role}</span>
                </div>
              </div>

              {/* Career Telemetry Snapshot */}
              <div className="bg-[#111827] border border-[#1f293d] p-3 rounded-lg flex items-center justify-between">
                <span className="text-xs font-semibold text-[#94a3b8]">Career Milestone Stats:</span>
                <span className="text-xs font-mono font-bold text-white">{info.stats}</span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 mt-1">
                <button
                  onClick={() => setActivePlayerSubCard(null)}
                  className="px-4 py-2 bg-[#1e293b] hover:bg-slate-700 text-gray-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    const name = activePlayerSubCard.name;
                    setActivePlayerSubCard(null);
                    if (onSelectPlayer) {
                      onSelectPlayer(name);
                    }
                    const slug = encodeURIComponent(name.toLowerCase().trim().replace(/\s+/g, '-'));
                    window.location.href = `/players/${slug}`;
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-white text-xs font-bold rounded-lg shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  View Full Player Profile Card ➔
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}

// ----------------------------------------------------------------------
// CARD 2: SUNBURST & NESTED TREEMAP (DELIVERY TYPE ➔ SHOT TYPE ➔ RUNS)
// ----------------------------------------------------------------------
export function RunFlowSankey() {
  const [selectedSeason, setSelectedSeason] = useState<string>("ALL");
  const [activeSegment, setActiveSegment] = useState<string>("Pace");

  // Concentric Tier Dataset
  const sunburstTiers = [
    {
      type: "Pace Bowlers (140+ km/h)",
      key: "Pace",
      color: "#ef4444",
      share: "48% Total Runs",
      shots: [
        { name: "Pull & Hook Shots", runs: "1,240 Runs", sr: "178 SR", boundaryPct: "68%", color: "#f97316" },
        { name: "Cover Drive & Cut", runs: "980 Runs", sr: "154 SR", boundaryPct: "54%", color: "#eab308" },
        { name: "Scoop & Ramp Shots", runs: "640 Runs", sr: "185 SR", boundaryPct: "72%", color: "#ec4899" }
      ]
    },
    {
      type: "Spin Bowlers (Off/Leg Spin)",
      key: "Spin",
      color: "#a855f7",
      share: "34% Total Runs",
      shots: [
        { name: "Slog Sweep & Lofted", runs: "1,120 Runs", sr: "162 SR", boundaryPct: "64%", color: "#8b5cf6" },
        { name: "Singles & Running", runs: "890 Runs", sr: "115 SR", boundaryPct: "12%", color: "#06b6d4" },
        { name: "Late Cut & Reverse", runs: "420 Runs", sr: "145 SR", boundaryPct: "48%", color: "#3b82f6" }
      ]
    },
    {
      type: "Slower Change-ups",
      key: "Slower",
      color: "#06b6d4",
      share: "18% Total Runs",
      shots: [
        { name: "Straight Lofted Hit", runs: "580 Runs", sr: "135 SR", boundaryPct: "52%", color: "#10b981" },
        { name: "Mid-Wicket Flick", runs: "460 Runs", sr: "128 SR", boundaryPct: "38%", color: "#84cc16" }
      ]
    }
  ];

  const currentTier = sunburstTiers.find(t => t.key === activeSegment) || sunburstTiers[0];

  return (
    <div className="w-full bg-[#0B1020] border border-white/10 rounded-2xl p-4 shadow-xl flex flex-col gap-3 h-full justify-between min-h-0">
      
      {/* FILTER CONTROLS BAR */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-purple-400" />
          <div>
            <span className="text-sm font-black text-white uppercase tracking-wider block">
              Concentric Sunburst Execution Rings
            </span>
            <span className="text-[10px] text-purple-400 font-mono font-bold">
              Hierarchical Radial Breakdown • Pace / Spin / Variations to Shot Types
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
          <Calendar className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-[10px] font-bold text-white/50 uppercase">Season:</span>
          <select
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(e.target.value)}
            className="bg-slate-900 text-purple-300 text-xs font-mono font-bold outline-none cursor-pointer rounded px-2 py-0.5"
          >
            <option value="ALL">All Seasons (2008-2026)</option>
            {["2026", "2025", "2024", "2023", "2022", "2021", "2020", "2019", "2018"].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* SUNBURST CANVAS & BREAKDOWN TILES */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        
        {/* SUNBURST CONCENTRIC RINGS SVG */}
        <div className="col-span-12 md:col-span-6 bg-black/40 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center relative min-h-[340px]">
          <svg viewBox="0 0 400 400" className="w-full max-w-[360px] h-[320px]">
            {/* Inner Core */}
            <circle cx="200" cy="200" r="45" fill="#0f172a" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
            <text x="200" y="196" fill="#ffffff" fontSize="10" fontWeight="900" textAnchor="middle">DELIVERY</text>
            <text x="200" y="210" fill="#a855f7" fontSize="9" fontWeight="800" textAnchor="middle">HIERARCHY</text>

            {/* Middle Ring Segments (Delivery Types) */}
            {sunburstTiers.map((tier, idx) => {
              const startAngle = idx * (360 / sunburstTiers.length);
              const endAngle = (idx + 1) * (360 / sunburstTiers.length);
              const isActive = tier.key === activeSegment;

              return (
                <g key={tier.key} onClick={() => setActiveSegment(tier.key)} className="cursor-pointer">
                  <circle
                    cx="200"
                    cy="200"
                    r={75 + idx * 16}
                    fill="none"
                    stroke={tier.color}
                    strokeWidth={isActive ? "20" : "12"}
                    opacity={isActive ? 0.95 : 0.4}
                    className="transition-all duration-300 hover:opacity-100"
                  />
                </g>
              );
            })}

            {/* Outer Ring Segments (Shot Execution) */}
            {currentTier.shots.map((shot, sIdx) => {
              return (
                <circle
                  key={sIdx}
                  cx="200"
                  cy="200"
                  r={135 + sIdx * 14}
                  fill="none"
                  stroke={shot.color}
                  strokeWidth="10"
                  opacity="0.8"
                  strokeDasharray="40 10"
                />
              );
            })}
          </svg>

          {/* Interactive Tier Switcher Pills */}
          <div className="flex items-center gap-2 mt-2">
            {sunburstTiers.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveSegment(t.key)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeSegment === t.key ? 'bg-purple-500 text-white shadow-lg' : 'bg-white/5 text-white/50 hover:text-white'
                }`}
              >
                {t.key}
              </button>
            ))}
          </div>
        </div>

        {/* BREAKDOWN SHOT EXECUTION CARDS */}
        <div className="col-span-12 md:col-span-6 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <span className="text-xs font-bold text-white/50 uppercase tracking-wider">{currentTier.type}</span>
            <span className="text-xs font-mono font-bold text-amber-400">{currentTier.share}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentTier.shots.map((shot, i) => (
              <div key={i} className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: shot.color }} />
                  <span className="text-xs font-black text-white">{shot.name}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-white/60">Volume:</span>
                  <span className="text-amber-300 font-bold">{shot.runs}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-white/60">Strike Rate:</span>
                  <span className="text-purple-300 font-bold">{shot.sr}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-white/60">Boundary %:</span>
                  <span className="text-cyan-300 font-bold">{shot.boundaryPct}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// CARD 3: INTERACTIVE 2D HEATMAP MATRIX (DELIVERY LENGTH ➔ SHOT TYPE)
// ----------------------------------------------------------------------
export function ShotFlowSankey() {
  const [batterType, setBatterType] = useState<string>("ALL");
  const [hoveredCell, setHoveredCell] = useState<{ x: string; y: string; runs: number; sr: number; boundary: string } | null>(null);

  const deliveryLengths = ["Yorker", "Full Pitch", "Good Length", "Back of Length", "Short & Bouncer"];
  const shotTypes = ["Cover Drive", "Square Cut", "Pull & Hook", "Slog Sweep", "Scoop & Ramp"];

  // 5x5 Heatmap Matrix Data
  const heatmapMatrix: Record<string, Record<string, { runs: number; sr: number; boundary: string }>> = {
    "Yorker": {
      "Cover Drive": { runs: 85, sr: 112, boundary: "14%" },
      "Square Cut": { runs: 42, sr: 95, boundary: "8%" },
      "Pull & Hook": { runs: 30, sr: 80, boundary: "5%" },
      "Slog Sweep": { runs: 240, sr: 142, boundary: "52%" },
      "Scoop & Ramp": { runs: 480, sr: 185, boundary: "74%" }
    },
    "Full Pitch": {
      "Cover Drive": { runs: 620, sr: 168, boundary: "68%" },
      "Square Cut": { runs: 310, sr: 145, boundary: "45%" },
      "Pull & Hook": { runs: 120, sr: 110, boundary: "22%" },
      "Slog Sweep": { runs: 540, sr: 175, boundary: "65%" },
      "Scoop & Ramp": { runs: 290, sr: 155, boundary: "48%" }
    },
    "Good Length": {
      "Cover Drive": { runs: 450, sr: 142, boundary: "48%" },
      "Square Cut": { runs: 580, sr: 156, boundary: "62%" },
      "Pull & Hook": { runs: 340, sr: 138, boundary: "42%" },
      "Slog Sweep": { runs: 390, sr: 150, boundary: "54%" },
      "Scoop & Ramp": { runs: 110, sr: 120, boundary: "28%" }
    },
    "Back of Length": {
      "Cover Drive": { runs: 210, sr: 125, boundary: "32%" },
      "Square Cut": { runs: 490, sr: 148, boundary: "56%" },
      "Pull & Hook": { runs: 680, sr: 165, boundary: "64%" },
      "Slog Sweep": { runs: 280, sr: 132, boundary: "38%" },
      "Scoop & Ramp": { runs: 95, sr: 105, boundary: "18%" }
    },
    "Short & Bouncer": {
      "Cover Drive": { runs: 60, sr: 90, boundary: "10%" },
      "Square Cut": { runs: 320, sr: 135, boundary: "44%" },
      "Pull & Hook": { runs: 940, sr: 188, boundary: "82%" },
      "Slog Sweep": { runs: 150, sr: 115, boundary: "25%" },
      "Scoop & Ramp": { runs: 380, sr: 172, boundary: "66%" }
    }
  };

  const getHeatmapColor = (runs: number) => {
    if (runs > 700) return "bg-gradient-to-br from-amber-500 to-red-600 text-white shadow-lg shadow-amber-500/20";
    if (runs > 400) return "bg-gradient-to-br from-purple-600 to-indigo-600 text-white";
    if (runs > 200) return "bg-gradient-to-br from-cyan-600 to-blue-700 text-white/90";
    return "bg-slate-900/80 text-white/40 border border-white/5";
  };

  return (
    <div className="w-full bg-[#0B1020] border border-white/10 rounded-2xl p-4 shadow-xl flex flex-col gap-3 h-full justify-between min-h-0">
      
      {/* FILTER CONTROLS BAR */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-cyan-400" />
          <div>
            <span className="text-sm font-black text-white uppercase tracking-wider block">
              5×5 Pitch Length × Shot Matrix Heatmap
            </span>
            <span className="text-[10px] text-cyan-400 font-mono font-bold">
              Pitch Zone Clustering (Yorker, Full, Good Length, Back of Length, Short)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
          <Filter className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[10px] font-bold text-white/50 uppercase">Batter Stance:</span>
          <select
            value={batterType}
            onChange={(e) => setBatterType(e.target.value)}
            className="bg-slate-900 text-cyan-400 text-xs font-bold outline-none cursor-pointer rounded px-2 py-0.5"
          >
            <option value="ALL">All Batters (RHB & LHB)</option>
            <option value="RHB">Right-Handed (RHB)</option>
            <option value="LHB">Left-Handed (LHB)</option>
          </select>
        </div>
      </div>

      {/* 2D HEATMAP MATRIX CANVAS */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* MATRIX GRID */}
        <div className="col-span-12 md:col-span-8 bg-black/40 border border-white/10 rounded-2xl p-4 overflow-x-auto">
          <div className="min-w-[500px]">
            {/* Header X-Axis Labels */}
            <div className="grid grid-cols-6 gap-2 mb-2 text-center text-[10px] font-black text-white/50 uppercase">
              <div></div>
              {deliveryLengths.map(dl => <div key={dl}>{dl}</div>)}
            </div>

            {/* Matrix Rows */}
            {shotTypes.map(st => (
              <div key={st} className="grid grid-cols-6 gap-2 mb-2 items-center">
                <div className="text-[10px] font-bold text-white/70 uppercase truncate pr-1 text-right">{st}</div>
                {deliveryLengths.map(dl => {
                  const cell = heatmapMatrix[dl]?.[st] || { runs: 0, sr: 0, boundary: "0%" };
                  return (
                    <div
                      key={`${dl}-${st}`}
                      onMouseEnter={() => setHoveredCell({ x: dl, y: st, ...cell })}
                      className={`h-14 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200 hover:scale-105 ${getHeatmapColor(cell.runs)}`}
                    >
                      <span className="text-xs font-black font-mono">{cell.runs}</span>
                      <span className="text-[9px] font-mono opacity-80">{cell.sr} SR</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* CELL DETAILS / HOVER TOOLTIP CARD */}
        <div className="col-span-12 md:col-span-4 flex flex-col gap-3">
          <div className="text-xs font-bold text-white/50 uppercase tracking-wider mb-1">Cell Telemetry Details</div>

          {hoveredCell ? (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-900/40 to-slate-900 border border-purple-500/30 flex flex-col gap-3 shadow-xl animate-fadeIn">
              <div className="border-b border-white/10 pb-2">
                <span className="text-[10px] text-cyan-400 font-mono font-bold block">{hoveredCell.x}</span>
                <h3 className="text-sm font-black text-white">{hoveredCell.y}</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                  <span className="text-[9px] text-white/40 uppercase block">Total Runs</span>
                  <span className="text-lg font-black text-amber-400 font-mono">{hoveredCell.runs}</span>
                </div>
                <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                  <span className="text-[9px] text-white/40 uppercase block">Strike Rate</span>
                  <span className="text-lg font-black text-purple-400 font-mono">{hoveredCell.sr}</span>
                </div>
              </div>

              <div className="bg-black/30 p-2.5 rounded-xl border border-white/5 flex items-center justify-between">
                <span className="text-[10px] text-white/60 uppercase">Boundary Frequency:</span>
                <span className="text-xs font-black text-cyan-400 font-mono">{hoveredCell.boundary}</span>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col items-center justify-center text-center text-white/40 text-xs min-h-[180px]">
              <Target className="w-8 h-8 text-white/20 mb-2" />
              Hover over any matrix cell to inspect delivery length vs shot execution metrics.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}