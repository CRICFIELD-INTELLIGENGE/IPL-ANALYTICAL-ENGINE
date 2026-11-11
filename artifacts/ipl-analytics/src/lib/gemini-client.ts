/** Optional commentary uses the server gateway; no provider credentials belong in the browser. */
export interface GeminiAnalysisResult {
  text: string;
  evidence?: { id: string; tool: string; source: string; data: unknown }[];
  model: string;
  source: "live_api" | "unavailable";
  error?: string;
  ms: number;
}
export async function askGeminiAnalyst(prompt: string, contextData?: unknown): Promise<GeminiAnalysisResult> {
  const start = performance.now();
  const unavailable = (error: string): GeminiAnalysisResult => ({ text: "", model: "", source: "unavailable", error, ms: Math.round(performance.now() - start) });
  try {
    // Remove keys saved by earlier releases; never read or transmit them.
    try { globalThis.localStorage?.removeItem("ipl_gemini_api_key"); } catch { /* storage may be blocked */ }
    const context = contextData == null ? undefined : JSON.stringify(contextData);
    if (prompt.trim().length < 3 || prompt.length > 2000 || (context?.length ?? 0) > 20_000) return unavailable("Please shorten the question or selected context.");
    const base = import.meta.env?.BASE_URL ?? "/";
    const response = await fetch(`${base}api/ai/${contextData == null ? "analyst" : "commentary"}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contextData == null ? { prompt } : { prompt, context }), signal: AbortSignal.timeout(100_000),
    });
    const result = await response.json();
    if (!response.ok) return unavailable(typeof result.error === "string" ? result.error : "AI commentary is unavailable. Please try again later.");
    if (result.source !== "live_api" || typeof result.text !== "string" || !result.text.trim()) return unavailable("AI commentary returned no text.");
    return { text: result.text, model: result.model, source: "live_api", evidence: Array.isArray(result.evidence) ? result.evidence : [], ms: Math.round(performance.now() - start) };
  } catch { return unavailable("AI commentary is unavailable. Check your connection and try again."); }
}
