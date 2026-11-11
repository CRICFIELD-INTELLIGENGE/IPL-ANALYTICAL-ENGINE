import predictions from "../../../api-server/data/rr-2027-predictions.json";
export const RR_PREDICTIONS = predictions;
export const rrName = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "").replace("suryavanshi", "sooryavanshi").replace("amanrao", "amanraoperala").replace("peralaperala", "perala");
export const rrCall = (name: string) => predictions.players.find(p => [p.name,...(p.aliases ?? [])].some(alias => rrName(alias) === rrName(name)));
export const RR_COMBINATIONS = [
 {name: "Preferred XI", reason: "Preserve the top six; Jadeja and Bishnoi control the middle overs. Five primary bowlers; Indian seam Impact cover is the priority.", names: predictions.xi},
 {name: "Jaipur · control and experience", reason: "Sandeep replaces Brijesh for an experienced Indian seam option; retain both frontline spinners when the surface supports them.", names: predictions.xi.map(n => n === "Brijesh Sharma" ? "Sandeep Sharma" : n)},
 {name: "Guwahati · seam conditions", reason: "Sandeep replaces Bishnoi only on a seam-friendly surface. Keep Jadeja as the frontline spinner and protect the batting order.", names: predictions.xi.map(n => n === "Ravi Bishnoi" ? "Sandeep Sharma" : n)},
 {name: "Keeper depth - overseas pace", reason: "Ravi Singh replaces Ferreira; Burger replaces Brijesh. Tests Indian keeper-batting cover with a second overseas fast bowler. Requires validation of finishing depth.", names: predictions.xi.map(n => n === "Donovan Ferreira" ? "Ravi Singh" : n === "Brijesh Sharma" ? "Nandre Burger" : n)},
];
