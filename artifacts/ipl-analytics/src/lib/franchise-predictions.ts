import allPredictions from "../../../api-server/data/franchise-2027-predictions.json";
import rrPredictions from "../../../api-server/data/rr-2027-predictions.json";

export const FRANCHISE_PREDICTIONS = allPredictions;
export const RR_PREDICTIONS = rrPredictions;

export const normalizePlayerName = (s: string) =>
  s.toLowerCase().replace(/[^a-z]/g, "").replace("suryavanshi", "sooryavanshi").replace("amanrao", "amanraoperala").replace("peralaperala", "perala");

export const rrName = normalizePlayerName;

export function getFranchisePredictions(team: string) {
  const code = team.toUpperCase();
  return (allPredictions as any).teams?.[code] ?? (code === "RR" ? rrPredictions : null);
}

export function franchiseCall(team: string, name: string) {
  const pred = getFranchisePredictions(team);
  if (!pred?.players) return null;
  const norm = normalizePlayerName(name);
  return pred.players.find((p: any) =>
    [p.name, ...(p.aliases ?? [])].some((alias: string) => normalizePlayerName(alias) === norm)
  );
}

export const rrCall = (name: string) => franchiseCall("RR", name) ?? (rrPredictions.players as any[]).find(p => [p.name,...(p.aliases ?? [])].some(alias => rrName(alias) === rrName(name)));

export function getFranchiseCombinations(team: string) {
  const pred = getFranchisePredictions(team);
  if (!pred) return [];
  const xi: string[] = pred.xi || [];
  const subs: string[] = pred.impactSubs || [];
  
  return [
    {
      name: "Preferred Starting XI",
      reason: `Primary balanced combination: 4 overseas limit respected, 5+ bowling options, designated keeper.`,
      names: xi,
      impactSubs: subs
    },
    {
      name: "Chasing / Batting Depth",
      reason: `Impact Sub activation: ${subs[0] || 'Batting Cover'} replaces 4th bowler in second innings chase.`,
      names: subs.length > 0 ? [...xi.slice(0, 10), subs[0]] : xi,
      impactSubs: subs.slice(1)
    },
    {
      name: "Defending / Death Bowling Choke",
      reason: `Impact Sub activation: ${subs[1] || subs[0] || 'Seam Specialist'} deployed for death overs execution.`,
      names: subs.length > 1 ? [...xi.slice(0, 10), subs[1]] : xi,
      impactSubs: subs
    }
  ];
}

export const RR_COMBINATIONS = [
  { name: "Preferred XI", reason: "Preserve the top six; Jadeja and Bishnoi control the middle overs. Five primary bowlers; Indian seam Impact cover is the priority.", names: rrPredictions.xi },
  { name: "Jaipur · control and experience", reason: "Sandeep replaces Brijesh for an experienced Indian seam option; retain both frontline spinners when the surface supports them.", names: rrPredictions.xi.map(n => n === "Brijesh Sharma" ? "Sandeep Sharma" : n) },
  { name: "Guwahati · seam conditions", reason: "Sandeep replaces Bishnoi only on a seam-friendly surface. Keep Jadeja as the frontline spinner and protect the batting order.", names: rrPredictions.xi.map(n => n === "Ravi Bishnoi" ? "Sandeep Sharma" : n) },
  { name: "Keeper depth - overseas pace", reason: "Ravi Singh replaces Ferreira; Burger replaces Brijesh. Tests Indian keeper-batting cover with a second overseas fast bowler. Requires validation of finishing depth.", names: rrPredictions.xi.map(n => n === "Donovan Ferreira" ? "Ravi Singh" : n === "Brijesh Sharma" ? "Nandre Burger" : n) },
];
