"use client";

import { useState } from "react";
import { FOCUS_OPTIONS } from "@/lib/focus";
import {
  OUTPUT_KINDS,
  OUTPUT_LABELS,
  type FocusKey,
  type OutputEvent,
  type OutputKind,
} from "@/lib/types";
import { OutputCard, type CardState } from "@/components/output-card";

type CardMap = Record<OutputKind, CardState>;

function freshCards(status: CardState["status"]): CardMap {
  return OUTPUT_KINDS.reduce((acc, kind) => {
    acc[kind] = { status };
    return acc;
  }, {} as CardMap);
}

type JobStatus = "idle" | "reading" | "ok" | "fail";

export function Workspace() {
  const [targetRole, setTargetRole] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [focus, setFocus] = useState<FocusKey>("software_engineering");
  const [rawExperience, setRawExperience] = useState("");
  const [education, setEducation] = useState("");
  const [keyProjects, setKeyProjects] = useState("");

  const [running, setRunning] = useState(false);
  const [formError, setFormError] = useState("");
  const [cards, setCards] = useState<CardMap>(() => freshCards("idle"));
  const [started, setStarted] = useState(false);

  const [jobStatus, setJobStatus] = useState<JobStatus>("idle");
  const [jobNote, setJobNote] = useState("");

  async function readLink() {
    if (!jobUrl.trim()) return;
    setJobStatus("reading");
    setJobNote("");
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: jobUrl.trim() }),
      });
      const data = (await res.json()) as {
        source?: string;
        chars?: number;
        error?: string;
      };
      if (res.ok) {
        setJobStatus("ok");
        setJobNote(`Read ${data.chars ?? 0} characters via ${data.source}.`);
      } else {
        setJobStatus("fail");
        setJobNote(data.error ?? "Could not read that link.");
      }
    } catch {
      setJobStatus("fail");
      setJobNote("Could not reach the link.");
    }
  }

  function applyEvent(event: OutputEvent) {
    setCards((prev) => {
      const nextState: CardState =
        event.status === "start"
          ? { status: "pending" }
          : event.status === "done"
            ? { status: "done", content: event.content }
            : { status: "error", error: event.error };
      return { ...prev, [event.kind]: nextState };
    });
  }

  async function generate() {
    if (!targetRole.trim() || !rawExperience.trim()) {
      setFormError("A target role and your raw experience are both required.");
      return;
    }
    setFormError("");
    setRunning(true);
    setStarted(true);
    setCards(freshCards("pending"));

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetRole,
          jobUrl,
          focus,
          rawExperience,
          education,
          keyProjects,
        }),
      });

      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setFormError(data.error ?? "Generation failed. Please try again.");
        setCards(freshCards("idle"));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newline = buffer.indexOf("\n");
        while (newline >= 0) {
          const line = buffer.slice(0, newline).trim();
          buffer = buffer.slice(newline + 1);
          if (line) {
            try {
              applyEvent(JSON.parse(line) as OutputEvent);
            } catch {
              // ignore malformed lines
            }
          }
          newline = buffer.indexOf("\n");
        }
      }

      // Any card still pending means an upstream step failed before it ran.
      setCards((prev) => {
        const next = { ...prev };
        for (const kind of OUTPUT_KINDS) {
          if (next[kind].status === "pending") {
            next[kind] = {
              status: "error",
              error: "Skipped because an earlier step did not complete.",
            };
          }
        }
        return next;
      });
    } catch {
      setFormError("The connection dropped during generation.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-stone-700">
              Target role or job description
            </span>
            <textarea
              value={targetRole}
              onChange={(event) => setTargetRole(event.target.value)}
              rows={2}
              placeholder="Frontend / Full-Stack Developer Intern. React, Next.js, TypeScript, user-facing dashboards."
              className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-stone-700">
              Job posting URL (optional)
            </span>
            <div className="mt-1 flex gap-2">
              <input
                type="url"
                value={jobUrl}
                onChange={(event) => {
                  setJobUrl(event.target.value);
                  setJobStatus("idle");
                }}
                placeholder="https://company.com/careers/123"
                className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
              />
              <button
                type="button"
                onClick={readLink}
                disabled={jobStatus === "reading" || !jobUrl.trim()}
                className="shrink-0 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-100 disabled:opacity-50"
              >
                {jobStatus === "reading" ? "Reading..." : "Read link"}
              </button>
            </div>
            {jobNote && (
              <p
                className={`mt-1 text-xs ${jobStatus === "ok" ? "text-emerald-600" : "text-amber-600"}`}
              >
                {jobNote}
              </p>
            )}
          </label>

          <label className="block">
            <span className="text-sm font-medium text-stone-700">
              Focus and tone
            </span>
            <select
              value={focus}
              onChange={(event) => setFocus(event.target.value as FocusKey)}
              className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
            >
              {FOCUS_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-stone-700">
              Your raw experience
            </span>
            <textarea
              value={rawExperience}
              onChange={(event) => setRawExperience(event.target.value)}
              rows={5}
              placeholder="i built the website for my uni club from scratch, next.js + typescript, ~320 members use it. made an elo ranking system and a thing that reads match sheets from a photo..."
              className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-stone-700">
              Education (optional)
            </span>
            <textarea
              value={education}
              onChange={(event) => setEducation(event.target.value)}
              rows={2}
              placeholder="University of Toronto Mississauga, BSc Computer Science, 2026"
              className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-stone-700">
              Key projects (optional)
            </span>
            <textarea
              value={keyProjects}
              onChange={(event) => setKeyProjects(event.target.value)}
              rows={2}
              placeholder="ClaimFlow (LangGraph agents), VIGIL (RAG monitoring)..."
              className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
            />
          </label>
        </div>

        <details className="mt-4 rounded-md border border-stone-200 bg-stone-50 p-3 text-sm text-stone-600">
          <summary className="cursor-pointer font-medium text-stone-700">
            Examples and formats (stay visible while you type)
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>Target role:</strong> paste a title or the full posting.
            </li>
            <li>
              <strong>Raw experience:</strong> rough notes are fine, the messier
              the better. Include any real numbers you remember.
            </li>
            <li>
              <strong>Education:</strong> school, degree, grad year.
            </li>
            <li>
              <strong>Key projects:</strong> name them, one per line, with a
              short what-it-does.
            </li>
          </ul>
        </details>

        {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}

        <div className="mt-4">
          <button
            type="button"
            onClick={generate}
            disabled={running}
            className="rounded-md bg-teal-700 px-5 py-2.5 font-medium text-white transition hover:bg-teal-800 disabled:opacity-60"
          >
            {running ? "Generating..." : "Generate"}
          </button>
        </div>
      </div>

      {started && (
        <div className="space-y-4">
          {OUTPUT_KINDS.map((kind) => (
            <OutputCard
              key={kind}
              kind={kind}
              label={OUTPUT_LABELS[kind]}
              state={cards[kind]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
