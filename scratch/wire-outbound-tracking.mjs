// Adds a GA event to every outbound article link.
//
// The server-side counter at /api/ipl/insights/go/<slug> already records the
// click for everyone. This adds the GA side for consented visitors, which is
// where source, device and landing page live — the things needed to work out
// which channel actually sends readers.

import fs from "node:fs";

const p = "artifacts/ipl-analytics/src/components/insight-reader.tsx";
let s = fs.readFileSync(p, "utf8");

if (s.includes("trackOutbound")) {
  console.log("already wired");
  process.exit(0);
}

// import
const anchor = 'import { motion, AnimatePresence } from "framer-motion";';
if (!s.includes(anchor)) throw new Error("import anchor missing");
s = s.replace(anchor, `${anchor}\nimport { trackOutbound } from "@/lib/analytics";`);

// Every outbound anchor already carries href={goLink(article.slug)}; attach the
// event to the same element so the two counts cannot drift apart.
const before = (s.match(/href=\{goLink\(article\.slug\)\}/g) || []).length;
s = s.replace(
  /href=\{goLink\(article\.slug\)\}/g,
  'href={goLink(article.slug)}\n              onClick={() => trackOutbound(article.slug, article.title, article.platform)}',
);

fs.writeFileSync(p, s);
console.log(`outbound tracking attached to ${before} links`);
