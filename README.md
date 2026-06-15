# CareerProof AI

[![Live](https://img.shields.io/badge/live-careerproof--ai.vercel.app-0f766e)](https://careerproof-ai.vercel.app)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-149eca)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)
![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20pgvector-3ecf8e)
![License](https://img.shields.io/badge/license-All%20Rights%20Reserved-lightgrey)

**A production career-prep web app.** It turns one rough description of your work
or projects (plus a target role, or a job link it researches) into recruiter-ready
materials through a multi-step LLM chain, then audits its own output for
credibility and scores your fit for the role.

**Live:** https://careerproof-ai.vercel.app — sign in with Google and try it.

> Author: Marco Anthony Ayuste

This is the productionized version of an AWS PartyRock MVP ([origin repo](https://github.com/Minifigures/aws-ai-ml-scholars-productivity-app)).
It adds real Google accounts, a saved profile with retrieval-augmented memory,
live job-posting research, and persistent run history, which a stateless
playground cannot provide.

---

## What it does

One run produces seven chained outputs:

1. **Experience Analyzer** maps messy notes to the target role and flags missing metrics.
2. **Resume Bullet Generator** writes three bullets in "Accomplished X by doing Y, resulting in Z" form.
3. **STAR Interview Story** restructures the same experience into a behavioral answer.
4. **Portfolio Blurb** writes a short project card.
5. **Credibility Checker** audits the bullets for inflated metrics, vague claims, and buzzwords, with fixes.
6. **Recommendations and Action Plan** outputs a Jobright-style **Fit Score (0 to 100)** with skills, experience, and ATS sub-scores, plus a prioritized plan.
7. **Resume in LaTeX** (Jake's Template) ready to copy and paste.

Three differentiators over a chatbot or the playground MVP:

- **Saved profile + RAG.** Fill your profile once; the app embeds it and recalls the relevant parts on every run.
- **Live job-URL research.** Paste a posting link; the app reads it server-side (Jina Reader, with a fetch fallback and an SSRF guard) and factors it into the analysis and fit score.
- **Repeatable history.** Every run is saved and consistent, the structural advantage over one-off chats.

**Design principle: credibility over keyword-stuffing.** A higher ATS number is not
worth a bullet that collapses under one interview follow-up.

---

## Architecture

```
Inputs (target role, job URL/text, focus, raw experience, education, projects)
   + RAG context retrieved from the saved profile
        |
        v
Experience Analyzer
   |
   +--> Resume Bullets --> Credibility Checker
   |                  \--> Resume (LaTeX)
   +--> STAR Story
   +--> Portfolio Blurb
        |
        v
Recommendations + Fit Score   (reads analyzer + bullets + credibility + job text)
```

The chain runs server-side and streams each output to the client as it completes
(NDJSON), so cards fill progressively. Independent steps run in parallel, so the
wall-clock is about four sequential model calls rather than seven.

**Stack**

- **Next.js 16** (App Router) and **React 19**, TypeScript strict, Tailwind CSS v4.
- **Supabase**: Postgres + `pgvector` + Auth (Google sign-in), with row-level security tying every row to its owner.
- **Free multi-provider LLM layer** with automatic fallback. The live config runs **Groq** (Llama 3.3 70B) as primary and **Cerebras** (gpt-oss-120b) as fallback; their rate limits are complementary (Groq caps tokens/min, Cerebras caps requests/min), so one covers the other. Also supports OpenRouter, Hugging Face, and Gemini, plus optional Anthropic Claude, all behind one swappable interface (`lib/llm.ts`).
- **Voyage AI** embeddings for semantic RAG (optional; falls back to Postgres full-text search).
- **Jina AI Reader** for job-URL research.
- Deployed on **Vercel** with GitHub auto-deploy.

---

## Local development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the env template and fill it in:

   ```bash
   cp .env.example .env.local
   ```

   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are required.
   At least one free LLM key is required for generation: any of `GROQ_API_KEY`,
   `CEREBRAS_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, or `HF_API_KEY`
   (set several for automatic fallback; order them with `LLM_ORDER`). `VOYAGE_API_KEY`
   and `JINA_API_KEY` are optional.

3. Apply the database schema (Supabase SQL editor or CLI) from
   `supabase/migrations/0001_init.sql`.

4. Run the dev server:

   ```bash
   npm run dev
   ```

---

## Deployment

Deployed on Vercel with GitHub auto-deploy (every push to `main` ships). Set the
same environment variables in the Vercel project. The `NEXT_PUBLIC_` values are
inlined at build time, so add them before deploying. For Google sign-in, enable
the Google provider in Supabase and set the Site URL plus
`<your-domain>/auth/callback` in the redirect allowlist.

---

## License

All rights reserved. See [LICENSE](LICENSE). This is a proprietary portfolio
project; the code and prompts may not be copied or reused without written
permission.
