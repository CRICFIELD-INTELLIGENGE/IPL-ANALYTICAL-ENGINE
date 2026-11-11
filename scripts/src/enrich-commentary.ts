import * as fs from 'fs';
import * as path from 'path';

// Define the expected structure from the Apify Scraper
interface ApifyCommentaryRow {
  match_id?: string;
  over?: string | number;
  innings?: number;
  batter?: string;
  bowler?: string;
  runs?: number;
  text?: string;
  commentary?: string; // Alternative field name
  title?: string;
}

// Define our output enriched structure
interface EnrichedDelivery {
  match_id: string;
  over: number;
  innings: number;
  matchup_delivery: string;
  scoring_area: string;
  runs: number;
  raw_text: string;
}

// Regex / Keyword definitions
const DELIVERY_KEYWORDS = [
  { type: 'Yorker', keywords: ['yorker', 'blockhole', 'base of the stumps'] },
  { type: 'Bouncer', keywords: ['bouncer', 'short ball', 'short delivery', 'dug in short'] },
  { type: 'Slower Delivery', keywords: ['slower ball', 'slower delivery', 'off-cutter', 'leg-cutter', 'knuckle ball', 'change of pace'] },
  { type: 'Full Toss', keywords: ['full toss', 'beamer'] },
  { type: 'Good Length', keywords: ['good length', 'length ball', 'on a length'] },
  { type: 'Full Length', keywords: ['full delivery', 'pitched up', 'full and wide', 'half-volley'] },
  { type: 'Outswing', keywords: ['outswing', 'shapes away', 'moves away'] },
  { type: 'Inswing', keywords: ['inswing', 'shapes in', 'nips back'] },
  { type: 'Googly', keywords: ['googly', 'wrong un'] },
  { type: 'Carrom Ball', keywords: ['carrom ball'] },
];

const SCORING_AREA_KEYWORDS = [
  { area: 'Mid-Wicket', keywords: ['mid-wicket', 'midwicket', 'mid wicket'] },
  { area: 'Cover', keywords: ['cover', 'extra cover', 'covers'] },
  { area: 'Third Man', keywords: ['third man', 'thirdman'] },
  { area: 'Long-On', keywords: ['long-on', 'long on'] },
  { area: 'Long-Off', keywords: ['long-off', 'long off'] },
  { area: 'Point', keywords: ['point', 'backward point'] },
  { area: 'Square Leg', keywords: ['square leg', 'backward square'] },
  { area: 'Fine Leg', keywords: ['fine leg', 'short fine'] },
  { area: 'Mid-Off', keywords: ['mid-off', 'mid off'] },
  { area: 'Mid-On', keywords: ['mid-on', 'mid on'] },
  { area: 'Gully', keywords: ['gully'] },
  { area: 'Slip', keywords: ['slip', 'slips'] },
];

function parseDeliveryType(text: string): string {
  const lowerText = text.toLowerCase();
  for (const category of DELIVERY_KEYWORDS) {
    if (category.keywords.some(kw => lowerText.includes(kw))) {
      return category.type;
    }
  }
  return 'Standard/Unclassified';
}

function parseScoringArea(text: string): string {
  const lowerText = text.toLowerCase();
  for (const category of SCORING_AREA_KEYWORDS) {
    if (category.keywords.some(kw => lowerText.includes(kw))) {
      return category.area;
    }
  }
  return 'Standard/Unclassified';
}

function parseRuns(text: string, providedRuns?: number): number {
  if (providedRuns !== undefined && providedRuns !== null) {
    return providedRuns;
  }
  const lowerText = text.toLowerCase();
  if (lowerText.includes('six')) return 6;
  if (lowerText.includes('four') || lowerText.includes('boundary')) return 4;
  if (lowerText.includes('no run')) return 0;
  if (lowerText.includes('1 run') || lowerText.includes('single')) return 1;
  if (lowerText.includes('2 runs') || lowerText.includes('couple')) return 2;
  if (lowerText.includes('3 runs')) return 3;
  return 0; // Default if unparseable and missing
}

async function run() {
  const inputPath = path.resolve(process.cwd(), '../lib/cricket-data/raw/apify-commentary.json');
  const outputPath = path.resolve(process.cwd(), '../lib/cricket-data/aggregated/enriched-commentary.json');
  
  // Ensure output directory exists
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  let rawData: ApifyCommentaryRow[] = [];
  try {
    if (fs.existsSync(inputPath)) {
      const fileData = fs.readFileSync(inputPath, 'utf8');
      rawData = JSON.parse(fileData);
      console.log(`Loaded ${rawData.length} raw commentary rows from Apify.`);
    } else {
      console.warn(`Input file not found at ${inputPath}. Creating dummy data to test the pipeline.`);
      // Mock data for testing if no input is present yet
      rawData = [
        {
          match_id: 'IPL2026_01', over: 14.2, innings: 2,
          text: 'Bumrah to Kohli, FOUR, searing yorker dug out wonderfully through mid-wicket for a boundary!'
        },
        {
          match_id: 'IPL2026_01', over: 14.3, innings: 2,
          text: 'Bumrah to Kohli, no run, short bouncer, ducked under.'
        },
        {
          match_id: 'IPL2026_01', over: 14.4, innings: 2,
          text: 'Bumrah to Kohli, SIX, slower delivery, picked early and lofted over long-on for a massive six!'
        }
      ];
    }
  } catch (err) {
    console.error('Error reading input JSON:', err);
    return;
  }

  const enrichedData: EnrichedDelivery[] = [];

  for (const row of rawData) {
    const rawText = row.text || row.commentary || row.title || '';
    
    // Fallbacks and safe parsing
    const overStr = String(row.over || '0.0').replace(/[^\d.]/g, '');
    const overNum = parseFloat(overStr) || 0;
    
    const delivery: EnrichedDelivery = {
      match_id: row.match_id || 'UNKNOWN_MATCH',
      over: overNum,
      innings: row.innings || 1,
      matchup_delivery: parseDeliveryType(rawText),
      scoring_area: parseScoringArea(rawText),
      runs: parseRuns(rawText, row.runs),
      raw_text: rawText
    };
    
    enrichedData.push(delivery);
  }

  fs.writeFileSync(outputPath, JSON.stringify(enrichedData, null, 2));
  console.log(`Successfully enriched ${enrichedData.length} deliveries.`);
  console.log(`Saved output to ${outputPath}`);
}

run().catch(console.error);
