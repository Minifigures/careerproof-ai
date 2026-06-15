// Shared domain types for CareerProof AI.

export type FocusKey =
  | "software_engineering"
  | "ai_ml"
  | "data"
  | "product_business"
  | "internship";

// The seven chained outputs, in dependency order.
export type OutputKind =
  | "experience_analyzer"
  | "resume_bullets"
  | "star_story"
  | "portfolio_blurb"
  | "credibility_check"
  | "recommendations"
  | "latex_resume";

export const OUTPUT_KINDS: OutputKind[] = [
  "experience_analyzer",
  "resume_bullets",
  "star_story",
  "portfolio_blurb",
  "credibility_check",
  "recommendations",
  "latex_resume",
];

export const OUTPUT_LABELS: Record<OutputKind, string> = {
  experience_analyzer: "Experience Analyzer",
  resume_bullets: "Resume Bullet Generator",
  star_story: "STAR Interview Story",
  portfolio_blurb: "Portfolio Blurb",
  credibility_check: "Credibility Checker",
  recommendations: "Recommendations and Action Plan",
  latex_resume: "Resume in LaTeX (Jake's Template)",
};

export interface GenerateInput {
  targetRole: string;
  jobUrl?: string;
  // jobText is resolved server-side from jobUrl, or pasted directly.
  jobText?: string;
  rawExperience: string;
  focus: FocusKey;
  education?: string;
  keyProjects?: string;
  // Retrieved profile context (RAG), injected server-side.
  ragContext?: string;
}

// One newline-delimited event emitted by the streaming generate endpoint.
export interface OutputEvent {
  kind: OutputKind;
  status: "start" | "done" | "error";
  content?: string;
  error?: string;
}

export interface ProfileRecord {
  full_name: string;
  email: string;
  phone: string;
  location: string;
  links: string;
  headline: string;
  summary: string;
  work_experience: string;
  education: string;
  skills: string;
  projects: string;
}

export const EMPTY_PROFILE: ProfileRecord = {
  full_name: "",
  email: "",
  phone: "",
  location: "",
  links: "",
  headline: "",
  summary: "",
  work_experience: "",
  education: "",
  skills: "",
  projects: "",
};
