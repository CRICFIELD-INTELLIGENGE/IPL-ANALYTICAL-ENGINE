// Shows deliveries the parser could not classify, so the rules are extended
// from what commentators actually wrote rather than from guesswork.
import fs from "node:fs";
import { parseDelivery } from "./parse-commentary.mjs";

const dir = process.argv[2];
const missing = { length: [], line: [], shot: [], zone: [] };
let total = 0;

for (const f of fs.readdirSync(dir).slice(0, 25)) {
  const j = JSON.parse(fs.readFileSync(`${dir}/${f}`, "utf8"));
  for (const inn of j.innings ?? []) {
    for (const d of inn.deliveries ?? []) {
      if (d.over == null || !d.text) continue;
      total++;
      const p = parseDelivery(d.text);
      for (const k of Object.keys(missing)) {
        if (p[k] == null && missing[k].length < 10) missing[k].push(d.text.slice(0, 110));
      }
    }
  }
}

console.log(`inspected ${total} deliveries\n`);
for (const [k, list] of Object.entries(missing)) {
  console.log(`--- no ${k.toUpperCase()} detected ---`);
  for (const t of list) console.log("  • " + t);
  console.log();
}
