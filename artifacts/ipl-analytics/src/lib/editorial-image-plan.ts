// Editorial Dugout photography — per-section image plans.
//
// Reads the full article (every segment heading and paragraph, the match
// dossier and the key figure) and works out what a photo beside each segment
// would have to show: which players, which franchise kit, which season, which
// venue. It produces a specific Getty search for an editor to run by hand.
// It never picks an image itself and never invents asset ids.

import type { EditorialArticle } from "@/data/editorial-magazine-data";
import { EDITORIAL_ARTICLES } from "@/data/editorial-magazine-data";
import type { EditorialSectionId } from "@/data/editorial-images/types";

export type SlotRole =
  | "hero-central-story"
  | "historical-context"
  | "key-player-or-tactic"
  | "turning-point"
  | "contrast-or-opposition"
  | "closing-identity";

export interface ImageSlotPlan {
  sectionId: EditorialSectionId;
  sectionHeading: string;
  role: SlotRole;
  roleBrief: string;
  players: string[];
  opponents: string[];
  seasons: string[];
  venue?: string;
  /** Sentences from the segment that justify the image choice. */
  evidence: string[];
  query: string;
  gettySearchUrl: string;
  /** "recommended" when the segment names a player or season; "optional" otherwise. */
  priority: "recommended" | "optional";
  /** Things the reviewer must check against the Getty caption. */
  mustVerify: string[];
  warnings: string[];
}

export interface ArticleImagePlan {
  articleId: string;
  slug: string;
  title: string;
  teamCode: string;
  franchiseName: string;
  venue?: string;
  keyFigure?: string;
  players: string[];
  seasons: string[];
  slots: ImageSlotPlan[];
}

// Names that appear in the Dugout articles, with the distinctive short forms the
// copy uses. Ambiguous surnames (Head, Green, David, Iyer, Sharma, Singh …) are
// deliberately not aliases: "Head" alone matches ordinary English.
const PLAYER_ALIASES: Record<string, string[]> = {
  "Pat Cummins": ["Cummins"],
  "Travis Head": [],
  "Abhishek Sharma": ["Abhishek"],
  "Heinrich Klaasen": ["Klaasen"],
  "Bhuvneshwar Kumar": ["Bhuvneshwar", "Bhuvi"],
  "T Natarajan": ["Natarajan"],
  "Nitish Kumar Reddy": ["Nitish Reddy"],
  "David Warner": ["Warner"],
  "Kane Williamson": ["Williamson"],
  "Virat Kohli": ["Kohli"],
  "Faf du Plessis": ["du Plessis", "Faf"],
  "Rajat Patidar": ["Patidar"],
  "Glenn Maxwell": ["Maxwell"],
  "Yash Dayal": ["Dayal"],
  "Mohammed Siraj": ["Siraj"],
  "Cameron Green": [],
  "Chris Gayle": ["Gayle"],
  "AB de Villiers": ["de Villiers"],
  "MS Dhoni": ["Dhoni"],
  "Ruturaj Gaikwad": ["Gaikwad", "Ruturaj"],
  "Ravindra Jadeja": ["Jadeja"],
  "Shivam Dube": ["Dube"],
  "Matheesha Pathirana": ["Pathirana"],
  "Deepak Chahar": [],
  "Ajinkya Rahane": ["Rahane"],
  "Rohit Sharma": [],
  "Jasprit Bumrah": ["Bumrah"],
  "Suryakumar Yadav": ["Suryakumar"],
  "Hardik Pandya": [],
  "Tilak Varma": ["Tilak"],
  "Tim David": [],
  "Ishan Kishan": ["Kishan"],
  "Shreyas Iyer": [],
  "Sunil Narine": ["Narine"],
  "Andre Russell": ["Russell"],
  "Mitchell Starc": ["Starc"],
  "Varun Chakravarthy": ["Chakravarthy"],
  "Rinku Singh": ["Rinku"],
  "Venkatesh Iyer": [],
  "Gautam Gambhir": ["Gambhir"],
  "Sanju Samson": ["Samson"],
  "Yashasvi Jaiswal": ["Jaiswal"],
  "Jos Buttler": ["Buttler"],
  "Riyan Parag": ["Parag"],
  "Yuzvendra Chahal": [],
  "Trent Boult": ["Boult"],
  "Ravichandran Ashwin": ["Ashwin"],
  "Rishabh Pant": ["Pant"],
  "Axar Patel": ["Axar"],
  "Kuldeep Yadav": ["Kuldeep"],
  "Tristan Stubbs": ["Stubbs"],
  "Jake Fraser-McGurk": ["Fraser-McGurk"],
  "Khaleel Ahmed": ["Khaleel"],
  "Mukesh Kumar": [],
  "Shashank Singh": [],
  "Ashutosh Sharma": ["Ashutosh"],
  "Sam Curran": [],
  "Arshdeep Singh": ["Arshdeep"],
  "Harshal Patel": ["Harshal"],
  "Liam Livingstone": ["Livingstone"],
  "Kagiso Rabada": ["Rabada"],
  "Shubman Gill": [],
  "Rashid Khan": ["Rashid"],
  "Sai Sudharsan": ["Sudharsan"],
  "David Miller": [],
  "Rahul Tewatia": ["Tewatia"],
  "Mohammed Shami": ["Shami"],
  "Mohit Sharma": [],
  "KL Rahul": [],
  "Nicholas Pooran": ["Pooran"],
  "Marcus Stoinis": ["Stoinis"],
  "Mayank Yadav": [],
  "Ravi Bishnoi": ["Bishnoi"],
  "Krunal Pandya": [],
  "Ayush Badoni": ["Badoni"],
};

const TEAM_NAMES: Record<string, string> = {
  SRH: "Sunrisers Hyderabad",
  RCB: "Royal Challengers Bengaluru",
  CSK: "Chennai Super Kings",
  MI: "Mumbai Indians",
  KKR: "Kolkata Knight Riders",
  RR: "Rajasthan Royals",
  DC: "Delhi Capitals",
  PBKS: "Punjab Kings",
  GT: "Gujarat Titans",
  LSG: "Lucknow Super Giants",
};

const ROLE_FOR: Record<EditorialSectionId, { role: SlotRole; brief: string }> = {
  hero: { role: "hero-central-story", brief: "One strong photograph of the article's central story." },
  s1: { role: "historical-context", brief: "Historical or contextual image for the opening argument." },
  s2: { role: "key-player-or-tactic", brief: "The key player or tactical moment the segment analyses." },
  s3: { role: "turning-point", brief: "The match or moment the segment calls decisive." },
  s4: { role: "contrast-or-opposition", brief: "Contrast: opposition response, rival franchise or wider-league context." },
  s5: { role: "closing-identity", brief: "Closing photograph representing the article's conclusion." },
};

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const PLAYER_MATCHERS = Object.entries(PLAYER_ALIASES).map(([name, aliases]) => ({
  name,
  re: new RegExp(`\\b(${[name, ...aliases].map(escapeRe).join("|")})\\b`),
}));

function playersIn(text: string): string[] {
  return PLAYER_MATCHERS.filter((p) => p.re.test(text)).map((p) => p.name);
}

const FORWARD_LOOKING = /\b(prepares?|preparing|ahead|next|future|upcoming|will|must|should|cycle|roadmap)\b/i;

/** Seasons the text refers to as played. Sentences looking ahead ("as the franchise prepares for 2025") are ignored. */
function seasonsIn(text: string): string[] {
  const cleaned = text
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => !FORWARD_LOOKING.test(sentence))
    .join(" ");
  const years = cleaned.match(/\b20(0[8-9]|1\d|2[0-5])\b/g) ?? [];
  return [...new Set(years)].sort();
}

function opponentsIn(text: string, own: string): string[] {
  return Object.entries(TEAM_NAMES)
    .filter(([code, name]) => code !== own && (text.includes(name) || new RegExp(`\\b${code}\\b`).test(text)))
    .map(([, name]) => name);
}

function sentencesNaming(text: string, needles: string[], max = 2): string[] {
  if (!needles.length) return [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  return sentences.filter((s) => needles.some((n) => s.includes(n.split(" ").slice(-1)[0]))).slice(0, max);
}

export function gettySearchUrl(query: string): string {
  return `https://www.gettyimages.com/search/2/image?family=editorial&phrase=${encodeURIComponent(query)}`;
}

function shortVenue(venue?: string): string | undefined {
  return venue?.split(",")[0]?.replace(/\s*\/.*$/, "").trim() || undefined;
}

export function planArticleImages(article: EditorialArticle): ArticleImagePlan {
  const franchise = TEAM_NAMES[article.teamCode] ?? article.franchiseName;
  const venue = article.sidebarModules?.matchDossier?.venue;
  const keyFigure = article.sidebarModules?.keyFigure?.name;
  const allText = [
    article.title,
    article.subtitle,
    ...article.chapters.flatMap((c) => [c.heading, ...c.body, c.quote ?? ""]),
  ].join(" ");
  const articlePlayers = playersIn(allText);
  const articleSeasons = seasonsIn(
    [allText, article.sidebarModules?.keyFigure?.summary ?? "", article.methodologyNote].join(" "),
  );
  const isVenueStory = /venue|stadium|ground|chinnaswamy|wankhede|chepauk|eden|uppal|kotla|ekana|ahmedabad|jaipur|home/i.test(
    `${article.parameter} ${article.title}`,
  );

  const slotFor = (sectionId: EditorialSectionId, heading: string, text: string): ImageSlotPlan => {
    const { role, brief } = ROLE_FOR[sectionId];
    const sectionPlayers = playersIn(`${heading} ${text}`);
    const sectionSeasons = seasonsIn(`${heading} ${text}`);
    const players =
      sectionId === "hero"
        ? [...new Set([...playersIn(article.title + " " + article.subtitle), ...(keyFigure ? [keyFigure] : [])])].slice(0, 2)
        : sectionPlayers.slice(0, 2);
    const seasons = sectionSeasons.length ? sectionSeasons : sectionId === "hero" ? articleSeasons.slice(-1) : [];
    const opponents = opponentsIn(`${heading} ${text}`, article.teamCode);
    const useVenue = isVenueStory || /venue|stadium|ground|home|pitch|boundar/i.test(heading);

    const queryParts = [
      ...players,
      franchise,
      ...(role === "contrast-or-opposition" && opponents[0] ? [opponents[0]] : []),
      ...(useVenue && shortVenue(venue) ? [shortVenue(venue)!] : []),
      "IPL",
      ...(seasons.length ? [seasons[seasons.length - 1]] : []),
    ];
    const query = queryParts.join(" ");

    const mustVerify = [
      `Kit is ${franchise}${seasons.length ? ` in ${seasons.join("/")}` : ""} (not another franchise or a national side).`,
      ...players.map((p) => `${p} is identified by name in the Getty caption.`),
      ...(useVenue && venue ? [`Caption places the photo at ${venue}.`] : []),
      "Photo date falls in an IPL season the segment discusses.",
    ];

    const warnings: string[] = [];
    if (!players.length) warnings.push("Segment names no player — use a team or venue image, or leave the slot empty.");
    if (!seasons.length) warnings.push("Segment names no season — confirm the season from context before approving.");
    const published = Number(article.publishedDate.match(/20\d\d/)?.[0] ?? 0);
    if (seasons.some((y) => Number(y) > published))
      warnings.push(`Segment looks ahead to ${seasons.join("/")} from a ${published} article; a photo from that season fits only if the pictured player was in that squad.`);
    if (sectionId !== "hero" && !/\b(match|final|against|vs|chase|fixture|over)\b/i.test(text))
      warnings.push("Segment is analytical and names no specific match; avoid implying a match it does not describe.");
    if (article.sidebarModules?.matchDossier?.matchTitle?.includes("Key Rival"))
      warnings.push('Match dossier is generic ("Key Rival"); do not caption the photo as that fixture.');

    return {
      sectionId,
      sectionHeading: heading,
      role,
      roleBrief: brief,
      players,
      opponents,
      seasons,
      venue: useVenue ? venue : undefined,
      evidence: sentencesNaming(text, players).length ? sentencesNaming(text, players) : [text.split(/(?<=[.!?])\s+/)[0]],
      query,
      gettySearchUrl: gettySearchUrl(query),
      priority: sectionId === "hero" || players.length > 0 ? "recommended" : "optional",
      mustVerify,
      warnings,
    };
  };

  const slots: ImageSlotPlan[] = [
    slotFor("hero", article.title, `${article.subtitle} ${article.sidebarModules?.keyFigure?.summary ?? ""}`),
    ...article.chapters.slice(0, 5).map((c, i) =>
      slotFor(`s${i + 1}` as EditorialSectionId, c.heading, [...c.body, c.quote ?? ""].join(" ")),
    ),
  ];

  return {
    articleId: article.id,
    slug: article.slug,
    title: article.title,
    teamCode: article.teamCode,
    franchiseName: franchise,
    venue,
    keyFigure,
    players: articlePlayers,
    seasons: articleSeasons,
    slots,
  };
}

export function planAllArticles(articles: EditorialArticle[] = EDITORIAL_ARTICLES): ArticleImagePlan[] {
  return articles.map(planArticleImages);
}
