import Link from "next/link";
import { Nav } from "@/components/nav";

const FEATURES = [
  {
    title: "Experience Analyzer",
    body: "Maps your messy notes to a target role and flags exactly which numbers are missing.",
  },
  {
    title: "Quantified resume bullets",
    body: 'Three bullets in the proven "Accomplished X by doing Y, resulting in Z" form.',
  },
  {
    title: "STAR interview story",
    body: "The same experience restructured into a tight, deliverable behavioral answer.",
  },
  {
    title: "Credibility check",
    body: "A skeptical audit that strips inflated metrics and buzzwords before a recruiter sees them.",
  },
  {
    title: "Jobright-style fit score",
    body: "A 0 to 100 score with skills, experience, and ATS sub-scores, plus a real action plan.",
  },
  {
    title: "LaTeX resume + saved profile",
    body: "Copy-paste Jake's Template output, and a profile the app remembers across runs (RAG).",
  },
];

export default function Home() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-5xl px-4">
        <section className="py-16 sm:py-24">
          <p className="mb-3 text-sm font-medium uppercase tracking-wide text-teal-700">
            Career prep, grounded in what you can defend
          </p>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">
            Turn messy experience into a strong, defensible application.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-stone-600">
            CareerProof AI takes one rough description of your work or projects
            plus a target role (or a job link it researches) and returns
            quantified resume bullets, a STAR interview answer, a LaTeX resume,
            and a fit score, with a credibility check that keeps every claim
            honest.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/app"
              className="rounded-md bg-teal-700 px-5 py-2.5 font-medium text-white transition hover:bg-teal-800"
            >
              Start now
            </Link>
            <Link
              href="/login"
              className="rounded-md border border-stone-300 bg-white px-5 py-2.5 font-medium text-stone-700 transition hover:bg-stone-100"
            >
              Sign in
            </Link>
          </div>
        </section>

        <section className="grid gap-4 pb-16 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-stone-200 bg-white p-5"
            >
              <h2 className="font-semibold text-stone-900">{feature.title}</h2>
              <p className="mt-1.5 text-sm text-stone-600">{feature.body}</p>
            </div>
          ))}
        </section>

        <section className="border-t border-stone-200 py-10 text-sm text-stone-500">
          <p>
            The principle: credibility over keyword-stuffing. A higher ATS number
            is not worth a bullet that collapses under one interview follow-up.
          </p>
        </section>
      </main>
    </>
  );
}
