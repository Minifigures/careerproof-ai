// Resolve a job-posting URL into clean, model-ready text.
//
// PartyRock apps cannot reach the web; that is the headline gap this production
// app closes. Primary path is Jina AI Reader (r.jina.ai), which is free, renders
// JavaScript server-side, and returns LLM-ready markdown. Falls back to a direct
// fetch with naive HTML stripping. An SSRF guard blocks internal addresses on the
// direct-fetch path.

const MAX_LENGTH = 12000;

const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./, // link-local, includes cloud metadata 169.254.169.254
  /^::1$/,
  /\.local$/i,
  /\.internal$/i,
  /metadata/i,
];

export function isSafeUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return false;
  }
  const host = url.hostname;
  return !BLOCKED_HOST_PATTERNS.some((pattern) => pattern.test(host));
}

export interface ScrapeResult {
  text: string;
  source: "jina" | "fetch";
}

async function viaJina(url: string): Promise<string> {
  const headers: Record<string, string> = { Accept: "text/plain" };
  if (process.env.JINA_API_KEY) {
    headers.Authorization = `Bearer ${process.env.JINA_API_KEY}`;
  }
  const response = await fetch(`https://r.jina.ai/${url}`, {
    headers,
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    throw new Error(`Jina Reader returned ${response.status}`);
  }
  return response.text();
}

async function viaFetch(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; CareerProofAI/1.0)" },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    throw new Error(`Fetch returned ${response.status}`);
  }
  const html = await response.text();
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Returns clean text, or null when the URL is unsafe or every path fails. The
// caller degrades gracefully to paste-text when this is null.
export async function scrapeJob(rawUrl: string): Promise<ScrapeResult | null> {
  if (!isSafeUrl(rawUrl)) {
    return null;
  }
  try {
    const text = await viaJina(rawUrl);
    if (text.trim().length > 0) {
      return { text: text.slice(0, MAX_LENGTH), source: "jina" };
    }
  } catch {
    // fall through to direct fetch
  }
  try {
    const text = await viaFetch(rawUrl);
    if (text.trim().length > 0) {
      return { text: text.slice(0, MAX_LENGTH), source: "fetch" };
    }
  } catch {
    // both paths failed
  }
  return null;
}
