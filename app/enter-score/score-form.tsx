"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  EmptyState,
  Message,
  appPanelClassName,
  cn,
  inputClassName,
  primaryButtonClassName,
  secondaryButtonClassName
} from "../../components/ui/primitives";

type PlayerOption = {
  id: string;
  firstName: string;
  lastName: string;
};

type EventOption = {
  id: string;
  name: string;
  eventDate: string;
  eventType: string;
};

type CourseOption = {
  id: string;
  name: string;
  location: string | null;
};

type CourseHole = {
  holeNumber: number;
  par: number;
  handicap: number | null;
  yardage: number | null;
};

type HoleEntry = CourseHole & {
  score: string;
  putts: string;
  fir: boolean | null;
  gir: boolean;
  penalty: string;
};

type CourseHolesResult = {
  success: boolean;
  holes?: Array<{
    hole_number: number;
    par: number;
    handicap: number | null;
    yardage: number | null;
  }>;
  message?: string;
};

type ScoreFormProps = {
  teamId: string;
  activeSeasonName: string | null;
  players: PlayerOption[];
  events: EventOption[];
  courses: CourseOption[];
  isPlayerEntryLocked?: boolean;
};

type SubmitRoundInput = {
  teamId: string;
  playerId: string;
  eventId: string | null;
  courseId?: string | null;
  playedOn: string;
  holes: 9 | 18;
  score: number;
  par: number | null;
  putts: number | null;
  fairwaysHit: number | null;
  fairwaysPossible: number | null;
  greensInRegulation: number | null;
  girPossible: number | null;
  penalties: number | null;
  threePutts: number | null;
  notes: string | null;
  holeEntries?: Array<{
    holeNumber: number;
    par: number;
    handicap: number | null;
    score: number;
    putts: number | null;
    fir: boolean | null;
    gir: boolean;
    penalty: number | null;
  }>;
};

type SubmitRoundResult = {
  success: boolean;
  message: string;
};

type EntryMode = "hole-by-hole" | "summary";

type FormState = {
  playerId: string;
  eventId: string;
  courseId: string;
  playedOn: string;
  holes: "9" | "18";
  score: string;
  par: string;
  putts: string;
  fairwaysHit: string;
  fairwaysPossible: string;
  greensInRegulation: string;
  girPossible: string;
  penalties: string;
  threePutts: string;
  notes: string;
};

type FormMessage = {
  type: "success" | "error";
  text: string;
};

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getDefaultsForHoles(holes: "9" | "18") {
  return holes === "9"
    ? { par: "36", fairwaysPossible: "7", girPossible: "9" }
    : { par: "72", fairwaysPossible: "14", girPossible: "18" };
}

function createInitialState(defaultCourseId = "", defaultPlayerId = ""): FormState {
  const defaults = getDefaultsForHoles("18");

  return {
    playerId: defaultPlayerId,
    eventId: "",
    courseId: defaultCourseId,
    playedOn: getTodayDate(),
    holes: "18",
    score: "",
    par: defaults.par,
    putts: "",
    fairwaysHit: "",
    fairwaysPossible: defaults.fairwaysPossible,
    greensInRegulation: "",
    girPossible: defaults.girPossible,
    penalties: "0",
    threePutts: "0",
    notes: ""
  };
}

function optionalNumber(value: string) {
  if (value.trim() === "") {
    return null;
  }

  return Number(value);
}

function requiredNumber(value: string) {
  if (value.trim() === "") {
    return null;
  }

  return Number(value);
}

function formatEventLabel(event: EventOption) {
  return `${event.name} (${event.eventDate})`;
}

function createHoleEntries(courseHoles: CourseHole[]): HoleEntry[] {
  return courseHoles.map((hole) => ({
    ...hole,
    score: "",
    putts: "",
    fir: hole.par === 3 ? null : false,
    gir: false,
    penalty: "0"
  }));
}

function calculateHoleTotals(holeEntries: HoleEntry[]) {
  const puttValues = holeEntries
    .map((hole) => optionalNumber(hole.putts))
    .filter((value): value is number => value !== null);
  const totalPenalties = holeEntries.reduce(
    (total, hole) => total + (optionalNumber(hole.penalty) ?? 0),
    0
  );
  const fairwayHoles = holeEntries.filter((hole) => hole.par !== 3);

  return {
    holes: holeEntries.length,
    score: holeEntries.reduce((total, hole) => total + (Number(hole.score) || 0), 0),
    par: holeEntries.reduce((total, hole) => total + hole.par, 0),
    putts:
      puttValues.length > 0
        ? puttValues.reduce((total, value) => total + value, 0)
        : null,
    fairwaysHit: fairwayHoles.filter((hole) => hole.fir === true).length,
    fairwaysPossible: fairwayHoles.length,
    greensInRegulation: holeEntries.filter((hole) => hole.gir).length,
    girPossible: holeEntries.length,
    penalties: totalPenalties,
    threePutts: puttValues.filter((value) => value >= 3).length
  };
}

async function submitRound(input: SubmitRoundInput): Promise<SubmitRoundResult> {
  const response = await fetch("/api/rounds", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  try {
    const result = (await response.json()) as SubmitRoundResult;

    if (!response.ok && result.message) {
      return { success: false, message: result.message };
    }

    return result;
  } catch {
    return {
      success: false,
      message: "Could not read the score submission response."
    };
  }
}

export function ScoreForm({
  teamId,
  activeSeasonName,
  players,
  events,
  courses,
  isPlayerEntryLocked = false
}: ScoreFormProps) {
  const defaultCourseId = courses[0]?.id ?? "";
  const lockedPlayer = isPlayerEntryLocked ? players[0] ?? null : null;
  const defaultPlayerId = lockedPlayer?.id ?? "";
  const [form, setForm] = useState<FormState>(() =>
    createInitialState(defaultCourseId, defaultPlayerId)
  );
  const [entryMode, setEntryMode] = useState<EntryMode>(
    courses.length > 0 ? "hole-by-hole" : "summary"
  );
  const [courseHoles, setCourseHoles] = useState<CourseHole[]>([]);
  const [holeEntries, setHoleEntries] = useState<HoleEntry[]>([]);
  const [isLoadingHoles, setIsLoadingHoles] = useState(false);
  const [message, setMessage] = useState<FormMessage | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const holeTotals = useMemo(() => calculateHoleTotals(holeEntries), [holeEntries]);

  useEffect(() => {
    if (entryMode !== "hole-by-hole" || !form.courseId) {
      return;
    }

    let isCurrent = true;

    async function loadCourseHoles() {
      setIsLoadingHoles(true);

      try {
        const response = await fetch(`/api/courses/${form.courseId}/holes`);
        const result = (await response.json()) as CourseHolesResult;

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Could not load course holes.");
        }

        if (!isCurrent) {
          return;
        }

        const nextCourseHoles = (result.holes ?? []).map((hole) => ({
          holeNumber: hole.hole_number,
          par: hole.par,
          handicap: hole.handicap,
          yardage: hole.yardage
        }));

        setCourseHoles(nextCourseHoles);
        setHoleEntries(createHoleEntries(nextCourseHoles));
      } catch (error) {
        if (!isCurrent) {
          return;
        }

        setCourseHoles([]);
        setHoleEntries([]);
        setMessage({
          type: "error",
          text:
            error instanceof Error
              ? error.message
              : "Could not load course holes."
        });
      } finally {
        if (isCurrent) {
          setIsLoadingHoles(false);
        }
      }
    }

    void loadCourseHoles();

    return () => {
      isCurrent = false;
    };
  }, [entryMode, form.courseId]);

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateHoles(value: "9" | "18") {
    const defaults = getDefaultsForHoles(value);

    setForm((current) => ({
      ...current,
      holes: value,
      par: defaults.par,
      fairwaysPossible: defaults.fairwaysPossible,
      girPossible: defaults.girPossible
    }));
  }

  function updateHoleEntry(
    index: number,
    field: keyof Pick<HoleEntry, "score" | "putts" | "penalty" | "gir" | "fir">,
    value: string | boolean | null
  ) {
    setHoleEntries((current) =>
      current.map((hole, holeIndex) =>
        holeIndex === index ? { ...hole, [field]: value } : hole
      )
    );
  }

  function validateSummaryInput(input: SubmitRoundInput) {
    if (!input.playerId) {
      return "Please choose a player.";
    }

    if (!input.playedOn) {
      return "Please enter the played date.";
    }

    if (!Number.isFinite(input.score) || input.score <= 0) {
      return "Score is required and must be greater than 0.";
    }

    if (
      input.fairwaysHit !== null &&
      input.fairwaysPossible !== null &&
      input.fairwaysHit > input.fairwaysPossible
    ) {
      return "Fairways hit cannot exceed fairways possible.";
    }

    if (
      input.greensInRegulation !== null &&
      input.girPossible !== null &&
      input.greensInRegulation > input.girPossible
    ) {
      return "Greens in regulation cannot exceed GIR possible.";
    }

    return null;
  }

  function buildHoleByHoleInput(): SubmitRoundInput | string {
    if (!form.playerId) {
      return "Please choose a player.";
    }

    if (!form.playedOn) {
      return "Please enter the played date.";
    }

    if (!form.courseId) {
      return "Please choose a course for hole-by-hole entry.";
    }

    if (courseHoles.length !== 9 && courseHoles.length !== 18) {
      return "The selected course needs a saved 9- or 18-hole setup before hole-by-hole entry.";
    }

    for (const hole of holeEntries) {
      const score = requiredNumber(hole.score);
      const putts = optionalNumber(hole.putts);
      const penalty = optionalNumber(hole.penalty);

      if (!Number.isFinite(score) || score === null || score <= 0) {
        return `Hole ${hole.holeNumber} score is required and must be greater than 0.`;
      }

      if (putts !== null && (!Number.isFinite(putts) || putts < 0)) {
        return `Hole ${hole.holeNumber} putts must be 0 or greater.`;
      }

      if (penalty !== null && (!Number.isFinite(penalty) || penalty < 0)) {
        return `Hole ${hole.holeNumber} penalty strokes must be 0 or greater.`;
      }
    }

    return {
      teamId,
      playerId: form.playerId,
      eventId: form.eventId || null,
      courseId: form.courseId,
      playedOn: form.playedOn,
      holes: holeTotals.holes as 9 | 18,
      score: holeTotals.score,
      par: holeTotals.par,
      putts: holeTotals.putts,
      fairwaysHit: holeTotals.fairwaysHit,
      fairwaysPossible: holeTotals.fairwaysPossible,
      greensInRegulation: holeTotals.greensInRegulation,
      girPossible: holeTotals.girPossible,
      penalties: holeTotals.penalties,
      threePutts: holeTotals.threePutts,
      notes: form.notes.trim() || null,
      holeEntries: holeEntries.map((hole) => ({
        holeNumber: hole.holeNumber,
        par: hole.par,
        handicap: hole.handicap,
        score: Number(hole.score),
        putts: optionalNumber(hole.putts),
        fir: hole.par === 3 ? null : hole.fir,
        gir: hole.gir,
        penalty: optionalNumber(hole.penalty)
      }))
    };
  }

  function buildSummaryInput(): SubmitRoundInput | string {
    const score = requiredNumber(form.score);
    const input: SubmitRoundInput = {
      teamId,
      playerId: form.playerId,
      eventId: form.eventId || null,
      courseId: form.courseId || null,
      playedOn: form.playedOn,
      holes: Number(form.holes) as 9 | 18,
      score: score ?? 0,
      par: optionalNumber(form.par),
      putts: optionalNumber(form.putts),
      fairwaysHit: optionalNumber(form.fairwaysHit),
      fairwaysPossible: optionalNumber(form.fairwaysPossible),
      greensInRegulation: optionalNumber(form.greensInRegulation),
      girPossible: optionalNumber(form.girPossible),
      penalties: optionalNumber(form.penalties),
      threePutts: optionalNumber(form.threePutts),
      notes: form.notes.trim() || null
    };

    return validateSummaryInput(input) ?? input;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const input = entryMode === "hole-by-hole" ? buildHoleByHoleInput() : buildSummaryInput();

    if (typeof input === "string") {
      setMessage({ type: "error", text: input });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await submitRound(input);

      setMessage({
        type: result.success ? "success" : "error",
        text: result.message
      });

      if (result.success) {
        setForm(createInitialState(defaultCourseId, defaultPlayerId));
        if (entryMode === "hole-by-hole") {
          setHoleEntries(createHoleEntries(courseHoles));
        }
      }
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Could not save round. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(appPanelClassName, "space-y-6 p-6 sm:p-8")}
    >
      {message ? (
        <Message type={message.type}>{message.text}</Message>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <SelectField
          label="Player"
          value={form.playerId}
          onChange={(value) => updateField("playerId", value)}
          disabled={isPlayerEntryLocked}
          helpText={
            lockedPlayer
              ? "Rounds submitted from your account are tied to your player profile."
              : undefined
          }
          required
        >
          <option value="">Choose a player</option>
          {players.map((player) => (
            <option key={player.id} value={player.id}>
              {player.firstName} {player.lastName}
            </option>
          ))}
        </SelectField>

        <SelectField
          label="Event optional"
          value={form.eventId}
          onChange={(value) => updateField("eventId", value)}
        >
          <option value="">No event</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {formatEventLabel(event)}
            </option>
          ))}
        </SelectField>

        <SelectField
          label="Course"
          value={form.courseId}
          onChange={(value) => {
            updateField("courseId", value);
            setCourseHoles([]);
            setHoleEntries([]);
          }}
        >
          <option value="">No course selected</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.name}{course.location ? ` - ${course.location}` : ""}
            </option>
          ))}
        </SelectField>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Played date</span>
          <input
            type="date"
            value={form.playedOn}
            onChange={(event) => updateField("playedOn", event.target.value)}
            required
            className={inputClassName}
          />
        </label>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
        <p className="text-sm font-semibold text-slate-700">Entry mode</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => setEntryMode("hole-by-hole")}
            disabled={courses.length === 0}
            className={cn(
              secondaryButtonClassName,
              entryMode === "hole-by-hole" &&
                "border-green-700 bg-green-800 text-white hover:bg-green-900 hover:text-white"
            )}
          >
            Hole-by-Hole Entry
          </button>
          <button
            type="button"
            onClick={() => setEntryMode("summary")}
            className={cn(
              secondaryButtonClassName,
              entryMode === "summary" &&
                "border-green-700 bg-green-800 text-white hover:bg-green-900 hover:text-white"
            )}
          >
            Manual Summary
          </button>
        </div>
        {courses.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">
            Add a course on the Courses page to use hole-by-hole entry.
          </p>
        ) : null}
      </div>

      {entryMode === "hole-by-hole" ? (
        <HoleByHoleSection
          holeEntries={holeEntries}
          holeTotals={holeTotals}
          isLoading={isLoadingHoles}
          courseSelected={Boolean(form.courseId)}
          onUpdateHole={updateHoleEntry}
        />
      ) : (
        <SummaryEntrySection form={form} updateField={updateField} updateHoles={updateHoles} />
      )}

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-slate-700">Notes</span>
        <textarea
          value={form.notes}
          onChange={(event) => updateField("notes", event.target.value)}
          rows={4}
          className={inputClassName}
          placeholder="Optional round notes"
        />
      </label>

      <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          {activeSeasonName
            ? `This round will be attached to ${activeSeasonName}.`
            : "No active season is set, so this round will not be season-specific yet."}
        </p>
        <button
          type="submit"
          disabled={isSubmitting || players.length === 0}
          className={primaryButtonClassName}
        >
          {isSubmitting ? "Submitting..." : "Submit Round"}
        </button>
      </div>
    </form>
  );
}

function HoleByHoleSection({
  holeEntries,
  holeTotals,
  isLoading,
  courseSelected,
  onUpdateHole
}: {
  holeEntries: HoleEntry[];
  holeTotals: ReturnType<typeof calculateHoleTotals>;
  isLoading: boolean;
  courseSelected: boolean;
  onUpdateHole: (
    index: number,
    field: keyof Pick<
      HoleEntry,
      "score" | "putts" | "penalty" | "gir" | "fir"
    >,
    value: string | boolean | null
  ) => void;
}) {
  if (!courseSelected) {
    return (
      <EmptyState message="Choose a course to load its hole setup." />
    );
  }

  if (isLoading) {
    return <EmptyState message="Loading course holes..." />;
  }

  if (holeEntries.length === 0) {
    return (
      <EmptyState message="This course does not have holes configured yet. Add hole setup on the Courses page." />
    );
  }

  const completedHoles = holeEntries.filter(
    (hole) => hole.score.trim() !== ""
  ).length;

  const frontNine = holeEntries.slice(0, 9);
  const backNine = holeEntries.slice(9);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
          Scorecard Entry
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
          Record the round hole by hole
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Enter the score and statistics directly into the scorecard. On
          smaller screens, scroll horizontally to move across the holes.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <ScoreIndicatorLegendItem
            indicator="eagle-or-better"
            display="-2"
            label="Eagle or better"
          />
          <ScoreIndicatorLegendItem
            indicator="birdie"
            display="-1"
            label="Birdie"
          />
          <ScoreIndicatorLegendItem
            indicator="par"
            display="E"
            label="Par"
          />
          <ScoreIndicatorLegendItem
            indicator="bogey"
            display="+1"
            label="Bogey"
          />
          <ScoreIndicatorLegendItem
            indicator="double-bogey-or-worse"
            display="+2"
            label="Double bogey or worse"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TotalCard
          label="Score"
          value={
            completedHoles > 0
              ? holeTotals.score.toString()
              : "—"
          }
        />
        <TotalCard
          label="To Par"
          value={formatScoreToPar(holeEntries)}
        />
        <TotalCard
          label="Putts"
          value={holeTotals.putts?.toString() ?? "—"}
        />
        <TotalCard
          label="Penalties"
          value={holeTotals.penalties.toString()}
        />
        <TotalCard
          label="Fairways"
          value={`${holeTotals.fairwaysHit} / ${holeTotals.fairwaysPossible}`}
        />
        <TotalCard
          label="GIR"
          value={`${holeTotals.greensInRegulation} / ${holeTotals.girPossible}`}
        />
        <TotalCard
          label="Three-putts"
          value={holeTotals.threePutts.toString()}
        />
        <TotalCard
          label="Holes Entered"
          value={`${completedHoles} / ${holeTotals.holes}`}
        />
      </div>

      {holeEntries.length === 9 ? (
        <ScorecardNine
          title="Nine-Hole Scorecard"
          subtotalLabel="TOTAL"
          holeEntries={frontNine}
          startIndex={0}
          onUpdateHole={onUpdateHole}
        />
      ) : (
        <>
          <ScorecardNine
            title="Front Nine"
            subtotalLabel="OUT"
            holeEntries={frontNine}
            startIndex={0}
            onUpdateHole={onUpdateHole}
          />

          <ScorecardNine
            title="Back Nine"
            subtotalLabel="IN"
            holeEntries={backNine}
            startIndex={9}
            onUpdateHole={onUpdateHole}
          />

          <div className="rounded-xl border border-green-800 bg-green-900 px-5 py-4 text-white shadow-sm">
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <ScorecardRoundTotal
                label="Total Score"
                value={
                  completedHoles > 0
                    ? holeTotals.score.toString()
                    : "—"
                }
              />
              <ScorecardRoundTotal
                label="Total Par"
                value={holeTotals.par.toString()}
              />
              <ScorecardRoundTotal
                label="To Par"
                value={formatScoreToPar(holeEntries)}
              />
              <ScorecardRoundTotal
                label="Putts"
                value={holeTotals.putts?.toString() ?? "—"}
              />
              <ScorecardRoundTotal
                label="FIR"
                value={`${holeTotals.fairwaysHit}/${holeTotals.fairwaysPossible}`}
              />
              <ScorecardRoundTotal
                label="GIR"
                value={`${holeTotals.greensInRegulation}/${holeTotals.girPossible}`}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ScorecardNine({
  title,
  subtotalLabel,
  holeEntries,
  startIndex,
  onUpdateHole
}: {
  title: string;
  subtotalLabel: string;
  holeEntries: HoleEntry[];
  startIndex: number;
  onUpdateHole: (
    index: number,
    field: keyof Pick<
      HoleEntry,
      "score" | "putts" | "penalty" | "gir" | "fir"
    >,
    value: string | boolean | null
  ) => void;
}) {
  const totals = calculateHoleTotals(holeEntries);

  const hasScores = holeEntries.some(
    (hole) => hole.score.trim() !== ""
  );

  const hasCompleteYardage = holeEntries.every(
    (hole) => hole.yardage !== null
  );

  const totalYardage = holeEntries.reduce(
    (total, hole) => total + (hole.yardage ?? 0),
    0
  );

  return (
    <section className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
      <div className="flex flex-col gap-1 border-b border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-950">
            {title}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Holes {holeEntries[0]?.holeNumber}–
            {holeEntries[holeEntries.length - 1]?.holeNumber}
          </p>
        </div>

        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Tap FIR or GIR to mark it as hit
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[940px] border-collapse text-center text-sm">
          <thead>
            <tr className="bg-green-900 text-white">
              <th className="sticky left-0 z-20 min-w-28 border-r border-green-700 bg-green-900 px-3 py-3 text-left text-xs font-bold uppercase tracking-wide">
                Hole
              </th>

              {holeEntries.map((hole) => (
                <th
                  key={hole.holeNumber}
                  className="min-w-20 border-r border-green-700 px-2 py-3 text-base font-bold"
                >
                  {hole.holeNumber}
                </th>
              ))}

              <th className="min-w-24 bg-green-950 px-3 py-3 text-sm font-bold">
                {subtotalLabel}
              </th>
            </tr>
          </thead>

          <tbody>
            <ScorecardStaticRow
              label="Yards"
              values={holeEntries.map((hole) =>
                hole.yardage?.toString() ?? "—"
              )}
              total={
                hasCompleteYardage
                  ? totalYardage.toString()
                  : "—"
              }
            />

            <ScorecardStaticRow
              label="Handicap"
              values={holeEntries.map((hole) =>
                hole.handicap?.toString() ?? "—"
              )}
              total="—"
              muted
            />

            <ScorecardStaticRow
              label="Par"
              values={holeEntries.map((hole) =>
                hole.par.toString()
              )}
              total={totals.par.toString()}
              emphasized
            />

            <tr className="border-t border-slate-200 bg-green-50/60">
              <ScorecardRowLabel
                label="Score"
                emphasized
              />

              {holeEntries.map((hole, localIndex) => (
                <td
                  key={hole.holeNumber}
                  className="border-r border-slate-200 px-2 py-2"
                >
                  <ScorecardNumberInput
                    value={hole.score}
                    onChange={(value) =>
                      onUpdateHole(
                        startIndex + localIndex,
                        "score",
                        value
                      )
                    }
                    min={1}
                    required
                    emphasized
                    scorePar={hole.par}
                    ariaLabel={`Hole ${hole.holeNumber} score`}
                  />
                </td>
              ))}

              <ScorecardTotalCell
                value={hasScores ? totals.score.toString() : "—"}
                emphasized
              />
            </tr>

            <tr className="border-t border-slate-200">
              <ScorecardRowLabel label="Putts" />

              {holeEntries.map((hole, localIndex) => (
                <td
                  key={hole.holeNumber}
                  className="border-r border-slate-200 px-2 py-2"
                >
                  <ScorecardNumberInput
                    value={hole.putts}
                    onChange={(value) =>
                      onUpdateHole(
                        startIndex + localIndex,
                        "putts",
                        value
                      )
                    }
                    min={0}
                    ariaLabel={`Hole ${hole.holeNumber} putts`}
                  />
                </td>
              ))}

              <ScorecardTotalCell
                value={totals.putts?.toString() ?? "—"}
              />
            </tr>

            <tr className="border-t border-slate-200 bg-slate-50/50">
              <ScorecardRowLabel label="FIR" />

              {holeEntries.map((hole, localIndex) => (
                <td
                  key={hole.holeNumber}
                  className="border-r border-slate-200 px-2 py-2"
                >
                  {hole.par === 3 ? (
                    <span className="text-lg font-semibold text-slate-300">
                      —
                    </span>
                  ) : (
                    <ScorecardToggle
                      checked={hole.fir === true}
                      onChange={(checked) =>
                        onUpdateHole(
                          startIndex + localIndex,
                          "fir",
                          checked
                        )
                      }
                      ariaLabel={`Hole ${hole.holeNumber} fairway hit`}
                    />
                  )}
                </td>
              ))}

              <ScorecardTotalCell
                value={`${totals.fairwaysHit}/${totals.fairwaysPossible}`}
              />
            </tr>

            <tr className="border-t border-slate-200">
              <ScorecardRowLabel label="GIR" />

              {holeEntries.map((hole, localIndex) => (
                <td
                  key={hole.holeNumber}
                  className="border-r border-slate-200 px-2 py-2"
                >
                  <ScorecardToggle
                    checked={hole.gir}
                    onChange={(checked) =>
                      onUpdateHole(
                        startIndex + localIndex,
                        "gir",
                        checked
                      )
                    }
                    ariaLabel={`Hole ${hole.holeNumber} green in regulation`}
                  />
                </td>
              ))}

              <ScorecardTotalCell
                value={`${totals.greensInRegulation}/${totals.girPossible}`}
              />
            </tr>

            <tr className="border-t border-slate-200 bg-slate-50/50">
              <ScorecardRowLabel label="Penalty" />

              {holeEntries.map((hole, localIndex) => (
                <td
                  key={hole.holeNumber}
                  className="border-r border-slate-200 px-2 py-2"
                >
                  <ScorecardNumberInput
                    value={hole.penalty}
                    onChange={(value) =>
                      onUpdateHole(
                        startIndex + localIndex,
                        "penalty",
                        value
                      )
                    }
                    min={0}
                    ariaLabel={`Hole ${hole.holeNumber} penalty strokes`}
                  />
                </td>
              ))}

              <ScorecardTotalCell
                value={totals.penalties.toString()}
              />
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ScorecardStaticRow({
  label,
  values,
  total,
  muted = false,
  emphasized = false
}: {
  label: string;
  values: string[];
  total: string;
  muted?: boolean;
  emphasized?: boolean;
}) {
  return (
    <tr
      className={cn(
        "border-t border-slate-200",
        muted && "bg-slate-50/50",
        emphasized && "bg-green-50/60"
      )}
    >
      <ScorecardRowLabel
        label={label}
        emphasized={emphasized}
      />

      {values.map((value, index) => (
        <td
          key={`${label}-${index}`}
          className={cn(
            "border-r border-slate-200 px-2 py-3 font-medium",
            muted ? "text-slate-500" : "text-slate-700",
            emphasized && "font-bold text-green-950"
          )}
        >
          {value}
        </td>
      ))}

      <ScorecardTotalCell
        value={total}
        emphasized={emphasized}
      />
    </tr>
  );
}

function ScorecardRowLabel({
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

function ScorecardTotalCell({
  value,
  emphasized = false
}: {
  value: string;
  emphasized?: boolean;
}) {
  return (
    <td
      className={cn(
        "bg-slate-100 px-3 py-3 font-bold text-slate-900",
        emphasized && "bg-green-200 text-lg text-green-950"
      )}
    >
      {value}
    </td>
  );
}

type ScoreIndicator =
  | "eagle-or-better"
  | "birdie"
  | "par"
  | "bogey"
  | "double-bogey-or-worse"
  | null;

function getScoreIndicator(
  value: string,
  par?: number
): ScoreIndicator {
  if (value.trim() === "" || par === undefined) {
    return null;
  }

  const score = Number(value);

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

function getScoreIndicatorClassName(
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

function getScoreIndicatorLabel(
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

function ScorecardNumberInput({
  value,
  onChange,
  min,
  required = false,
  emphasized = false,
  scorePar,
  ariaLabel
}: {
  value: string;
  onChange: (value: string) => void;
  min?: number;
  required?: boolean;
  emphasized?: boolean;
  scorePar?: number;
  ariaLabel: string;
}) {
  const indicator = emphasized
    ? getScoreIndicator(value, scorePar)
    : null;

  const indicatorLabel = getScoreIndicatorLabel(indicator);

  return (
    <input
      type="number"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onFocus={(event) => event.currentTarget.select()}
      min={min}
      required={required}
      inputMode="numeric"
      aria-label={ariaLabel}
      title={indicatorLabel}
      className={cn(
        "mx-auto px-1 text-center outline-none transition focus:ring-2 focus:ring-green-200 focus:ring-offset-1",
        emphasized
          ? cn(
              "h-12 w-12 text-lg font-bold",
              getScoreIndicatorClassName(indicator)
            )
          : "h-11 w-14 rounded-md border border-slate-300 bg-white text-base font-semibold text-slate-950"
      )}
    />
  );
}

function ScoreIndicatorLegendItem({
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

function ScorecardToggle({
  checked,
  onChange,
  ariaLabel
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      aria-label={ariaLabel}
      className={cn(
        "mx-auto flex h-10 w-10 items-center justify-center rounded-md border text-lg font-bold transition focus:outline-none focus:ring-2 focus:ring-green-200 focus:ring-offset-1",
        checked
          ? "border-green-700 bg-green-800 text-white shadow-sm"
          : "border-slate-300 bg-white text-slate-300 hover:border-green-400 hover:bg-green-50"
      )}
    >
      {checked ? "✓" : ""}
    </button>
  );
}

function ScorecardRoundTotal({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-green-200">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function formatScoreToPar(holeEntries: HoleEntry[]) {
  const completedHoles = holeEntries.filter(
    (hole) => hole.score.trim() !== ""
  );

  if (completedHoles.length === 0) {
    return "—";
  }

  const score = completedHoles.reduce(
    (total, hole) => total + (Number(hole.score) || 0),
    0
  );

  const par = completedHoles.reduce(
    (total, hole) => total + hole.par,
    0
  );

  const difference = score - par;

  if (difference === 0) {
    return "E";
  }

  return difference > 0
    ? `+${difference}`
    : difference.toString();
}

function SummaryEntrySection({
  form,
  updateField,
  updateHoles
}: {
  form: FormState;
  updateField: (field: keyof FormState, value: string) => void;
  updateHoles: (value: "9" | "18") => void;
}) {
  return (
    <div className="space-y-5">
      <label className="block space-y-2 md:max-w-xs">
        <span className="text-sm font-semibold text-slate-700">Holes</span>
        <select
          value={form.holes}
          onChange={(event) => updateHoles(event.target.value as "9" | "18")}
          className={inputClassName}
        >
          <option value="9">9 holes</option>
          <option value="18">18 holes</option>
        </select>
      </label>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NumberField label="Score" value={form.score} onChange={(value) => updateField("score", value)} min={1} required />
        <NumberField label="Par" value={form.par} onChange={(value) => updateField("par", value)} min={0} />
        <NumberField label="Putts" value={form.putts} onChange={(value) => updateField("putts", value)} min={0} />
        <NumberField label="Penalties" value={form.penalties} onChange={(value) => updateField("penalties", value)} min={0} />
        <NumberField label="Fairways hit" value={form.fairwaysHit} onChange={(value) => updateField("fairwaysHit", value)} min={0} />
        <NumberField label="Fairways possible" value={form.fairwaysPossible} onChange={(value) => updateField("fairwaysPossible", value)} min={0} />
        <NumberField label="Greens in regulation" value={form.greensInRegulation} onChange={(value) => updateField("greensInRegulation", value)} min={0} />
        <NumberField label="GIR possible" value={form.girPossible} onChange={(value) => updateField("girPossible", value)} min={0} />
        <NumberField label="Three-putts" value={form.threePutts} onChange={(value) => updateField("threePutts", value)} min={0} />
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  required = false,
  disabled = false,
  helpText,
  children
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  helpText?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        disabled={disabled}
        className={inputClassName}
      >
        {children}
      </select>
      {helpText ? <p className="text-xs leading-5 text-slate-500">{helpText}</p> : null}
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  required = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: number;
  required?: boolean;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        min={min}
        required={required}
        inputMode="numeric"
        className={inputClassName}
      />
    </label>
  );
}

function TotalCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-green-900/10 bg-green-50/70 p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-green-800">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  );
}
