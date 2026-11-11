// Day 10 — CricField Video Intelligence & Entity Resolution Tests
//
//   pnpm --filter @workspace/api-server test

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isSafeVideoUrl,
  normalizeTeamCode,
  resolveMatchForVideo,
  searchVideoCatalogue,
  getVideosForMatch,
  getVideosForPlayer,
  getVideoStatsSummary,
} from "../src/services/video/video-intelligence-service";

test("URL Safety Validation: accepts authorized HTTPS streaming domains only", () => {
  assert.equal(isSafeVideoUrl("https://www.hotstar.com/in/sports/cricket/match/123"), true);
  assert.equal(isSafeVideoUrl("https://youtube.com/watch?v=xyz"), true);
  assert.equal(isSafeVideoUrl("https://youtu.be/xyz"), true);
  assert.equal(isSafeVideoUrl("https://www.iplt20.com/video/456"), true);
  assert.equal(isSafeVideoUrl("https://www.bcci.tv/videos/789"), true);

  // Insecure or unauthorized domains must be blocked
  assert.equal(isSafeVideoUrl("http://www.hotstar.com/in/sports"), false, "Must require HTTPS");
  assert.equal(isSafeVideoUrl("https://pirate-cricket-streams.xyz/video"), false, "Must block unknown domain");
  assert.equal(isSafeVideoUrl("javascript:alert(1)"), false, "Must reject script URI");
  assert.equal(isSafeVideoUrl("not a url"), false, "Must reject malformed URL");
});

test("Team Code Normalization: resolves legacy and written franchise names to canonical codes", () => {
  assert.equal(normalizeTeamCode("Royal Challengers Bangalore"), "RCB");
  assert.equal(normalizeTeamCode("Royal Challengers Bengaluru"), "RCB");
  assert.equal(normalizeTeamCode("rcb"), "RCB");
  assert.equal(normalizeTeamCode("Chennai Super Kings"), "CSK");
  assert.equal(normalizeTeamCode("Mumbai Indians"), "MI");
  assert.equal(normalizeTeamCode("Kolkata Knight Riders"), "KKR");
  assert.equal(normalizeTeamCode("Gujarat Titans"), "GT");
  assert.equal(normalizeTeamCode("Punjab Kings"), "PBKS");
  assert.equal(normalizeTeamCode("Kings XI Punjab"), "PBKS");
  assert.equal(normalizeTeamCode("Sunrisers Hyderabad"), "SRH");
});

test("Cricket Entity Resolution: matches Grand Final video to exact match ID with high confidence", () => {
  const mockMatches = [
    { matchId: "1535465", competition: "ipl", season: "2026", date: "2026-05-31", stage: "Final", team1: "GT", team2: "RCB" },
    { matchId: "1535462", competition: "ipl", season: "2026", date: "2026-05-26", stage: "Qualifier 1", team1: "RCB", team2: "GT" },
    { matchId: "1473469", competition: "ipl", season: "2026", date: "2026-04-10", stage: null, team1: "CSK", team2: "RCB" },
  ];

  const finalVideo = {
    title: "IPL 2026 Grand Final: RCB vs GT — The Decider",
    season: 2026,
    teams: ["RCB", "GT"],
    matchStage: "Final",
  };

  const resolved = resolveMatchForVideo(finalVideo, mockMatches);
  assert.equal(resolved.matchId, "1535465");
  assert.ok(resolved.confidence! >= 0.95, "Exact stage match must have high confidence");
  assert.ok(resolved.evidence?.includes("Final"));
});

test("Cricket Entity Resolution: flags ambiguous matches when multiple seasonal encounters exist without date", () => {
  const mockMatches = [
    { matchId: "1001", competition: "ipl", season: "2026", date: "2026-04-01", stage: null, team1: "MI", team2: "CSK" },
    { matchId: "1002", competition: "ipl", season: "2026", date: "2026-05-01", stage: null, team1: "CSK", team2: "MI" },
  ];

  const leagueVideo = {
    title: "MI vs CSK Highlights",
    season: 2026,
    teams: ["MI", "CSK"],
    matchStage: null,
  };

  const resolved = resolveMatchForVideo(leagueVideo, mockMatches);
  assert.ok(resolved.confidence! < 0.70, "Ambiguous matches must have confidence < 0.70");
  assert.ok(resolved.evidence?.includes("Ambiguous"));
});

test("Video Catalogue Search: pagination, text search and filter mechanics", () => {
  const result = searchVideoCatalogue({ page: 1, limit: 10 });
  assert.ok(result.total > 0);
  assert.equal(result.videos.length, 10);
  assert.equal(result.page, 1);

  // Search by keyword
  const searchResult = searchVideoCatalogue({ query: "Kohli" });
  assert.ok(searchResult.total > 0);
  assert.ok(
    searchResult.videos.every(
      (v) =>
        v.title.toLowerCase().includes("kohli") ||
        v.players.some((p) => p.toLowerCase().includes("kohli")) ||
        v.keywords.some((k) => k.toLowerCase().includes("kohli"))
    )
  );
});

test("Video Stats Summary: provides total count, verification rate and providers breakdown", () => {
  const stats = getVideoStatsSummary();
  assert.ok(stats.totalVideos > 0);
  assert.ok(stats.verifiedVideos <= stats.totalVideos);
  assert.ok(stats.providers["jiohotstar"] > 0 || stats.providers["youtube"] > 0);
});
