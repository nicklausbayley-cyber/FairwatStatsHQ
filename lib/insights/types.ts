import type { Database } from "../supabase/types";

export type RoundFormat = 9 | 18;
export type TrendMetric =
  | "scoring"
  | "gir"
  | "fir"
  | "putting"
  | "three_putts"
  | "penalties";

export type InsightRoundRow = Pick<
  Database["public"]["Tables"]["rounds"]["Row"],
  | "id" | "team_id" | "season_id" | "player_id" | "event_id"
  | "played_on" | "created_at" | "holes" | "score" | "putts"
  | "fairways_hit" | "fairways_possible" | "greens_in_regulation"
  | "gir_possible" | "penalties" | "three_putts"
>;

export type InsightHoleRow = Pick<
  Database["public"]["Tables"]["round_holes"]["Row"],
  "round_id" | "hole_number" | "par" | "score" | "putts" | "fir" | "gir" | "penalty"
>;

export type InsightPlayer = Pick<
  Database["public"]["Tables"]["players"]["Row"],
  "id" | "first_name" | "last_name"
>;

export type InsightEvent = Pick<
  Database["public"]["Tables"]["events"]["Row"],
  "id" | "event_type"
>;

export type NormalizedRound = {
  id: string;
  playerId: string;
  eventId: string | null;
  playedOn: string;
  createdAt: string;
  holes: RoundFormat;
  score: number;
  putts: number | null;
  gir: { hit: number; possible: number } | null;
  fir: { hit: number; possible: number } | null;
  threePuttsPer18: number | null;
  penaltiesPer18: number | null;
};

export type Outing = {
  key: string;
  playedOn: string;
  eventId: string | null;
  rounds: NormalizedRound[];
};

export type InsightEvidence = {
  recentRoundIds: string[];
  baselineRoundIds: string[];
  recentOutings: number;
  baselineOutings: number;
  recentDates: string[];
  baselineDates: string[];
  playerCount: number;
};

export type MetricComparison = {
  category: TrendMetric;
  recentValue: number | null;
  baselineValue: number | null;
  delta: number | null;
  threshold: number;
  unit: "strokes" | "percentage_points" | "putts" | "per_18";
  ready: boolean;
  reason: string | null;
  evidence: InsightEvidence;
};

export type CoachInsight = {
  id: string;
  scope: "team" | "player";
  category: TrendMetric | "counting_score";
  direction: "positive" | "negative" | "neutral";
  title: string;
  body: string;
  recommendation?: string;
  recentValue: number;
  baselineValue: number | null;
  delta: number | null;
  severity: number;
  playerId?: string;
  playerName?: string;
  sampleSize: number;
  evidence: InsightEvidence;
};

export type PracticePriority = {
  category: "approach" | "tee_shots" | "putting" | "course_management";
  title: string;
  severity: number;
  reason: string;
  recommendation: string;
  insightId: string;
  scope: "team" | "player";
};

export type CoachInsightsReport = {
  holes: RoundFormat;
  summary: string;
  snapshot: Record<TrendMetric, MetricComparison>;
  trendingUp: CoachInsight[];
  needsAttention: CoachInsight[];
  playerWatchlist: CoachInsight[];
  practicePriorities: PracticePriority[];
  allInsights: CoachInsight[];
  completedRounds: number;
  excludedRounds: number;
  teamOutings: number;
  latestPlayedOn: string | null;
};
