import React, { useState, useMemo } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { GlassCard } from "@/components/glass-card";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag, Sparkles, Trophy, Layers, Target, BookOpen, Brain,
  QrCode, Shirt, Key, Gift, Eye, RotateCw, Check, Star,
  ExternalLink, ArrowUpRight, Flame, ShieldCheck, Zap,
  TrendingUp, BarChart3, HelpCircle, X, ChevronRight,
  SlidersHorizontal, CheckCircle2, Package, Tag, Info
} from "lucide-react";
import {
  ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, BarChart, Bar, XAxis, YAxis, Tooltip
} from "recharts";

/* ══════════════════════════════════════════════════════════════════════════
   1. COLLECTIONS DATA SPECIFICATION (From User Request)
   ══════════════════════════════════════════════════════════════════════════ */

export interface ProductItem {
  id: string;
  name: string;
  tagline: string;
  price: number;
  originalPrice?: number;
  badge?: string;
  badgeColor?: string;
  image?: string;
  specs: string[];
  description: string;
  stockStatus: "In Stock" | "Limited Run" | "Pre-Order";
  digitalIntegration: string;
}

export interface CollectionDef {
  id: string;
  icon: string;
  name: string;
  productsSummary: string;
  whyItFits: string;
  highlightTag: string;
  category: "Cards & Games" | "Editorial & Art" | "Strategy & Tech" | "Merch & Bundles";
  products: ProductItem[];
}

export const COLLECTIONS_DATA: CollectionDef[] = [
  {
    id: "cards",
    icon: "🃏",
    name: "IPL Intelligence Cards",
    productsSummary: "Individual player cards, team packs, season packs, complete decks",
    whyItFits: "Your strongest original product",
    highlightTag: "Flagship Collectible",
    category: "Cards & Games",
    products: [
      {
        id: "card-vk18",
        name: "Virat Kohli #18 — The Chase Master Card",
        tagline: "Front: Iconic MRF Stance • Back: Full Career Telemetry & Scoring Radar",
        price: 299,
        originalPrice: 399,
        badge: "Bestseller",
        badgeColor: "bg-red-500/20 text-red-400 border-red-500/30",
        specs: ["350 GSM Velvet Matte", "Gold Foil Stamped", "NFC Chip Embedded", "2008–2026 Indexed"],
        description: "Featuring 8,326 runs, 39.0 average, 132.7 strike rate, runs by season chart, scoring zones radar, and bowling type SR breakdown.",
        stockStatus: "In Stock",
        digitalIntegration: "Tap NFC with your phone to open Virat's live telemetry dossier on /players/virat-kohli.",
      },
      {
        id: "card-msd7",
        name: "MS Dhoni #7 — The Finisher Card",
        tagline: "Death Overs Master • 85.2% Chase Win Probability",
        price: 299,
        originalPrice: 399,
        badge: "Hall of Fame",
        badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
        specs: ["350 GSM Velvet Matte", "Embossed Gold Seal", "NFC Chip Embedded", "Yellow Army Special"],
        description: "Captures 5,243 runs, 24 fifties, death-over strike rate of 182.4, and the legendary calm demeanor that defined IPL dynasties.",
        stockStatus: "In Stock",
        digitalIntegration: "Instant deep-link to MS Dhoni's match-winning win probability impact models.",
      },
      {
        id: "card-team-pack",
        name: "Franchise 11 Core Team Packs",
        tagline: "Curated 11-player deck for your favorite IPL franchise",
        price: 899,
        originalPrice: 1199,
        badge: "Fan Favorite",
        badgeColor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        specs: ["11 Foil Cards", "Tuck Box with Magnetic Seal", "Team Tactical Cheat Sheet"],
        description: "Available for CSK, RCB, MI, KKR, RR, SRH, DC, GT, LSG, PBKS. Contains the playing XI telemetry and historical records.",
        stockStatus: "In Stock",
        digitalIntegration: "Unlocks franchise tactical dashboards in the Intelligence Hub.",
      },
      {
        id: "card-season-pack",
        name: "Season 2026 Archive Pack",
        tagline: "74 Match Milestones, Clutch Moments & Breakout Stars",
        price: 1299,
        originalPrice: 1599,
        badge: "2026 Complete",
        badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        specs: ["25 Cards Pack", "Holographic Season Crest", "Includes 2 Rare Inserts"],
        description: "Every key narrative of the 2026 IPL season immortalized with ball-by-ball milestone coordinate stamps.",
        stockStatus: "In Stock",
        digitalIntegration: "Syncs with the 2026 season database and replay engine.",
      },
      {
        id: "card-complete-deck",
        name: "Master Intelligence Deck (All 100 Legends)",
        tagline: "The definitive physical IPL history encyclopedia in cards",
        price: 3499,
        originalPrice: 4499,
        badge: "Ultimate Edition",
        badgeColor: "bg-purple-500/20 text-purple-400 border-purple-500/30",
        specs: ["100 Cards in Rigid Acrylic Box", "Full Telemetry Backings", "Certificate of Authenticity"],
        description: "Comprehensive all-time collection from 2008 to 2026. Includes all Orange Caps, Purple Caps, and tournament MVPs.",
        stockStatus: "Limited Run",
        digitalIntegration: "Grants 1-year complimentary Pro Analyst OS Pass.",
      },
    ],
  },
  {
    id: "games",
    icon: "🎴",
    name: "Game Decks",
    productsSummary: "Trump-style stat battle cards, Auction Battle, Playing XI Builder, Chase Challenge",
    whyItFits: "Turns your analytics into a game",
    highlightTag: "Interactive Gaming",
    category: "Cards & Games",
    products: [
      {
        id: "game-trump",
        name: "IPL Trump: Stat Battle Cards",
        tagline: "Clash on SR, Average, Clutch Rating, Boundary % & Wickets",
        price: 699,
        originalPrice: 899,
        badge: "Party Game",
        badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
        specs: ["60 Cards Deck", "Rulebook Included", "Stat Normalization Index", "For 2-6 Players"],
        description: "Compare modern stars with all-time legends using real database stats. Features 'Clutch Super Trumps' that turn the tide in the final over!",
        stockStatus: "In Stock",
        digitalIntegration: "Scan any card to settle stat disputes with live verified data.",
      },
      {
        id: "game-auction-battle",
        name: "Mega Auction Battle Board Game",
        tagline: "Manage ₹120 Crore Purse, Right-to-Match (RTM) & Paddle Wars",
        price: 1899,
        originalPrice: 2299,
        badge: "Strategy Classic",
        badgeColor: "bg-purple-500/20 text-purple-400 border-purple-500/30",
        specs: ["120 Bidding Chips", "10 Franchise Boards", "150 Player Pool Cards", "Wooden Auctioneer Gavel"],
        description: "Simulate a live IPL Mega Auction with friends. Balance foreign player quotas, uncapped value picks, and team role synergy scores.",
        stockStatus: "In Stock",
        digitalIntegration: "Syncs with the live web /auction simulator engine.",
      },
      {
        id: "game-playing-xi",
        name: "Playing XI Tactical Builder Deck",
        tagline: "Solve venue conditions, match-ups, and powerplay bowling balances",
        price: 799,
        originalPrice: 999,
        badge: "Analytical",
        badgeColor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        specs: ["45 Player Tactical Cards", "10 Stadium Pitch Condition Tiles", "Synergy Calculator Chart"],
        description: "Create optimal lineups that adapt to Chepauk spin, Wankhede bounce, or Chinnaswamy boundaries.",
        stockStatus: "In Stock",
        digitalIntegration: "Score your squad against the AI Analyst lineup rater.",
      },
      {
        id: "game-chase-challenge",
        name: "Chase Challenge: Death Overs Duel",
        tagline: "Defend or chase 60 runs in the last 4 overs",
        price: 849,
        originalPrice: 1099,
        badge: "High Tension",
        badgeColor: "bg-red-500/20 text-red-400 border-red-500/30",
        specs: ["Over-by-over Probability Dice", "40 Clutch Action Cards", "Win Probability Tracker Board"],
        description: "Re-live the thrill of high-pressure chases using true historical delivery success curves.",
        stockStatus: "In Stock",
        digitalIntegration: "Live momentum chart simulation companion on /pulse.",
      },
    ],
  },
  {
    id: "limited",
    icon: "🏆",
    name: "Limited Editions",
    productsSummary: "Orange Cap, Purple Cap, MVP, Champion, Record Breaker, Clutch editions",
    whyItFits: "Creates collectible scarcity",
    highlightTag: "Strictly Numbered",
    category: "Cards & Games",
    products: [
      {
        id: "ltd-orange-cap",
        name: "Orange Cap Elite: 890 Runs Commemorative Card",
        tagline: "Pure 24k Gold Hot-Stamping with Diamond Grain Finish",
        price: 999,
        badge: "Numbered 1/500",
        badgeColor: "bg-amber-400/20 text-amber-300 border-amber-400/40",
        specs: ["Serialized Laser Engraved #", "Acrylic Magnetic Case", "Certificate of Scarcity"],
        description: "Honoring the greatest single-season run-scoring records in franchise history.",
        stockStatus: "Limited Run",
        digitalIntegration: "Displays verified digital badge in user profile.",
      },
      {
        id: "ltd-purple-cap",
        name: "Purple Cap Precision: Death Yorker Master",
        tagline: "Metallic Violet Prism Holo Foil",
        price: 999,
        badge: "Numbered 1/500",
        badgeColor: "bg-purple-400/20 text-purple-300 border-purple-400/40",
        specs: ["Serialized #", "UV Spot Coated", "Laser Cut Ball Trajectory"],
        description: "Celebrating the wicket-takers who mastered speed, variations, and pinpoint yorkers.",
        stockStatus: "Limited Run",
        digitalIntegration: "Unlocks historical bowler ball-by-ball heatmaps.",
      },
      {
        id: "ltd-champion",
        name: "2026 Champion Royal Crest Gold Plate",
        tagline: "Official commemorative medal card for the 2026 champions",
        price: 1499,
        originalPrice: 1899,
        badge: "Trophy Edition",
        badgeColor: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
        specs: ["Metal Inlay Card", "Velvet Presentation Box", "74 Match Scorecard Booklet"],
        description: "Heavyweight dual-layered metal-hybrid card capturing the 2026 championship campaign.",
        stockStatus: "Limited Run",
        digitalIntegration: "Full season replay archive access.",
      },
      {
        id: "ltd-record-breaker",
        name: "277+ Record Breaker Mega-Strike Card",
        tagline: "Commemorating the highest team totals and blistering sixes",
        price: 799,
        badge: "Special Release",
        badgeColor: "bg-orange-500/20 text-orange-400 border-orange-500/30",
        specs: ["Prismatic Chrome Finish", "Sixes Trajectory Radial Map"],
        description: "Dedicated to the power hitters that redefined modern T20 scoring ceilings.",
        stockStatus: "In Stock",
        digitalIntegration: "Interactive spatial sixes map on mobile.",
      },
    ],
  },
  {
    id: "posters",
    icon: "📊",
    name: "Data Posters",
    productsSummary: "Player career maps, season charts, rivalry posters, venue maps",
    whyItFits: "Converts your visualizations into wall art",
    highlightTag: "Gallery Wall Art",
    category: "Editorial & Art",
    products: [
      {
        id: "poster-career-map",
        name: "Virat Kohli 8,300+ Runs Spatial Career Radial Map",
        tagline: "Every scoring stroke categorized across 16 seasons in a geometric art chart",
        price: 999,
        originalPrice: 1299,
        badge: "Art Print",
        badgeColor: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
        specs: ["A2 Size (420 x 594 mm)", "300 GSM Archival Fine Art Paper", "Giclée Ultra-HD Print"],
        description: "A museum-grade visual infographic tracking career wagon wheels, phase-wise strike rates, and milestone centuries.",
        stockStatus: "In Stock",
        digitalIntegration: "Scan bottom QR to explore interactive 360-degree spatial wagon wheel on screen.",
      },
      {
        id: "poster-rivalry",
        name: "El Clásico: CSK vs MI 18-Year Analytical Timeline",
        tagline: "Head-to-head match results, playoff thrillers & trophy tally",
        price: 899,
        originalPrice: 1199,
        badge: "Iconic Rivalry",
        badgeColor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        specs: ["A2 Size", "Matte Lamination with UV Spot Highlights", "Muted Gold Typography"],
        description: "Dual-toned blueprint of the greatest rivalry in cricket history, comparing captaincy tenures and tactical matchups.",
        stockStatus: "In Stock",
        digitalIntegration: "Direct shortcut to /stats?tab=head2head.",
      },
      {
        id: "poster-venue-heatmaps",
        name: "10 Iconic IPL Grounds: Pitch Trajectory & Boundary Bias Map",
        tagline: "Chepauk, Wankhede, Eden Gardens, Chinnaswamy architectural layout",
        price: 1199,
        originalPrice: 1499,
        badge: "Architectural",
        badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        specs: ["Panoramic 24x36 Inches", "Heavy Canvas Print", "Engineered Pitch Dimensions"],
        description: "Detailed blueprints showing boundary dimensions, average 1st innings scores, and pace vs spin wicket distribution.",
        stockStatus: "In Stock",
        digitalIntegration: "Links to the venue telemetry lab on /visualizations.",
      },
    ],
  },
  {
    id: "yearbook",
    icon: "📖",
    name: "IPL Data Yearbook",
    productsSummary: "Annual physical/digital book with season stories + analytics",
    whyItFits: "Perfect bridge between your writing and analytics",
    highlightTag: "Hardcover Book",
    category: "Editorial & Art",
    products: [
      {
        id: "yb-2026-hardcover",
        name: "The 2026 IPL Intelligence Yearbook (Hardcover)",
        tagline: "260 Pages of In-Depth Tactical Essays, Visual Graphs & Player Profiles",
        price: 1999,
        originalPrice: 2499,
        badge: "Collector Edition",
        badgeColor: "bg-purple-500/20 text-purple-400 border-purple-500/30",
        specs: ["Hardcover Fabric Spine", "260 Full-Color Pages", "Includes 2 Collectible Cards Inside"],
        description: "The definitive retrospective on the 2026 season. Covers all 74 matches, auction decisions, tactical shifts, and 9 analytical dimensions.",
        stockStatus: "In Stock",
        digitalIntegration: "Includes scratch code for lifelong digital PDF + interactive web compendium.",
      },
      {
        id: "yb-digital",
        name: "IPL Intelligence Digital Yearbook (eBook + Interactive)",
        tagline: "High-Res PDF, EPUB and interactive web portal access",
        price: 499,
        originalPrice: 799,
        badge: "Instant Delivery",
        badgeColor: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
        specs: ["Instant Download", "Searchable Text & Data", "Mobile & Tablet Optimized"],
        description: "Complete digital publication featuring embedded interactive charts and direct links to live database queries.",
        stockStatus: "In Stock",
        digitalIntegration: "Instant activation on your account.",
      },
      {
        id: "yb-decade",
        name: "The First Decade: 2008–2018 Historical Retrospective",
        tagline: "How the IPL conquered global sport economics",
        price: 1799,
        originalPrice: 2199,
        badge: "Classic Archive",
        badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
        specs: ["220 Pages Hardcover", "Archival Photos", "Historical Salary & Auction Data"],
        description: "Essential reading for sports business and data analytics enthusiasts.",
        stockStatus: "In Stock",
        digitalIntegration: "Corresponds to the 2008-2018 filter mode in the app.",
      },
    ],
  },
  {
    id: "strategy",
    icon: "🧠",
    name: "Strategy Kits",
    productsSummary: "Auction simulation kit, scouting sheets, squad-building board",
    whyItFits: "Makes the project useful beyond fans",
    highlightTag: "Pro Analyst Tools",
    category: "Strategy & Tech",
    products: [
      {
        id: "strat-auction-kit",
        name: "Pro Auction War-Room Simulator Kit",
        tagline: "Magnetic squad boards, role matrices & salary cap spreadsheet templates",
        price: 2499,
        originalPrice: 2999,
        badge: "Pro Equipment",
        badgeColor: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
        specs: ["Magnetic Whiteboard 45x60cm", "150 Magnetic Player Tags", "Dry Erase Marker & Budget Ledger"],
        description: "Used by real cricket analysts and content creators to plan auction tactics, squad balance, and backup contingency paths.",
        stockStatus: "In Stock",
        digitalIntegration: "Export your tabletop squads directly into our /auction simulator.",
      },
      {
        id: "strat-scouting-sheets",
        name: "National Talent Scouting Binder (2026-2027)",
        tagline: "Comprehensive analytical rating cards for 300+ domestic & overseas prospects",
        price: 1299,
        originalPrice: 1699,
        badge: "Scout Favorite",
        badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        specs: ["Leatherette 3-Ring Binder", "300 Heavyweight Metric Sheets", "Category Index Tabs"],
        description: "Scouting rubrics tracking release point consistency, entry point versatility, and boundary strike rates.",
        stockStatus: "In Stock",
        digitalIntegration: "Compatible with custom filters on /stats.",
      },
      {
        id: "strat-tactics-compass",
        name: "Matchup Tactical Compass Wheel",
        tagline: "Double-sided spinning disc showing batter vs bowler phase advantages",
        price: 499,
        badge: "Desk Companion",
        badgeColor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        specs: ["Durable 250 Micron PVC", "Brass Center Rivet", "Covers 12 Bowling Types"],
        description: "Instant physical calculation of historical matchup strike rates (e.g. Left-arm orthodox vs Right-hand aggressive batters).",
        stockStatus: "In Stock",
        digitalIntegration: "Mirrors the Matchup Lab engine on /stats.",
      },
    ],
  },
  {
    id: "interactive",
    icon: "🧩",
    name: "Interactive Products",
    productsSummary: "QR/NFC cards opening that player's live profile on your site",
    whyItFits: "Connects physical merchandise to the OS",
    highlightTag: "Phygital Hardware",
    category: "Strategy & Tech",
    products: [
      {
        id: "inter-nfc-pass",
        name: "IPL Intelligence Smart NFC Pass Card",
        tagline: "Tap with any smartphone to open real-time live match center & telemetry",
        price: 599,
        originalPrice: 799,
        badge: "Smart NFC",
        badgeColor: "bg-purple-500/20 text-purple-400 border-purple-500/30",
        specs: ["Embedded NTAG213 Microchip", "Matte Black PVC with Brushed Metal Look", "No App Needed"],
        description: "Tap the back of your phone to immediately launch the user's favorite player or live match momentum tracker without typing URLs.",
        stockStatus: "In Stock",
        digitalIntegration: "Pre-programmed to launch https://ipl-intelligence.internal or your custom player dashboard.",
      },
      {
        id: "inter-qr-deskstand",
        name: "Analyst Live Telemetry Desk Stand",
        tagline: "Solid brushed aluminum phone stand with laser engraved dynamic QR",
        price: 899,
        originalPrice: 1199,
        badge: "Studio Tech",
        badgeColor: "bg-zinc-400/20 text-zinc-300 border-zinc-400/30",
        specs: ["Anodized Aluminum", "Weighted Anti-Slip Base", "Universal Smartphone Mount"],
        description: "Keep your second-screen live ball telemetry running during live broadcasts effortlessly.",
        stockStatus: "In Stock",
        digitalIntegration: "Instant docking station for the /pulse match momentum tracker.",
      },
    ],
  },
  {
    id: "lifestyle",
    icon: "👕",
    name: "Lifestyle",
    productsSummary: "Minimal stat tees, caps, hoodies, tote bags",
    whyItFits: "Secondary merch—not the main identity",
    highlightTag: "Apparel & Gear",
    category: "Merch & Bundles",
    products: [
      {
        id: "life-tee-intent",
        name: "\"Intent Breeds Freedom\" Minimalist Heavy Tee",
        tagline: "240 GSM French Terry Cotton with discrete typography on chest & back",
        price: 1199,
        originalPrice: 1499,
        badge: "Streetwear",
        badgeColor: "bg-slate-500/20 text-slate-300 border-slate-500/30",
        specs: ["100% Combed Cotton", "Pre-Shrunk 240 GSM", "High-Density Screen Print"],
        description: "Subtle cricket philosophy wear. The iconic quote from the Kohli Intelligence Card printed in crisp editorial typography.",
        stockStatus: "In Stock",
        digitalIntegration: "Woven label includes scannable micro-QR to Kohli profile.",
      },
      {
        id: "life-hoodie-stats",
        name: "132.7 Strike Rate Vintage Washed Hoodie",
        tagline: "Deep charcoal oversized hoodie with subtle sleeve telemetry coordinates",
        price: 2499,
        originalPrice: 2999,
        badge: "Cozy Heavy",
        badgeColor: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
        specs: ["380 GSM Fleece", "Double-Lined Hood", "Kangaroo Pocket with Secret Phone Sleeve"],
        description: "For late-night IPL viewing and stadium breeze. Premium heavyweight street fit.",
        stockStatus: "In Stock",
        digitalIntegration: "Discreet wrist NFC tag launches app homepage.",
      },
      {
        id: "life-cap-data",
        name: "\"DATA > VIBES\" Embroidered Dad Cap",
        tagline: "Unstructured 6-panel low profile cotton twill",
        price: 699,
        badge: "Everyday Carry",
        badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
        specs: ["Brass Buckle Strap", "100% Chino Twill", "Detailed Stitching"],
        description: "The official battle cry of the modern cricket intelligence era.",
        stockStatus: "In Stock",
        digitalIntegration: "NFC smart bill tab.",
      },
      {
        id: "life-tote-spatial",
        name: "Spatial Ground Geometry Canvas Tote",
        tagline: "Heavyweight natural ecru cotton tote with boundary dimension print",
        price: 499,
        badge: "Eco Merch",
        badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        specs: ["14 oz Heavyweight Canvas", "Reinforced Handles", "Inner Zipper Pocket"],
        description: "Spacious enough for a 16-inch laptop, notebooks, and card decks.",
        stockStatus: "In Stock",
        digitalIntegration: "Scannable tag.",
      },
    ],
  },
  {
    id: "accessories",
    icon: "🔑",
    name: "Accessories",
    productsSummary: "Keychains, card holders, sleeves, magnets, stickers",
    whyItFits: "Cheap entry products",
    highlightTag: "Under ₹499",
    category: "Merch & Bundles",
    products: [
      {
        id: "acc-keychain",
        name: "Mini Intelligence Card Acrylic Keychain",
        tagline: "Exact miniature replica of #18 Kohli or #7 Dhoni Intelligence Card",
        price: 199,
        originalPrice: 299,
        badge: "Top Seller",
        badgeColor: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
        specs: ["Double-Layered 4mm Acrylic", "Stainless Steel Swivel Ring", "Scratch-Resistant Coating"],
        description: "Carry your cricket talisman everywhere. Front shows jersey & portrait, back shows miniature stat career grid.",
        stockStatus: "In Stock",
        digitalIntegration: "Compact NFC chip inside acrylic triggers player profile.",
      },
      {
        id: "acc-sleeves",
        name: "Magnetic UV-Cut Frosted Card Sleeves (Pack of 5)",
        tagline: "35pt rigid one-touch magnetic trading card holders",
        price: 449,
        originalPrice: 599,
        badge: "Protection",
        badgeColor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        specs: ["99% UV Resistant Acrylic", "Gold Magnetic Catch", "Diamond Recessed Corners"],
        description: "Essential museum-grade protection for your limited edition Intelligence and Gold-foil cards.",
        stockStatus: "In Stock",
        digitalIntegration: "NFC signal friendly; cards scan right through the case.",
      },
      {
        id: "acc-stickers",
        name: "Data Analyst Laptop Decal Pack (12 Vinyl Stickers)",
        tagline: "Scoring zones, pitch heatmaps, six-hitting arcs & cricket memes",
        price: 249,
        originalPrice: 349,
        badge: "Vinyl Pack",
        badgeColor: "bg-purple-500/20 text-purple-400 border-purple-500/30",
        specs: ["100% Waterproof Vinyl", "UV-Resistant Laminate", "Residue-Free Removable"],
        description: "Decorate your MacBook, water bottles, and notebooks with stylish cricket telemetry art.",
        stockStatus: "In Stock",
        digitalIntegration: "Select stickers include micro-QRs.",
      },
      {
        id: "acc-magnets",
        name: "Iconic Stadium Pitch Die-Cast Fridge Magnets",
        tagline: "Chepauk, Wankhede, Eden Gardens, Chinnaswamy enamel magnets",
        price: 349,
        badge: "Collect All 4",
        badgeColor: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
        specs: ["Die-Cast Zinc Alloy", "Soft Enamel Color Fill", "Strong Rare-Earth Magnet"],
        description: "Miniature relief maps of India's most celebrated cricket cathedrals.",
        stockStatus: "In Stock",
        digitalIntegration: "NFC built into the base.",
      },
    ],
  },
  {
    id: "boxes",
    icon: "🎁",
    name: "Collector Boxes",
    productsSummary: "Card deck + poster + stickers + booklet + mystery card",
    whyItFits: "Premium product/bundle",
    highlightTag: "All-in-One Vault",
    category: "Merch & Bundles",
    products: [
      {
        id: "box-master-vault",
        name: "The Grand IPL Intelligence Vault Box",
        tagline: "The ultimate collector experience: 50 Cards + A2 Poster + Stickers + Scouting Booklet + 1 Numbered Mystery Card",
        price: 3999,
        originalPrice: 5499,
        badge: "Save 30%",
        badgeColor: "bg-amber-400/20 text-amber-300 border-amber-400/40",
        specs: [
          "50-Card Master Intelligence Deck",
          "A2 Archival Fine Art Career Poster",
          "12-Pack Waterproof Laptop Decals",
          "Scouting Dossier & Rule Booklet",
          "1 Guaranteed Numbered Mystery Foil Card",
          "Deluxe Matte Black Gift Box with Magnetic Clasp"
        ],
        description: "The centerpiece of the merchandise line. Curated for the passionate cricket connoisseur who appreciates both design and deep statistical rigour.",
        stockStatus: "Limited Run",
        digitalIntegration: "Permanent VIP digital status in the Intelligence Hub with access to all raw exports.",
      },
      {
        id: "box-franchise-vault",
        name: "Franchise Founder Collector Box (CSK / MI / RCB Edition)",
        tagline: "Dedicated to your team's glorious history and greatest superstars",
        price: 2499,
        originalPrice: 3199,
        badge: "Exclusive",
        badgeColor: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
        specs: ["20 Team Cards Deck", "Acrylic Keychain", "Stadium Magnet", "Franchise Tactical Map", "Team Decals"],
        description: "Select your allegiance. Every card, poster and collectible in this box is dedicated to a single franchise's legacy.",
        stockStatus: "In Stock",
        digitalIntegration: "Custom franchise UI theme unlocked on the web portal.",
      },
    ],
  },
];

/* ══════════════════════════════════════════════════════════════════════════
   2. INTERACTIVE 3D INTELLIGENCE CARD STUDIO (Mockup Showcase)
   ══════════════════════════════════════════════════════════════════════════ */

interface PlayerCardSpec {
  id: string;
  name: string;
  number: number;
  team: string;
  teamLogo: string;
  teamColor: string;
  tagline: string;
  signatureStyle: string;
  image: string;
  born: string;
  role: string;
  iplDebut: string;
  teamsList: string;
  nickname: string;
  quote: string;
  playingStyle: string;
  strengths: string[];
  matches: number;
  runs: string;
  average: number;
  strikeRate: number;
  hundreds: number;
  fifties: number;
  radarData: { subject: string; value: number }[];
  seasonRuns: { season: string; runs: number }[];
  srVsBowling: { type: string; sr: number; color: string }[];
  playerSlug: string;
}

const FEATURED_CARDS: PlayerCardSpec[] = [
  {
    id: "vk18",
    name: "VIRAT KOHLI",
    number: 18,
    team: "RCB",
    teamLogo: "/rcb logo.png",
    teamColor: "#EC1C24",
    tagline: "THE CHASE HAS A KING",
    signatureStyle: "MRF Cover Drive • Passion & Legacy",
    image: "/virat kohli.jpg",
    born: "5 November 1988",
    role: "Top Order Batter",
    iplDebut: "2008",
    teamsList: "RCB (2008 – Present)",
    nickname: "King, Run Machine",
    quote: "Intent Breeds Freedom",
    playingStyle: "Technically solid, aggressive top order batter. Masters pace, adapts to spin, excels in chases and big occasions.",
    strengths: ["Chase Specialist", "Consistency", "Running Between Wickets", "Fitness & Mindset", "On-side Play"],
    matches: 261,
    runs: "8,326",
    average: 39.0,
    strikeRate: 132.7,
    hundreds: 8,
    fifties: 58,
    radarData: [
      { subject: "Cover", value: 98 },
      { subject: "Mid-Wicket", value: 94 },
      { subject: "Long-on", value: 88 },
      { subject: "Square Cut", value: 82 },
      { subject: "Fine Leg", value: 85 },
      { subject: "Straight", value: 92 },
    ],
    seasonRuns: [
      { season: "'08", runs: 165 },
      { season: "'10", runs: 307 },
      { season: "'12", runs: 364 },
      { season: "'14", runs: 359 },
      { season: "'16", runs: 973 },
      { season: "'18", runs: 530 },
      { season: "'20", runs: 466 },
      { season: "'22", runs: 341 },
      { season: "'24", runs: 741 },
      { season: "'26", runs: 890 },
    ],
    srVsBowling: [
      { type: "Pace", sr: 138.2, color: "#EF4444" },
      { type: "Spin", sr: 128.4, color: "#F59E0B" },
      { type: "Left Arm Pace", sr: 131.7, color: "#3B82F6" },
      { type: "Leg Spin", sr: 136.1, color: "#10B981" },
    ],
    playerSlug: "virat-kohli",
  },
  {
    id: "msd7",
    name: "MS DHONI",
    number: 7,
    team: "CSK",
    teamLogo: "/csk logo.png",
    teamColor: "#F9CD05",
    tagline: "THE FINISHER",
    signatureStyle: "Helicopter Shot • Master Tactician",
    image: "/msd.jpg",
    born: "7 July 1981",
    role: "Wicketkeeper Batter & Captain",
    iplDebut: "2008",
    teamsList: "CSK (2008–15, 2018–Present), RPS",
    nickname: "Thala, Captain Cool",
    quote: "Process Over Results",
    playingStyle: "Unflappable finisher. Decodes bowlers under extreme death pressure, explosive lower-order power with elite game awareness.",
    strengths: ["Death Overs Exploits", "Spin Calculation", "Lightning Stumping", "Calm Under Fire", "Tactical Fields"],
    matches: 264,
    runs: "5,243",
    average: 39.1,
    strikeRate: 137.5,
    hundreds: 0,
    fifties: 24,
    radarData: [
      { subject: "Cover", value: 76 },
      { subject: "Mid-Wicket", value: 96 },
      { subject: "Long-on", value: 99 },
      { subject: "Square Cut", value: 78 },
      { subject: "Fine Leg", value: 88 },
      { subject: "Straight", value: 95 },
    ],
    seasonRuns: [
      { season: "'08", runs: 414 },
      { season: "'11", runs: 392 },
      { season: "'13", runs: 461 },
      { season: "'18", runs: 455 },
      { season: "'19", runs: 416 },
      { season: "'21", runs: 114 },
      { season: "'23", runs: 104 },
      { season: "'24", runs: 161 },
      { season: "'26", runs: 182 },
    ],
    srVsBowling: [
      { type: "Pace", sr: 142.8, color: "#EF4444" },
      { type: "Spin", sr: 118.5, color: "#F59E0B" },
      { type: "Death Pace", sr: 182.4, color: "#8B5CF6" },
      { type: "Left Arm Pace", sr: 134.1, color: "#3B82F6" },
    ],
    playerSlug: "ms-dhoni",
  },
  {
    id: "rohit45",
    name: "ROHIT SHARMA",
    number: 45,
    team: "MI",
    teamLogo: "/mi logo.jpg",
    teamColor: "#004BA0",
    tagline: "HITMAN",
    signatureStyle: "Effortless Pull Shot • 5x IPL Champion",
    image: "/rohit sharma.jpg",
    born: "30 April 1987",
    role: "Top Order Batter & Leader",
    iplDebut: "2008",
    teamsList: "Deccan Chargers, MI (2011–Present)",
    nickname: "Hitman, Ro",
    quote: "Timing Over Brute Force",
    playingStyle: "Peerless front-foot puller with extra milliseconds against express pace. Lethal powerplay boundary hunter.",
    strengths: ["Powerplay Dominance", "Short-ball Mastery", "Pace Destroyer", "Calm Strategic Leadership"],
    matches: 257,
    runs: "6,628",
    average: 29.7,
    strikeRate: 131.1,
    hundreds: 2,
    fifties: 43,
    radarData: [
      { subject: "Cover", value: 88 },
      { subject: "Mid-Wicket", value: 99 },
      { subject: "Long-on", value: 92 },
      { subject: "Square Cut", value: 85 },
      { subject: "Fine Leg", value: 90 },
      { subject: "Straight", value: 89 },
    ],
    seasonRuns: [
      { season: "'08", runs: 404 },
      { season: "'11", runs: 372 },
      { season: "'13", runs: 538 },
      { season: "'15", runs: 482 },
      { season: "'17", runs: 333 },
      { season: "'20", runs: 332 },
      { season: "'23", runs: 332 },
      { season: "'24", runs: 417 },
      { season: "'26", runs: 462 },
    ],
    srVsBowling: [
      { type: "Pace", sr: 141.5, color: "#EF4444" },
      { type: "Spin", sr: 121.2, color: "#F59E0B" },
      { type: "Left Arm Pace", sr: 126.8, color: "#3B82F6" },
      { type: "Leg Spin", sr: 129.4, color: "#10B981" },
    ],
    playerSlug: "rohit-sharma",
  },
  {
    id: "bumrah19",
    name: "JASPRIT BUMRAH",
    number: 19,
    team: "MI",
    teamLogo: "/mi logo.jpg",
    teamColor: "#004BA0",
    tagline: "THE YORKER",
    signatureStyle: "Unorthodox Action • Pinpoint Death Yorker",
    image: "/bumrah.jpg",
    born: "6 December 1993",
    role: "Right-arm Fast Bowler",
    iplDebut: "2013",
    teamsList: "Mumbai Indians (2013–Present)",
    nickname: "Boom Boom, Jassi",
    quote: "Simplicity is the Greatest Art",
    playingStyle: "World's premier death bowler. Hyperextension action generating searing pace, lethal dipping yorkers and deceptive off-cutters.",
    strengths: ["Toe-Crushing Yorkers", "Sub-7 Death Economy", "Slower Balls", "Bounce Generation", "Big Match Clutch"],
    matches: 133,
    runs: "165 wkts",
    average: 22.5,
    strikeRate: 18.2,
    hundreds: 0,
    fifties: 2,
    radarData: [
      { subject: "Yorker %", value: 99 },
      { subject: "Dot Ball %", value: 96 },
      { subject: "Economy", value: 98 },
      { subject: "Death Clutch", value: 100 },
      { subject: "Bouncer %", value: 90 },
      { subject: "Variations", value: 92 },
    ],
    seasonRuns: [
      { season: "'14", runs: 5 },
      { season: "'16", runs: 15 },
      { season: "'17", runs: 20 },
      { season: "'18", runs: 17 },
      { season: "'19", runs: 19 },
      { season: "'20", runs: 27 },
      { season: "'22", runs: 15 },
      { season: "'24", runs: 20 },
      { season: "'26", runs: 23 },
    ],
    srVsBowling: [
      { type: "Powerplay Econ", sr: 6.2, color: "#10B981" },
      { type: "Middle Overs", sr: 6.8, color: "#3B82F6" },
      { type: "Death Econ (17-20)", sr: 7.4, color: "#8B5CF6" },
      { type: "vs Top 3 Batters", sr: 5.9, color: "#EF4444" },
    ],
    playerSlug: "jasprit-bumrah",
  },
];

/* ══════════════════════════════════════════════════════════════════════════
   3. CART & WISHLIST STATE HOOK
   ══════════════════════════════════════════════════════════════════════════ */

interface CartEntry {
  product: ProductItem;
  collectionName: string;
  qty: number;
}

/* ══════════════════════════════════════════════════════════════════════════
   4. MAIN SHOP PAGE COMPONENT
   ══════════════════════════════════════════════════════════════════════════ */

export default function ShopPage() {
  const [activeSubTab, setActiveSubTab] = useState<string>("all");
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerCardSpec>(FEATURED_CARDS[0]);
  const [cardFlipped, setCardFlipped] = useState<boolean>(false);
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [specModalProduct, setSpecModalProduct] = useState<ProductItem | null>(null);
  const [showImageZoom, setShowImageZoom] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const handleAddToCart = (product: ProductItem, collectionName: string) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { product, collectionName, qty: 1 }];
    });
    setIsCartOpen(true);
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((acc, curr) => acc + curr.product.price * curr.qty, 0);
  }, [cart]);

  const filteredCollections = useMemo(() => {
    if (activeSubTab === "all") {
      if (!searchQuery.trim()) return COLLECTIONS_DATA;
      return COLLECTIONS_DATA.map((col) => ({
        ...col,
        products: col.products.filter(
          (p) =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.description.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      })).filter((col) => col.products.length > 0);
    }
    return COLLECTIONS_DATA.filter((col) => col.id === activeSubTab);
  }, [activeSubTab, searchQuery]);

  return (
    <Layout hideRightPanel>
      {/* ─── TOP NOTIFICATION STRIP ─── */}
      <div className="w-full bg-gradient-to-r from-purple-900/60 via-primary/30 to-blue-900/60 border-b border-white/10 px-4 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/40 text-[9px] font-black tracking-widest uppercase">
            PHYSICAL + DIGITAL MERCH LAB
          </span>
          <span className="text-white/80 hidden sm:inline">
            Original Collectibles with Embedded NFC &amp; Live Telemetry Sync
          </span>
        </div>
        <div className="flex items-center gap-4 text-white/60 text-[11px]">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            2008–2026 Archive Certified
          </span>
          <button
            onClick={() => setIsCartOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all relative"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-primary" />
            <span>Bag</span>
            {cart.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-primary text-black font-black text-[9px] flex items-center justify-center">
                {cart.reduce((s, i) => s + i.qty, 0)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ─── HERO HEADER SECTION ─── */}
      <div className="relative overflow-hidden bg-gradient-to-b from-[#0e1428] via-[#090d1c] to-[#0B1020] border-b border-white/10 px-4 md:px-8 py-8 md:py-12">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-[1.3fr_0.7fr] gap-8 items-center">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                OFFICIAL COLLECTIBLES &amp; GEAR
              </span>
              <span className="text-[11px] font-mono text-white/40">10 Curated Product Lines</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight leading-none mb-4">
              IPL INTELLIGENCE <br />
              <span className="bg-gradient-to-r from-primary via-purple-400 to-pink-500 bg-clip-text text-transparent">
                CARDS &amp; MERCH STORE
              </span>
            </h1>
            <p className="text-white/60 text-sm md:text-base leading-relaxed max-w-2xl mb-6">
              Turn your deep cricket analytics into tangible physical collectibles, trump-style game decks,
              wall-sized spatial data posters, and NFC-enabled intelligence hardware connected directly to this OS.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setActiveSubTab("studio")}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-500 text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-primary/20 transition-all cursor-pointer"
              >
                <RotateCw className="w-4 h-4" />
                Interactive 3D Card Studio
              </button>
              <button
                onClick={() => setShowImageZoom(true)}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
              >
                <Eye className="w-4 h-4 text-purple-400" />
                View Master Design Blueprint
              </button>
              <button
                onClick={() => setActiveSubTab("matrix")}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
              >
                <Layers className="w-4 h-4 text-emerald-400" />
                Collection Rationale Matrix
              </button>
            </div>
          </div>

          {/* HERO PREVIEW CARD (Interactive Mockup Thumbnail) */}
          <div className="relative group cursor-pointer" onClick={() => setShowImageZoom(true)}>
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-purple-600/30 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
            <div className="relative bg-[#0d1326] border border-white/15 rounded-2xl overflow-hidden shadow-2xl p-3">
              <img
                src="/ipl-intelligence-cards-mockup.jpg"
                alt="IPL Intelligence Cards Design Mockup"
                className="w-full h-auto object-cover rounded-xl transition-transform duration-500 group-hover:scale-[1.02]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4 rounded-xl">
                <div className="flex items-center justify-between w-full">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-primary">Front &amp; Back Architecture</div>
                    <div className="text-xs font-bold text-white">Virat Kohli #18 • Player Decks &amp; Merch</div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold flex items-center gap-1.5">
                    <Eye className="w-3 h-3 text-primary" /> Inspect Full Sheet
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── COLLECTION SUB-TAB BAR ─── */}
      <div className="sticky top-[50px] z-20 bg-[#0B1020]/95 backdrop-blur-xl border-b border-white/10 px-4 md:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setActiveSubTab("all")}
              className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                activeSubTab === "all"
                  ? "bg-primary text-black shadow-lg shadow-primary/25"
                  : "bg-white/5 text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              All Collections
            </button>

            {COLLECTIONS_DATA.map((col) => (
              <button
                key={col.id}
                onClick={() => setActiveSubTab(col.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold tracking-tight flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                  activeSubTab === col.id
                    ? "bg-purple-600/30 border border-purple-500/50 text-white font-black"
                    : "bg-white/5 border border-transparent text-white/50 hover:text-white hover:bg-white/10"
                }`}
              >
                <span>{col.icon}</span>
                <span>{col.name}</span>
              </button>
            ))}

            <div className="h-5 w-px bg-white/10 mx-1 shrink-0" />

            <button
              onClick={() => setActiveSubTab("studio")}
              className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shrink-0 transition-all cursor-pointer ${
                activeSubTab === "studio"
                  ? "bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-lg"
                  : "bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20"
              }`}
            >
              <RotateCw className="w-3.5 h-3.5" />
              3D Card Studio
            </button>

            <button
              onClick={() => setActiveSubTab("matrix")}
              className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shrink-0 transition-all cursor-pointer ${
                activeSubTab === "matrix"
                  ? "bg-emerald-600 text-white shadow-lg"
                  : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Collection Matrix
            </button>
          </div>

          {/* Quick Search */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <input
              type="text"
              placeholder="Search products or cards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-primary/60 w-48"
            />
          </div>
        </div>
      </div>

      {/* ─── MAIN CONTENT BODY ─── */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">

        {/* ─── 1. INTERACTIVE 3D CARD STUDIO VIEW ─── */}
        {activeSubTab === "studio" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/[0.02] border border-white/5 p-6 rounded-3xl">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-[10px] font-black uppercase tracking-widest">
                  LIVE INTERACTIVE PROTOTYPE
                </span>
                <h2 className="text-2xl md:text-3xl font-black text-white mt-1">
                  IPL INTELLIGENCE CARD STUDIO
                </h2>
                <p className="text-white/50 text-xs md:text-sm mt-1">
                  Click the card below to flip between FRONT (Iconic Stance) and BACK (Deep Telemetry, Scoring Radar, Bowling SRs).
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCardFlipped(!cardFlipped)}
                  className="px-4 py-2.5 rounded-xl bg-primary text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-primary/90 transition-all cursor-pointer shadow-lg"
                >
                  <RotateCw className="w-4 h-4" />
                  Flip Card ({cardFlipped ? "Showing Back" : "Showing Front"})
                </button>
                <Link
                  href={`/players/${selectedPlayer.playerSlug}`}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all"
                >
                  <span>Live Telemetry</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* THE FLIPPABLE CARD CONTAINER */}
            <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start">
              <div className="flex flex-col items-center justify-center p-4 md:p-8 bg-black/40 rounded-3xl border border-white/10 min-h-[620px]">
                
                {/* 3D Flip Card */}
                <div
                  className="relative w-full max-w-[420px] aspect-[1/1.55] cursor-pointer select-none"
                  style={{ perspective: "1200px" }}
                  onClick={() => setCardFlipped(!cardFlipped)}
                >
                  <motion.div
                    className="w-full h-full relative"
                    animate={{ rotateY: cardFlipped ? 180 : 0 }}
                    transition={{ duration: 0.6, ease: "easeInOut" }}
                    style={{ transformStyle: "preserve-3d" }}
                  >
                    {/* ──── FRONT SIDE OF THE CARD ──── */}
                    <div
                      className="absolute inset-0 rounded-[28px] overflow-hidden border-4 border-amber-400/40 shadow-2xl bg-gradient-to-br from-[#1c1813] via-[#0f0e0c] to-[#1a140f] p-5 flex flex-col justify-between"
                      style={{ backfaceVisibility: "hidden" }}
                    >
                      {/* Top Bar: Jersey # and Team Crest */}
                      <div className="flex items-start justify-between z-10">
                        <div className="flex flex-col">
                          <span className="text-6xl font-black text-white leading-none tracking-tighter drop-shadow-md">
                            {selectedPlayer.number}
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 mt-1">
                            {selectedPlayer.team} LEGEND
                          </span>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-black/60 border border-white/20 p-2 flex items-center justify-center shadow-lg">
                          <img
                            src={selectedPlayer.teamLogo}
                            alt={selectedPlayer.team}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      </div>

                      {/* Main Player Image in Center */}
                      <div className="absolute inset-x-0 top-12 bottom-24 flex items-center justify-center overflow-hidden">
                        <img
                          src={selectedPlayer.image}
                          alt={selectedPlayer.name}
                          className="w-full h-full object-cover object-top opacity-90 transition-transform duration-500 hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0e0c] via-transparent to-transparent" />
                      </div>

                      {/* Signature Trait Tags on Right */}
                      <div className="absolute right-4 top-28 flex flex-col items-end gap-1.5 z-10 text-[9px] font-black uppercase tracking-widest text-white/70">
                        <span className="bg-black/60 px-2 py-0.5 rounded backdrop-blur border border-white/10">PASSION</span>
                        <span className="bg-black/60 px-2 py-0.5 rounded backdrop-blur border border-white/10">DISCIPLINE</span>
                        <span className="bg-black/60 px-2 py-0.5 rounded backdrop-blur border border-white/10">COMEBACKS</span>
                        <span className="bg-black/60 px-2 py-0.5 rounded backdrop-blur border border-white/10">CONSISTENCY</span>
                        <span className="bg-black/60 px-2 py-0.5 rounded backdrop-blur border border-white/10">LEGACY</span>
                      </div>

                      {/* Bottom Banner: Name, Tagline & Signature */}
                      <div className="relative z-10 bg-gradient-to-r from-red-950/90 to-black/90 p-4 rounded-2xl border border-red-500/30 backdrop-blur-md">
                        <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-amber-400">
                          {selectedPlayer.signatureStyle}
                        </div>
                        <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight uppercase leading-none mt-0.5">
                          {selectedPlayer.name}
                        </h3>
                        <div className="text-[11px] font-bold text-red-300 mt-1 uppercase tracking-wider flex items-center justify-between">
                          <span>{selectedPlayer.tagline}</span>
                          <span className="text-[9px] text-white/40">FLIP ↷</span>
                        </div>
                      </div>
                    </div>

                    {/* ──── BACK SIDE OF THE CARD ──── */}
                    <div
                      className="absolute inset-0 rounded-[28px] overflow-hidden border-4 border-amber-400/40 shadow-2xl bg-[#0d111d] p-4 md:p-5 flex flex-col justify-between text-white"
                      style={{
                        backfaceVisibility: "hidden",
                        transform: "rotateY(180deg)",
                      }}
                    >
                      {/* Top Header: Jersey # + Name + Country */}
                      <div className="border-b border-white/10 pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-3xl font-black text-primary leading-none">
                              {selectedPlayer.number}
                            </span>
                            <div>
                              <div className="text-sm font-black uppercase text-white leading-none">
                                {selectedPlayer.name}
                              </div>
                              <div className="text-[9px] font-mono text-white/50 uppercase mt-0.5">
                                {selectedPlayer.role}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/10 border border-white/10 text-amber-300">
                            🇮🇳 INDIA
                          </span>
                        </div>

                        {/* Bio Quick Line */}
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[8px] font-mono text-white/60 mt-2 bg-white/[0.02] p-1.5 rounded-lg border border-white/5">
                          <div><span className="text-white/30">BORN:</span> {selectedPlayer.born}</div>
                          <div><span className="text-white/30">DEBUT:</span> {selectedPlayer.iplDebut}</div>
                          <div><span className="text-white/30">TEAMS:</span> {selectedPlayer.teamsList}</div>
                          <div><span className="text-white/30">NICKNAME:</span> {selectedPlayer.nickname}</div>
                        </div>
                      </div>

                      {/* Playing Style & Strengths */}
                      <div className="bg-red-500/10 border border-red-500/20 p-2 rounded-xl text-[9px] leading-tight">
                        <div className="font-black text-red-400 uppercase tracking-widest text-[8px] mb-0.5">
                          PLAYING STYLE
                        </div>
                        <p className="text-white/80">{selectedPlayer.playingStyle}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {selectedPlayer.strengths.slice(0, 4).map((str, idx) => (
                            <span key={idx} className="bg-black/40 text-amber-300 px-1.5 py-0.5 rounded text-[8px] font-bold">
                              ✓ {str}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* IPL Career Stats Grid */}
                      <div className="bg-black/50 border border-white/10 rounded-xl p-2">
                        <div className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">
                          IPL CAREER METRICS (2008 – 2026)
                        </div>
                        <div className="grid grid-cols-6 gap-1 text-center">
                          <div className="bg-white/5 p-1 rounded">
                            <div className="text-xs font-black text-white">{selectedPlayer.matches}</div>
                            <div className="text-[7px] text-white/40 uppercase">MATCHES</div>
                          </div>
                          <div className="bg-white/5 p-1 rounded">
                            <div className="text-xs font-black text-amber-400">{selectedPlayer.runs}</div>
                            <div className="text-[7px] text-white/40 uppercase">RUNS</div>
                          </div>
                          <div className="bg-white/5 p-1 rounded">
                            <div className="text-xs font-black text-white">{selectedPlayer.average}</div>
                            <div className="text-[7px] text-white/40 uppercase">AVG</div>
                          </div>
                          <div className="bg-white/5 p-1 rounded">
                            <div className="text-xs font-black text-red-400">{selectedPlayer.strikeRate}</div>
                            <div className="text-[7px] text-white/40 uppercase">S/R</div>
                          </div>
                          <div className="bg-white/5 p-1 rounded">
                            <div className="text-xs font-black text-white">{selectedPlayer.hundreds}</div>
                            <div className="text-[7px] text-white/40 uppercase">100s</div>
                          </div>
                          <div className="bg-white/5 p-1 rounded">
                            <div className="text-xs font-black text-white">{selectedPlayer.fifties}</div>
                            <div className="text-[7px] text-white/40 uppercase">50s</div>
                          </div>
                        </div>
                      </div>

                      {/* Telemetry Charts: Scoring Zones Radar + Bowling Type Breakdown */}
                      <div className="grid grid-cols-2 gap-2 h-24">
                        {/* Scoring Radar */}
                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-1 flex flex-col items-center justify-center">
                          <div className="text-[7px] font-black uppercase tracking-wider text-white/40">SCORING ZONES</div>
                          <div className="w-full h-16">
                            <ResponsiveContainer width="100%" height="100%">
                              <RadarChart data={selectedPlayer.radarData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 6 }} />
                                <Radar dataKey="value" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.4} />
                              </RadarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* Bowling SR Breakdown */}
                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-1.5 flex flex-col justify-between">
                          <div className="text-[7px] font-black uppercase tracking-wider text-white/40">v/s BOWLING TYPE (SR)</div>
                          <div className="space-y-1">
                            {selectedPlayer.srVsBowling.map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between text-[7px] font-mono">
                                <span className="text-white/60 truncate max-w-[55px]">{item.type}</span>
                                <div className="flex items-center gap-1">
                                  <div className="w-10 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                      className="h-full rounded-full"
                                      style={{
                                        width: `${Math.min(100, (item.sr / 200) * 100)}%`,
                                        backgroundColor: item.color,
                                      }}
                                    />
                                  </div>
                                  <span className="font-bold text-white">{item.sr}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Footer Quote & Live NFC Link */}
                      <div className="border-t border-white/10 pt-2 flex items-center justify-between">
                        <div className="italic text-[9px] font-serif text-amber-300">
                          "{selectedPlayer.quote}"
                        </div>
                        <div className="flex items-center gap-1 text-[8px] font-black text-primary uppercase">
                          <QrCode className="w-3 h-3" /> NFC OS CONNECTED
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>

                <div className="mt-4 text-center text-xs text-white/40 flex items-center gap-2">
                  <RotateCw className="w-3.5 h-3.5 text-primary animate-spin" style={{ animationDuration: "6s" }} />
                  Tap anywhere on the card to flip between Front Art and Back Telemetry
                </div>
              </div>

              {/* Player Selector Strip & Card Specs */}
              <div className="space-y-4">
                <GlassCard className="p-5">
                  <div className="text-[10px] font-black uppercase tracking-widest text-primary mb-3">
                    SELECT FEATURED LEGEND
                  </div>
                  <div className="space-y-2">
                    {FEATURED_CARDS.map((p) => {
                      const isSelected = selectedPlayer.id === p.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => {
                            setSelectedPlayer(p);
                            setCardFlipped(false);
                          }}
                          className={`w-full p-3 rounded-2xl border flex items-center gap-3 text-left transition-all cursor-pointer ${
                            isSelected
                              ? "bg-primary/20 border-primary shadow-lg shadow-primary/10"
                              : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/15"
                          }`}
                        >
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-black shrink-0 border border-white/10">
                            <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-white">{p.name}</span>
                              <span className="text-[10px] font-bold text-amber-400">#{p.number}</span>
                            </div>
                            <div className="text-[10px] text-white/50 truncate">{p.tagline}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </GlassCard>

                {/* Purchase This Specific Card */}
                <GlassCard className="p-5 border-amber-400/30 bg-gradient-to-br from-amber-500/10 via-black to-black">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-amber-400">PHYSICAL CARD COLLECTIBLE</span>
                      <h4 className="text-sm font-black text-white mt-0.5">{selectedPlayer.name} #18</h4>
                      <p className="text-[11px] text-white/60 mt-1">350 GSM Velvet Matte • Gold Hot-Stamped Foil • NFC Chip</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black text-white">₹299</div>
                      <div className="text-[9px] text-white/40 line-through">₹399</div>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      handleAddToCart(
                        {
                          id: `card-${selectedPlayer.id}`,
                          name: `${selectedPlayer.name} #${selectedPlayer.number} Intelligence Card`,
                          tagline: selectedPlayer.tagline,
                          price: 299,
                          originalPrice: 399,
                          specs: ["350 GSM Velvet Matte", "Gold Foil Stamped", "NFC Chip Embedded"],
                          description: `Front: Iconic portrait. Back: Full telemetry, scoring radar, and runs by season.`,
                          stockStatus: "In Stock",
                          digitalIntegration: `Direct link to /players/${selectedPlayer.playerSlug}`,
                        },
                        "IPL Intelligence Cards"
                      )
                    }
                    className="w-full mt-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    Add This Card to Bag
                  </button>
                </GlassCard>
              </div>
            </div>
          </div>
        )}

        {/* ─── 2. STRATEGIC COLLECTION RATIONALE MATRIX ─── */}
        {activeSubTab === "matrix" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-white/[0.02] border border-white/5 p-6 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                  PORTFOLIO ARCHITECTURE
                </span>
                <h2 className="text-2xl md:text-3xl font-black text-white mt-1">
                  10 COLLECTIONS RATIONALE MATRIX
                </h2>
                <p className="text-white/50 text-xs md:text-sm mt-1">
                  Comprehensive strategy blueprint matching physical product formats to digital cricket intelligence.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40">
              <table className="w-full text-left border-collapse min-w-[760px]">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 text-[11px] font-black uppercase tracking-wider text-white/50">
                    <th className="py-3.5 px-4">Collection</th>
                    <th className="py-3.5 px-4">Products</th>
                    <th className="py-3.5 px-4">Why it fits your project</th>
                    <th className="py-3.5 px-4 text-center">Format &amp; Hardware</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs text-white/80">
                  {COLLECTIONS_DATA.map((col) => (
                    <tr key={col.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 px-4 font-black text-white whitespace-nowrap flex items-center gap-2">
                        <span className="text-lg">{col.icon}</span>
                        <div>
                          <div className="text-white font-bold">{col.name}</div>
                          <span className="text-[9px] text-primary uppercase font-mono">{col.category}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-white/70 max-w-xs">{col.productsSummary}</td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-[11px] font-bold">
                          ★ {col.whyItFits}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center font-mono text-[10px] text-white/40">
                        {col.highlightTag}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => setActiveSubTab(col.id)}
                          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-[11px] transition-all cursor-pointer"
                        >
                          View Products →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── 3. STANDARD PRODUCT CATALOG (ALL OR FILTERED COLLECTION) ─── */}
        {activeSubTab !== "studio" && activeSubTab !== "matrix" && (
          <div className="space-y-12 animate-in fade-in duration-300">
            {filteredCollections.map((col) => (
              <div key={col.id} className="space-y-4">
                {/* Collection Section Title & Why It Fits Callout */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 border-b border-white/10 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{col.icon}</span>
                      <h2 className="text-2xl font-black text-white tracking-tight uppercase">
                        {col.name}
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white/60 text-[10px] font-black uppercase tracking-widest">
                        {col.products.length} Products
                      </span>
                    </div>
                    <p className="text-white/50 text-xs mt-1">{col.productsSummary}</p>
                  </div>

                  {/* Why it fits callout badge */}
                  <div className="flex items-center gap-2 bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 px-3.5 py-2 rounded-xl">
                    <Sparkles className="w-4 h-4 text-primary shrink-0" />
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-wider text-primary">Strategic Rationale</div>
                      <div className="text-xs font-bold text-white/90">{col.whyItFits}</div>
                    </div>
                  </div>
                </div>

                {/* Product Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {col.products.map((prod) => (
                    <GlassCard
                      key={prod.id}
                      className="p-5 flex flex-col justify-between group hover:border-primary/40 transition-all hover:-translate-y-1 duration-300"
                    >
                      <div>
                        {/* Badges & Stock */}
                        <div className="flex items-center justify-between mb-3">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${
                              prod.badgeColor || "bg-white/10 text-white border-white/10"
                            }`}
                          >
                            {prod.badge || "Original"}
                          </span>
                          <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            {prod.stockStatus}
                          </span>
                        </div>

                        {/* Title & Tagline */}
                        <h3 className="text-base font-black text-white group-hover:text-primary transition-colors leading-snug">
                          {prod.name}
                        </h3>
                        <p className="text-[11px] text-white/50 mt-1 line-clamp-2 leading-relaxed">
                          {prod.tagline}
                        </p>

                        {/* Specs Pills */}
                        <div className="flex flex-wrap gap-1 mt-3">
                          {prod.specs.slice(0, 3).map((spec, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[9px] font-mono text-white/60"
                            >
                              {spec}
                            </span>
                          ))}
                        </div>

                        {/* Digital Integration Note */}
                        <div className="mt-3.5 pt-3 border-t border-white/5 flex items-start gap-1.5 text-[10px] text-primary/80">
                          <QrCode className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{prod.digitalIntegration}</span>
                        </div>
                      </div>

                      {/* Bottom Pricing & Action */}
                      <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between">
                        <div>
                          <div className="text-lg font-black text-white leading-none">
                            ₹{prod.price.toLocaleString("en-IN")}
                          </div>
                          {prod.originalPrice && (
                            <div className="text-[10px] text-white/40 line-through">
                              ₹{prod.originalPrice.toLocaleString("en-IN")}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setSpecModalProduct(prod)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all cursor-pointer"
                            title="Quick Specs"
                          >
                            <Info className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleAddToCart(prod, col.name)}
                            className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-black font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            Add
                          </button>
                        </div>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── CART DRAWER MODAL ─── */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-md bg-[#0e1428] border-l border-white/10 h-full p-6 flex flex-col justify-between shadow-2xl text-white overflow-y-auto"
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-black uppercase tracking-tight">Your Merch Bag</h3>
                    <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/60 text-[10px] font-bold">
                      {cart.length} items
                    </span>
                  </div>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {cart.length === 0 ? (
                  <div className="py-20 text-center text-white/40 space-y-3">
                    <Package className="w-12 h-12 mx-auto text-white/20" />
                    <p className="text-sm">Your kit bag is empty.</p>
                    <button
                      onClick={() => setIsCartOpen(false)}
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white uppercase tracking-wider"
                    >
                      Browse Collections
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5 my-4 space-y-3">
                    {cart.map((item, idx) => (
                      <div key={idx} className="pt-3 flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <span className="text-[9px] font-black uppercase tracking-widest text-primary">
                            {item.collectionName}
                          </span>
                          <h4 className="text-xs font-bold text-white truncate">{item.product.name}</h4>
                          <div className="text-[10px] text-white/50 mt-0.5">
                            ₹{item.product.price} × {item.qty}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-black text-white">
                            ₹{(item.product.price * item.qty).toLocaleString("en-IN")}
                          </div>
                          <button
                            onClick={() =>
                              setCart((prev) => prev.filter((i) => i.product.id !== item.product.id))
                            }
                            className="text-[10px] text-red-400 hover:text-red-300 mt-1"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {cart.length > 0 && (
                <div className="border-t border-white/10 pt-4 space-y-3">
                  <div className="flex items-center justify-between text-xs text-white/60">
                    <span>Shipping</span>
                    <span className="text-emerald-400 font-bold">Free Worldwide Express</span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-bold text-white">
                    <span>Order Subtotal</span>
                    <span className="text-lg font-black text-primary">₹{cartTotal.toLocaleString("en-IN")}</span>
                  </div>
                  <p className="text-[10px] text-white/40 text-center">
                    Physical items shipped in protective tamper-evident collectors casing with verified NFC tags.
                  </p>
                  <button
                    onClick={() => {
                      alert(`Proceeding to secure checkout for ₹${cartTotal.toLocaleString("en-IN")}`);
                    }}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-500 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-primary/20 transition-all cursor-pointer"
                  >
                    <span>Proceed to Order Simulation</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── SPEC DETAILS MODAL ─── */}
      <AnimatePresence>
        {specModalProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-[#0e1428] border border-white/15 rounded-3xl p-6 shadow-2xl text-white space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full bg-primary/20 text-primary text-[9px] font-black uppercase tracking-widest border border-primary/30">
                    PRODUCT SPECIFICATIONS
                  </span>
                  <h3 className="text-lg font-black text-white mt-1.5">{specModalProduct.name}</h3>
                </div>
                <button
                  onClick={() => setSpecModalProduct(null)}
                  className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-white/70 leading-relaxed">{specModalProduct.description}</p>

              <div className="bg-black/40 p-3 rounded-2xl border border-white/10 space-y-2">
                <div className="text-[10px] font-black uppercase text-white/40 tracking-wider">
                  MATERIAL &amp; HARDWARE SPECS
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {specModalProduct.specs.map((s, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-white/80">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-purple-950/30 p-3 rounded-2xl border border-purple-500/20 text-xs text-purple-200 flex items-start gap-2">
                <QrCode className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Digital Platform Link: </span>
                  {specModalProduct.digitalIntegration}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <div className="text-xl font-black text-white">₹{specModalProduct.price}</div>
                  <div className="text-[10px] text-emerald-400 font-bold">Free Worldwide Express Delivery</div>
                </div>
                <button
                  onClick={() => {
                    handleAddToCart(specModalProduct, "Selected Product");
                    setSpecModalProduct(null);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-primary text-black font-black text-xs uppercase tracking-wider flex items-center gap-1.5 hover:bg-primary/90 transition-all cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4" /> Add to Bag
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── FULL DESIGN BLUEPRINT MODAL ─── */}
      <AnimatePresence>
        {showImageZoom && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-5xl bg-[#090d1c] border border-white/20 rounded-3xl p-4 shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs font-black uppercase tracking-wider text-white">
                    IPL Intelligence Cards Master Design Sheet
                  </span>
                </div>
                <button
                  onClick={() => setShowImageZoom(false)}
                  className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="max-h-[80vh] overflow-auto rounded-xl">
                <img
                  src="/ipl-intelligence-cards-mockup.jpg"
                  alt="Full Blueprint"
                  className="w-full h-auto object-contain rounded-xl"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
