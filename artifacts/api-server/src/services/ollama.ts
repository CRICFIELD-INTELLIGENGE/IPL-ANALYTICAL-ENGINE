import { z } from "zod";
export function ollamaSettings() {
  const base = process.env.OLLAMA_BASE_URL?.trim() || "http://127.0.0.1:11434";
  const url = new URL(base);
  if (url.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error("ollama_local_url_required");
  const model = process.env.OLLAMA_MODEL?.trim() || "llama3:latest";
  if (!/^[a-zA-Z0-9._:/-]{1,150}$/.test(model) || /(?:cloud|https?)/i.test(model)) throw new Error("local_model_required");
  return { base: url.origin, model };
}
export async function ollamaCompletion(options: { model: string; messages: unknown[]; signal: AbortSignal; fetcher?: typeof fetch }) {
  const { base } = ollamaSettings();
  const response = await (options.fetcher ?? fetch)(`${base}/api/chat`, { method:"POST", signal:options.signal, headers:{"Content-Type":"application/json"}, body:JSON.stringify({ model:options.model, messages:options.messages, stream:false, options:{ temperature:0.1, num_predict:600, num_ctx:8192 } }) });
  if (!response.ok) throw new Error("ollama_unavailable");
  const result = await response.json();
  const text = z.string().trim().min(1).parse(result.message?.content);
  return { message:{role:"assistant",content:text}, model: options.model };
}
