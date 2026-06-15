// Multi-provider LLM layer. Free by default (Groq, Gemini, Cerebras, OpenRouter,
// Hugging Face); Claude is opt-in via ANTHROPIC_API_KEY. Set any one key, or set
// several for automatic fallback. Order via LLM_ORDER; models via *_MODEL.

export interface CompleteOptions {
  system: string;
  prompt: string;
  maxTokens?: number;
  model?: string;
}

interface ProviderCall { system: string; prompt: string; maxTokens: number; model: string; }
interface Provider { name: string; model: string; call: (a: ProviderCall) => Promise<string>; }

const TEMPERATURE = 0.4;
const trunc = async (res: Response) => (await res.text().catch(() => "")).slice(0, 200);

// Generic OpenAI-compatible chat call (Groq, Cerebras, OpenRouter, HF router).
function openAICompatible(baseUrl: string, apiKey: string | undefined, extra: Record<string, string> = {}) {
  return async ({ system, prompt, maxTokens, model }: ProviderCall): Promise<string> => {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}`, ...extra },
      body: JSON.stringify({
        model, max_tokens: maxTokens, temperature: TEMPERATURE,
        messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`${baseUrl} failed (${res.status}): ${await trunc(res)}`);
    const data = await res.json();
    const text: unknown = data?.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) throw new Error(`No text from ${baseUrl}.`);
    return text.trim();
  };
}

async function callGemini({ system, prompt, maxTokens, model }: ProviderCall): Promise<string> {
  const key = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: maxTokens, temperature: TEMPERATURE },
    }),
  });
  if (!res.ok) throw new Error(`Gemini failed (${res.status}): ${await trunc(res)}`);
  const data = await res.json();
  const parts: unknown = data?.candidates?.[0]?.content?.parts;
  const text = Array.isArray(parts) ? parts.map((p) => (p && typeof p.text === "string" ? p.text : "")).join("") : "";
  if (!text.trim()) throw new Error("Gemini returned no text.");
  return text.trim();
}

// Anthropic Claude (optional, paid). Native Messages API via fetch, no SDK.
async function callAnthropic({ system, prompt, maxTokens, model }: ProviderCall): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY ?? "", "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) throw new Error(`Anthropic failed (${res.status}): ${await trunc(res)}`);
  const data = await res.json();
  const blocks: unknown = data?.content;
  const text = Array.isArray(blocks) ? blocks.map((b) => (b && b.type === "text" && typeof b.text === "string" ? b.text : "")).join("") : "";
  if (!text.trim()) throw new Error("Anthropic returned no text.");
  return text.trim();
}

// Build a provider only if its key is present.
function registry(): Record<string, Provider | null> {
  const e = process.env;
  return {
    groq: e.GROQ_API_KEY ? { name: "groq", model: e.GROQ_MODEL ?? "llama-3.3-70b-versatile", call: openAICompatible("https://api.groq.com/openai/v1", e.GROQ_API_KEY) } : null,
    gemini: (e.GEMINI_API_KEY || e.GOOGLE_API_KEY) ? { name: "gemini", model: e.GEMINI_MODEL ?? "gemini-2.0-flash", call: callGemini } : null,
    cerebras: e.CEREBRAS_API_KEY ? { name: "cerebras", model: e.CEREBRAS_MODEL ?? "llama-3.3-70b", call: openAICompatible("https://api.cerebras.ai/v1", e.CEREBRAS_API_KEY) } : null,
    openrouter: e.OPENROUTER_API_KEY ? { name: "openrouter", model: e.OPENROUTER_MODEL ?? "meta-llama/llama-3.3-70b-instruct:free", call: openAICompatible("https://openrouter.ai/api/v1", e.OPENROUTER_API_KEY, { "HTTP-Referer": "https://careerproof-ai.vercel.app", "X-Title": "CareerProof AI" }) } : null,
    huggingface: (e.HF_API_KEY || e.HUGGINGFACE_API_KEY) ? { name: "huggingface", model: e.HF_MODEL ?? "meta-llama/Llama-3.3-70B-Instruct", call: openAICompatible("https://router.huggingface.co/v1", e.HF_API_KEY ?? e.HUGGINGFACE_API_KEY) } : null,
    anthropic: e.ANTHROPIC_API_KEY ? { name: "anthropic", model: e.ANTHROPIC_MODEL ?? "claude-sonnet-4-6", call: callAnthropic } : null,
  };
}

const DEFAULT_ORDER = ["groq", "gemini", "cerebras", "openrouter", "huggingface", "anthropic"];

function providerChain(): Provider[] {
  const available = registry();
  const order = (process.env.LLM_ORDER ?? DEFAULT_ORDER.join(",")).split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const chain: Provider[] = [];
  const seen = new Set<string>();
  for (const name of order) {
    if (seen.has(name)) continue;
    seen.add(name);
    const p = available[name];
    if (p) chain.push(p);
  }
  return chain;
}

// One completion: try each configured provider in order, return the first success.
export async function complete({ system, prompt, maxTokens = 4000 }: CompleteOptions): Promise<string> {
  const chain = providerChain();
  if (chain.length === 0) {
    throw new Error("No LLM provider configured. Set a free key: GROQ_API_KEY, GEMINI_API_KEY, CEREBRAS_API_KEY, OPENROUTER_API_KEY, or HF_API_KEY.");
  }
  let lastError: unknown;
  for (const provider of chain) {
    try {
      return await provider.call({ system, prompt, maxTokens, model: provider.model });
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`All LLM providers failed. Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}
