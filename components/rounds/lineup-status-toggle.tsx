"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type LineupStatusToggleProps = {
  roundId: string;
  initialValue: boolean;
};

export function LineupStatusToggle({
  roundId,
  initialValue
}: LineupStatusToggleProps) {
  const router = useRouter();
  const [countsTowardLineup, setCountsTowardLineup] = useState(initialValue);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleChange(nextValue: boolean) {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/rounds/${roundId}/lineup-status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          countsTowardLineup: nextValue
        })
      });
      const result = (await response.json()) as {
        success?: boolean;
        message?: string;
      };

      if (!response.ok || !result.success) {
        setMessage(result.message ?? "Could not update lineup status.");
        return;
      }

      setCountsTowardLineup(nextValue);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not update lineup status."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-1">
      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          checked={countsTowardLineup}
          disabled={isSaving}
          onChange={(event) => handleChange(event.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-green-700 focus:ring-green-600"
        />
        <span>{isSaving ? "Saving..." : "Counts toward lineup"}</span>
      </label>
      {message ? (
        <p className="max-w-52 text-xs text-red-700">{message}</p>
      ) : null}
    </div>
  );
}
