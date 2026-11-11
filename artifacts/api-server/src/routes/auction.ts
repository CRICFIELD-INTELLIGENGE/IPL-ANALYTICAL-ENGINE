import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { auctionService } from "../services/auction";

const router = Router();

// Day 7: every body is validated. Before, a missing room code crashed the handler (500 with a stack trace), a
// negative bid increment LOWERED the live bid, any value was stored as the AI speed, and chat took any type/size.
// The auction itself is still one shared, in-memory game for all visitors (DAY-07-REPORT.md §4).
const teamId = z.coerce.number().int().min(1).max(20);
const schemas = {
  selectTeam: z.object({ teamId }),
  bid: z.object({ teamId, increment: z.coerce.number().int().positive().max(2500).optional() }), // lakhs; max ₹25 Cr per raise
  chat: z.object({ user: z.string().trim().min(1).max(40), team: z.string().trim().max(40).default(""), msg: z.string().trim().min(1).max(280) }),
  joinRoom: z.object({ code: z.string().trim().regex(/^IPL-\d{4}$/i), teamId: teamId.optional() }),
  setSpeed: z.object({ speed: z.coerce.number().int().min(1).max(3) }),
};

function parse<T extends z.ZodTypeAny>(schema: T, req: Request, res: Response): z.infer<T> | null {
  const r = schema.safeParse(req.body ?? {});
  if (!r.success) {
    res.status(400).json({ error: "invalid_request", issues: r.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) });
    return null;
  }
  return r.data;
}

router.get("/state", (_req, res) => {
  res.json(auctionService.getState());
});

router.post("/start", (_req, res) => {
  auctionService.start();
  res.json({ status: "success" });
});

router.post("/select-team", (req, res) => {
  const b = parse(schemas.selectTeam, req, res);
  if (!b) return;
  auctionService.selectTeam(b.teamId);
  res.json(auctionService.getState());
});

router.post("/bid", (req, res) => {
  const b = parse(schemas.bid, req, res);
  if (!b) return;
  auctionService.placeBid(b.teamId, b.increment);
  res.json(auctionService.getState());
});

router.post("/pause", (_req, res) => {
  auctionService.pause();
  res.json(auctionService.getState());
});

router.post("/resume", (_req, res) => {
  auctionService.resume();
  res.json(auctionService.getState());
});

router.post("/chat", (req, res) => {
  const b = parse(schemas.chat, req, res);
  if (!b) return;
  auctionService.sendChatMessage(b.user, b.team, b.msg);
  res.json(auctionService.getState());
});

router.post("/create-room", (_req, res) => {
  res.json(auctionService.createRoom());
});

router.post("/join-room", (req, res) => {
  const b = parse(schemas.joinRoom, req, res);
  if (!b) return;
  res.json(auctionService.joinRoom(b.code, b.teamId));
});

router.post("/set-speed", (req, res) => {
  const b = parse(schemas.setSpeed, req, res);
  if (!b) return;
  auctionService.setAiSpeed(b.speed);
  res.json(auctionService.getState());
});

router.post("/reset", (_req, res) => {
  auctionService.reset();
  res.json(auctionService.getState());
});

export default router;
