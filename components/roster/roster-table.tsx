"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { PlayerRosterRow } from "../../lib/players/roster";
import {
  Badge,
  EmptyState,
  Message,
  cn,
  dangerButtonClassName,
  inputClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
  tableHeaderClassName,
  tableRowClassName,
  tableShellClassName
} from "../ui/primitives";

type RosterTableProps = {
  players: PlayerRosterRow[];
};

type FormState = {
  firstName: string;
  lastName: string;
  graduationYear: string;
  status: "active" | "inactive";
};

type FormMessage = {
  type: "success" | "error";
  text: string;
};

type PlayerActionResult = {
  success: boolean;
  message: string;
};

function formStateFromPlayer(player: PlayerRosterRow): FormState {
  return {
    firstName: player.first_name,
    lastName: player.last_name,
    graduationYear: player.graduation_year?.toString() ?? "",
    status: player.status === "inactive" ? "inactive" : "active"
  };
}

function parseGraduationYear(value: string) {
  if (value.trim() === "") {
    return null;
  }

  return Number(value);
}

function validateForm(form: FormState) {
  if (!form.firstName.trim()) {
    return "First name is required.";
  }

  if (!form.lastName.trim()) {
    return "Last name is required.";
  }

  const graduationYear = parseGraduationYear(form.graduationYear);

  if (
    graduationYear !== null &&
    (!Number.isInteger(graduationYear) || graduationYear < 2000 || graduationYear > 2100)
  ) {
    return "Graduation year must be a valid four-digit year.";
  }

  return null;
}

async function patchPlayer(body: unknown) {
  const response = await fetch("/api/players", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const result = (await response.json()) as PlayerActionResult;

  if (!response.ok || !result.success) {
    return {
      success: false,
      message: result.message || "Could not update player. Please try again."
    };
  }

  return result;
}

export function RosterTable({ players }: RosterTableProps) {
  const router = useRouter();
  const [showInactive, setShowInactive] = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [message, setMessage] = useState<FormMessage | null>(null);
  const [pendingPlayerId, setPendingPlayerId] = useState<string | null>(null);

  const inactiveCount = players.filter((player) => player.status === "inactive").length;
  const visiblePlayers = showInactive
    ? players
    : players.filter((player) => player.status !== "inactive");

  async function deactivatePlayer(player: PlayerRosterRow) {
    setMessage(null);
    setPendingPlayerId(player.id);

    try {
      const result = await patchPlayer({ id: player.id, action: "deactivate" });

      setMessage({
        type: result.success ? "success" : "error",
        text: result.message
      });

      if (result.success) {
        setEditingPlayerId(null);
        router.refresh();
      }
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Could not deactivate player. Please try again."
      });
    } finally {
      setPendingPlayerId(null);
    }
  }

  function handleEditSuccess(messageText: string) {
    setMessage({ type: "success", text: messageText });
    setEditingPlayerId(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-950">Roster List</p>
          <p className="mt-1 text-sm text-slate-500">
            {showInactive
              ? "Showing active and inactive players."
              : "Showing active players only."}
          </p>
        </div>
        {inactiveCount > 0 ? (
          <label className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(event) => setShowInactive(event.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-green-800 focus:ring-green-700"
            />
            Show inactive players
          </label>
        ) : null}
      </div>

      {message ? (
        <Message type={message.type}>{message.text}</Message>
      ) : null}

      {visiblePlayers.length === 0 ? (
        <EmptyState message="No active players to show. Turn on inactive players to view the full roster." />
      ) : (
        <div className={tableShellClassName}>
          <div className={cn(tableHeaderClassName, "lg:grid lg:grid-cols-[1.1fr_1.1fr_0.8fr_0.8fr_1.2fr]")}>
            <span>First Name</span>
            <span>Last Name</span>
            <span>Graduation</span>
            <span>Status</span>
            <span>Actions</span>
          </div>

          <div>
            {visiblePlayers.map((player) => {
              const isEditing = editingPlayerId === player.id;
              const isInactive = player.status === "inactive";

              return (
                <div key={player.id} className="border-b border-gray-100 last:border-b-0">
                  <div className={cn(tableRowClassName, "lg:grid-cols-[1.1fr_1.1fr_0.8fr_0.8fr_1.2fr] lg:items-center")}>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 lg:hidden">
                        First Name
                      </p>
                      <Link
                        href={`/players/${player.id}`}
                        className="font-semibold text-green-800 transition hover:text-green-950"
                      >
                        {player.first_name}
                      </Link>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 lg:hidden">
                        Last Name
                      </p>
                      <p className="text-gray-700">{player.last_name}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 lg:hidden">
                        Graduation
                      </p>
                      <p className="text-gray-700">
                        {player.graduation_year ?? "Not set"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 lg:hidden">
                        Status
                      </p>
                      <Badge tone={isInactive ? "slate" : "green"} className="capitalize">
                        {player.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 lg:hidden">
                        Actions
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setMessage(null);
                            setEditingPlayerId(isEditing ? null : player.id);
                          }}
                          className={cn(secondaryButtonClassName, "px-3 py-1.5 text-xs")}
                        >
                          {isEditing ? "Cancel" : "Edit"}
                        </button>
                        <button
                          type="button"
                          onClick={() => deactivatePlayer(player)}
                          disabled={isInactive || pendingPlayerId === player.id}
                          className={dangerButtonClassName}
                        >
                          {pendingPlayerId === player.id
                            ? "Saving..."
                            : isInactive
                              ? "Inactive"
                              : "Deactivate"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {isEditing ? (
                    <EditPlayerForm
                      player={player}
                      onCancel={() => setEditingPlayerId(null)}
                      onSuccess={handleEditSuccess}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function EditPlayerForm({
  player,
  onCancel,
  onSuccess
}: {
  player: PlayerRosterRow;
  onCancel: () => void;
  onSuccess: (message: string) => void;
}) {
  const [form, setForm] = useState<FormState>(() => formStateFromPlayer(player));
  const [message, setMessage] = useState<FormMessage | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField<Field extends keyof FormState>(
    field: Field,
    value: FormState[Field]
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const validationError = validateForm(form);

    if (validationError) {
      setMessage({ type: "error", text: validationError });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await patchPlayer({
        id: player.id,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        graduationYear: parseGraduationYear(form.graduationYear),
        status: form.status
      });

      if (!result.success) {
        setMessage({ type: "error", text: result.message });
        return;
      }

      onSuccess(result.message);
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Could not update player. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border-t border-slate-100 bg-slate-50/70 px-5 py-5">
      {message ? (
        <Message type={message.type}>{message.text}</Message>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">First name</span>
          <input
            type="text"
            value={form.firstName}
            onChange={(event) => updateField("firstName", event.target.value)}
            required
            className={inputClassName}
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Last name</span>
          <input
            type="text"
            value={form.lastName}
            onChange={(event) => updateField("lastName", event.target.value)}
            required
            className={inputClassName}
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">
            Graduation year
          </span>
          <input
            type="number"
            value={form.graduationYear}
            onChange={(event) => updateField("graduationYear", event.target.value)}
            min={2000}
            max={2100}
            inputMode="numeric"
            className={inputClassName}
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Status</span>
          <select
            value={form.status}
            onChange={(event) =>
              updateField("status", event.target.value as FormState["status"])
            }
            className={inputClassName}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className={secondaryButtonClassName}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className={primaryButtonClassName}
        >
          {isSubmitting ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
