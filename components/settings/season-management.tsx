"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  Badge,
  EmptyState,
  Message,
  appPanelClassName,
  cn,
  inputClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
  tableHeaderClassName,
  tableRowClassName
} from "../ui/primitives";

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
    <div className={cn(appPanelClassName, "space-y-6 p-6 sm:p-8")}>
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
            Season Management
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-950">
            Active Season
          </h2>
        </div>
        <Badge tone={activeSeason ? "green" : "slate"}>
          {activeSeason ? activeSeason.name : "No active season"}
        </Badge>
      </div>

      {message ? (
        <Message type={message.type}>{message.text}</Message>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-5">
          <p className="text-sm font-semibold text-slate-600">Current active season</p>
          {activeSeason ? (
            <dl className="mt-4 space-y-3 text-sm">
              <SeasonInfo label="Name" value={activeSeason.name} strong />
              <SeasonInfo label="Start date" value={formatDate(activeSeason.startsOn)} />
              <SeasonInfo label="End date" value={formatDate(activeSeason.endsOn)} />
            </dl>
          ) : (
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Create a season or set one active to focus dashboards, statistics,
              events, and score entry.
            </p>
          )}
        </div>

        <form onSubmit={handleCreateSeason} className="rounded-lg border border-slate-200 p-5">
          <p className="text-sm font-semibold text-slate-700">Create new season</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="space-y-2 md:col-span-3">
              <span className="text-sm font-semibold text-slate-700">Season name</span>
              <input
                type="text"
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="2026 Season"
                required
                className={inputClassName}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Start date</span>
              <input
                type="date"
                value={form.startsOn}
                onChange={(event) => updateField("startsOn", event.target.value)}
                className={inputClassName}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">End date</span>
              <input
                type="date"
                value={form.endsOn}
                onChange={(event) => updateField("endsOn", event.target.value)}
                className={inputClassName}
              />
            </label>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={isCreating}
                className={cn(primaryButtonClassName, "w-full")}
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
          <span className="text-sm font-semibold text-slate-500">
            {seasons.length} total
          </span>
        </div>

        {seasons.length === 0 ? (
          <div className="mt-4">
            <EmptyState message="No seasons found for this team yet." />
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
            <div className={cn(tableHeaderClassName, "lg:grid lg:grid-cols-[1.2fr_0.9fr_0.9fr_0.8fr_0.8fr]")}>
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
                  className={cn(tableRowClassName, "lg:grid-cols-[1.2fr_0.9fr_0.9fr_0.8fr_0.8fr] lg:items-center")}
                >
                  <SeasonCell label="Name" value={season.name} strong />
                  <SeasonCell label="Start" value={formatDate(season.startsOn)} />
                  <SeasonCell label="End" value={formatDate(season.endsOn)} />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 lg:hidden">
                      Status
                    </p>
                    <span
                      className={cn(
                        "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
                        season.isActive
                          ? "border-green-200 bg-green-50 text-green-800"
                          : "border-slate-200 bg-slate-100 text-slate-600"
                      )}
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
                      className={cn(secondaryButtonClassName, "px-3 py-1.5 text-xs")}
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
