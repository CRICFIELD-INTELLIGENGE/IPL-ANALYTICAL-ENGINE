import { Router } from "express";
import { auctionService } from "../services/auction";

const router = Router();

router.get("/state", (req, res) => {
  res.json(auctionService.getState());
});

router.post("/start", (req, res) => {
  auctionService.start();
  res.json({ status: "success" });
});

router.post("/select-team", (req, res) => {
  const { teamId } = req.body;
  auctionService.selectTeam(teamId);
  res.json(auctionService.getState());
});

router.post("/bid", (req, res) => {
  const { teamId, increment } = req.body;
  auctionService.placeBid(teamId, increment);
  res.json(auctionService.getState());
});

router.post("/pause", (req, res) => {
  auctionService.pause();
  res.json(auctionService.getState());
});

router.post("/resume", (req, res) => {
  auctionService.resume();
  res.json(auctionService.getState());
});

router.post("/chat", (req, res) => {
  const { user, team, msg } = req.body;
  auctionService.sendChatMessage(user, team, msg);
  res.json(auctionService.getState());
});

router.post("/create-room", (req, res) => {
  res.json(auctionService.createRoom());
});

router.post("/join-room", (req, res) => {
  const { code, teamId } = req.body;
  res.json(auctionService.joinRoom(code, teamId));
});

router.post("/set-speed", (req, res) => {
  const { speed } = req.body;
  auctionService.setAiSpeed(speed);
  res.json(auctionService.getState());
});

router.post("/reset", (req, res) => {
  auctionService.reset();
  res.json(auctionService.getState());
});

export default router;
