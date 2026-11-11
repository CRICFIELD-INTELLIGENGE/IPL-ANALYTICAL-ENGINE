// Franchise context for the article engine: warehouse ids (former names included), home venue
// patterns, first season, and the plain-language names the prose uses.

export interface Ctx {
  code: string;
  name: string; // current franchise name, e.g. "Chennai Super Kings"
  ids: number[];
  idsSql: string; // "(9)" / "(2,15)"
  homeLike: string[]; // venue name LIKE patterns
  homeLabel: string; // name the plan title uses for the home ground
  homeSql: string; // "(SELECT venue_id FROM venues WHERE …)"
  firstYear: number;
  rival: string; // the opponent the franchise has played most often (filled at run time)
}

const BASE: Omit<Ctx, "idsSql" | "homeSql" | "rival">[] = [
  { code: "CSK", name: "Chennai Super Kings", ids: [9], homeLike: ["%Chidambaram%"], homeLabel: "Chepauk", firstYear: 2008 },
  { code: "MI", name: "Mumbai Indians", ids: [4], homeLike: ["%Wankhede%"], homeLabel: "Wankhede", firstYear: 2008 },
  { code: "RCB", name: "Royal Challengers Bengaluru", ids: [2, 15], homeLike: ["%Chinnaswamy%"], homeLabel: "Chinnaswamy", firstYear: 2008 },
  { code: "KKR", name: "Kolkata Knight Riders", ids: [6], homeLike: ["%Eden Gardens%"], homeLabel: "Eden Gardens", firstYear: 2008 },
  { code: "SRH", name: "Sunrisers Hyderabad", ids: [1], homeLike: ["%Rajiv Gandhi%"], homeLabel: "Hyderabad", firstYear: 2013 },
  { code: "RR", name: "Rajasthan Royals", ids: [10], homeLike: ["%Sawai Mansingh%"], homeLabel: "Jaipur", firstYear: 2008 },
  { code: "DC", name: "Delhi Capitals", ids: [8, 11], homeLike: ["%Kotla%", "%Arun Jaitley%"], homeLabel: "Delhi", firstYear: 2008 },
  { code: "PBKS", name: "Punjab Kings", ids: [7, 12], homeLike: ["%Mohali%", "%IS Bindra%", "%Mullanpur%"], homeLabel: "Mohali", firstYear: 2008 },
  { code: "GT", name: "Gujarat Titans", ids: [14], homeLike: ["%Narendra Modi%", "%Motera%"], homeLabel: "Ahmedabad", firstYear: 2022 },
  { code: "LSG", name: "Lucknow Super Giants", ids: [13], homeLike: ["%Ekana%"], homeLabel: "Lucknow", firstYear: 2022 },
];

export const CONTEXTS: Ctx[] = BASE.map((b) => ({
  ...b,
  idsSql: `(${b.ids.join(",")})`,
  homeSql: `(SELECT venue_id FROM venues WHERE ${b.homeLike.map((p) => `name LIKE '${p}'`).join(" OR ")})`,
  rival: "",
}));

export const FRANCHISE_IDS: Record<string, number[]> = Object.fromEntries(BASE.map((b) => [b.code, b.ids]));
export const ctxFor = (code: string) => {
  const c = CONTEXTS.find((x) => x.code === code.toUpperCase());
  if (!c) throw new Error(`unknown franchise ${code}`);
  return c;
};
export const nameOf = (code: string) => ctxFor(code).name;
