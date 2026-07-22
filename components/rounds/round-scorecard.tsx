import { cn } from "../ui/primitives";
import { ScoreIndicatorValue } from "./score-indicator";
import type { RoundHoleDetails } from "./round-types";

type ScorecardTotals = {
  score: number;
  par: number;
  putts: number | null;
  fairwaysHit: number;
  fairwaysPossible: number;
  greensInRegulation: number;
  girPossible: number;
  penalties: number;
};

function calculateTotals(
  holes: RoundHoleDetails[]
): ScorecardTotals {
  const putts = holes
    .map((hole) => hole.putts)
    .filter((value): value is number => value !== null);

  const fairwayHoles = holes.filter(
    (hole) => hole.par !== 3
  );

  return {
    score: holes.reduce(
      (total, hole) => total + hole.score,
      0
    ),
    par: holes.reduce(
      (total, hole) => total + hole.par,
      0
    ),
    putts:
      putts.length > 0
        ? putts.reduce(
            (total, value) => total + value,
            0
          )
        : null,
    fairwaysHit: fairwayHoles.filter(
      (hole) => hole.fir === true
    ).length,
    fairwaysPossible: fairwayHoles.length,
    greensInRegulation: holes.filter(
      (hole) => hole.gir
    ).length,
    girPossible: holes.length,
    penalties: holes.reduce(
      (total, hole) => total + (hole.penalty ?? 0),
      0
    )
  };
}

function formatToPar(score: number, par: number) {
  const difference = score - par;

  if (difference === 0) {
    return "E";
  }

  return difference > 0
    ? `+${difference}`
    : difference.toString();
}

function StaticRow({
  label,
  values,
  total,
  emphasized = false,
  muted = false
}: {
  label: string;
  values: Array<string | number>;
  total: string | number;
  emphasized?: boolean;
  muted?: boolean;
}) {
  return (
    <tr
      className={cn(
        "border-t border-slate-200",
        emphasized && "bg-green-50/60",
        muted && "bg-slate-50/60"
      )}
    >
      <RowLabel label={label} emphasized={emphasized} />

      {values.map((value, index) => (
        <td
          key={`${label}-${index}`}
          className={cn(
            "border-r border-slate-200 px-2 py-3 font-medium",
            emphasized
              ? "font-bold text-green-950"
              : "text-slate-700",
            muted && "text-slate-500"
          )}
        >
          {value}
        </td>
      ))}

      <TotalCell value={total} emphasized={emphasized} />
    </tr>
  );
}

function BooleanRow({
  label,
  holes,
  value,
  total
}: {
  label: string;
  holes: RoundHoleDetails[];
  value: (hole: RoundHoleDetails) => boolean | null;
  total: string;
}) {
  return (
    <tr className="border-t border-slate-200">
      <RowLabel label={label} />

      {holes.map((hole) => {
        const result = value(hole);

        return (
          <td
            key={`${label}-${hole.holeNumber}`}
            className="border-r border-slate-200 px-2 py-3"
          >
            {result === null ? (
              <span className="font-semibold text-slate-300">
                —
              </span>
            ) : result ? (
              <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-md bg-green-800 font-bold text-white">
                ✓
              </span>
            ) : (
              <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-300">
                —
              </span>
            )}
          </td>
        );
      })}

      <TotalCell value={total} />
    </tr>
  );
}

function RowLabel({
  label,
  emphasized = false
}: {
  label: string;
  emphasized?: boolean;
}) {
  return (
    <th
      scope="row"
      className={cn(
        "sticky left-0 z-10 border-r border-slate-200 bg-slate-50 px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600",
        emphasized && "bg-green-100 text-green-950"
      )}
    >
      {label}
    </th>
  );
}

function TotalCell({
  value,
  emphasized = false
}: {
  value: string | number;
  emphasized?: boolean;
}) {
  return (
    <td
      className={cn(
        "bg-slate-100 px-3 py-3 font-bold text-slate-900",
        emphasized &&
          "bg-green-200 text-lg text-green-950"
      )}
    >
      {value}
    </td>
  );
}

function NineHoleScorecard({
  title,
  subtotalLabel,
  holes
}: {
  title: string;
  subtotalLabel: string;
  holes: RoundHoleDetails[];
}) {
  const totals = calculateTotals(holes);

  return (
    <section className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
        <h3 className="text-lg font-bold text-slate-950">
          {title}
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Holes {holes[0]?.holeNumber}–
          {holes[holes.length - 1]?.holeNumber}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-center text-sm">
          <thead>
            <tr className="bg-green-900 text-white">
              <th className="sticky left-0 z-20 min-w-28 border-r border-green-700 bg-green-900 px-3 py-3 text-left text-xs font-bold uppercase tracking-wide">
                Hole
              </th>

              {holes.map((hole) => (
                <th
                  key={hole.holeNumber}
                  className="min-w-20 border-r border-green-700 px-2 py-3 text-base font-bold"
                >
                  {hole.holeNumber}
                </th>
              ))}

              <th className="min-w-24 bg-green-950 px-3 py-3 font-bold">
                {subtotalLabel}
              </th>
            </tr>
          </thead>

          <tbody>
            <StaticRow
              label="Handicap"
              values={holes.map(
                (hole) => hole.handicap ?? "—"
              )}
              total="—"
              muted
            />

            <StaticRow
              label="Par"
              values={holes.map((hole) => hole.par)}
              total={totals.par}
              emphasized
            />

            <tr className="border-t border-slate-200 bg-green-50/60">
              <RowLabel label="Score" emphasized />

              {holes.map((hole) => (
                <td
                  key={hole.holeNumber}
                  className="border-r border-slate-200 px-2 py-2"
                >
                  <ScoreIndicatorValue
                    score={hole.score}
                    par={hole.par}
                  />
                </td>
              ))}

              <TotalCell
                value={totals.score}
                emphasized
              />
            </tr>

            <StaticRow
              label="Putts"
              values={holes.map(
                (hole) => hole.putts ?? "—"
              )}
              total={totals.putts ?? "—"}
            />

            <BooleanRow
              label="FIR"
              holes={holes}
              value={(hole) =>
                hole.par === 3 ? null : hole.fir === true
              }
              total={`${totals.fairwaysHit}/${totals.fairwaysPossible}`}
            />

            <BooleanRow
              label="GIR"
              holes={holes}
              value={(hole) => hole.gir}
              total={`${totals.greensInRegulation}/${totals.girPossible}`}
            />

            <StaticRow
              label="Penalty"
              values={holes.map(
                (hole) => hole.penalty ?? 0
              )}
              total={totals.penalties}
              muted
            />
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function RoundScorecard({
  holes
}: {
  holes: RoundHoleDetails[];
}) {
  const sortedHoles = [...holes].sort(
    (left, right) =>
      left.holeNumber - right.holeNumber
  );
  const roundTotals = calculateTotals(sortedHoles);

  if (sortedHoles.length === 9) {
    return (
      <NineHoleScorecard
        title="Nine-Hole Scorecard"
        subtotalLabel="TOTAL"
        holes={sortedHoles}
      />
    );
  }

  const frontNine = sortedHoles.slice(0, 9);
  const backNine = sortedHoles.slice(9);

  return (
    <div className="space-y-6">
      <NineHoleScorecard
        title="Front Nine"
        subtotalLabel="OUT"
        holes={frontNine}
      />

      <NineHoleScorecard
        title="Back Nine"
        subtotalLabel="IN"
        holes={backNine}
      />

      <div className="rounded-xl border border-green-800 bg-green-900 px-5 py-4 text-white shadow-sm">
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <RoundTotal
            label="Total Score"
            value={roundTotals.score.toString()}
          />
          <RoundTotal
            label="Total Par"
            value={roundTotals.par.toString()}
          />
          <RoundTotal
            label="To Par"
            value={formatToPar(
              roundTotals.score,
              roundTotals.par
            )}
          />
          <RoundTotal
            label="Putts"
            value={roundTotals.putts?.toString() ?? "—"}
          />
          <RoundTotal
            label="FIR"
            value={`${roundTotals.fairwaysHit}/${roundTotals.fairwaysPossible}`}
          />
          <RoundTotal
            label="GIR"
            value={`${roundTotals.greensInRegulation}/${roundTotals.girPossible}`}
          />
        </div>
      </div>
    </div>
  );
}

function RoundTotal({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-green-100">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold">
        {value}
      </p>
    </div>
  );
}
