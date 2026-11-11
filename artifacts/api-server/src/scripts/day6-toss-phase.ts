import { getTossAnalysis, getPhaseAnalysis } from "../services/stats-aggregator";
const t: any = await getTossAnalysis(); const p: any = await getPhaseAnalysis();
console.log(JSON.stringify({ ...t, venueBreakdown: t.venueBreakdown.slice(0, 3) }), "\n", JSON.stringify(p));
