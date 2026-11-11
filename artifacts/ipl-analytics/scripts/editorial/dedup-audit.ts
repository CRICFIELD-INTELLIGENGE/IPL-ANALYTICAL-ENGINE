// Read-only deduplication audit: pairs every legacy Dugout article with its closest v2 article by
// content (title, subtitle/dek, section headings), classifies the pair, and fact-checks the legacy
// article's phase table against the warehouse. Writes docs/editorial/DEDUP-AUDIT.json. Changes nothing.
//
//   pnpm exec tsx --no-warnings scripts/editorial/dedup-audit.ts
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { EDITORIAL_ARTICLES } from "../../src/data/editorial-magazine-data";
import { APP, LEGAL, REGULATION, openDb } from "./evidence/lib";
import { FRANCHISE_IDS } from "./engine/context";

// Reviewed pairings (CSK read in full). These override the automatic match and calibrate it.
export const REVIEWED: Record<string, { planId: string; verdict: "duplicate" | "partial-overlap" | "distinct"; why: string }> = {
  "art-csk-01": { planId: "cf-csk-040", verdict: "partial-overlap", why: "Both argue that continuity is CSK's edge; the legacy piece adds role clarity and culture, the new piece measures season-to-season continuity." },
  "art-csk-02": { planId: "cf-csk-004", verdict: "duplicate", why: "Same question: how CSK bat through overs 7–15." },
  "art-csk-03": { planId: "cf-csk-019", verdict: "partial-overlap", why: "Legacy surveys bowler combinations by name; new piece tests rotation and match-ups with data. Pace/spin roles also overlap cf-csk-011, 014, 015." },
  "art-csk-04": { planId: "cf-csk-030", verdict: "partial-overlap", why: "Both on captaincy decisions; legacy is about Dhoni personally, new piece covers franchise-level decisions and declines to compare Dhoni's combined-franchise record." },
  "art-csk-05": { planId: "cf-csk-022", verdict: "duplicate", why: "Same subject: what makes Chepauk different for CSK." },
  "art-csk-06": { planId: "cf-csk-074", verdict: "partial-overlap", why: "Legacy argues veterans are undervalued at auction; new piece measures performance by age. Value side overlaps cf-csk-039." },
  "art-csk-07": { planId: "cf-csk-027", verdict: "partial-overlap", why: "Both ask whether to change the XI per match; legacy by conditions and venue, new piece by opponent." },
  "art-csk-08": { planId: "cf-csk-067", verdict: "partial-overlap", why: "Both trace how CSK's squad evolved; legacy is a narrative of eras, new piece measures squad size and usage. Leadership side overlaps cf-csk-064." },
  "art-csk-09": { planId: "cf-csk-014", verdict: "duplicate", why: "Same thesis: CSK build pressure with dot balls rather than wickets." },
  "art-csk-10": { planId: "cf-csk-091", verdict: "duplicate", why: "Same question: what CSK should build for the next cycle." },
};

// Topic-level review of the other franchises (title, subtitle and section headings read against the
// 100 plan slots). Format: legacy suffix → slot number, d = duplicate, p = partial overlap, x = distinct.
const TOPIC_REVIEW = `
srh-01:062:p srh-02:001:d srh-03:025:p srh-04:010:p srh-05:022:d srh-06:039:p srh-07:020:d srh-08:067:p srh-09:003:p srh-10:091:d
mi-01:079:p mi-02:005:p mi-03:037:p mi-04:085:p mi-05:022:d mi-06:033:p mi-07:020:p mi-08:063:p mi-09:004:d mi-10:091:d
kkr-01:064:p kkr-02:001:d kkr-03:014:p kkr-04:039:x kkr-05:022:d kkr-06:032:p kkr-07:024:d kkr-08:064:p kkr-09:081:p kkr-10:091:d
rr-01:092:p rr-02:074:p rr-03:013:d rr-04:080:p rr-05:022:d rr-06:035:d rr-07:034:d rr-08:062:p rr-09:080:d rr-10:072:p
dc-01:069:p dc-02:004:d dc-03:013:d dc-04:085:p dc-05:022:d dc-06:038:p dc-07:100:p dc-08:067:p dc-09:088:d dc-10:091:d
pbks-01:029:p pbks-02:001:d pbks-03:015:d pbks-04:006:d pbks-05:065:p pbks-06:032:d pbks-07:100:p pbks-08:067:p pbks-09:026:p pbks-10:091:d
gt-01:061:d gt-02:002:p gt-03:089:p gt-04:056:p gt-05:022:d gt-06:031:p gt-07:100:p gt-08:062:p gt-09:068:d gt-10:091:d
lsg-01:061:p lsg-02:002:p lsg-03:014:d lsg-04:005:d lsg-05:022:d lsg-06:039:d lsg-07:100:p lsg-08:062:p lsg-09:009:d lsg-10:091:d`;
const VERDICT = { d: "duplicate", p: "partial-overlap", x: "distinct" } as const;
for (const tok of TOPIC_REVIEW.trim().split(/\s+/)) {
  const [suffix, slot, v] = tok.split(":");
  const fr = suffix.split("-")[0];
  REVIEWED[`art-${suffix}`] = { planId: `cf-${fr}-${slot}`, verdict: VERDICT[v as keyof typeof VERDICT], why: "Topic-level review (title, subtitle, section headings); confirm by reading both before acting." };
}
// RCB: already decided in legacy-decisions.json (reviewed). Revisions are treated as duplicates of their plan slot.
for (const d of (JSON.parse(readFileSync(resolve(import.meta.dirname, "../../src/data/editorial/plan/legacy-decisions.json"), "utf8")) as { decisions: { legacyId: string; planId?: string; decision: string; note?: string }[] }).decisions)
  if (d.legacyId.startsWith("art-rcb-")) REVIEWED[d.legacyId] = { planId: d.planId ?? "", verdict: d.decision === "revise" ? "duplicate" : "distinct", why: `Existing reviewed decision: ${d.decision}. ${d.note ?? ""}`.trim() };

const STOP = new Set("a an and are as at be by can could do does for from has have how in is it its of on or should than that the their there this to vs versus what when where which who why will with without more most beyond into through new next".split(" "));
const tokens = (s: string, team: string[]) => {
  let t = s.toLowerCase().replace(/[’'`]/g, "'").replace(/'s\b/g, "");
  for (const n of team) t = t.split(n.toLowerCase()).join(" ");
  return new Set(t.split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w)).map((w) => w.replace(/(ing|ers|er|es|s)$/, "")));
};
const jaccard = (a: Set<string>, b: Set<string>) => { let i = 0; for (const x of a) if (b.has(x)) i++; return i / Math.max(1, a.size + b.size - i); };
const overlap = (a: Set<string>, b: Set<string>) => { let i = 0; for (const x of a) if (b.has(x)) i++; return i / Math.max(1, Math.min(a.size, b.size)); };

const db = openDb();
const rate = (o1: number, o2: number, ids?: number[]) => {
  const f = ids ? `AND i.batting_team_id IN (${ids.join(",")})` : "";
  const r = db.prepare(`SELECT SUM(d.total_runs) * 6.0 / SUM(CASE WHEN ${LEGAL} THEN 1 ELSE 0 END) rr FROM deliveries d JOIN innings i ON i.innings_id = d.innings_id WHERE ${REGULATION} AND d.over_num BETWEEN ? AND ? ${f}`).get(o1, o2) as { rr: number };
  return r.rr;
};
const PHASES: Record<string, [number, number]> = { Powerplay: [0, 5], Middle: [6, 14], Death: [15, 19] };

const out = [];
for (const legacy of EDITORIAL_ARTICLES) {
  const fr = legacy.teamCode.toUpperCase();
  const team = [legacy.franchiseName, fr, "Royal Challengers Bangalore", "Delhi Daredevils", "Kings XI Punjab"];
  const lt = tokens([legacy.title, legacy.subtitle, ...legacy.contentSections.map((s) => s.heading)].join(" "), team);
  const ltTitle = tokens(legacy.title + " " + legacy.subtitle, team);
  const dir = resolve(APP, "src/data/editorial/articles", fr.toLowerCase());
  const scored = readdirSync(dir).map((f) => {
    const v = JSON.parse(readFileSync(resolve(dir, f), "utf8"));
    const vt = tokens([v.title, v.dek, ...v.sections.map((s: { heading: string }) => s.heading)].join(" "), team);
    const score = 0.6 * overlap(ltTitle, tokens(v.title + " " + v.dek, team)) + 0.4 * jaccard(lt, vt);
    return { planId: v.id as string, title: v.title as string, words: JSON.stringify(v.sections).split(/\s+/).length, generator: v.generator as string | undefined, score: Math.round(score * 1000) / 1000 };
  }).sort((a, b) => b.score - a.score);
  const reviewed = REVIEWED[legacy.id];
  const best = (reviewed && scored.find((s) => s.planId === reviewed.planId)) || scored[0];
  const auto = best.score >= 0.33 ? "duplicate" : best.score >= 0.17 ? "partial-overlap" : "distinct";

  // Fact-check the legacy phase table (team run rates) against the warehouse.
  const checks: { phase: string; claimedTeam: number; actualTeam: number; claimedLeague: number; actualLeague: number }[] = [];
  for (const s of legacy.contentSections) for (const row of s.table?.rows ?? []) {
    const ph = Object.keys(PHASES).find((p) => String(row[0]).startsWith(p));
    const t = parseFloat(String(row[1])), l = parseFloat(String(row[2]));
    if (ph && Number.isFinite(t) && Number.isFinite(l)) {
      const [o1, o2] = PHASES[ph];
      checks.push({ phase: ph, claimedTeam: t, actualTeam: Math.round(rate(o1, o2, FRANCHISE_IDS[fr]) * 100) / 100, claimedLeague: l, actualLeague: Math.round(rate(o1, o2) * 100) / 100 });
    }
  }
  const legacyWords = [legacy.excerpt, ...legacy.contentSections.flatMap((s) => s.body)].join(" ").split(/\s+/).length;
  out.push({
    franchise: fr, legacyId: legacy.id, legacySlug: legacy.slug, legacyTitle: legacy.title, legacyWords, legacyConfidenceLabel: legacy.dataConfidenceStatus,
    match: best, runnersUp: scored.filter((s) => s.planId !== best.planId).slice(0, 2),
    verdict: reviewed?.verdict ?? auto, verdictSource: !reviewed ? "automatic — needs review" : fr === "CSK" ? "reviewed (full read)" : fr === "RCB" ? "existing reviewed decision" : "reviewed (topic level)", why: reviewed?.why ?? "",
    tableCheck: checks, tableMisstated: checks.some((c) => Math.abs(c.claimedTeam - c.actualTeam) > 0.5),
  });
}

// Calibration: how often the automatic match agrees with the reviewed CSK pairings.
const csk = out.filter((o) => REVIEWED[o.legacyId]);
const autoTop = (id: string) => { const o = out.find((x) => x.legacyId === id)!; return [o.match, ...o.runnersUp].sort((a, b) => b.score - a.score)[0].planId; };
const agree = csk.filter((o) => autoTop(o.legacyId) === REVIEWED[o.legacyId].planId).length;
const findingTemplates = new Set(EDITORIAL_ARTICLES.map((x) => x.keyFindings.map((f) => f.replace(/[\d.+%]+/g, "#").replace(x.franchiseName, "X").replace(x.parameter.toLowerCase(), "P")).join("|"))).size;

const summary = {
  generatedAt: new Date().toISOString(),
  legacyArticles: out.length,
  verdicts: out.reduce<Record<string, number>>((c, o) => ((c[o.verdict] = (c[o.verdict] ?? 0) + 1), c), {}),
  calibration: { reviewed: csk.length, automaticTopMatchAgrees: agree },
  legacyTablesChecked: out.filter((o) => o.tableCheck.length).length,
  legacyTablesMisstated: out.filter((o) => o.tableMisstated).length,
  distinctKeyFindingTemplates: findingTemplates,
  legacyLabelledVerified: out.filter((o) => o.legacyConfidenceLabel === "Verified").length,
};
writeFileSync(resolve(APP, "../../docs/editorial/DEDUP-AUDIT.json"), JSON.stringify({ summary, pairs: out }, null, 1) + "\n");
console.log(JSON.stringify(summary, null, 1));
for (const o of out.filter((x) => x.franchise === "CSK")) console.log(o.legacyId, o.verdict, o.match.planId, o.match.score, "| auto top:", autoTop(o.legacyId), "| table misstated:", o.tableMisstated);
