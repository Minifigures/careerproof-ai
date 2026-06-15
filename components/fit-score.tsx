"use client";

import { Markdown } from "@/components/markdown";

interface ParsedScore {
  score: number | null;
  rationale: string;
  skills: number | null;
  experience: number | null;
  ats: number | null;
  rest: string;
}

function readInt(text: string, re: RegExp): number | null {
  const match = text.match(re);
  if (!match) return null;
  const value = Number.parseInt(match[1], 10);
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : null;
}

function parseScore(text: string): ParsedScore {
  const score = readInt(text, /FIT SCORE:\s*(\d{1,3})/i);
  const skills = readInt(text, /Skills Match:\s*(\d{1,3})/i);
  const experience = readInt(text, /Experience Match:\s*(\d{1,3})/i);
  const ats = readInt(text, /ATS(?:\s*Keyword)?\s*Match:\s*(\d{1,3})/i);

  let rationale = "";
  const rationaleMatch = text.match(
    /FIT SCORE:\s*\d{1,3}\s*\n+([\s\S]*?)\n+\s*Skills Match:/i,
  );
  if (rationaleMatch) {
    rationale = rationaleMatch[1].trim();
  }

  let rest = text;
  const atsIndex = text.search(/ATS(?:\s*Keyword)?\s*Match:\s*\d{1,3}\s*%?/i);
  if (atsIndex >= 0) {
    const after = text.slice(atsIndex);
    const newline = after.indexOf("\n");
    rest = newline >= 0 ? after.slice(newline + 1).trim() : "";
  }

  return { score, rationale, skills, experience, ats, rest };
}

function scoreColor(value: number): string {
  if (value >= 75) return "text-emerald-600";
  if (value >= 50) return "text-amber-600";
  return "text-red-600";
}

function barColor(value: number): string {
  if (value >= 75) return "bg-emerald-500";
  if (value >= 50) return "bg-amber-500";
  return "bg-red-500";
}

function Bar({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-stone-500">
        <span>{label}</span>
        <span className="font-medium text-stone-700">
          {value === null ? "--" : `${value}%`}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-stone-200">
        <div
          className={`h-full rounded-full ${value === null ? "bg-stone-300" : barColor(value)}`}
          style={{ width: `${value ?? 0}%` }}
        />
      </div>
    </div>
  );
}

export function FitScore({ text }: { text: string }) {
  const parsed = parseScore(text);

  // If we could not find a numeric score, fall back to rendering the raw text.
  if (parsed.score === null) {
    return <Markdown>{text}</Markdown>;
  }

  return (
    <div>
      <div className="flex flex-col gap-4 rounded-lg border border-stone-200 bg-stone-50 p-4 sm:flex-row sm:items-center">
        <div className="flex shrink-0 flex-col items-center justify-center">
          <div className={`text-4xl font-bold ${scoreColor(parsed.score)}`}>
            {parsed.score}
          </div>
          <div className="text-xs uppercase tracking-wide text-stone-400">
            Fit score
          </div>
        </div>
        <div className="flex-1 space-y-2">
          <Bar label="Skills match" value={parsed.skills} />
          <Bar label="Experience match" value={parsed.experience} />
          <Bar label="ATS keyword match" value={parsed.ats} />
        </div>
      </div>
      {parsed.rationale && (
        <p className="mt-3 text-sm text-stone-600">{parsed.rationale}</p>
      )}
      {parsed.rest && (
        <div className="mt-3">
          <Markdown>{parsed.rest}</Markdown>
        </div>
      )}
    </div>
  );
}
