// Removes the On-Field sub-sidebar override.
//
// Six pages passed sidebarItems={ON_FIELD_SIDEBAR} to Layout, which does not
// add a sub-nav — it *replaces* the whole sidebar with a three-item one. So
// opening Feed, Stats or Pulse swapped the site's navigation out from under the
// reader, and getting back to Scores or Intel Hub meant going via Home. Every
// other tab keeps the main sidebar; these now do too.
//
// The player, team and venue pages had the same override, which is why they
// felt like a different site once you drilled into them.

import fs from "node:fs";

const files = [
  "artifacts/ipl-analytics/src/pages/feed.tsx",
  "artifacts/ipl-analytics/src/pages/pulse.tsx",
  "artifacts/ipl-analytics/src/pages/stats.tsx",
  "artifacts/ipl-analytics/src/pages/player.tsx",
  "artifacts/ipl-analytics/src/pages/team.tsx",
  "artifacts/ipl-analytics/src/pages/venue.tsx",
];

let totalProps = 0;
let totalImports = 0;

for (const f of files) {
  let s = fs.readFileSync(f, "utf8");
  const before = s;

  // <Layout sidebarItems={ON_FIELD_SIDEBAR} ...>  ->  <Layout ...>
  const props = (s.match(/ sidebarItems=\{ON_FIELD_SIDEBAR\}/g) || []).length;
  s = s.replace(/ sidebarItems=\{ON_FIELD_SIDEBAR\}/g, "");

  const imports = (s.match(/^import \{ ON_FIELD_SIDEBAR \} from "@\/lib\/on-field-sidebar";\n/gm) || []).length;
  s = s.replace(/^import \{ ON_FIELD_SIDEBAR \} from "@\/lib\/on-field-sidebar";\n/gm, "");

  if (s !== before) {
    fs.writeFileSync(f, s);
    totalProps += props;
    totalImports += imports;
    console.log(`  ${f.split("/").pop()}: ${props} override(s), ${imports} import(s)`);
  } else {
    console.warn(`  ${f.split("/").pop()}: nothing to change`);
  }
}

console.log(`\nremoved ${totalProps} sidebar overrides and ${totalImports} imports`);

// The module is now unused; leave a note rather than a dangling export.
const libPath = "artifacts/ipl-analytics/src/lib/on-field-sidebar.ts";
if (fs.existsSync(libPath)) {
  fs.unlinkSync(libPath);
  console.log("deleted lib/on-field-sidebar.ts (no remaining consumers)");
}
