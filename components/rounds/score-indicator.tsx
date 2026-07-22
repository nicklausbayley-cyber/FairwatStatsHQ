import { cn } from "../ui/primitives";

export type ScoreIndicator =
  | "eagle-or-better"
  | "birdie"
  | "par"
  | "bogey"
  | "double-bogey-or-worse"
  | null;

export function getScoreIndicator(
  value: string | number,
  par?: number | null
): ScoreIndicator {
  const normalizedValue =
    typeof value === "string" ? value.trim() : value;

  if (normalizedValue === "" || par === undefined || par === null) {
    return null;
  }

  const score = Number(normalizedValue);

  if (!Number.isFinite(score)) {
    return null;
  }

  const difference = score - par;

  if (difference <= -2) {
    return "eagle-or-better";
  }

  if (difference === -1) {
    return "birdie";
  }

  if (difference === 0) {
    return "par";
  }

  if (difference === 1) {
    return "bogey";
  }

  return "double-bogey-or-worse";
}

export function getScoreIndicatorClassName(
  indicator: ScoreIndicator
) {
  switch (indicator) {
    case "eagle-or-better":
      return "rounded-full border-2 border-red-700 bg-red-50 text-red-950 ring-2 ring-red-700 ring-offset-2";

    case "birdie":
      return "rounded-full border-2 border-red-600 bg-red-50 text-red-950";

    case "bogey":
      return "rounded-sm border-2 border-blue-700 bg-blue-50 text-blue-950";

    case "double-bogey-or-worse":
      return "rounded-sm border-4 border-double border-blue-800 bg-blue-50 text-blue-950";

    case "par":
    case null:
    default:
      return "rounded-md border border-green-400 bg-green-50 text-green-950";
  }
}

export function getScoreIndicatorLabel(
  indicator: ScoreIndicator
) {
  switch (indicator) {
    case "eagle-or-better":
      return "Eagle or better";

    case "birdie":
      return "Birdie";

    case "par":
      return "Par";

    case "bogey":
      return "Bogey";

    case "double-bogey-or-worse":
      return "Double bogey or worse";

    default:
      return undefined;
  }
}

export function ScoreIndicatorValue({
  score,
  par,
  className
}: {
  score: number;
  par: number;
  className?: string;
}) {
  const indicator = getScoreIndicator(score, par);

  return (
    <span
      title={getScoreIndicatorLabel(indicator)}
      className={cn(
        "mx-auto inline-flex h-10 w-10 items-center justify-center text-base font-bold",
        getScoreIndicatorClassName(indicator),
        className
      )}
    >
      {score}
    </span>
  );
}

export function ScoreIndicatorLegendItem({
  indicator,
  display,
  label
}: {
  indicator: Exclude<ScoreIndicator, null>;
  display: string;
  label: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm">
      <span
        className={cn(
          "flex h-7 w-7 items-center justify-center text-[10px] font-bold",
          getScoreIndicatorClassName(indicator)
        )}
        aria-hidden="true"
      >
        {display}
      </span>

      <span>{label}</span>
    </div>
  );
}
