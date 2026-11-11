export function isFreeOpenRouterModel(model: string): boolean {
  return model === "openrouter/free" || /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+:free$/.test(model);
}
export function openRouterConfig() {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  const model = process.env.OPENROUTER_MODEL?.trim() || "openrouter/free";
  return key && isFreeOpenRouterModel(model) ? { key, model } : null;
}
export async function openRouterCompletion(options: { key: string; model: string; messages: unknown[]; signal: AbortSignal; tools?: unknown[]; toolChoice?: string; fetcher?: typeof fetch }) {
  if (!isFreeOpenRouterModel(options.model)) throw new Error("free_model_required");
  const response = await (options.fetcher ?? fetch)("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST", signal: options.signal,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${options.key}`, "X-OpenRouter-Title": "CricField" },
    body: JSON.stringify({ model: options.model, messages: options.messages, max_tokens: 1200, temperature: 0.1,
      provider: { require_parameters: true, max_price: { prompt: 0, completion: 0 } },
      ...(options.tools ? { tools: options.tools, tool_choice: options.toolChoice ?? "auto", parallel_tool_calls: false } : {}) }),
  });
  if (!response.ok) throw new Error(response.status === 429 ? "provider_rate_limited" : "provider_unavailable");
  const raw = await response.json();
  if (raw.error) throw new Error("provider_unavailable");
  const message = raw.choices?.[0]?.message;
  if (!message || typeof message !== "object") throw new Error("empty_response");
  return { message, model: typeof raw.model === "string" ? raw.model : options.model };
}
