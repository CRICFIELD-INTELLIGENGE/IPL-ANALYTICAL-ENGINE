// Counts candidate shot/line/length words only among deliveries the parser
// currently leaves unclassified, so a rule is added on evidence of what it
// would actually capture.
import fs from "node:fs";
import { parseDelivery } from "./parse-commentary.mjs";
const [, , dir, field, ...cands] = process.argv;
const files = fs.readdirSync(dir).filter(f => f.endsWith(".json"));
const hits = new Map(cands.map(c => [c, 0]));
let misses = 0;
for (const f of files) {
  const j = JSON.parse(fs.readFileSync(`${dir}/${f}`, "utf8"));
  for (const inn of j.innings ?? []) for (const d of inn.deliveries ?? []) {
    if (d.over == null || !d.text) continue;
    if (parseDelivery(d.text)[field] != null) continue;
    misses++;
    for (const c of cands) if (new RegExp(c, "i").test(d.text)) hits.set(c, hits.get(c) + 1);
  }
}
console.log(`${field}: ${misses} unclassified`);
for (const [c, n] of [...hits].sort((a, b) => b[1] - a[1])) {
  console.log(`   ${String(n).padStart(5)}  ${((n / misses) * 100).toFixed(1).padStart(5)}%  ${c}`);
}
