// Replaces the /insights page with the author's real content shelf.
//
// What it removes: a REPORTS list of PDFs that did not exist (the download
// button called alert("Download stub: ...")) and a BLOGS list of invented
// titles, excerpts and dates. Both were presented as a published body of work.
//
// What it becomes: the posts held in the content hub, grouped by platform, with
// an honest empty state per platform until real links are added.

import fs from "node:fs";

const p = "artifacts/ipl-analytics/src/pages/section-pages.tsx";
let s = fs.readFileSync(p, "utf8");

const startMarker = "const REPORTS = [";
const endMarker = "export function ReportsPage() { return <InsightsPage />; }";
const start = s.indexOf(startMarker);
const end = s.indexOf(endMarker);
if (start < 0 || end < 0) throw new Error(`markers not found: ${start} ${end}`);

const replacement = `/**
 * /insights — the author's own published work.
 *
 * This page previously listed six downloadable "reports" whose button called
 * alert("Download stub: ...") and six blog posts with invented titles and
 * dates. None of it existed. It now renders whatever is actually registered in
 * the content hub, and shows an empty shelf when nothing is.
 */
export function InsightsPage() {
  const hub = useContentHub();
  const byPlatform = hub.data?.socialByPlatform ?? { LinkedIn: [], X: [], Medium: [], Substack: [] };
  const total = Object.values(byPlatform).flat().length;

  return (
    <Layout>
      <PageHeader
        Icon={FileText}
        title="Insights"
        subtitle={total === 0 ? "Your published work — nothing linked yet" : \`\${total} published \${total === 1 ? "piece" : "pieces"}\`}
      />
      {hub.isLoading ? (
        <div className="py-20 text-center text-white/30 font-mono text-sm">Loading your content…</div>
      ) : (
        <MyContentTab byPlatform={byPlatform} />
      )}
    </Layout>
  );
}

`;

s = s.slice(0, start) + replacement + s.slice(end);

// Wire up the imports the new page needs.
const anchor = 'import { Layout } from "@/components/layout";';
if (!s.includes("MyContentTab")) throw new Error("replacement did not land");
s = s.replace(
  anchor,
  `${anchor}\nimport { MyContentTab } from "@/components/my-content";\nimport { useContentHub } from "@/lib/aggregates";`,
);

fs.writeFileSync(p, s);
console.log("insights page rewritten");
console.log("stub download refs left:", (s.match(/Download stub/g) || []).length);
