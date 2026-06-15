import type { FocusKey } from "@/lib/types";

export interface FocusOption {
  key: FocusKey;
  label: string;
  // A short tone instruction injected into prompts so output matches the lane.
  tone: string;
}

export const FOCUS_OPTIONS: FocusOption[] = [
  {
    key: "software_engineering",
    label: "Software Engineering",
    tone: "Emphasize systems built, languages and frameworks, scale, reliability, and shipping software end to end.",
  },
  {
    key: "ai_ml",
    label: "AI and ML",
    tone: "Emphasize models, data pipelines, evaluation, accuracy or latency gains, and applied machine learning.",
  },
  {
    key: "data",
    label: "Data",
    tone: "Emphasize data modeling, analysis, dashboards, SQL and pipelines, and decisions driven by the numbers.",
  },
  {
    key: "product_business",
    label: "Product and Business",
    tone: "Emphasize user impact, stakeholder communication, prioritization, and measurable business outcomes.",
  },
  {
    key: "internship",
    label: "Internship",
    tone: "Calibrate scope and seniority for an early-career candidate; value learning velocity and ownership of a real feature.",
  },
];

export function focusTone(key: FocusKey): string {
  return FOCUS_OPTIONS.find((option) => option.key === key)?.tone ?? "";
}

export function focusLabel(key: FocusKey): string {
  return FOCUS_OPTIONS.find((option) => option.key === key)?.label ?? key;
}
