"use client";

import { useState, type FormEvent } from "react";

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

type ScoreFormProps = {
  teamId: string;
  activeSeasonName: string | null;
  players: PlayerOption[];
  events: EventOption[];
};

type SubmitRoundInput = {
  teamId: string;
  playerId: string;
  eventId: string | null;
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
};

type SubmitRoundResult = {
  success: boolean;
  message: string;
};

type FormState = {
  playerId: string;
  eventId: string;
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

function createInitialState(): FormState {
  const defaults = getDefaultsForHoles("18");

  return {
    playerId: "",
    eventId: "",
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
  events
}: ScoreFormProps) {
  const [form, setForm] = useState<FormState>(createInitialState);
  const [message, setMessage] = useState<FormMessage | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  function validateForm(input: SubmitRoundInput) {
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const score = requiredNumber(form.score);
    const input: SubmitRoundInput = {
      teamId,
      playerId: form.playerId,
      eventId: form.eventId || null,
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

    const validationError = validateForm(input);

    if (validationError) {
      setMessage({ type: "error", text: validationError });
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
        setForm(createInitialState());
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
        <label className="space-y-2">
          <span className="text-sm font-semibold text-gray-700">Player</span>
          <select
            value={form.playerId}
            onChange={(event) => updateField("playerId", event.target.value)}
            required
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
          >
            <option value="">Choose a player</option>
            {players.map((player) => (
              <option key={player.id} value={player.id}>
                {player.firstName} {player.lastName}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-gray-700">
            Event optional
          </span>
          <select
            value={form.eventId}
            onChange={(event) => updateField("eventId", event.target.value)}
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
          >
            <option value="">No event</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {formatEventLabel(event)}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-gray-700">
            Played date
          </span>
          <input
            type="date"
            value={form.playedOn}
            onChange={(event) => updateField("playedOn", event.target.value)}
            required
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
          />
        </label>

        <label className="space-y-2">
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
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NumberField
          label="Score"
          value={form.score}
          onChange={(value) => updateField("score", value)}
          min={1}
          required
        />
        <NumberField
          label="Par"
          value={form.par}
          onChange={(value) => updateField("par", value)}
          min={0}
        />
        <NumberField
          label="Putts"
          value={form.putts}
          onChange={(value) => updateField("putts", value)}
          min={0}
        />
        <NumberField
          label="Penalties"
          value={form.penalties}
          onChange={(value) => updateField("penalties", value)}
          min={0}
        />
        <NumberField
          label="Fairways hit"
          value={form.fairwaysHit}
          onChange={(value) => updateField("fairwaysHit", value)}
          min={0}
        />
        <NumberField
          label="Fairways possible"
          value={form.fairwaysPossible}
          onChange={(value) => updateField("fairwaysPossible", value)}
          min={0}
        />
        <NumberField
          label="Greens in regulation"
          value={form.greensInRegulation}
          onChange={(value) => updateField("greensInRegulation", value)}
          min={0}
        />
        <NumberField
          label="GIR possible"
          value={form.girPossible}
          onChange={(value) => updateField("girPossible", value)}
          min={0}
        />
        <NumberField
          label="Three-putts"
          value={form.threePutts}
          onChange={(value) => updateField("threePutts", value)}
          min={0}
        />
      </div>

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
