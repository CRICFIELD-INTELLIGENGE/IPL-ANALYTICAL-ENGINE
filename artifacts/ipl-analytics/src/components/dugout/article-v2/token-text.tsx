// Renders article prose with evidence tokens resolved. Each statistic carries its provenance
// (label, sample size, dataset) as an accessible tooltip; citations link to the source list.
import type { ArticleV2, EvidenceFile } from "@/data/editorial/schema";
import { splitTokens } from "@/lib/editorial-v2";

export function TokenText({ text, evidence, article }: { text: string; evidence: EvidenceFile; article?: ArticleV2 }) {
  return (
    <>
      {splitTokens(text).map((seg, i) => {
        if (seg.kind === "text") return <span key={i}>{seg.text}</span>;
        if (seg.kind === "ev") {
          const m = evidence.metrics[seg.id];
          if (!m) return null;
          const tip = `${m.label} — n = ${m.sampleSize.n.toLocaleString("en-IN")} ${m.sampleSize.unit}. ${m.filters}`;
          return (
            <span key={i} className="font-semibold text-white decoration-white/25 decoration-dotted underline-offset-4 hover:underline" title={tip} data-metric={seg.id}>
              {m.display}
            </span>
          );
        }
        if (seg.kind === "src") {
          const idx = article ? article.sources.findIndex((s) => s.id === seg.id) : -1;
          if (idx < 0) return null;
          return (
            <sup key={i} className="ml-0.5">
              <a href={`#source-${seg.id}`} className="font-mono text-[10px] text-sky-400 hover:text-sky-300" aria-label={`Source ${idx + 1}: ${article!.sources[idx].title}`}>
                [{idx + 1}]
              </a>
            </sup>
          );
        }
        return null; // hypotheses are rendered as blocks by the article view
      })}
    </>
  );
}
