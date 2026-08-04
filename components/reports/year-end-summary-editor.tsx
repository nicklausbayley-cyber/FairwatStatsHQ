"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Message,
  inputClassName,
  primaryButtonClassName,
  secondaryButtonClassName
} from "../ui/primitives";

type SummaryValues = {
  seasonSummary: string;
  strengths: string;
  developmentAreas: string;
  nextSeasonGoals: string;
};

type ApiResult = {
  success: boolean;
  message: string;
};

const fields: Array<{
  key: keyof SummaryValues;
  label: string;
  description: string;
  placeholder: string;
}> = [
  {
    key: "seasonSummary",
    label: "Season Summary",
    description:
      "Overall reflection on the player’s season, growth, attitude, and contribution.",
    placeholder:
      "Summarize the player’s season and overall development..."
  },
  {
    key: "strengths",
    label: "Strengths",
    description:
      "Skills, habits, and qualities the player should continue building on.",
    placeholder:
      "List the player’s strongest areas and positive habits..."
  },
  {
    key: "developmentAreas",
    label: "Development Areas",
    description:
      "Specific opportunities for improvement supported by the season data.",
    placeholder:
      "Identify the most important areas for continued development..."
  },
  {
    key: "nextSeasonGoals",
    label: "Next-Season Goals",
    description:
      "Clear, measurable goals for practice, competition, and preparation.",
    placeholder:
      "Document the player’s goals and recommended next steps..."
  }
];

export function YearEndSummaryEditor({
  playerId,
  seasonId,
  initialValues
}: {
  playerId: string;
  seasonId: string;
  initialValues: SummaryValues;
}) {
  const router = useRouter();
  const [values, setValues] = useState(initialValues);
  const [savedValues, setSavedValues] = useState(initialValues);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const isDirty =
    JSON.stringify(values) !== JSON.stringify(savedValues);

  function updateField(
    key: keyof SummaryValues,
    value: string
  ) {
    setValues((current) => ({
      ...current,
      [key]: value
    }));
    setMessage(null);
  }

  async function saveSummary() {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/players/${playerId}/year-end-summary`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            seasonId,
            ...values
          })
        }
      );

      const result = (await response.json()) as ApiResult;

      if (!response.ok || !result.success) {
        setMessage({
          type: "error",
          text: result.message || "Could not save the summary."
        });
        return;
      }

      setSavedValues(values);
      setMessage({
        type: "success",
        text: result.message
      });
      router.refresh();
    } catch {
      setMessage({
        type: "error",
        text: "Could not save the summary. Please try again."
      });
    } finally {
      setIsSaving(false);
    }
  }

  function printReport() {
    if (isDirty) {
      setMessage({
        type: "error",
        text: "Save your changes before printing the report."
      });
      return;
    }

    window.print();
  }

  return (
    <section className="space-y-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5 print:hidden sm:p-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
          Meeting Preparation
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
          Coach Comments and Goals
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Save the season-specific comments that should appear on the
          printed parent and player report.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {fields.map((field) => (
          <label key={field.key} className="space-y-2">
            <span className="block text-sm font-semibold text-slate-800">
              {field.label}
            </span>
            <span className="block text-xs leading-5 text-slate-500">
              {field.description}
            </span>
            <textarea
              value={values[field.key]}
              maxLength={5000}
              onChange={(event) =>
                updateField(field.key, event.target.value)
              }
              placeholder={field.placeholder}
              className={`${inputClassName} min-h-36 resize-y`}
            />
          </label>
        ))}
      </div>

      {message ? (
        <Message type={message.type}>{message.text}</Message>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={saveSummary}
          disabled={isSaving || !isDirty}
          className={primaryButtonClassName}
        >
          {isSaving ? "Saving..." : "Save Summary"}
        </button>

        <button
          type="button"
          onClick={printReport}
          disabled={isSaving}
          className={secondaryButtonClassName}
        >
          Print / Save as PDF
        </button>

        <span className="text-sm text-slate-500">
          {isDirty ? "Unsaved changes" : "All changes saved"}
        </span>
      </div>
    </section>
  );
}
