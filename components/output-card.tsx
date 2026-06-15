"use client";

import { Markdown } from "@/components/markdown";
import { FitScore } from "@/components/fit-score";
import { CopyButton } from "@/components/copy-button";
import type { OutputKind } from "@/lib/types";

export type CardStatus = "idle" | "pending" | "done" | "error";

export interface CardState {
  status: CardStatus;
  content?: string;
  error?: string;
}

// Strip a leading/trailing ```lang fence so the copy gives pure LaTeX.
function stripFence(text: string): string {
  const match = text.match(/```[a-zA-Z]*\n([\s\S]*?)```/);
  return match ? match[1].trim() : text.trim();
}

function StatusDot({ status }: { status: CardStatus }) {
  const map: Record<CardStatus, string> = {
    idle: "bg-stone-300",
    pending: "bg-amber-400 animate-pulse",
    done: "bg-emerald-500",
    error: "bg-red-500",
  };
  return <span className={`inline-block h-2 w-2 rounded-full ${map[status]}`} />;
}

export function OutputCard({
  kind,
  label,
  state,
}: {
  kind: OutputKind;
  label: string;
  state: CardState;
}) {
  const copyText =
    kind === "latex_resume" && state.content
      ? stripFence(state.content)
      : state.content;

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-900">
          <StatusDot status={state.status} />
          {label}
        </h3>
        {state.status === "done" && copyText && (
          <CopyButton
            text={copyText}
            label={kind === "latex_resume" ? "Copy LaTeX" : "Copy"}
          />
        )}
      </div>

      {state.status === "idle" && (
        <p className="text-sm text-stone-400">Waiting to generate.</p>
      )}

      {state.status === "pending" && (
        <div className="space-y-2">
          <div className="h-3 w-3/4 animate-pulse rounded bg-stone-100" />
          <div className="h-3 w-full animate-pulse rounded bg-stone-100" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-stone-100" />
        </div>
      )}

      {state.status === "error" && (
        <p className="text-sm text-red-600">
          {state.error ?? "Something went wrong generating this section."}
        </p>
      )}

      {state.status === "done" && state.content && (
        <>
          {kind === "recommendations" ? (
            <FitScore text={state.content} />
          ) : (
            <Markdown>{state.content}</Markdown>
          )}
        </>
      )}
    </section>
  );
}
