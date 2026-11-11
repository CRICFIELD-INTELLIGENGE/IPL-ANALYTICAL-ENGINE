import * as S from "../src/services/arcade/arcade-store";
import { setArcadeUserResolver } from "../src/routes/arcade";
import type { Request } from "express";

async function post(path: string, body: unknown, headers?: Record<string, string>) {
  const res = await fetch(`http://localhost:5000/api/arcade${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function get(path: string, headers?: Record<string, string>) {
  const res = await fetch(`http://localhost:5000/api/arcade${path}`, {
    headers: { ...headers },
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function put(path: string, body: unknown, headers?: Record<string, string>) {
  const res = await fetch(`http://localhost:5000/api/arcade${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function del(path: string, headers?: Record<string, string>) {
  const res = await fetch(`http://localhost:5000/api/arcade${path}`, {
    method: "DELETE",
    headers: { ...headers },
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function testSignedInFlows() {
  console.log("=== TESTING SIGNED-IN FLOWS ===");

  // 1. Without auth header -> 401
  const unauthPassport = await get("/passport");
  console.log("Unauthenticated /passport:", unauthPassport.status, "(expected 401)");

  const unauthSave = await get("/saves/build-your-xi");
  console.log("Unauthenticated /saves:", unauthSave.status, "(expected 401)");

  // 2. Test Supabase live auth endpoint if real user credentials exist or test mock
  // In development/test, let's test how arcade handles an authenticated user:
  const testUserId = "usr-test-12345";
  const testEmail = "testuser@cricfield.com";
  
  // Directly test arcade-store for signed-in user
  console.log("\nTesting Arcade Store for User:", testUserId);
  const passport0 = S.passport(testUserId);
  console.log("Initial Passport XP:", passport0.xp, "Level:", passport0.level);

  // Update profile
  S.updateProfile(testUserId, { handle: "CricMaster99", favouriteTeam: "CSK", showOnBoards: true });
  const passport1 = S.passport(testUserId);
  console.log("Updated Passport Handle:", passport1.handle, "Team:", passport1.favouriteTeam);

  // Record a result
  const outcome = S.recordResult(testUserId, {
    game: "hand-cricket",
    mode: "tournament",
    score: 300,
    won: true,
    achievements: ["schoolyard-champion"]
  });
  console.log("Recorded Result Outcome: XP earned:", outcome.xp, "New Total XP:", outcome.totalXp, "Level:", outcome.level, "Achievements:", outcome.newAchievements);

  const passport2 = S.passport(testUserId);
  console.log("Post-Game Passport Level:", passport2.level, "XP:", passport2.xp, "Achievements Unlocked:", passport2.achievements.length);

  // Test Saves in Arcade Store
  S.putSave(testUserId, "build-your-xi", "slot-1", { team: "CSK", mode: "budget", ids: ["p1", "p2"] });
  const saves = S.getSaves(testUserId, "build-your-xi");
  console.log("Saves Count for User:", saves.length, "Saved slot:", saves[0]?.slot, "State:", saves[0]?.state);

  S.deleteSave(testUserId, "build-your-xi", "slot-1");
  const savesAfterDel = S.getSaves(testUserId, "build-your-xi");
  console.log("Saves Count After Deletion:", savesAfterDel.length);

  // Test Leaderboard
  const lb = S.leaderboard("hand-cricket", "weekly", testUserId, "CSK");
  console.log("Leaderboard Entries:", lb.top.length, "Your Rank:", lb.you?.rank, "Your Score:", lb.you?.score);
}

testSignedInFlows().catch(console.error);
