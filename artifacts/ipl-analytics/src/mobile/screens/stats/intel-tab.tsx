import { useMemo, useState } from "react";
import { Maximize2, Minimize2, RotateCcw, Search, ZoomIn, ZoomOut } from "lucide-react";
import { HeadToHeadTacticalLab } from "@/components/head-to-head-tactical-lab";
import "@/pages/stats-tools.css";
import type { MobileStatsHook } from "./use-mobile-stats";

export function MobileTacticsTab({ state }: { state: MobileStatsHook }) {
  const [p1Role, setP1Role] = useState<"Batter" | "Bowler">("Batter");
  const [p2Role, setP2Role] = useState<"Batter" | "Bowler">("Bowler");
  const [player1, setPlayer1] = useState<string>(() => state.tacticalPlayer || "");
  const [player2, setPlayer2] = useState<string>("");
  const [q1, setQ1] = useState("");
  const [q2, setQ2] = useState("");
  const [zoom, setZoom] = useState<number>(1);
  const [fullscreen, setFullscreen] = useState(false);

  const list1 = p1Role === "Batter" ? state.batterOptionNames : state.bowlerOptionNames;
  const list2 = p2Role === "Batter" ? state.batterOptionNames : state.bowlerOptionNames;

  const resolvedP1 = player1 || state.tacticalPlayer || list1[0] || "V Kohli";
  const resolvedP2 = player2 || list2[0] || "JJ Bumrah";

  const findRow = (name: string, role: "Batter" | "Bowler") => {
    const arr = role === "Batter" ? state.activeData.batters : state.activeData.bowlers;
    return arr.find((r) => r.player === name) ?? null;
  };

  const p1Stats = useMemo(() => findRow(resolvedP1, p1Role), [resolvedP1, p1Role, state.activeData]);
  const p2Stats = useMemo(() => findRow(resolvedP2, p2Role), [resolvedP2, p2Role, state.activeData]);

  const filtered1 = useMemo(
    () => list1.filter((n) => !q1 || state.formatName(n).toLowerCase().includes(q1.toLowerCase())).slice(0, 60),
    [list1, q1, state],
  );
  const filtered2 = useMemo(
    () => list2.filter((n) => !q2 || state.formatName(n).toLowerCase().includes(q2.toLowerCase())).slice(0, 60),
    [list2, q2, state],
  );

  const labContent = (
    <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", minWidth: 0 }}>
      <div
        style={{
          transform: zoom !== 1 ? `scale(${zoom})` : undefined,
          transformOrigin: "top left",
          width: zoom !== 1 ? `${100 / zoom}%` : "100%",
        }}
      >
        <HeadToHeadTacticalLab
          player1={resolvedP1}
          player2={resolvedP2}
          p1Role={p1Role}
          p2Role={p2Role}
          p1Stats={p1Stats}
          p2Stats={p2Stats}
          playerImages={state.playerImages}
          matchIds={state.slicedMatchIds}
          initialSubTab={state.tacticalSubTab}
          initialDeliveryType={state.tacticalDeliveryType}
        />
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="ms3-card" style={{ gap: 9 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <span className="ms3-scope-label">Player 1</span>
              <button
                type="button"
                className="ms3-pill"
                style={{ height: 22, padding: "0 7px", fontSize: 10 }}
                onClick={() => setP1Role((r) => (r === "Batter" ? "Bowler" : "Batter"))}
              >
                {p1Role}
              </button>
            </div>
            <div className="ms3-search-wrap" style={{ marginBottom: 4 }}>
              <Search size={12} className="ms3-search-icon" />
              <input
                type="text"
                className="ms3-input ms3-input--search"
                style={{ height: 34, fontSize: 12 }}
                placeholder="Search P1..."
                value={q1}
                onChange={(e) => setQ1(e.target.value)}
              />
            </div>
            <select
              className="ms3-select"
              value={resolvedP1}
              onChange={(e) => setPlayer1(e.target.value)}
              aria-label="Tactics Player 1"
            >
              {!filtered1.includes(resolvedP1) && <option value={resolvedP1}>{state.formatName(resolvedP1)}</option>}
              {filtered1.map((n) => (
                <option key={n} value={n}>{state.formatName(n)}</option>
              ))}
            </select>
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <span className="ms3-scope-label">Player 2</span>
              <button
                type="button"
                className="ms3-pill"
                style={{ height: 22, padding: "0 7px", fontSize: 10 }}
                onClick={() => setP2Role((r) => (r === "Batter" ? "Bowler" : "Batter"))}
              >
                {p2Role}
              </button>
            </div>
            <div className="ms3-search-wrap" style={{ marginBottom: 4 }}>
              <Search size={12} className="ms3-search-icon" />
              <input
                type="text"
                className="ms3-input ms3-input--search"
                style={{ height: 34, fontSize: 12 }}
                placeholder="Search P2..."
                value={q2}
                onChange={(e) => setQ2(e.target.value)}
              />
            </div>
            <select
              className="ms3-select"
              value={resolvedP2}
              onChange={(e) => setPlayer2(e.target.value)}
              aria-label="Tactics Player 2"
            >
              {!filtered2.includes(resolvedP2) && <option value={resolvedP2}>{state.formatName(resolvedP2)}</option>}
              {filtered2.map((n) => (
                <option key={n} value={n}>{state.formatName(n)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Mobile Zoom & Fullscreen Controls */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, paddingTop: 4, borderTop: "1px solid var(--ms-border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <button
              type="button"
              className="ms3-pill"
              onClick={() => setZoom((z) => Math.max(0.75, Number((z - 0.1).toFixed(2))))}
              aria-label="Zoom out diagram"
            >
              <ZoomOut size={12} />
            </button>
            <button
              type="button"
              className="ms3-pill"
              onClick={() => setZoom(1)}
              aria-label="Reset zoom"
            >
              <RotateCcw size={11} /> {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              className="ms3-pill"
              onClick={() => setZoom((z) => Math.min(1.5, Number((z + 0.1).toFixed(2))))}
              aria-label="Zoom in diagram"
            >
              <ZoomIn size={12} />
            </button>
          </div>

          <button
            type="button"
            className="ms3-pill"
            data-active={fullscreen}
            onClick={() => setFullscreen(true)}
            data-testid="ms3-tactics-fullscreen"
          >
            <Maximize2 size={12} /> Fullscreen
          </button>
        </div>
      </div>

      <div className="ms3-tactics-wrap stats-tool">{labContent}</div>

      {fullscreen && (
        <div className="ms3-fullscreen stats-tool" role="dialog" aria-modal="true" aria-label="Tactics and Length Fullscreen">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ font: "800 14px/1.2 var(--m-display)" }}>
              {state.formatName(resolvedP1)} vs {state.formatName(resolvedP2)}
            </div>
            <button
              type="button"
              className="ms3-btn"
              onClick={() => setFullscreen(false)}
              data-testid="ms3-tactics-exit-fs"
            >
              <Minimize2 size={14} /> Close
            </button>
          </div>
          <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>{labContent}</div>
        </div>
      )}
    </div>
  );
}
