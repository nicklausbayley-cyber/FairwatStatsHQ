"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent
} from "react";
import {
  Badge,
  EmptyState,
  FormSection,
  Message,
  cn,
  inputClassName,
  primaryButtonClassName,
  secondaryButtonClassName
} from "../../components/ui/primitives";

type TeamOption = {
  id: string;
  name: string;
  school_name: string | null;
  mascot: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  contact_email: string | null;
};

type PlayerOption = {
  id: string;
  team_id: string;
  first_name: string;
  last_name: string;
  graduation_year: number | null;
  status: string;
  profile_id: string | null;
};

type FormKey = "team" | "staff" | "players" | "playerLogin" | "season";

type FormMessage = {
  type: "success" | "error";
  text: string;
};

type LoadResult = {
  success: boolean;
  message?: string;
  teams?: TeamOption[];
  players?: PlayerOption[];
};

type ActionResult = {
  success: boolean;
  message: string;
  team?: TeamOption;
  teamId?: string;
  count?: number;
  userId?: string;
  seasonId?: string;
};

const defaultTeamForm = {
  teamName: "",
  schoolName: "",
  mascot: "",
  primaryColor: "#166534",
  secondaryColor: "#111827",
  contactEmail: ""
};

const defaultStaffForm = {
  teamId: "",
  fullName: "",
  email: "",
  temporaryPassword: "",
  role: "admin" as "admin" | "coach"
};

const defaultBulkPlayersForm = {
  teamId: "",
  rosterText: ""
};

const defaultPlayerLoginForm = {
  teamId: "",
  playerId: "",
  playerEmail: "",
  temporaryPassword: ""
};

const defaultSeasonForm = {
  teamId: "",
  seasonName: "2026 Season",
  startsOn: "",
  endsOn: "",
  setActive: true
};

function getDefaultTeamId(
  teams: TeamOption[],
  currentTeamId: string,
  preferredTeamId?: string
) {
  if (preferredTeamId && teams.some((team) => team.id === preferredTeamId)) {
    return preferredTeamId;
  }

  if (currentTeamId && teams.some((team) => team.id === currentTeamId)) {
    return currentTeamId;
  }

  return teams[0]?.id ?? "";
}

function getPlayerName(player: PlayerOption) {
  return `${player.first_name} ${player.last_name}`;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

async function postOnboarding(payload: Record<string, unknown>) {
  const response = await fetch("/api/onboarding", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const result = (await response.json()) as ActionResult;

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Onboarding action failed.");
  }

  return result;
}

export function OnboardingPanel() {
  const router = useRouter();
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingForm, setPendingForm] = useState<FormKey | null>(null);
  const [createdTeamId, setCreatedTeamId] = useState<string | null>(null);
  const [teamForm, setTeamForm] = useState(defaultTeamForm);
  const [staffForm, setStaffForm] = useState(defaultStaffForm);
  const [bulkPlayersForm, setBulkPlayersForm] = useState(defaultBulkPlayersForm);
  const [playerLoginForm, setPlayerLoginForm] = useState(defaultPlayerLoginForm);
  const [seasonForm, setSeasonForm] = useState(defaultSeasonForm);
  const [messages, setMessages] = useState<Record<FormKey, FormMessage | null>>({
    team: null,
    staff: null,
    players: null,
    playerLogin: null,
    season: null
  });

  const hasTeams = teams.length > 0;
  const selectedPlayerOptions = useMemo(
    () =>
      players.filter((player) => player.team_id === playerLoginForm.teamId),
    [players, playerLoginForm.teamId]
  );

  const loadOptions = useCallback(async (preferredTeamId?: string) => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const response = await fetch("/api/onboarding");
      const result = (await response.json()) as LoadResult;

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Could not load onboarding data.");
      }

      const nextTeams = result.teams ?? [];
      const nextPlayers = result.players ?? [];

      setTeams(nextTeams);
      setPlayers(nextPlayers);
      setStaffForm((current) => ({
        ...current,
        teamId: getDefaultTeamId(nextTeams, current.teamId, preferredTeamId)
      }));
      setBulkPlayersForm((current) => ({
        ...current,
        teamId: getDefaultTeamId(nextTeams, current.teamId, preferredTeamId)
      }));
      setSeasonForm((current) => ({
        ...current,
        teamId: getDefaultTeamId(nextTeams, current.teamId, preferredTeamId)
      }));
      setPlayerLoginForm((current) => {
        const nextTeamId = getDefaultTeamId(
          nextTeams,
          current.teamId,
          preferredTeamId
        );
        const nextTeamPlayers = nextPlayers.filter(
          (player) => player.team_id === nextTeamId
        );
        const nextPlayerId = nextTeamPlayers.some(
          (player) => player.id === current.playerId
        )
          ? current.playerId
          : nextTeamPlayers[0]?.id ?? "";

        return {
          ...current,
          teamId: nextTeamId,
          playerId: nextPlayerId
        };
      });
    } catch (error) {
      setLoadError(
        getErrorMessage(error, "Could not load onboarding data. Please try again.")
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOptions();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadOptions]);

  function setMessage(formKey: FormKey, message: FormMessage | null) {
    setMessages((current) => ({
      ...current,
      [formKey]: message
    }));
  }

  function selectTeamForDependentForms(teamId: string) {
    setStaffForm((current) => ({ ...current, teamId }));
    setBulkPlayersForm((current) => ({ ...current, teamId }));
    setSeasonForm((current) => ({ ...current, teamId }));
    setPlayerLoginForm((current) => {
      const firstPlayerId =
        players.find((player) => player.team_id === teamId)?.id ?? "";

      return {
        ...current,
        teamId,
        playerId: firstPlayerId
      };
    });
  }

  async function refreshAfterMutation(teamId?: string) {
    await loadOptions(teamId);
    router.refresh();
  }

  async function handleCreateTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("team", null);

    if (!teamForm.teamName.trim()) {
      setMessage("team", { type: "error", text: "Team name is required." });
      return;
    }

    setPendingForm("team");

    try {
      const result = await postOnboarding({
        action: "create-team",
        ...teamForm
      });
      const teamId = result.teamId ?? result.team?.id ?? "";

      if (teamId) {
        setCreatedTeamId(teamId);
        selectTeamForDependentForms(teamId);
      }

      setTeamForm(defaultTeamForm);
      await refreshAfterMutation(teamId);
      setMessage("team", { type: "success", text: result.message });
    } catch (error) {
      setMessage("team", {
        type: "error",
        text: getErrorMessage(error, "Could not create team. Please try again.")
      });
    } finally {
      setPendingForm(null);
    }
  }

  async function handleCreateStaffLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("staff", null);

    if (!staffForm.teamId) {
      setMessage("staff", { type: "error", text: "Choose a team." });
      return;
    }

    setPendingForm("staff");

    try {
      const result = await postOnboarding({
        action: "create-staff-login",
        ...staffForm
      });

      setStaffForm((current) => ({
        ...current,
        fullName: "",
        email: "",
        temporaryPassword: ""
      }));
      await refreshAfterMutation(staffForm.teamId);
      setMessage("staff", { type: "success", text: result.message });
    } catch (error) {
      setMessage("staff", {
        type: "error",
        text: getErrorMessage(
          error,
          "Could not create coach/admin login. Please try again."
        )
      });
    } finally {
      setPendingForm(null);
    }
  }

  async function handleAddPlayers(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("players", null);

    if (!bulkPlayersForm.teamId) {
      setMessage("players", { type: "error", text: "Choose a team." });
      return;
    }

    setPendingForm("players");

    try {
      const result = await postOnboarding({
        action: "add-players",
        ...bulkPlayersForm
      });

      setBulkPlayersForm((current) => ({
        ...current,
        rosterText: ""
      }));
      await refreshAfterMutation(bulkPlayersForm.teamId);
      setMessage("players", { type: "success", text: result.message });
    } catch (error) {
      setMessage("players", {
        type: "error",
        text: getErrorMessage(error, "Could not add players. Please try again.")
      });
    } finally {
      setPendingForm(null);
    }
  }

  async function handleCreatePlayerLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("playerLogin", null);

    if (!playerLoginForm.teamId || !playerLoginForm.playerId) {
      setMessage("playerLogin", {
        type: "error",
        text: "Choose a team and player."
      });
      return;
    }

    setPendingForm("playerLogin");

    try {
      const result = await postOnboarding({
        action: "create-player-login",
        ...playerLoginForm
      });

      setPlayerLoginForm((current) => ({
        ...current,
        playerEmail: "",
        temporaryPassword: ""
      }));
      await refreshAfterMutation(playerLoginForm.teamId);
      setMessage("playerLogin", { type: "success", text: result.message });
    } catch (error) {
      setMessage("playerLogin", {
        type: "error",
        text: getErrorMessage(
          error,
          "Could not create player login. Please try again."
        )
      });
    } finally {
      setPendingForm(null);
    }
  }

  async function handleCreateSeason(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("season", null);

    if (!seasonForm.teamId) {
      setMessage("season", { type: "error", text: "Choose a team." });
      return;
    }

    setPendingForm("season");

    try {
      const result = await postOnboarding({
        action: "create-season",
        ...seasonForm
      });

      setSeasonForm((current) => ({
        ...current,
        seasonName: "",
        startsOn: "",
        endsOn: ""
      }));
      await refreshAfterMutation(seasonForm.teamId);
      setMessage("season", { type: "success", text: result.message });
    } catch (error) {
      setMessage("season", {
        type: "error",
        text: getErrorMessage(error, "Could not create season. Please try again.")
      });
    } finally {
      setPendingForm(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryTile label="Teams" value={teams.length.toString()} />
        <SummaryTile label="Players" value={players.length.toString()} />
        <SummaryTile
          label="Connected Players"
          value={players.filter((player) => player.profile_id).length.toString()}
        />
      </div>

      {loadError ? <Message type="error">{loadError}</Message> : null}
      {isLoading ? (
        <EmptyState message="Loading onboarding data..." />
      ) : null}

      <form onSubmit={handleCreateTeam}>
        <FormSection
          eyebrow="Step 1"
          title="Create Team"
          description="Create the team container that all future players, events, rounds, courses, and profiles will belong to."
          footer={
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {createdTeamId ? (
                <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
                  <span className="font-semibold">Created team_id: </span>
                  <code>{createdTeamId}</code>
                </div>
              ) : (
                <span className="text-sm text-slate-500">
                  Team IDs appear here after creation.
                </span>
              )}
              <button
                type="submit"
                disabled={pendingForm === "team"}
                className={primaryButtonClassName}
              >
                {pendingForm === "team" ? "Creating..." : "Create Team"}
              </button>
            </div>
          }
        >
          <div className="space-y-5">
            {messages.team ? (
              <Message type={messages.team.type}>{messages.team.text}</Message>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <TextField
                label="Team name"
                value={teamForm.teamName}
                onChange={(value) =>
                  setTeamForm((current) => ({ ...current, teamName: value }))
                }
                required
              />
              <TextField
                label="School name"
                value={teamForm.schoolName}
                onChange={(value) =>
                  setTeamForm((current) => ({ ...current, schoolName: value }))
                }
              />
              <TextField
                label="Mascot"
                value={teamForm.mascot}
                onChange={(value) =>
                  setTeamForm((current) => ({ ...current, mascot: value }))
                }
              />
              <ColorField
                label="Primary color"
                value={teamForm.primaryColor}
                onChange={(value) =>
                  setTeamForm((current) => ({ ...current, primaryColor: value }))
                }
              />
              <ColorField
                label="Secondary color"
                value={teamForm.secondaryColor}
                onChange={(value) =>
                  setTeamForm((current) => ({ ...current, secondaryColor: value }))
                }
              />
              <TextField
                label="Contact email"
                type="email"
                value={teamForm.contactEmail}
                onChange={(value) =>
                  setTeamForm((current) => ({ ...current, contactEmail: value }))
                }
              />
            </div>
          </div>
        </FormSection>
      </form>

      <form onSubmit={handleCreateStaffLogin}>
        <FormSection
          eyebrow="Step 2"
          title="Create Coach/Admin Login"
          description="Create or connect a Supabase Auth user, then upsert the team profile that gives the account admin or coach access."
          footer={
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!hasTeams || pendingForm === "staff"}
                className={primaryButtonClassName}
              >
                {pendingForm === "staff" ? "Creating..." : "Create Login"}
              </button>
            </div>
          }
        >
          <div className="space-y-5">
            {messages.staff ? (
              <Message type={messages.staff.type}>{messages.staff.text}</Message>
            ) : null}

            {!hasTeams ? (
              <InlineNotice message="Create a team before adding coach/admin logins." />
            ) : null}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <TeamSelect
                teams={teams}
                value={staffForm.teamId}
                onChange={(teamId) =>
                  setStaffForm((current) => ({ ...current, teamId }))
                }
                disabled={!hasTeams}
              />
              <TextField
                label="Full name"
                value={staffForm.fullName}
                onChange={(value) =>
                  setStaffForm((current) => ({ ...current, fullName: value }))
                }
                required
              />
              <TextField
                label="Email"
                type="email"
                value={staffForm.email}
                onChange={(value) =>
                  setStaffForm((current) => ({ ...current, email: value }))
                }
                required
              />
              <TextField
                label="Temporary password"
                type="password"
                value={staffForm.temporaryPassword}
                onChange={(value) =>
                  setStaffForm((current) => ({
                    ...current,
                    temporaryPassword: value
                  }))
                }
                required
              />
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Role</span>
                <select
                  value={staffForm.role}
                  onChange={(event) =>
                    setStaffForm((current) => ({
                      ...current,
                      role: event.target.value as "admin" | "coach"
                    }))
                  }
                  className={inputClassName}
                >
                  <option value="admin">Admin</option>
                  <option value="coach">Coach</option>
                </select>
              </label>
            </div>
          </div>
        </FormSection>
      </form>

      <form onSubmit={handleAddPlayers}>
        <FormSection
          eyebrow="Step 3"
          title="Add Players"
          description="Bulk load roster names without creating player login accounts yet."
          footer={
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!hasTeams || pendingForm === "players"}
                className={primaryButtonClassName}
              >
                {pendingForm === "players" ? "Adding..." : "Add Players"}
              </button>
            </div>
          }
        >
          <div className="space-y-5">
            {messages.players ? (
              <Message type={messages.players.type}>{messages.players.text}</Message>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
              <TeamSelect
                teams={teams}
                value={bulkPlayersForm.teamId}
                onChange={(teamId) =>
                  setBulkPlayersForm((current) => ({ ...current, teamId }))
                }
                disabled={!hasTeams}
              />
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">
                  Roster input
                </span>
                <textarea
                  value={bulkPlayersForm.rosterText}
                  onChange={(event) =>
                    setBulkPlayersForm((current) => ({
                      ...current,
                      rosterText: event.target.value
                    }))
                  }
                  rows={7}
                  placeholder={"Mason Cole, 2027\nAvery Ellis, 2028"}
                  className={cn(inputClassName, "min-h-40 resize-y")}
                />
                <span className="block text-xs text-slate-500">
                  One player per line. Supported format: First Last, Graduation Year.
                </span>
              </label>
            </div>
          </div>
        </FormSection>
      </form>

      <form onSubmit={handleCreatePlayerLogin}>
        <FormSection
          eyebrow="Step 4"
          title="Optional Player Login Setup"
          description="Create a player Auth account and connect it to one roster record when the player is ready to enter scores."
          footer={
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={
                  !hasTeams ||
                  selectedPlayerOptions.length === 0 ||
                  pendingForm === "playerLogin"
                }
                className={secondaryButtonClassName}
              >
                {pendingForm === "playerLogin"
                  ? "Connecting..."
                  : "Create Player Login"}
              </button>
            </div>
          }
        >
          <div className="space-y-5">
            {messages.playerLogin ? (
              <Message type={messages.playerLogin.type}>
                {messages.playerLogin.text}
              </Message>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <TeamSelect
                teams={teams}
                value={playerLoginForm.teamId}
                onChange={(teamId) => {
                  const firstPlayerId =
                    players.find((player) => player.team_id === teamId)?.id ?? "";

                  setPlayerLoginForm((current) => ({
                    ...current,
                    teamId,
                    playerId: firstPlayerId
                  }));
                }}
                disabled={!hasTeams}
              />
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Player</span>
                <select
                  value={playerLoginForm.playerId}
                  onChange={(event) =>
                    setPlayerLoginForm((current) => ({
                      ...current,
                      playerId: event.target.value
                    }))
                  }
                  disabled={selectedPlayerOptions.length === 0}
                  className={inputClassName}
                >
                  <option value="">Select player</option>
                  {selectedPlayerOptions.map((player) => (
                    <option key={player.id} value={player.id}>
                      {getPlayerName(player)}
                      {player.graduation_year
                        ? `, ${player.graduation_year}`
                        : ""}
                      {player.profile_id ? " (connected)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <TextField
                label="Player email"
                type="email"
                value={playerLoginForm.playerEmail}
                onChange={(value) =>
                  setPlayerLoginForm((current) => ({
                    ...current,
                    playerEmail: value
                  }))
                }
                required
              />
              <TextField
                label="Temporary password"
                type="password"
                value={playerLoginForm.temporaryPassword}
                onChange={(value) =>
                  setPlayerLoginForm((current) => ({
                    ...current,
                    temporaryPassword: value
                  }))
                }
                required
              />
            </div>

            {playerLoginForm.teamId && selectedPlayerOptions.length === 0 ? (
              <InlineNotice message="No players exist for this team yet. Add roster players first." />
            ) : null}
          </div>
        </FormSection>
      </form>

      <form onSubmit={handleCreateSeason}>
        <FormSection
          eyebrow="Step 5"
          title="Starter Season"
          description="Create the first season for a team and optionally make it the active season immediately."
          footer={
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!hasTeams || pendingForm === "season"}
                className={primaryButtonClassName}
              >
                {pendingForm === "season" ? "Creating..." : "Create Season"}
              </button>
            </div>
          }
        >
          <div className="space-y-5">
            {messages.season ? (
              <Message type={messages.season.type}>{messages.season.text}</Message>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <TeamSelect
                teams={teams}
                value={seasonForm.teamId}
                onChange={(teamId) =>
                  setSeasonForm((current) => ({ ...current, teamId }))
                }
                disabled={!hasTeams}
              />
              <TextField
                label="Season name"
                value={seasonForm.seasonName}
                onChange={(value) =>
                  setSeasonForm((current) => ({ ...current, seasonName: value }))
                }
                required
              />
              <TextField
                label="Start date"
                type="date"
                value={seasonForm.startsOn}
                onChange={(value) =>
                  setSeasonForm((current) => ({ ...current, startsOn: value }))
                }
              />
              <TextField
                label="End date"
                type="date"
                value={seasonForm.endsOn}
                onChange={(value) =>
                  setSeasonForm((current) => ({ ...current, endsOn: value }))
                }
              />
            </div>

            <label className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={seasonForm.setActive}
                onChange={(event) =>
                  setSeasonForm((current) => ({
                    ...current,
                    setActive: event.target.checked
                  }))
                }
                className="h-4 w-4 rounded border-gray-300 text-green-800 focus:ring-green-700"
              />
              Set as active season
            </label>
          </div>
        </FormSection>
      </form>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
        {value}
      </p>
    </div>
  );
}

function InlineNotice({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
      {message}
    </div>
  );
}

function TeamSelect({
  teams,
  value,
  onChange,
  disabled
}: {
  teams: TeamOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="space-y-2">
      <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        Team
        {value ? <Badge tone="slate">selected</Badge> : null}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled || teams.length === 0}
        required
        className={inputClassName}
      >
        <option value="">Select team</option>
        {teams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.name}
            {team.school_name ? `, ${team.school_name}` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  required = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className={inputClassName}
      />
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <div className="flex gap-2">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-12 shrink-0 rounded-md border border-slate-200 bg-white p-1"
          aria-label={label}
        />
        <div className="flex min-h-10 flex-1 items-center rounded-md border border-slate-200 bg-white px-3 font-mono text-sm text-slate-700">
          {value}
        </div>
      </div>
    </label>
  );
}
