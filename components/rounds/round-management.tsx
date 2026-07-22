"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Message,
  appPanelClassName,
  cn,
  dangerButtonClassName,
  inputClassName,
  primaryButtonClassName,
  secondaryButtonClassName
} from "../ui/primitives";
import {
  getScoreIndicator,
  getScoreIndicatorClassName,
  getScoreIndicatorLabel
} from "./score-indicator";
import type {
  RoundDetailsData,
  RoundEventOption,
  RoundHoleDetails
} from "./round-types";

type RoundManagementProps = {
  round: RoundDetailsData;
  events: RoundEventOption[];
};

type FormMessage = {
  type: "success" | "error";
  text: string;
};

type EditableHole = {
  holeNumber: number;
  par: number;
  handicap: number | null;
  score: string;
  putts: string;
  fir: boolean | null;
  gir: boolean;
  penalty: string;
};

type RoundFormState = {
  playedOn: string;
  eventId: string;
  notes: string;
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
  holeEntries: EditableHole[];
};

type RoundActionResult = {
  success: boolean;
  message: string;
};

function stringValue(value: number | null) {
  return value === null ? "" : value.toString();
}

function createFormState(
  round: RoundDetailsData
): RoundFormState {
  return {
    playedOn: round.playedOn,
    eventId: round.eventId ?? "",
    notes: round.notes ?? "",
    holes: round.holes === 9 ? "9" : "18",
    score: round.score.toString(),
    par: stringValue(round.par),
    putts: stringValue(round.putts),
    fairwaysHit: stringValue(round.fairwaysHit),
    fairwaysPossible: stringValue(
      round.fairwaysPossible
    ),
    greensInRegulation: stringValue(
      round.greensInRegulation
    ),
    girPossible: stringValue(round.girPossible),
    penalties: stringValue(round.penalties),
    threePutts: stringValue(round.threePutts),
    holeEntries: round.holeEntries.map((hole) => ({
      holeNumber: hole.holeNumber,
      par: hole.par,
      handicap: hole.handicap,
      score: hole.score.toString(),
      putts: stringValue(hole.putts),
      fir: hole.par === 3 ? null : hole.fir === true,
      gir: hole.gir,
      penalty: stringValue(hole.penalty)
    }))
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

function formatEventLabel(event: RoundEventOption) {
  return `${event.name} (${event.eventDate})`;
}

function calculateHoleTotals(
  holes: EditableHole[]
) {
  const completedScores = holes
    .map((hole) => requiredNumber(hole.score))
    .filter((value): value is number => value !== null);

  const putts = holes
    .map((hole) => optionalNumber(hole.putts))
    .filter((value): value is number => value !== null);

  const fairwayHoles = holes.filter(
    (hole) => hole.par !== 3
  );

  return {
    score: completedScores.reduce(
      (total, value) => total + value,
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
      (total, hole) =>
        total + (optionalNumber(hole.penalty) ?? 0),
      0
    ),
    threePutts: putts.filter(
      (value) => value >= 3
    ).length
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

function validateHoleForm(form: RoundFormState) {
  for (const hole of form.holeEntries) {
    const score = requiredNumber(hole.score);
    const putts = optionalNumber(hole.putts);
    const penalty = optionalNumber(hole.penalty);

    if (
      score === null ||
      !Number.isInteger(score) ||
      score <= 0
    ) {
      return `Hole ${hole.holeNumber} score is required and must be greater than 0.`;
    }

    if (
      putts !== null &&
      (!Number.isInteger(putts) || putts < 0)
    ) {
      return `Hole ${hole.holeNumber} putts must be 0 or greater.`;
    }

    if (
      penalty !== null &&
      (!Number.isInteger(penalty) || penalty < 0)
    ) {
      return `Hole ${hole.holeNumber} penalty strokes must be 0 or greater.`;
    }
  }

  return null;
}

function validateSummaryForm(
  form: RoundFormState
) {
  const score = requiredNumber(form.score);

  if (
    score === null ||
    !Number.isInteger(score) ||
    score <= 0
  ) {
    return "Score is required and must be greater than 0.";
  }

  const nonNegativeFields = [
    ["Par", form.par],
    ["Putts", form.putts],
    ["Fairways hit", form.fairwaysHit],
    ["Fairways possible", form.fairwaysPossible],
    [
      "Greens in regulation",
      form.greensInRegulation
    ],
    ["GIR possible", form.girPossible],
    ["Penalties", form.penalties],
    ["Three-putts", form.threePutts]
  ] as const;

  for (const [label, value] of nonNegativeFields) {
    const parsedValue = optionalNumber(value);

    if (
      parsedValue !== null &&
      (!Number.isInteger(parsedValue) ||
        parsedValue < 0)
    ) {
      return `${label} must be 0 or greater.`;
    }
  }

  const fairwaysHit = optionalNumber(
    form.fairwaysHit
  );
  const fairwaysPossible = optionalNumber(
    form.fairwaysPossible
  );

  if (
    fairwaysHit !== null &&
    fairwaysPossible !== null &&
    fairwaysHit > fairwaysPossible
  ) {
    return "Fairways hit cannot exceed fairways possible.";
  }

  const greensHit = optionalNumber(
    form.greensInRegulation
  );
  const greensPossible = optionalNumber(
    form.girPossible
  );

  if (
    greensHit !== null &&
    greensPossible !== null &&
    greensHit > greensPossible
  ) {
    return "Greens in regulation cannot exceed GIR possible.";
  }

  return null;
}

async function roundRequest(
  roundId: string,
  method: "PATCH" | "DELETE",
  body?: unknown
) {
  const response = await fetch(
    `/api/rounds/${roundId}`,
    {
      method,
      headers:
        body === undefined
          ? undefined
          : {
              "Content-Type": "application/json"
            },
      body:
        body === undefined
          ? undefined
          : JSON.stringify(body)
    }
  );

  const result =
    (await response.json()) as RoundActionResult;

  if (!response.ok || !result.success) {
    return {
      success: false,
      message:
        result.message ||
        "Could not complete the round action."
    };
  }

  return result;
}

export function RoundManagement({
  round,
  events
}: RoundManagementProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] =
    useState(false);
  const [isSaving, setIsSaving] =
    useState(false);
  const [isDeleting, setIsDeleting] =
    useState(false);
  const [message, setMessage] =
    useState<FormMessage | null>(null);
  const [form, setForm] =
    useState<RoundFormState>(() =>
      createFormState(round)
    );

  const isHoleByHole =
    form.holeEntries.length > 0;

  const holeTotals = useMemo(
    () => calculateHoleTotals(form.holeEntries),
    [form.holeEntries]
  );

  function updateField<
    Field extends keyof RoundFormState
  >(
    field: Field,
    value: RoundFormState[Field]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function updateHole(
    index: number,
    field: keyof Pick<
      EditableHole,
      "score" | "putts" | "fir" | "gir" | "penalty"
    >,
    value: string | boolean | null
  ) {
    setForm((current) => ({
      ...current,
      holeEntries: current.holeEntries.map(
        (hole, holeIndex) =>
          holeIndex === index
            ? { ...hole, [field]: value }
            : hole
      )
    }));
  }

  function cancelEditing() {
    setForm(createFormState(round));
    setMessage(null);
    setIsEditing(false);
  }

  async function handleSave(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setMessage(null);

    if (!form.playedOn) {
      setMessage({
        type: "error",
        text: "Played date is required."
      });
      return;
    }

    const validationError = isHoleByHole
      ? validateHoleForm(form)
      : validateSummaryForm(form);

    if (validationError) {
      setMessage({
        type: "error",
        text: validationError
      });
      return;
    }

    const body = isHoleByHole
      ? {
          playedOn: form.playedOn,
          eventId: form.eventId || null,
          notes: form.notes.trim() || null,
          holeEntries: form.holeEntries.map(
            (hole) => ({
              holeNumber: hole.holeNumber,
              score: Number(hole.score),
              putts: optionalNumber(
                hole.putts
              ),
              fir:
                hole.par === 3
                  ? null
                  : hole.fir === true,
              gir: hole.gir,
              penalty: optionalNumber(
                hole.penalty
              )
            })
          )
        }
      : {
          playedOn: form.playedOn,
          eventId: form.eventId || null,
          notes: form.notes.trim() || null,
          holes: Number(form.holes),
          score: Number(form.score),
          par: optionalNumber(form.par),
          putts: optionalNumber(form.putts),
          fairwaysHit: optionalNumber(
            form.fairwaysHit
          ),
          fairwaysPossible: optionalNumber(
            form.fairwaysPossible
          ),
          greensInRegulation: optionalNumber(
            form.greensInRegulation
          ),
          girPossible: optionalNumber(
            form.girPossible
          ),
          penalties: optionalNumber(
            form.penalties
          ),
          threePutts: optionalNumber(
            form.threePutts
          )
        };

    setIsSaving(true);

    try {
      const result = await roundRequest(
        round.id,
        "PATCH",
        body
      );

      setMessage({
        type: result.success
          ? "success"
          : "error",
        text: result.message
      });

      if (result.success) {
        setIsEditing(false);
        router.refresh();
      }
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Could not update round."
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete this ${round.holes}-hole round for ${round.playerName}? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setMessage(null);
    setIsDeleting(true);

    try {
      const result = await roundRequest(
        round.id,
        "DELETE"
      );

      if (!result.success) {
        setMessage({
          type: "error",
          text: result.message
        });
        return;
      }

      router.push(
        `/players/${round.playerId}`
      );
      router.refresh();
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Could not delete round."
      });
    } finally {
      setIsDeleting(false);
    }
  }

  if (!isEditing) {
    return (
      <div
        className={cn(
          appPanelClassName,
          "space-y-4 p-6 sm:p-8"
        )}
      >
        {message ? (
          <Message type={message.type}>
            {message.text}
          </Message>
        ) : null}

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
              Coach Controls
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-950">
              Manage this round
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Correct submitted statistics or remove
              an accidental scorecard.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                setMessage(null);
                setIsEditing(true);
              }}
              className={
                secondaryButtonClassName
              }
            >
              Edit Round
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className={dangerButtonClassName}
            >
              {isDeleting
                ? "Deleting..."
                : "Delete Round"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSave}
      className={cn(
        appPanelClassName,
        "space-y-6 p-6 sm:p-8"
      )}
    >
      {message ? (
        <Message type={message.type}>
          {message.text}
        </Message>
      ) : null}

      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
          Edit Round
        </p>
        <h2 className="mt-2 text-2xl font-bold text-slate-950">
          Correct round details
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">
            Played date
          </span>
          <input
            type="date"
            value={form.playedOn}
            onChange={(event) =>
              updateField(
                "playedOn",
                event.target.value
              )
            }
            required
            className={inputClassName}
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">
            Event
          </span>
          <select
            value={form.eventId}
            onChange={(event) =>
              updateField(
                "eventId",
                event.target.value
              )
            }
            className={inputClassName}
          >
            <option value="">No event</option>
            {events.map((event) => (
              <option
                key={event.id}
                value={event.id}
              >
                {formatEventLabel(event)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isHoleByHole ? (
        <HoleEditor
          holes={form.holeEntries}
          totals={holeTotals}
          onUpdate={updateHole}
        />
      ) : (
        <SummaryEditor
          form={form}
          updateField={updateField}
        />
      )}

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-slate-700">
          Notes
        </span>
        <textarea
          value={form.notes}
          onChange={(event) =>
            updateField(
              "notes",
              event.target.value
            )
          }
          rows={4}
          className={inputClassName}
          placeholder="Optional round notes"
        />
      </label>

      <div className="flex flex-col gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={cancelEditing}
          disabled={isSaving}
          className={secondaryButtonClassName}
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={isSaving}
          className={primaryButtonClassName}
        >
          {isSaving
            ? "Saving..."
            : "Save Changes"}
        </button>
      </div>
    </form>
  );
}

function HoleEditor({
  holes,
  totals,
  onUpdate
}: {
  holes: EditableHole[];
  totals: ReturnType<
    typeof calculateHoleTotals
  >;
  onUpdate: (
    index: number,
    field: keyof Pick<
      EditableHole,
      "score" | "putts" | "fir" | "gir" | "penalty"
    >,
    value: string | boolean | null
  ) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <EditorTotal
          label="Score"
          value={totals.score.toString()}
        />
        <EditorTotal
          label="To Par"
          value={formatToPar(
            totals.score,
            totals.par
          )}
        />
        <EditorTotal
          label="Putts"
          value={
            totals.putts?.toString() ?? "—"
          }
        />
        <EditorTotal
          label="Penalties"
          value={totals.penalties.toString()}
        />
        <EditorTotal
          label="Fairways"
          value={`${totals.fairwaysHit}/${totals.fairwaysPossible}`}
        />
        <EditorTotal
          label="GIR"
          value={`${totals.greensInRegulation}/${totals.girPossible}`}
        />
        <EditorTotal
          label="Three-putts"
          value={totals.threePutts.toString()}
        />
        <EditorTotal
          label="Holes"
          value={holes.length.toString()}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-300">
        <table className="w-full min-w-[900px] border-collapse text-center text-sm">
          <thead>
            <tr className="bg-green-900 text-white">
              <th className="min-w-24 border-r border-green-700 px-3 py-3 text-left">
                Hole
              </th>
              <th className="min-w-20 border-r border-green-700 px-2 py-3">
                Par
              </th>
              <th className="min-w-24 border-r border-green-700 px-2 py-3">
                Score
              </th>
              <th className="min-w-24 border-r border-green-700 px-2 py-3">
                Putts
              </th>
              <th className="min-w-24 border-r border-green-700 px-2 py-3">
                FIR
              </th>
              <th className="min-w-24 border-r border-green-700 px-2 py-3">
                GIR
              </th>
              <th className="min-w-24 px-2 py-3">
                Penalty
              </th>
            </tr>
          </thead>

          <tbody>
            {holes.map((hole, index) => (
              <tr
                key={hole.holeNumber}
                className="border-t border-slate-200"
              >
                <th
                  scope="row"
                  className="bg-slate-50 px-3 py-3 text-left font-bold text-slate-950"
                >
                  {hole.holeNumber}
                </th>

                <td className="border-l border-slate-200 px-2 py-3 font-semibold">
                  {hole.par}
                </td>

                <td className="border-l border-slate-200 px-2 py-2">
                  <EditableScoreInput
                    value={hole.score}
                    par={hole.par}
                    onChange={(value) =>
                      onUpdate(
                        index,
                        "score",
                        value
                      )
                    }
                    ariaLabel={`Hole ${hole.holeNumber} score`}
                  />
                </td>

                <td className="border-l border-slate-200 px-2 py-2">
                  <SmallNumberInput
                    value={hole.putts}
                    onChange={(value) =>
                      onUpdate(
                        index,
                        "putts",
                        value
                      )
                    }
                    min={0}
                    ariaLabel={`Hole ${hole.holeNumber} putts`}
                  />
                </td>

                <td className="border-l border-slate-200 px-2 py-2">
                  {hole.par === 3 ? (
                    <span className="text-slate-300">
                      N/A
                    </span>
                  ) : (
                    <ToggleButton
                      checked={hole.fir === true}
                      onChange={(checked) =>
                        onUpdate(
                          index,
                          "fir",
                          checked
                        )
                      }
                      ariaLabel={`Hole ${hole.holeNumber} FIR`}
                    />
                  )}
                </td>

                <td className="border-l border-slate-200 px-2 py-2">
                  <ToggleButton
                    checked={hole.gir}
                    onChange={(checked) =>
                      onUpdate(
                        index,
                        "gir",
                        checked
                      )
                    }
                    ariaLabel={`Hole ${hole.holeNumber} GIR`}
                  />
                </td>

                <td className="border-l border-slate-200 px-2 py-2">
                  <SmallNumberInput
                    value={hole.penalty}
                    onChange={(value) =>
                      onUpdate(
                        index,
                        "penalty",
                        value
                      )
                    }
                    min={0}
                    ariaLabel={`Hole ${hole.holeNumber} penalty`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryEditor({
  form,
  updateField
}: {
  form: RoundFormState;
  updateField: <
    Field extends keyof RoundFormState
  >(
    field: Field,
    value: RoundFormState[Field]
  ) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-2">
        <span className="text-sm font-semibold text-slate-700">
          Holes
        </span>
        <div className="flex min-h-10 items-center rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
          {form.holes} holes
        </div>
      </div>

      <SummaryNumberField
        label="Score"
        value={form.score}
        onChange={(value) =>
          updateField("score", value)
        }
        min={1}
        required
      />
      <SummaryNumberField
        label="Par"
        value={form.par}
        onChange={(value) =>
          updateField("par", value)
        }
        min={0}
      />
      <SummaryNumberField
        label="Putts"
        value={form.putts}
        onChange={(value) =>
          updateField("putts", value)
        }
        min={0}
      />
      <SummaryNumberField
        label="Fairways hit"
        value={form.fairwaysHit}
        onChange={(value) =>
          updateField("fairwaysHit", value)
        }
        min={0}
      />
      <SummaryNumberField
        label="Fairways possible"
        value={form.fairwaysPossible}
        onChange={(value) =>
          updateField(
            "fairwaysPossible",
            value
          )
        }
        min={0}
      />
      <SummaryNumberField
        label="GIR"
        value={form.greensInRegulation}
        onChange={(value) =>
          updateField(
            "greensInRegulation",
            value
          )
        }
        min={0}
      />
      <SummaryNumberField
        label="GIR possible"
        value={form.girPossible}
        onChange={(value) =>
          updateField("girPossible", value)
        }
        min={0}
      />
      <SummaryNumberField
        label="Penalties"
        value={form.penalties}
        onChange={(value) =>
          updateField("penalties", value)
        }
        min={0}
      />
      <SummaryNumberField
        label="Three-putts"
        value={form.threePutts}
        onChange={(value) =>
          updateField("threePutts", value)
        }
        min={0}
      />
    </div>
  );
}

function EditableScoreInput({
  value,
  par,
  onChange,
  ariaLabel
}: {
  value: string;
  par: number;
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  const indicator = getScoreIndicator(
    value,
    par
  );

  return (
    <input
      type="number"
      value={value}
      onChange={(event) =>
        onChange(event.target.value)
      }
      onFocus={(event) =>
        event.currentTarget.select()
      }
      min={1}
      required
      inputMode="numeric"
      aria-label={ariaLabel}
      title={getScoreIndicatorLabel(indicator)}
      className={cn(
        "mx-auto h-12 w-12 px-1 text-center text-lg font-bold outline-none transition focus:ring-2 focus:ring-green-200 focus:ring-offset-1",
        getScoreIndicatorClassName(indicator)
      )}
    />
  );
}

function SmallNumberInput({
  value,
  onChange,
  min,
  ariaLabel
}: {
  value: string;
  onChange: (value: string) => void;
  min: number;
  ariaLabel: string;
}) {
  return (
    <input
      type="number"
      value={value}
      onChange={(event) =>
        onChange(event.target.value)
      }
      onFocus={(event) =>
        event.currentTarget.select()
      }
      min={min}
      inputMode="numeric"
      aria-label={ariaLabel}
      className="mx-auto h-11 w-16 rounded-md border border-slate-300 bg-white px-2 text-center font-semibold text-slate-950 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
    />
  );
}

function ToggleButton({
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
        "mx-auto flex h-10 w-10 items-center justify-center rounded-md border text-lg font-bold",
        checked
          ? "border-green-700 bg-green-800 text-white"
          : "border-slate-300 bg-white text-slate-300"
      )}
    >
      {checked ? "✓" : ""}
    </button>
  );
}

function SummaryNumberField({
  label,
  value,
  onChange,
  min,
  required = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min: number;
  required?: boolean;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-slate-700">
        {label}
      </span>
      <input
        type="number"
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        min={min}
        required={required}
        inputMode="numeric"
        className={inputClassName}
      />
    </label>
  );
}

function EditorTotal({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-green-900/10 bg-green-50/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-green-800">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-slate-950">
        {value}
      </p>
    </div>
  );
}
