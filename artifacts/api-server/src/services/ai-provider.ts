import { groqConfig, groqCompletion } from "./groq";
import { ollamaCompletion, ollamaSettings } from "./ollama";
import { openRouterCompletion, openRouterConfig } from "./openrouter";
export type AIConfig = { provider: "cloudflare" | "openrouter" | "ollama" | "groq"; key: string; model: string; accountId?: string };
export function aiConfig(): AIConfig | null {
  const provider = process.env.AI_PROVIDER?.trim() || (process.env.NODE_ENV === "production" ? "openrouter" : "ollama");
  if (provider === "groq") { const config=groqConfig(); return config ? {...config,provider} : null; }
  if (provider === "ollama") { try { return { provider, key: "", model: ollamaSettings().model }; } catch { return null; } }
  if (provider === "openrouter") { const config = openRouterConfig(); return config ? { ...config, provider } : null; }
  if (provider !== "cloudflare") return null;
  const key = process.env.CLOUDFLARE_API_TOKEN?.trim();
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const model = process.env.CLOUDFLARE_AI_MODEL?.trim() || "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
  if (!key || !accountId || !/^[a-f0-9]{32}$/i.test(accountId) || !/^@cf\/[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(model)) return null;
  return { provider, key, accountId, model };
}
export async function aiCompletion(options: { provider?: "cloudflare" | "openrouter" | "ollama" | "groq"; accountId?: string; key: string; model: string; messages: unknown[]; signal: AbortSignal; tools?: unknown[]; toolChoice?: string; fetcher?: typeof fetch }) {
  if (options.provider === "groq") return groqCompletion(options);
  if (options.provider === "ollama") return ollamaCompletion(options);
  if (options.provider !== "cloudflare") return openRouterCompletion(options);
  if (!options.accountId || !/^[a-f0-9]{32}$/i.test(options.accountId)) throw new Error("invalid_account_id");
  const response = await (options.fetcher ?? fetch)(`https://api.cloudflare.com/client/v4/accounts/${options.accountId}/ai/v1/chat/completions`, {
    method: "POST", signal: options.signal,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${options.key}` },
    body: JSON.stringify({ model: options.model, messages: options.messages, max_tokens: 1200, temperature: 0.1,
      ...(options.tools ? { tools: options.tools, tool_choice: options.toolChoice ?? "auto" } : {}) }),
  });
  if (!response.ok) throw new Error(response.status === 429 ? "provider_rate_limited" : "provider_unavailable");
  const raw = await response.json();
  if (raw.error || raw.success === false) throw new Error("provider_unavailable");
  const message = raw.choices?.[0]?.message;
  if (!message || typeof message !== "object") throw new Error("empty_response");
  return { message, model: typeof raw.model === "string" ? raw.model : options.model };
}
