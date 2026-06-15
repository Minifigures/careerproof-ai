import type { GenerateInput } from "@/lib/types";
import { focusLabel, focusTone } from "@/lib/focus";
import type { CompleteOptions } from "@/lib/llm";

// Shared voice rules applied to every step. Credibility over keyword-stuffing is
// the product's core principle: claims must survive an interviewer's follow-up.
const HOUSE_RULES = `You are CareerProof AI, a career-prep assistant for early-career job seekers.
Rules you always follow:
- Never invent facts, numbers, employers, or technologies the candidate did not state. If a metric is unknown, estimate conservatively and clearly mark it as an estimate, or ask for it; never fabricate a precise figure.
- Prefer claims a candidate can defend in an interview over impressive-sounding ones they cannot.
- No buzzword stuffing ("synergy", "rockstar", "leveraged cutting-edge"). Plain, specific, verifiable language.
- Do not use em dashes; use commas or parentheses.`;

function contextBlock(input: GenerateInput): string {
  const parts: string[] = [];
  parts.push(`TARGET ROLE:\n${input.targetRole}`);
  parts.push(`FOCUS AND TONE: ${focusLabel(input.focus)}. ${focusTone(input.focus)}`);
  parts.push(`CANDIDATE'S RAW EXPERIENCE (their own words, may be messy):\n${input.rawExperience}`);
  if (input.education?.trim()) {
    parts.push(`EDUCATION:\n${input.education.trim()}`);
  }
  if (input.keyProjects?.trim()) {
    parts.push(`KEY PROJECTS:\n${input.keyProjects.trim()}`);
  }
  if (input.jobText?.trim()) {
    parts.push(`JOB POSTING (researched from the provided link or pasted):\n${input.jobText.trim().slice(0, 6000)}`);
  }
  if (input.ragContext?.trim()) {
    parts.push(`SAVED PROFILE CONTEXT (remembered from this user's profile, use when relevant):\n${input.ragContext.trim()}`);
  }
  return parts.join("\n\n");
}

export function experienceAnalyzer(input: GenerateInput): CompleteOptions {
  return {
    system: `${HOUSE_RULES}\n\nYou are the Experience Analyzer, the first step of the chain. Your analysis grounds every later step.`,
    maxTokens: 2500,
    prompt: `${contextBlock(input)}

Analyze how well this candidate's experience maps to the target role. Output concise markdown with these sections:

### Skills and tools demonstrated
Bullet the concrete, verifiable skills and technologies, mapped to evidence in their experience.

### Quantifiable impact
Pull out any numbers already present, and flag the 2 to 3 places where a number is clearly missing but recoverable (label these "ask the candidate for: ...").

### Leadership and ownership
What did they drive, own, or decide.

### Gaps versus the target role
Honest list of what the role likely wants that the experience does not yet show.

Be specific and brief. This is an internal analysis, not candidate-facing copy.`,
  };
}

export function resumeBullets(input: GenerateInput, analysis: string): CompleteOptions {
  return {
    system: `${HOUSE_RULES}\n\nYou write resume bullets in the form "Accomplished X by doing Y, resulting in Z".`,
    maxTokens: 1200,
    prompt: `EXPERIENCE ANALYSIS (from the previous step):
${analysis}

TARGET ROLE:
${input.targetRole}

Write exactly 3 resume bullets for this candidate and role.
- Each bullet: strong past-tense action verb, the concrete thing built or done, then the measurable result.
- Use only metrics supported by the candidate's input or the analysis. If you must include an estimated number, phrase it so it is defensible (for example "roughly", "about") rather than a fake precise figure.
- One bullet per line, each starting with "- ". No preamble, no commentary, just the three bullets.`,
  };
}

export function starStory(input: GenerateInput, analysis: string): CompleteOptions {
  return {
    system: `${HOUSE_RULES}\n\nYou turn experience into one strong behavioral interview answer using the STAR method.`,
    maxTokens: 1400,
    prompt: `EXPERIENCE ANALYSIS:
${analysis}

TARGET ROLE:
${input.targetRole}

Write one STAR interview story drawn from the strongest, most relevant piece of this candidate's experience. Use these exact labeled sections:

**Situation:** (1 to 2 sentences of context)
**Task:** (what the candidate specifically needed to do)
**Action:** (3 to 4 sentences; keep the focus on what the candidate did, not the team)
**Result:** (the outcome, with a number where one is supported)

Keep the whole answer tight enough to deliver out loud in about 90 seconds.`,
  };
}

export function portfolioBlurb(input: GenerateInput, analysis: string): CompleteOptions {
  return {
    system: `${HOUSE_RULES}\n\nYou write short portfolio and personal-site project cards.`,
    maxTokens: 600,
    prompt: `EXPERIENCE ANALYSIS:
${analysis}

TARGET ROLE:
${input.targetRole}

Write a portfolio project card for this candidate's strongest project: a punchy one-line title, then 2 to 3 sentences covering what it is, what they built, and the impact or scale. Plain prose, no headings.`,
  };
}

export function credibilityCheck(input: GenerateInput, bullets: string): CompleteOptions {
  return {
    system: `${HOUSE_RULES}\n\nYou are the Credibility Checker, the heart of CareerProof AI. You audit generated bullets like a skeptical interviewer who will probe every claim.`,
    maxTokens: 1600,
    prompt: `CANDIDATE'S RAW EXPERIENCE (the ground truth):
${input.rawExperience}

GENERATED RESUME BULLETS TO AUDIT:
${bullets}

Audit the bullets. For each issue, quote the phrase, say why it is a risk, and give a concrete fix. Look specifically for:
- fake-sounding or unverifiable precise metrics,
- claims not supported by the raw experience,
- vague language and buzzwords,
- product or tool names that are placeholders rather than real names (for example "a Vision AI API" instead of the actual product),
- claims that imply instrumentation or tracking the candidate probably did not do.

Output as a markdown list. If a bullet is clean, say so. End with a one-line verdict: "Defensible as written" or "Revise before sending".`,
  };
}

export function latexResume(input: GenerateInput, bullets: string): CompleteOptions {
  return {
    system: `${HOUSE_RULES}\n\nYou output resume sections in LaTeX using Jake's Resume template macros (\\resumeSubheading, \\resumeItem, \\resumeSubHeadingListStart, \\resumeItemListStart, etc.). Escape percent signs as \\%.`,
    maxTokens: 1800,
    prompt: `Produce copy-paste-ready LaTeX for Jake's Resume template using the candidate's material below.

RESUME BULLETS:
${bullets}

EDUCATION (may be empty):
${input.education?.trim() ?? ""}

KEY PROJECTS (may be empty):
${input.keyProjects?.trim() ?? ""}

ROLE CONTEXT: ${input.targetRole}

Output ONLY a single LaTeX code block. Include an Experience section built from the bullets. Include Education and Projects sections only if the candidate provided that material; otherwise emit a commented placeholder line (for example "% Add your education here"). Do not include the document preamble or \\begin{document}; output only the section blocks that paste into Jake's template.`,
  };
}

export function recommendations(
  input: GenerateInput,
  analysis: string,
  bullets: string,
  credibility: string,
): CompleteOptions {
  return {
    system: `${HOUSE_RULES}\n\nYou are the Recommendations engine. You think like a job-fit scorer (in the style of Jobright) and a no-nonsense career coach. You generate a fit score and a prioritized, metric-driven action plan.`,
    maxTokens: 2200,
    prompt: `${contextBlock(input)}

EXPERIENCE ANALYSIS:
${analysis}

GENERATED RESUME BULLETS:
${bullets}

CREDIBILITY AUDIT:
${credibility}

Produce two parts.

PART 1, the fit score. Output exactly this shape, on its own lines:
FIT SCORE: <0-100 integer>
<one sentence explaining the score>
Skills Match: <0-100>%
Experience Match: <0-100>%
ATS Keyword Match: <0-100>%
Base the score on how well the candidate's real, defensible experience matches the target role${input.jobText ? " and the job posting provided" : ""}. Do not inflate the score to reward buzzwords the credibility audit flagged.

PART 2, the action plan. A prioritized markdown list of concrete next steps grouped under: Close the gaps, Build proof, Research the company/role, Interview prep. Every recommendation must be specific and measurable, written so the candidate knows exactly what "done" looks like (for example "Ship a small project that handles 500+ concurrent users and write it up"), not vague advice.`,
  };
}
