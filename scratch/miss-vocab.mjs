// Counts the words commentators actually used on deliveries the parser could
// not classify. Extending the rules from these counts keeps the vocabulary
// grounded in the corpus instead of in what cricket writing is assumed to say.
import fs from "node:fs";
import { parseDelivery } from "./parse-commentary.mjs";

const dir = process.argv[2];
const field = process.argv[3] ?? "shot";
const files = fs.readdirSync(dir).filter(f => f.endsWith(".json"));

const uni = new Map();
const bi = new Map();
let misses = 0, total = 0;
const bump = (m, k) => m.set(k, (m.get(k) ?? 0) + 1);

// Words that appear on nearly every ball and so carry no signal.
const STOP = new Set(`the a an and to of for in on is it he his that this with as at
by from but not no there was were be been are will just now then so too very up down
off out over into back one two three four six run runs ball delivery over-the wicket
first second next end another only more much good great well again another`.split(/\s+/));

for (const f of files) {
  const j = JSON.parse(fs.readFileSync(`${dir}/${f}`, "utf8"));
  for (const inn of j.innings ?? []) {
    for (const d of inn.deliveries ?? []) {
      if (d.over == null || !d.text) continue;
      total++;
      if (parseDelivery(d.text)[field] != null) continue;
      misses++;
      const words = d.text.toLowerCase().replace(/[^a-z' -]/g, " ").split(/\s+/).filter(Boolean);
      for (let i = 0; i < words.length; i++) {
        if (!STOP.has(words[i]) && words[i].length > 2) bump(uni, words[i]);
        if (i + 1 < words.length) bump(bi, `${words[i]} ${words[i + 1]}`);
      }
    }
  }
}

const top = (m, n) => [...m].sort((a, b) => b[1] - a[1]).slice(0, n);
console.log(`${field}: ${misses} unclassified of ${total} deliveries (${((misses / total) * 100).toFixed(1)}%)\n`);
console.log("words:");
for (const [w, n] of top(uni, 60)) console.log(`   ${String(n).padStart(5)}  ${w}`);
console.log("\nphrases:");
for (const [w, n] of top(bi, 45)) console.log(`   ${String(n).padStart(5)}  ${w}`);
