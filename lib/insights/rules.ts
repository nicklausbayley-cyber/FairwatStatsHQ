import type { RoundFormat, TrendMetric } from "./types";

export const COMPARISON_OUTINGS = 3;
export const COUNTING_SCORES = 4;
export const COUNTING_WINDOW = 6;
export const MIN_COUNTING_EVENTS = 3;
export const COUNTING_RELIABILITY_THRESHOLD = 0.8;

export const METRICS: TrendMetric[] = [
  "scoring", "gir", "fir", "putting", "three_putts", "penalties"
];

export const METRIC_RULES: Record<TrendMetric, {
  label: string;
  lowerIsBetter: boolean;
  threshold: (holes: RoundFormat) => number;
  unit: "strokes" | "percentage_points" | "putts" | "per_18";
  positiveTitle: string;
  negativeTitle: string;
  positiveRecommendation: string;
  negativeRecommendation: string;
}> = {
  scoring: {
    label: "Scoring average",
    lowerIsBetter: true,
    threshold: (holes) => holes === 9 ? 1 : 2,
    unit: "strokes",
    positiveTitle: "Scoring is improving",
    negativeTitle: "Scoring needs attention",
    positiveRecommendation: "Review recent rounds with the players and keep reinforcing the routines they found useful.",
    negativeRecommendation: "Review recent scorecards and player notes before choosing a specific practice focus."
  },
  gir: {
    label: "GIR",
    lowerIsBetter: false,
    threshold: () => 8,
    unit: "percentage_points",
    positiveTitle: "More greens in regulation",
    negativeTitle: "Approach performance has slipped",
    positiveRecommendation: "Keep tracking green contact and reinforcing approach-shot consistency.",
    negativeRecommendation: "Practice approach-shot consistency and green contact; review club selection with players."
  },
  fir: {
    label: "FIR",
    lowerIsBetter: false,
    threshold: () => 10,
    unit: "percentage_points",
    positiveTitle: "Tee-shot accuracy is improving",
    negativeTitle: "Tee-shot accuracy has slipped",
    positiveRecommendation: "Keep reinforcing tee-shot target selection and repeatable routines.",
    negativeRecommendation: "Practice tee-shot accuracy and discuss targets and club choices off the tee."
  },
  putting: {
    label: "Putts per round",
    lowerIsBetter: true,
    threshold: (holes) => holes === 9 ? 0.75 : 1.5,
    unit: "putts",
    positiveTitle: "Fewer putts per round",
    negativeTitle: "Putting needs attention",
    positiveRecommendation: "Continue putting practice and check GIR alongside putt totals for context.",
    negativeRecommendation: "Review putting routines and speed control, checking GIR alongside putt totals for context."
  },
  three_putts: {
    label: "Three-putts per 18 holes",
    lowerIsBetter: true,
    threshold: () => 0.75,
    unit: "per_18",
    positiveTitle: "Three-putts are decreasing",
    negativeTitle: "More three-putts",
    positiveRecommendation: "Keep emphasizing distance control and leaving a manageable second putt.",
    negativeRecommendation: "Prioritize lag putting, distance control, and second-putt routines."
  },
  penalties: {
    label: "Penalties per 18 holes",
    lowerIsBetter: true,
    threshold: () => 0.75,
    unit: "per_18",
    positiveTitle: "Fewer penalty strokes",
    negativeTitle: "Penalty strokes are increasing",
    positiveRecommendation: "Keep reinforcing conservative targets and recovery decisions.",
    negativeRecommendation: "Review where penalties occur and discuss safer targets, club selection, and recovery decisions."
  }
};

export function formatMetricValue(category: TrendMetric, value: number) {
  if (category === "gir" || category === "fir") {
    return `${value.toFixed(1)}%`;
  }

  return value.toFixed(1);
}
