// Promotes the On-Field sub-pages to top-level routes: /feed and /stats.
//
// The old /on-field/* paths are kept as redirects rather than deleted. They are
// linked from home, player, team, pulse and stats pages, and anything already
// shared or bookmarked would otherwise 404 — a redirect costs one line and
// keeps every existing link alive.

import fs from "node:fs";
import path from "node:path";

/* ── 1. router ───────────────────────────────────────────────────────────── */

const appPath = "artifacts/ipl-analytics/src/App.tsx";
let app = fs.readFileSync(appPath, "utf8");

const oldRoutes = `      <Route path="/on-field/feed" component={FeedPage} />
      <Route path="/on-field/stats" component={StatsPage} />
      <Route path="/on-field/pulse" component={PulsePage} />
      <Route path="/pulse" component={PulsePage} />
      <Route path="/on-field">
        <Redirect to="/on-field/feed" />
      </Route>`;

const newRoutes = `      {/* Top-level destinations. */}
      <Route path="/feed" component={FeedPage} />
      <Route path="/stats" component={StatsPage} />
      <Route path="/pulse" component={PulsePage} />
      {/* The former /on-field/* paths, kept as redirects so links already
          shared or bookmarked keep working. */}
      <Route path="/on-field/feed">
        <Redirect to="/feed" />
      </Route>
      <Route path="/on-field/stats">
        <Redirect to="/stats" />
      </Route>
      <Route path="/on-field/pulse">
        <Redirect to="/pulse" />
      </Route>
      <Route path="/on-field">
        <Redirect to="/feed" />
      </Route>`;

if (!app.includes(oldRoutes)) throw new Error("router block not found");
app = app.replace(oldRoutes, newRoutes);
fs.writeFileSync(appPath, app);
console.log("router updated");

/* ── 2. every internal link ──────────────────────────────────────────────── */

const srcDir = "artifacts/ipl-analytics/src";
const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) walk(fp);
    else if (/\.(tsx|ts)$/.test(e.name)) files.push(fp);
  }
})(srcDir);

let changed = 0;
let hits = 0;
for (const f of files) {
  if (f.endsWith("App.tsx")) continue; // the redirects there must keep their old paths
  const before = fs.readFileSync(f, "utf8");
  const after = before
    .replace(/\/on-field\/feed/g, "/feed")
    .replace(/\/on-field\/stats/g, "/stats")
    .replace(/\/on-field\/pulse/g, "/pulse");
  if (after !== before) {
    hits += (before.match(/\/on-field\/(feed|stats|pulse)/g) || []).length;
    fs.writeFileSync(f, after);
    changed++;
    console.log("  rewrote", path.relative(srcDir, f));
  }
}
console.log(`${hits} links updated across ${changed} files`);
