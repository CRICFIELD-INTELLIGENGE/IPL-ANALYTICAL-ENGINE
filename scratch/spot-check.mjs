// Prints deliveries that got a given label, so a new rule can be read against
// the text it fired on rather than trusted because the count went up.
import fs from "node:fs";
import { parseDelivery } from "./parse-commentary.mjs";
const [, , dir, field, want, limit = "12"] = process.argv;
let n = 0;
for (const f of fs.readdirSync(dir)) {
  const j = JSON.parse(fs.readFileSync(`${dir}/${f}`, "utf8"));
  for (const inn of j.innings ?? []) for (const d of inn.deliveries ?? []) {
    if (!d.text || n >= Number(limit)) continue;
    if (parseDelivery(d.text)[field] === want) { console.log("  •", d.text.slice(0, 105)); n++; }
  }
  if (n >= Number(limit)) break;
}
