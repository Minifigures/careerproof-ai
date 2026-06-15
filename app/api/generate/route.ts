import { createSupabaseServerClient } from "@/lib/supabase/server";
import { runChain } from "@/lib/chain";
import { scrapeJob } from "@/lib/scrape";
import { retrieveContext } from "@/lib/rag";
import type { FocusKey, GenerateInput, OutputEvent } from "@/lib/types";

export const runtime = "nodejs";
// The 7-step chain runs to ~4 sequential model calls. 300s suits Vercel Pro;
// Hobby caps at 60s, which the parallelized chain on Sonnet usually fits.
export const maxDuration = 300;

const FOCUS_KEYS: FocusKey[] = [
  "software_engineering",
  "ai_ml",
  "data",
  "product_business",
  "internship",
];

interface GenerateBody {
  targetRole?: string;
  jobUrl?: string;
  jobText?: string;
  rawExperience?: string;
  focus?: string;
  education?: string;
  keyProjects?: string;
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as GenerateBody;
  const targetRole = body.targetRole?.trim();
  const rawExperience = body.rawExperience?.trim();
  const focus: FocusKey = FOCUS_KEYS.includes(body.focus as FocusKey)
    ? (body.focus as FocusKey)
    : "software_engineering";

  if (!targetRole || !rawExperience) {
    return Response.json(
      { error: "Target role and raw experience are required." },
      { status: 400 },
    );
  }

  // Resolve the job posting: prefer pasted text, otherwise research the URL.
  let jobText = body.jobText?.trim();
  if (!jobText && body.jobUrl?.trim()) {
    const scraped = await scrapeJob(body.jobUrl.trim());
    if (scraped) {
      jobText = scraped.text;
    }
  }

  // Retrieve saved-profile memory (RAG). Never block generation on a RAG failure.
  let ragContext = "";
  try {
    ragContext = await retrieveContext(
      supabase,
      `${targetRole}\n${rawExperience}`,
    );
  } catch {
    ragContext = "";
  }

  const input: GenerateInput = {
    targetRole,
    rawExperience,
    focus,
    jobUrl: body.jobUrl?.trim() || undefined,
    jobText: jobText || undefined,
    education: body.education?.trim() || undefined,
    keyProjects: body.keyProjects?.trim() || undefined,
    ragContext: ragContext || undefined,
  };

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: OutputEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      try {
        const outputs = await runChain(input, emit);
        await supabase.from("runs").insert({
          user_id: user.id,
          target_role: targetRole,
          focus,
          job_url: input.jobUrl ?? null,
          inputs: {
            targetRole,
            rawExperience,
            focus,
            jobUrl: input.jobUrl ?? null,
            education: input.education ?? null,
            keyProjects: input.keyProjects ?? null,
          },
          outputs,
        });
      } catch {
        // Per-step errors were already emitted by the chain; nothing else to send.
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
