import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import { Markdown } from "@/components/markdown";
import { FitScore } from "@/components/fit-score";
import { focusLabel } from "@/lib/focus";
import type { FocusKey } from "@/lib/types";

interface RunOutputs {
  resume_bullets?: string;
  recommendations?: string;
}

interface RunRow {
  id: string;
  target_role: string;
  focus: string;
  created_at: string;
  outputs: RunOutputs | null;
}

export default async function HistoryPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/history");
  }

  const { data } = await supabase
    .from("runs")
    .select("id, target_role, focus, created_at, outputs")
    .order("created_at", { ascending: false })
    .limit(25);

  const runs = (data ?? []) as RunRow[];

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">
          History
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          Your past runs. Each one is repeatable and consistent, the core
          advantage over a one-off chatbot conversation.
        </p>

        {runs.length === 0 ? (
          <div className="mt-8 rounded-lg border border-stone-200 bg-white p-6 text-sm text-stone-500">
            No runs yet.{" "}
            <Link href="/app" className="font-medium text-teal-700 underline">
              Generate your first one.
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {runs.map((run) => (
              <details
                key={run.id}
                className="rounded-xl border border-stone-200 bg-white p-4"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-3">
                  <span className="font-medium text-stone-900">
                    {run.target_role.slice(0, 80)}
                  </span>
                  <span className="shrink-0 text-xs text-stone-400">
                    {focusLabel(run.focus as FocusKey)} ·{" "}
                    {new Date(run.created_at).toLocaleDateString()}
                  </span>
                </summary>
                <div className="mt-4 space-y-4">
                  {run.outputs?.recommendations && (
                    <FitScore text={run.outputs.recommendations} />
                  )}
                  {run.outputs?.resume_bullets && (
                    <div>
                      <h3 className="mb-1 text-sm font-semibold text-stone-900">
                        Resume bullets
                      </h3>
                      <Markdown>{run.outputs.resume_bullets}</Markdown>
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
