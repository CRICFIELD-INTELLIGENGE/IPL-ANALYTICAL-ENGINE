// IPL 2027 auction tracker: admin gating, validation, corrections and purse maths.
// Writes only to a temp log file (AUCTION_LOG_PATH), never to data/.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express from "express";
import auctionRouter from "../src/routes/auction-2027";

const TOKEN = "test-admin-token-0123456789abcdef";
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), "auction-2027-"));
process.env["AUCTION_LOG_PATH"] = path.join(DIR, "log.json");

let server: Server;
let base = "";

before(async () => {
  const app = express();
  app.use(express.json());
  app.use("/api", auctionRouter);
  server = app.listen(0);
  await new Promise<void>((r) => server.once("listening", () => r()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => {
  delete process.env["ADMIN_API_TOKEN"];
  server?.close();
  fs.rmSync(DIR, { recursive: true, force: true });
});

const post = (body: unknown, token?: string) =>
  fetch(`${base}/api/auction-2027/updates`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { "x-admin-token": token } : {}) },
    body: JSON.stringify(body),
  });

test("updates are hidden without a token and refused with the wrong one", async () => {
  delete process.env["ADMIN_API_TOKEN"];
  assert.equal((await post({ kind: "purse", team: "RCB", purseLakhs: 5000 }, TOKEN)).status, 404);
  process.env["ADMIN_API_TOKEN"] = TOKEN;
  assert.equal((await post({ kind: "purse", team: "RCB", purseLakhs: 5000 }, "wrong-token-wrong-token-xx")).status, 401);
});

test("invalid updates are rejected", async () => {
  process.env["ADMIN_API_TOKEN"] = TOKEN;
  assert.equal((await post({ kind: "lot", lot: 1, player: "A", status: "sold" }, TOKEN)).status, 400); // no team/price
  assert.equal((await post({ kind: "purse", team: "XYZ", purseLakhs: 1 }, TOKEN)).status, 400);
});

test("log folds into current lots, corrections win, purse is tracked", async () => {
  process.env["ADMIN_API_TOKEN"] = TOKEN;
  const sourceUrl = "https://example.org/auction";
  assert.equal((await post({ kind: "purse", team: "RCB", purseLakhs: 5000, sourceUrl }, TOKEN)).status, 201);
  assert.equal((await post({ kind: "lot", lot: 1, player: "A", status: "sold", team: "RCB", priceLakhs: 900, sourceUrl }, TOKEN)).status, 201);
  assert.equal((await post({ kind: "lot", lot: 1, player: "A", status: "sold", team: "RCB", priceLakhs: 1000, sourceUrl }, TOKEN)).status, 201); // correction
  assert.equal((await post({ kind: "lot", lot: 2, player: "B", status: "unsold", sourceUrl }, TOKEN)).status, 201);

  const s = await (await fetch(`${base}/api/auction-2027`)).json();
  assert.equal(s.updates, 4);
  assert.equal(s.lots.length, 2);
  assert.ok(s.updatedAt);
  const rcb = s.teams.find((t: { team: string }) => t.team === "RCB");
  assert.deepEqual(rcb, { team: "RCB", players: 1, spentLakhs: 1000, startPurseLakhs: 5000, remainingLakhs: 4000 });
  assert.equal(s.teams.find((t: { team: string }) => t.team === "MI").remainingLakhs, null);
});

test("unsourced and contradictory updates are rejected without changing the log", async () => {
  process.env["ADMIN_API_TOKEN"] = TOKEN;
  const before = fs.readFileSync(process.env["AUCTION_LOG_PATH"]!, "utf8");
  const lot = { kind: "lot", lot: 3, player: "C", status: "sold", team: "MI", priceLakhs: 100, sourceUrl: "https://example.org/auction" };
  const { sourceUrl: _source, ...unsourced } = lot;
  for (const invalid of [
    unsourced,
    { kind: "purse", team: "MI", purseLakhs: 5000 },
    { ...lot, sourceUrl: "ftp://example.org/auction" },
    { ...lot, priceLakhs: 0 },
    { ...lot, basePriceLakhs: 200 },
    ...["unsold", "withdrawn", "pending", "registered", "shortlisted"].map(status => ({ ...lot, status })),
  ]) assert.equal((await post(invalid, TOKEN)).status, 400);
  assert.equal(fs.readFileSync(process.env["AUCTION_LOG_PATH"]!, "utf8"), before);
});

test("announcements and retentions need a source; corrections keep first publication time", async () => {
  process.env["ADMIN_API_TOKEN"] = TOKEN;
  const src = "https://example.org/official";
  assert.equal((await post({ kind: "retention", team: "MI", player: "X", decision: "retained" }, TOKEN)).status, 400);
  assert.equal((await post({ kind: "announcement", id: "a-1", headline: "Unsourced item", verification: "confirmed" }, TOKEN)).status, 400);

  await post({ kind: "announcement", id: "a-1", headline: "First version", verification: "reported", sourceUrl: src }, TOKEN);
  await post({ kind: "announcement", id: "a-1", headline: "Corrected version", verification: "confirmed", sourceUrl: src }, TOKEN);
  await post({ kind: "retention", team: "MI", player: "X", decision: "retained", sourceUrl: src }, TOKEN);
  await post({ kind: "retention", team: "MI", player: "x", decision: "released", sourceUrl: src }, TOKEN); // correction, case-insensitive

  const s = await (await fetch(`${base}/api/auction-2027`)).json();
  assert.equal(s.announcements.length, 1);
  assert.equal(s.announcements[0].headline, "Corrected version");
  assert.ok(s.announcements[0].firstRecordedAt < s.announcements[0].recordedAt);
  assert.deepEqual(s.retentions.map((r: { decision: string }) => r.decision), ["released"]);
});
