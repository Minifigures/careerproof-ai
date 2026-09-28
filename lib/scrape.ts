// Resolve a job-posting URL into clean, model-ready text.
//
// PartyRock apps cannot reach the web; that is the headline gap this production
// app closes. Primary path is Jina AI Reader (r.jina.ai), which is free, renders
// JavaScript server-side, and returns LLM-ready markdown. Falls back to a direct
// fetch with naive HTML stripping. An SSRF guard (lib/url-guard.ts plus a DNS
// check here) runs before either path and again on every direct-fetch redirect.

import { lookup } from "node:dns/promises";
import {
  isBlockedIp,
  isIpLiteral,
  isSafeUrl,
  normalizeHost,
} from "@/lib/url-guard";

const MAX_LENGTH = 12000;
const MAX_REDIRECTS = 5;

// Syntax, hostname blocklist and IP-literal ranges, then every address the
// hostname resolves to. A failed lookup counts as unsafe.
async function isPublicUrl(raw: string): Promise<boolean> {
  if (!isSafeUrl(raw)) {
    return false;
  }
  const host = normalizeHost(new URL(raw).hostname);
  if (isIpLiteral(host)) {
    return true;
  }
  try {
    const addresses = await lookup(host, { all: true });
    return (
      addresses.length > 0 &&
      !addresses.some((entry) => isBlockedIp(entry.address))
    );
  } catch {
    return false;
  }
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

// Follows redirects by hand so every hop is re-validated before it is fetched.
async function viaFetch(url: string): Promise<string> {
  const signal = AbortSignal.timeout(15000);
  let current = url;
  let response: Response;
  for (let hop = 0; ; hop++) {
    if (!(await isPublicUrl(current))) {
      throw new Error("Blocked URL");
    }
    response = await fetch(current, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CareerProofAI/1.0)" },
      redirect: "manual",
      signal,
    });
    const location = response.headers.get("location");
    if (response.status < 300 || response.status > 399 || !location) {
      break;
    }
    await response.body?.cancel();
    if (hop >= MAX_REDIRECTS) {
      throw new Error("Too many redirects");
    }
    current = new URL(location, current).toString();
  }
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
  if (!(await isPublicUrl(rawUrl))) {
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
