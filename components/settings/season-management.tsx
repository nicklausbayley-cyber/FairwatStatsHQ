"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export type SeasonSettings = {
  id: string;
  name: string;
  startsOn: string | null;
  endsOn: string | null;
  isActive: boolean;
};

type FormState = {
  name: string;
  startsOn: string;
  endsOn: string;
};

type FormMessage = {
  type: "success" | "error";
  text: string;
};

type SeasonActionResult = {
  success: boolean;
  message: string;
};

const initialFormState: FormState = {
  name: "",
  startsOn: "",
  endsOn: ""
};

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function validateForm(form: FormState) {
  if (!form.name.trim()) {
    return "Season name is required.";
  }

  if (form.startsOn && form.endsOn && form.startsOn > form.endsOn) {
    return "End date must be after the start date.";
  }

  return null;
}

async function seasonRequest(
  method: "POST" | "PATCH",
  body: Record<string, string | null>
) {
  const response = await fetch("/api/seasons", {
    method,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const result = (await response.json()) as SeasonActionResult;

  if (!response.ok || !result.success) {
    return {
      success: false,
      message: result.message || "Could not update seasons. Please try again."
    };
  }

  return result;
}

export function SeasonManagement({ seasons }: { seasons: SeasonSettings[] }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialFormState);
  const [message, setMessage] = useState<FormMessage | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [activePendingId, setActivePendingId] = useState<string | null>(null);
  const activeSeason = seasons.find((season) => season.isActive) ?? null;

  function updateField<Field extends keyof FormState>(
    field: Field,
    value: FormState[Field]
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleCreateSeason(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const validationError = validateForm(form);

    if (validationError) {
      setMessage({ type: "error", text: validationError });
      return;
    }

    setIsCreating(true);

    try {
      const result = await seasonRequest("POST", {
        name: form.name.trim(),
        startsOn: form.startsOn || null,
        endsOn: form.endsOn || null
      });

      setMessage({
        type: result.success ? "success" : "error",
        text: result.message
      });

      if (result.success) {
        setForm(initialFormState);
        router.refresh();
      }
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Could not create season. Please try again."
      });
    } finally {
      setIsCreating(false);
    }
  }

  async function setActiveSeason(season: SeasonSettings) {
    setMessage(null);
    setActivePendingId(season.id);

    try {
      const result = await seasonRequest("PATCH", { id: season.id });

      setMessage({
        type: result.success ? "success" : "error",
        text: result.message
      });

      if (result.success) {
        router.refresh();
      }
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Could not set active season. Please try again."
      });
    } finally {
      setActivePendingId(null);
    }
  }

  return (
    <div className="space-y-6 rounded-lg border border-green-900/10 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
            Season Management
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-950">
            Active Season
          </h2>
        </div>
        <div className="rounded-md bg-green-50 px-3 py-2 text-sm font-semibold text-green-800">
          {activeSeason ? activeSeason.name : "No active season"}
        </div>
      </div>

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

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-5">
          <p className="text-sm font-semibold text-gray-600">Current active season</p>
          {activeSeason ? (
            <dl className="mt-4 space-y-3 text-sm">
              <SeasonInfo label="Name" value={activeSeason.name} strong />
              <SeasonInfo label="Start date" value={formatDate(activeSeason.startsOn)} />
              <SeasonInfo label="End date" value={formatDate(activeSeason.endsOn)} />
            </dl>
          ) : (
            <p className="mt-4 text-sm leading-6 text-gray-600">
              Create a season or set one active to focus dashboards, statistics,
              events, and score entry.
            </p>
          )}
        </div>

        <form onSubmit={handleCreateSeason} className="rounded-lg border border-gray-200 p-5">
          <p className="text-sm font-semibold text-gray-700">Create new season</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="space-y-2 md:col-span-3">
              <span className="text-sm font-semibold text-gray-700">Season name</span>
              <input
                type="text"
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="2026 Season"
                required
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-gray-700">Start date</span>
              <input
                type="date"
                value={form.startsOn}
                onChange={(event) => updateField("startsOn", event.target.value)}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-gray-700">End date</span>
              <input
                type="date"
                value={form.endsOn}
                onChange={(event) => updateField("endsOn", event.target.value)}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
              />
            </label>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={isCreating}
                className="w-full rounded-md bg-green-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-900 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {isCreating ? "Creating..." : "Create Season"}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold tracking-tight text-gray-950">
            Existing Seasons
          </h3>
          <span className="text-sm font-semibold text-gray-500">
            {seasons.length} total
          </span>
        </div>

        {seasons.length === 0 ? (
          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50/60 p-5 text-sm leading-6 text-gray-600">
            No seasons found for this team yet.
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
            <div className="hidden grid-cols-[1.2fr_0.9fr_0.9fr_0.8fr_0.8fr] gap-4 border-b border-gray-100 bg-green-50/70 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-green-900 lg:grid">
              <span>Name</span>
              <span>Start</span>
              <span>End</span>
              <span>Status</span>
              <span>Action</span>
            </div>
            <div className="divide-y divide-gray-100">
              {seasons.map((season) => (
                <div
                  key={season.id}
                  className="grid gap-3 px-5 py-4 text-sm lg:grid-cols-[1.2fr_0.9fr_0.9fr_0.8fr_0.8fr] lg:items-center"
                >
                  <SeasonCell label="Name" value={season.name} strong />
                  <SeasonCell label="Start" value={formatDate(season.startsOn)} />
                  <SeasonCell label="End" value={formatDate(season.endsOn)} />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 lg:hidden">
                      Status
                    </p>
                    <span
                      className={
                        season.isActive
                          ? "inline-flex rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-800"
                          : "inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600"
                      }
                    >
                      {season.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 lg:hidden">
                      Action
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveSeason(season)}
                      disabled={season.isActive || activePendingId === season.id}
                      className="rounded-md border border-green-200 px-3 py-1.5 text-xs font-semibold text-green-800 transition hover:bg-green-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
                    >
                      {activePendingId === season.id
                        ? "Setting..."
                        : season.isActive
                          ? "Current"
                          : "Set Active"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SeasonInfo({
  label,
  value,
  strong = false
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </dt>
      <dd className={strong ? "mt-1 font-semibold text-gray-950" : "mt-1 text-gray-950"}>
        {value}
      </dd>
    </div>
  );
}

function SeasonCell({
  label,
  value,
  strong = false
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 lg:hidden">
        {label}
      </p>
      <p className={strong ? "font-semibold text-gray-950" : "text-gray-700"}>
        {value}
      </p>
    </div>
  );
}
