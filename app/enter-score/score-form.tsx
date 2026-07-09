"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

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

function createInitialState(defaultCourseId = ""): FormState {
  const defaults = getDefaultsForHoles("18");

  return {
    playerId: "",
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
  courses
}: ScoreFormProps) {
  const defaultCourseId = courses[0]?.id ?? "";
  const [form, setForm] = useState<FormState>(() => createInitialState(defaultCourseId));
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
      setCourseHoles([]);
      setHoleEntries([]);
      return;
    }

    let isCurrent = true;
    setIsLoadingHoles(true);

    fetch(`/api/courses/${form.courseId}/holes`)
      .then(async (response) => {
        const result = (await response.json()) as CourseHolesResult;

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Could not load course holes.");
        }

        return result.holes ?? [];
      })
      .then((holes) => {
        if (!isCurrent) {
          return;
        }

        const nextCourseHoles = holes.map((hole) => ({
          holeNumber: hole.hole_number,
          par: hole.par,
          handicap: hole.handicap,
          yardage: hole.yardage
        }));

        setCourseHoles(nextCourseHoles);
        setHoleEntries(createHoleEntries(nextCourseHoles));
      })
      .catch((error) => {
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
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoadingHoles(false);
        }
      });

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
        setForm(createInitialState(defaultCourseId));
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
      className="space-y-6 rounded-lg border border-green-900/10 bg-white p-6 shadow-sm sm:p-8"
    >
      {message ? (
        <div
          className={
            message.type === "success"
              ? "rounded-lg border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-900"
              : "rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900"
          }
        >
          {message.text}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <SelectField
          label="Player"
          value={form.playerId}
          onChange={(value) => updateField("playerId", value)}
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
          onChange={(value) => updateField("courseId", value)}
        >
          <option value="">No course selected</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.name}{course.location ? ` - ${course.location}` : ""}
            </option>
          ))}
        </SelectField>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-gray-700">Played date</span>
          <input
            type="date"
            value={form.playedOn}
            onChange={(event) => updateField("playedOn", event.target.value)}
            required
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
          />
        </label>
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-4">
        <p className="text-sm font-semibold text-gray-700">Entry mode</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => setEntryMode("hole-by-hole")}
            disabled={courses.length === 0}
            className={
              entryMode === "hole-by-hole"
                ? "rounded-md bg-green-800 px-4 py-2 text-sm font-semibold text-white"
                : "rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-green-50 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
            }
          >
            Hole-by-Hole Entry
          </button>
          <button
            type="button"
            onClick={() => setEntryMode("summary")}
            className={
              entryMode === "summary"
                ? "rounded-md bg-green-800 px-4 py-2 text-sm font-semibold text-white"
                : "rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-green-50"
            }
          >
            Manual Summary
          </button>
        </div>
        {courses.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600">
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
        <span className="text-sm font-semibold text-gray-700">Notes</span>
        <textarea
          value={form.notes}
          onChange={(event) => updateField("notes", event.target.value)}
          rows={4}
          className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
          placeholder="Optional round notes"
        />
      </label>

      <div className="flex flex-col gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-500">
          {activeSeasonName
            ? `This round will be attached to ${activeSeasonName}.`
            : "No active season is set, so this round will not be season-specific yet."}
        </p>
        <button
          type="submit"
          disabled={isSubmitting || players.length === 0}
          className="rounded-md bg-green-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-900 disabled:cursor-not-allowed disabled:bg-gray-300"
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
    field: keyof Pick<HoleEntry, "score" | "putts" | "penalty" | "gir" | "fir">,
    value: string | boolean | null
  ) => void;
}) {
  if (!courseSelected) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-5 text-sm leading-6 text-gray-600">
        Choose a course to load its hole setup.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-5 text-sm leading-6 text-gray-600">
        Loading course holes...
      </div>
    );
  }

  if (holeEntries.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-5 text-sm leading-6 text-gray-600">
        This course does not have holes configured yet. Add hole setup on the Courses page.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TotalCard label="Score" value={holeTotals.score.toString()} />
        <TotalCard label="Par" value={holeTotals.par.toString()} />
        <TotalCard label="Putts" value={holeTotals.putts?.toString() ?? "No data"} />
        <TotalCard label="Penalties" value={holeTotals.penalties.toString()} />
        <TotalCard label="Fairways" value={`${holeTotals.fairwaysHit} / ${holeTotals.fairwaysPossible}`} />
        <TotalCard label="GIR" value={`${holeTotals.greensInRegulation} / ${holeTotals.girPossible}`} />
        <TotalCard label="Three-putts" value={holeTotals.threePutts.toString()} />
        <TotalCard label="Holes" value={holeTotals.holes.toString()} />
      </div>

      <div className="space-y-3">
        {holeEntries.map((hole, index) => (
          <div
            key={hole.holeNumber}
            className="grid gap-3 rounded-lg border border-gray-200 p-4 lg:grid-cols-[0.7fr_0.6fr_0.8fr_0.8fr_0.9fr_0.8fr_0.9fr_0.9fr] lg:items-end"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Hole</p>
              <p className="mt-1 text-xl font-bold text-gray-950">{hole.holeNumber}</p>
              <p className="mt-1 text-xs text-gray-500">
                Par {hole.par}{hole.handicap ? ` | HCP ${hole.handicap}` : ""}
              </p>
            </div>
            <div className="text-sm text-gray-600">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Yards</p>
              <p className="mt-2">{hole.yardage ?? "Not set"}</p>
            </div>
            <NumberField
              label="Score"
              value={hole.score}
              onChange={(value) => onUpdateHole(index, "score", value)}
              min={1}
              required
            />
            <NumberField
              label="Putts"
              value={hole.putts}
              onChange={(value) => onUpdateHole(index, "putts", value)}
              min={0}
            />
            <div>
              <p className="text-sm font-semibold text-gray-700">FIR</p>
              {hole.par === 3 ? (
                <p className="mt-2 rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-500">
                  N/A
                </p>
              ) : (
                <label className="mt-2 flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={hole.fir === true}
                    onChange={(event) => onUpdateHole(index, "fir", event.target.checked)}
                    className="h-4 w-4 accent-green-800"
                  />
                  Hit fairway
                </label>
              )}
            </div>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-gray-700">GIR</span>
              <span className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={hole.gir}
                  onChange={(event) => onUpdateHole(index, "gir", event.target.checked)}
                  className="h-4 w-4 accent-green-800"
                />
                Green hit
              </span>
            </label>
            <NumberField
              label="Penalty"
              value={hole.penalty}
              onChange={(value) => onUpdateHole(index, "penalty", value)}
              min={0}
            />
          </div>
        ))}
      </div>
    </div>
  );
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
        <span className="text-sm font-semibold text-gray-700">Holes</span>
        <select
          value={form.holes}
          onChange={(event) => updateHoles(event.target.value as "9" | "18")}
          className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
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
  children
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-gray-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
      >
        {children}
      </select>
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
      <span className="text-sm font-semibold text-gray-700">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        min={min}
        required={required}
        inputMode="numeric"
        className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
      />
    </label>
  );
}

function TotalCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-green-900/10 bg-green-50/50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-green-800">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-gray-950">{value}</p>
    </div>
  );
}
