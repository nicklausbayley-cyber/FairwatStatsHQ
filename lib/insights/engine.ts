import { aggregateMetric, compareMetric, groupOutings, normalizeRounds, outingKey } from "./aggregate";
import {
  COUNTING_RELIABILITY_THRESHOLD, COUNTING_SCORES, COUNTING_WINDOW,
  MIN_COUNTING_EVENTS, METRICS, METRIC_RULES, confidenceForOutings, formatMetricValue
} from "./rules";
import type {
  CoachInsight, CoachInsightsReport, InsightEvent, InsightHoleRow, InsightPlayer,
  InsightRoundRow, InsightFormat, InsightSource, MetricComparison, NormalizedRound,
  PracticePriority, RoundFormat, TrendMetric
} from "./types";

export type CoachInsightsInput = {
  rounds: InsightRoundRow[];
  holeRows: InsightHoleRow[];
  players: InsightPlayer[];
  events: InsightEvent[];
  holes: InsightFormat;
  source?: InsightSource;
};

function rankInsights(a: CoachInsight, b: CoachInsight) {
  return b.severity - a.severity || a.id.localeCompare(b.id);
}

function describeChange(comparison: MetricComparison, holes: InsightFormat) {
  const { category, recentValue, baselineValue, delta } = comparison;
  if (recentValue === null || baselineValue === null || delta === null) return "";
  const rule = METRIC_RULES[category];
  const changeUnit = rule.unit === "percentage_points" ? "percentage points"
    : rule.unit === "per_18" ? "per 18-hole equivalent"
    : rule.unit === "putts"
      ? holes === "all" ? "putts per nine-hole equivalent" : `putts per ${holes}-hole round`
      : holes === "all" ? "strokes per nine-hole equivalent" : `strokes per ${holes}-hole round`;
  return `${rule.label} moved from ${formatMetricValue(category, baselineValue)} to ${formatMetricValue(category, recentValue)} (${Math.abs(delta).toFixed(1)} ${changeUnit} ${delta < 0 ? "lower" : "higher"}).`;
}

function trendInsight(comparison: MetricComparison, holes: InsightFormat, player?: InsightPlayer): CoachInsight | null {
  const { recentValue, baselineValue, delta, category, threshold } = comparison;
  if (!comparison.ready || recentValue === null || baselineValue === null || delta === null ||
    Math.abs(delta) + 1e-9 < threshold) return null;
  const rule = METRIC_RULES[category];
  const positive = rule.lowerIsBetter ? delta < 0 : delta > 0;
  const playerName = player ? `${player.first_name} ${player.last_name}`.trim() : undefined;
  const title = positive ? rule.positiveTitle : rule.negativeTitle;
  const subject = player ? `${playerName}: ` : "";
  const size = comparison.evidence.recentOutings;
  const period = comparison.confidence === "early" ? "Early indication only" :
    comparison.confidence === "preliminary" ? "Preliminary comparison" : "Established comparison";
  const sample = player
    ? `${period}: the most recent ${size} outing${size === 1 ? "" : "s"} compared with the preceding ${size}.`
    : `${period}: the most recent ${size} team outing${size === 1 ? "" : "s"} compared with the preceding ${size}, using ${comparison.evidence.playerCount} player${comparison.evidence.playerCount === 1 ? "" : "s"} with recorded stats in both periods.${comparison.lineupChanged ? " The lineup differed between periods; the comparison only uses overlapping players." : ""}`;
  return {
    id: `${player?.id ?? "team"}:${holes}:${category}`,
    scope: player ? "player" : "team", category,
    direction: positive ? "positive" : "negative",
    title: `${subject}${title}`, body: `${describeChange(comparison, holes)} ${sample}`,
    recommendation: positive ? rule.positiveRecommendation : rule.negativeRecommendation,
    recentValue, baselineValue, delta, severity: Math.abs(delta) / threshold,
    confidence: comparison.confidence, lineupChanged: comparison.lineupChanged,
    playerId: player?.id, playerName,
    sampleSize: comparison.evidence.recentRoundIds.length + comparison.evidence.baselineRoundIds.length,
    evidence: comparison.evidence
  };
}

function countingInsights(
  rounds: NormalizedRound[], raw: InsightRoundRow[], excludedIds: Set<string>,
  players: InsightPlayer[], events: InsightEvent[], holes: RoundFormat
) {
  const competitionIds = new Set(events.filter((event) =>
    event.event_type === "match" || event.event_type === "invitational" || event.event_type === "tournament"
  ).map((event) => event.id));
  const invalidOutings = new Set(raw.filter((row) => excludedIds.has(row.id)).map((row) =>
    outingKey({ eventId: row.event_id, playedOn: row.played_on })
  ));
  const formats = new Map<string, Set<number>>();
  for (const row of raw) {
    const key = outingKey({ eventId: row.event_id, playedOn: row.played_on });
    const values = formats.get(key) ?? new Set<number>();
    values.add(row.holes);
    formats.set(key, values);
  }

  const eligible = groupOutings(rounds).filter((outing) => {
    if (!outing.eventId || !competitionIds.has(outing.eventId) || invalidOutings.has(outing.key) ||
      formats.get(outing.key)?.size !== 1 || outing.rounds.length < COUNTING_SCORES) return false;
    const scores = outing.rounds.map((round) => round.score).sort((a, b) => a - b);
    // The schema does not store official tie-breaks or a varsity lineup.
    // A tie at the fourth-score boundary cannot establish who actually counted.
    return scores.length === COUNTING_SCORES || scores[COUNTING_SCORES - 1] !== scores[COUNTING_SCORES];
  }).slice(0, COUNTING_WINDOW);

  if (eligible.length < MIN_COUNTING_EVENTS) return [];
  const insights: CoachInsight[] = [];
  for (const player of players) {
    const playerRounds = eligible.flatMap((outing) => outing.rounds.filter((round) => round.playerId === player.id));
    const counted = eligible.filter((outing) =>
      [...outing.rounds].sort((a, b) => a.score - b.score)
        .slice(0, COUNTING_SCORES).some((round) => round.playerId === player.id)
    ).length;
    if (playerRounds.length < MIN_COUNTING_EVENTS || counted / eligible.length < COUNTING_RELIABILITY_THRESHOLD) continue;
    const name = `${player.first_name} ${player.last_name}`.trim();
    insights.push({
      id: `${player.id}:${holes}:counting_score`, scope: "player", category: "counting_score", direction: "neutral",
      title: `${name}: Reliable low-four score`,
      body: `${name}'s score was among the lowest four in ${counted} of the team's last ${eligible.length} eligible ${holes}-hole competition outings. Appeared in ${playerRounds.length} of those outings.`,
      recommendation: "Use this contribution alongside current form and your knowledge of the players when reviewing the lineup.",
      recentValue: counted / eligible.length * 100, baselineValue: null, delta: null,
      severity: counted / eligible.length, playerId: player.id, playerName: name, sampleSize: eligible.length,
      evidence: {
        recentRoundIds: playerRounds.map((round) => round.id), baselineRoundIds: [],
        recentOutings: eligible.length, baselineOutings: 0,
        recentDates: eligible.map((outing) => outing.playedOn), baselineDates: [], playerCount: 1
      }
    });
  }
  return insights;
}

const PRACTICE_CATEGORIES: Partial<Record<TrendMetric, {
  category: PracticePriority["category"];
  title: string;
}>> = {
  gir: { category: "approach", title: "Approach play" },
  fir: { category: "tee_shots", title: "Tee-shot accuracy" },
  putting: { category: "putting", title: "Putting" },
  three_putts: { category: "putting", title: "Putting" },
  penalties: { category: "course_management", title: "Course management" }
};

export function rankPracticePriorities(insights: CoachInsight[]): PracticePriority[] {
  const categories = new Map<PracticePriority["category"], CoachInsight>();
  for (const insight of insights.filter((item) => item.direction === "negative")) {
    if (insight.category === "counting_score") continue;
    const practice = PRACTICE_CATEGORIES[insight.category];
    if (!practice) continue;
    const existing = categories.get(practice.category);
    // Prefer a supported team signal; otherwise show a named player's signal.
    // Putts and three-putts share one category, so they cannot double its severity.
    if (!existing || (existing.scope === "player" && insight.scope === "team") ||
      (existing.scope === insight.scope && rankInsights(insight, existing) < 0)) {
      categories.set(practice.category, insight);
    }
  }
  return Array.from(categories, ([category, insight]) => ({
    category, title: PRACTICE_CATEGORIES[insight.category as TrendMetric]!.title,
    severity: insight.severity, reason: `${insight.scope === "player" ? `${insight.playerName}: ` : "Team: "}${insight.body}`,
    recommendation: insight.recommendation ?? "", insightId: insight.id, scope: insight.scope
  })).sort((a, b) => b.severity - a.severity || a.category.localeCompare(b.category)).slice(0, 3);
}

function buildSummary(
  snapshot: CoachInsightsReport["snapshot"], teamInsights: CoachInsight[],
  holes: InsightFormat, outings: number, lineupChanged: boolean
) {
  if (outings === 0) return "No completed outings yet. Enter a score to start building your team's coaching baseline.";
  const scoring = teamInsights.find((insight) => insight.category === "scoring");
  const positive = teamInsights.filter((insight) =>
    insight.direction === "positive" && insight.category !== "scoring"
  ).sort(rankInsights)[0];
  const negative = teamInsights.filter((insight) =>
    insight.direction === "negative" && insight.category !== "scoring"
  ).sort(rankInsights)[0];
  const sentences: string[] = [];
  if (scoring) {
    const unit = holes === "all" ? "per nine-hole equivalent" : `per ${holes}-hole round`;
    sentences.push(`Scoring in the comparable group is ${Math.abs(scoring.delta!).toFixed(1)} strokes ${scoring.delta! < 0 ? "lower" : "higher"} ${unit}.`);
  }
  if (positive) sentences.push(`${positive.title}.`);
  if (negative) sentences.push(`${negative.title}; review this with the players when planning practice.`);
  if (sentences.length > 0) {
    const caution = outings < 4 ? "Early indication; more outings are needed to confirm a trend."
      : outings < 6 ? "Preliminary comparison; more outings will improve confidence."
      : "Based on the most recent recorded outings.";
    return `${sentences.join(" ")} ${caution}${lineupChanged ? " Lineup changes may affect the team-level picture." : ""}`;
  }
  const format = holes === "all" ? "nine-hole-equivalent" : `${holes}-hole`;
  const value = snapshot.scoring.recentValue;
  const base = value === null
    ? "Available recorded stats are building the team's baseline."
    : `The latest recorded ${format} scoring average is ${value.toFixed(1)}.`;
  if (outings === 1) return `${base} This is one outing, not yet a trend. Practice notes and recorded metrics can guide the next session.`;
  if (outings < 4) return `${base} Early comparisons are available where the same players have data in both outings; treat small differences cautiously.`;
  if (outings < 6) return `${base} Preliminary two-versus-two comparisons are available where the recorded players overlap.`;
  return `${base} No comparable changes have crossed the coaching thresholds. Review the current metrics and player observations.`;
}

function classifySource(eventId: string | null, events: Map<string, InsightEvent["event_type"]>):
  "competition" | "practice" | "other" {
  if (!eventId) return "practice"; // Unattached scoring is usually practice.
  const type = events.get(eventId);
  if (type === "match" || type === "invitational" || type === "tournament") return "competition";
  if (type === "practice") return "practice";
  return "other"; // Qualifiers or events without known metadata.
}

/** Evidence-first early suggestions. A recorded penalty/three-putt is a
 * review opportunity, NOT proof that performance is deteriorating. */
function earlyPracticePriorities(rounds: NormalizedRound[], format: InsightFormat): PracticePriority[] {
  if (rounds.length === 0) return [];
  const choices: Array<{
    category: PracticePriority["category"];
    metric: "three_putts" | "penalties";
    title: string;
    recommendation: string;
  }> = [
    { category: "putting", metric: "three_putts", title: "Putting",
      recommendation: "Review three-putt holes and practice lag putting and speed control." },
    { category: "course_management", metric: "penalties", title: "Course management",
      recommendation: "Review when penalty strokes occurred and discuss safer targets and recovery choices." }
  ];
  return choices.flatMap((choice) => {
    const eligible = rounds.filter((round) =>
      choice.metric === "three_putts" ? round.threePuttsPer18 !== null : round.penaltiesPer18 !== null
    );
    const average = aggregateMetric(eligible, choice.metric, format);
    if (average === null || average < 1) return [];
    const label = choice.metric === "three_putts" ? "three-putts" : "penalty strokes";
    return [{
      category: choice.category, title: choice.title,
      severity: average,
      reason: `Early observation: ${average.toFixed(1)} ${label} per 18-hole equivalent over ${eligible.length} recorded round${eligible.length === 1 ? "" : "s"}. This is a practice review suggestion, not an established trend.`,
      recommendation: choice.recommendation,
      insightId: `early:${choice.metric}`, scope: "team" as const
    }];
  }).sort((a, b) => b.severity - a.severity);
}

/** Pure, deterministic rules: no AI, external service, or hidden season filtering. */
export function buildCoachInsights(input: CoachInsightsInput): CoachInsightsReport {
  const { rounds: normalized, excludedIds } = normalizeRounds(input.rounds, input.holeRows);
  const source = input.source ?? "all";
  const eventTypes = new Map(input.events.map((event) => [event.id, event.event_type]));
  const byFormat = normalized.filter((round) =>
    input.holes === "all" || round.holes === input.holes
  );
  const sourceCounts = { competition: 0, practice: 0, other: 0 };
  for (const round of byFormat) sourceCounts[classifySource(round.eventId, eventTypes)]++;
  const rounds = byFormat.filter((round) =>
    source === "all" || classifySource(round.eventId, eventTypes) === source
  );
  const outings = groupOutings(rounds);
  const snapshot = Object.fromEntries(METRICS.map((category) => [
    category, compareMetric(outings, category, input.holes)
  ])) as Record<TrendMetric, MetricComparison>;
  const teamInsights = METRICS.map((category) => trendInsight(snapshot[category], input.holes))
    .filter((insight): insight is CoachInsight => insight !== null);
  const playerInsights: CoachInsight[] = [];
  for (const player of input.players) {
    const playerOutings = groupOutings(rounds.filter((round) => round.playerId === player.id));
    for (const category of METRICS) {
      const insight = trendInsight(compareMetric(playerOutings, category, input.holes), input.holes, player);
      if (insight) playerInsights.push(insight);
    }
  }
  if (input.holes !== "all" && source !== "practice") {
    playerInsights.push(...countingInsights(rounds, input.rounds, excludedIds, input.players, input.events, input.holes));
  }
  const allInsights = [...teamInsights, ...playerInsights].sort(rankInsights);
  const watchPlayers = new Set<string>();
  const playerWatchlist = [...playerInsights].sort(rankInsights).filter((insight) => {
    if (!insight.playerId || watchPlayers.has(insight.playerId)) return false;
    watchPlayers.add(insight.playerId);
    return true;
  }).slice(0, 4);
  const priorities = rankPracticePriorities(allInsights);
  if (outings.length < 4) {
    for (const candidate of earlyPracticePriorities(outings.flatMap((outing) => outing.rounds), input.holes)) {
      if (priorities.length >= 3) break;
      if (!priorities.some((existing) => existing.category === candidate.category)) priorities.push(candidate);
    }
  }
  const parRounds = outings.flatMap((outing) => outing.rounds)
    .filter((round) => round.scoreToParPerNine !== null);
  const parRelative = parRounds.length === 0 ? null : {
    average: parRounds.reduce((sum, round) => sum + round.scoreToParPerNine!, 0) / parRounds.length,
    rounds: parRounds.length
  };
  const lineupChanged = METRICS.some((metric) => snapshot[metric].ready && snapshot[metric].lineupChanged);
  const excludedRounds = input.rounds.filter((row) =>
    (input.holes === "all" || row.holes === input.holes) &&
    (source === "all" || classifySource(row.event_id, eventTypes) === source) &&
    excludedIds.has(row.id)
  ).length;
  return {
    holes: input.holes, source, confidence: confidenceForOutings(outings.length),
    sourceCounts, parRelative,
    summary: buildSummary(snapshot, teamInsights, input.holes, outings.length, lineupChanged),
    snapshot,
    trendingUp: teamInsights.filter((insight) => insight.direction === "positive").sort(rankInsights).slice(0, 2),
    needsAttention: teamInsights.filter((insight) => insight.direction === "negative").sort(rankInsights).slice(0, 2),
    playerWatchlist, practicePriorities: priorities, allInsights,
    completedRounds: outings.reduce((total, outing) => total + outing.rounds.length, 0),
    excludedRounds,
    teamOutings: outings.length, latestPlayedOn: outings[0]?.playedOn ?? null
  };
}
