import type { GenerateInput, OutputEvent, OutputKind } from "@/lib/types";
import { complete, type CompleteOptions } from "@/lib/llm";
import {
  credibilityCheck,
  experienceAnalyzer,
  latexResume,
  portfolioBlurb,
  recommendations,
  resumeBullets,
  starStory,
} from "@/lib/prompts";

export type Emit = (event: OutputEvent) => void;

export interface ChainResult {
  experience_analyzer: string;
  resume_bullets: string;
  star_story: string;
  portfolio_blurb: string;
  credibility_check: string;
  recommendations: string;
  latex_resume: string;
}

// Run one output: announce start, call Claude, announce done (or error). Each
// step emits independently so the client fills cards as they resolve.
async function step(
  emit: Emit,
  kind: OutputKind,
  options: CompleteOptions,
): Promise<string> {
  emit({ kind, status: "start" });
  try {
    const content = await complete(options);
    emit({ kind, status: "done", content });
    return content;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Generation failed.";
    emit({ kind, status: "error", error: message });
    throw error;
  }
}

// The dependency graph:
//   experience_analyzer
//     -> resume_bullets, star_story, portfolio_blurb   (parallel)
//          resume_bullets -> credibility_check, latex_resume   (parallel)
//   recommendations needs analyzer + bullets + credibility
// Wall-clock is roughly four sequential calls, not seven.
export async function runChain(
  input: GenerateInput,
  emit: Emit,
): Promise<ChainResult> {
  const analysis = await step(
    emit,
    "experience_analyzer",
    experienceAnalyzer(input),
  );

  const [bullets, star, blurb] = await Promise.all([
    step(emit, "resume_bullets", resumeBullets(input, analysis)),
    step(emit, "star_story", starStory(input, analysis)),
    step(emit, "portfolio_blurb", portfolioBlurb(input, analysis)),
  ]);

  const [credibility, latex] = await Promise.all([
    step(emit, "credibility_check", credibilityCheck(input, bullets)),
    step(emit, "latex_resume", latexResume(input, bullets)),
  ]);

  const recs = await step(
    emit,
    "recommendations",
    recommendations(input, analysis, bullets, credibility),
  );

  return {
    experience_analyzer: analysis,
    resume_bullets: bullets,
    star_story: star,
    portfolio_blurb: blurb,
    credibility_check: credibility,
    latex_resume: latex,
    recommendations: recs,
  };
}
