import fs from "node:fs";
import path from "node:path";
import { Router, type IRouter } from "express";
import { z } from "zod";
import { requireAdmin } from "../lib/admin-auth";

// IPL 2027 desk: an append-only, server-timestamped log of admin updates — official announcements,
// retention decisions, verified purses and auction lots. Pulse, Feed and the retentions list all read it.
//
//   GET  /api/auction-2027          public; announcements, retentions, lots, team spend/purse, last update time
//   POST /api/auction-2027/updates  admin only (x-admin-token), body = one update below
//
// A later update for the same lot replaces the earlier one (corrections), but nothing is ever deleted,
// so the log is the audit trail. Example:
//   curl -X POST $API/api/auction-2027/updates -H "x-admin-token: $ADMIN_API_TOKEN" -H "content-type: application/json" \
//     -d '{"kind":"lot","lot":1,"player":"Player Name","role":"batter","basePriceLakhs":200,"status":"sold","team":"RCB","priceLakhs":1450,"sourceUrl":"https://..."}'

const TEAMS = ["CSK", "MI", "RCB", "KKR", "SRH", "RR", "DC", "PBKS", "GT", "LSG"] as const;
const lakhs = z.number().int().min(0).max(100_000);
const sourceUrl = z.string().url().max(500).refine(value => /^https?:\/\//i.test(value), {
  message: "sourceUrl must be an HTTP(S) source",
});

const updateSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("lot"),
    lot: z.number().int().min(1).max(2000),
    player: z.string().trim().min(1).max(80),
    role: z.string().trim().max(30).optional(),
    basePriceLakhs: lakhs.optional(),
    status: z.enum(["registered", "shortlisted", "pending", "on-block", "sold", "unsold", "withdrawn"]),
    team: z.enum(TEAMS).optional(),
    priceLakhs: lakhs.optional(),
    sourceUrl,
  }).strict(),
  // Verified purse available to a team when the auction opens.
  z.object({ kind: z.literal("purse"), team: z.enum(TEAMS), purseLakhs: lakhs, sourceUrl }).strict(),
  // Official news items (breaking strip / bulletin). A source is mandatory: nothing unsourced is published.
  z.object({
    kind: z.literal("announcement"),
    id: z.string().regex(/^[a-z0-9-]{3,60}$/), // re-post the same id to correct an item
    headline: z.string().trim().min(5).max(250),
    team: z.enum(TEAMS).optional(),
    verification: z.enum(["Official Announcement", "Credible Report", "Analyst Prediction", "Rumor", "confirmed", "reported"]),
    sourceUrl,
    publishedOn: z.string().optional(),
    eventDate: z.string().optional(),
    context: z.string().optional(),
  }).strict(),
  z.object({
    kind: z.literal("retention"),
    team: z.enum(TEAMS),
    player: z.string().trim().min(1).max(80),
    decision: z.enum(["retained", "released"]),
    priceLakhs: lakhs.optional(),
    sourceUrl,
  }).strict(),
]).superRefine((u, ctx) => {
  if (u.kind !== "lot") return;
  if (u.status === "sold" && (!u.team || u.priceLakhs == null || u.priceLakhs <= 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "sold lots need team and a positive priceLakhs" });
  }
  if (u.status === "sold" && u.priceLakhs != null && u.basePriceLakhs != null && u.priceLakhs < u.basePriceLakhs) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["priceLakhs"], message: "sale price cannot be below base price" });
  }
  if (u.status !== "sold" && u.status !== "on-block" && (u.team != null || u.priceLakhs != null)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "only sold or on-block lots may have a team or price" });
  }
});
type Update = z.infer<typeof updateSchema> & { recordedAt: string };

const logPath = () => process.env["AUCTION_LOG_PATH"] ?? path.resolve(process.cwd(), "data", "auction-2027-updates.json");

function readLog(): Update[] {
  try {
    return JSON.parse(fs.readFileSync(logPath(), "utf8")) as Update[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err; // a corrupt log must not be silently replaced by an empty one
  }
}

function appendLog(u: Update): void {
  const file = logPath();
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify([...readLog(), u], null, 1));
  fs.renameSync(tmp, file); // atomic swap, so a crash mid-write never truncates the log
}

export function summarise(log: Update[]) {
  const lots = new Map<number, Extract<Update, { kind: "lot" }>>();
  const purse = new Map<string, number>();
  const announcements = new Map<string, Extract<Update, { kind: "announcement" }> & { firstRecordedAt: string }>();
  const retentions = new Map<string, Extract<Update, { kind: "retention" }>>();
  for (const u of log) {
    if (u.kind === "lot") lots.set(u.lot, u);
    else if (u.kind === "purse") purse.set(u.team, u.purseLakhs);
    else if (u.kind === "announcement") announcements.set(u.id, { ...u, firstRecordedAt: announcements.get(u.id)?.firstRecordedAt ?? u.recordedAt });
    else retentions.set(`${u.team}|${u.player.toLowerCase()}`, u);
  }
  const current = [...lots.values()].sort((a, b) => a.lot - b.lot);
  const teams = TEAMS.map((team) => {
    const bought = current.filter((l) => l.status === "sold" && l.team === team);
    const spentLakhs = bought.reduce((s, l) => s + (l.priceLakhs ?? 0), 0);
    const startPurseLakhs = purse.get(team) ?? null;
    return {
      team,
      players: bought.length,
      spentLakhs,
      startPurseLakhs,
      remainingLakhs: startPurseLakhs == null ? null : startPurseLakhs - spentLakhs,
    };
  });
  return {
    updatedAt: log.at(-1)?.recordedAt ?? null,
    updates: log.length,
    // Newest first; firstRecordedAt is first publication, recordedAt the latest correction.
    announcements: [...announcements.values()].sort((a, b) => b.firstRecordedAt.localeCompare(a.firstRecordedAt)),
    retentions: [...retentions.values()].sort((a, b) => a.team.localeCompare(b.team) || a.player.localeCompare(b.player)),
    lots: current,
    teams,
  };
}

export function getAuctionDeskSnapshot() { return summarise(readLog()); }

const router: IRouter = Router();

router.get("/auction-2027", (_req, res) => {
  res.set("cache-control", "no-store").json(summarise(readLog()));
});

router.post("/auction-2027/updates", requireAdmin, (req, res) => {
  const parsed = updateSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) });
    return;
  }
  const update: Update = { ...parsed.data, recordedAt: new Date().toISOString() };
  appendLog(update);
  res.status(201).json(update);
});

export default router;
