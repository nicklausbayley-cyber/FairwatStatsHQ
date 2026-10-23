/**
 * Coach-facing setup milestones are derived from real team data.
 * Nothing is checked off manually and no extra database table is needed.
 */
export type CoachSetupInput = {
  isSignedIn: boolean;
  schoolName: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  activeSeasonName: string | null;
  activePlayerCount: number;
  activeSeasonEventCount: number;
};

export type CoachSetupStepId =
  | "account"
  | "branding"
  | "season"
  | "roster"
  | "event";

export type CoachSetupStep = {
  id: CoachSetupStepId;
  title: string;
  description: string;
  detail: string;
  href: string;
  actionLabel: string;
  complete: boolean;
};

export type CoachSetupProgress = {
  steps: CoachSetupStep[];
  completedCount: number;
  totalCount: number;
  percent: number;
  complete: boolean;
  nextStep: CoachSetupStep | null;
};

function hasText(value: string | null) {
  return Boolean(value?.trim());
}

function isValidHexColor(value: string | null) {
  return Boolean(value && /^#[\da-fA-F]{6}$/.test(value.trim()));
}

function safeCount(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

export function buildCoachSetupProgress(input: CoachSetupInput): CoachSetupProgress {
  const players = safeCount(input.activePlayerCount);
  const events = safeCount(input.activeSeasonEventCount);
  const seasonReady = hasText(input.activeSeasonName);
  const brandingReady = hasText(input.schoolName) &&
    hasText(input.logoUrl) &&
    isValidHexColor(input.primaryColor) &&
    isValidHexColor(input.secondaryColor);

  const steps: CoachSetupStep[] = [
    {
      id: "account",
      title: "Activate your coach account",
      description: "Use your secure Fairway Stats HQ coach login.",
      detail: input.isSignedIn
        ? "You're signed in and ready to manage your team."
        : "Accept your invitation and sign in.",
      href: "/login",
      actionLabel: "Sign in",
      complete: input.isSignedIn
    },
    {
      id: "branding",
      title: "Set up team branding",
      description: "Confirm your school name and colors, then upload your logo.",
      detail: brandingReady
        ? "School branding is in place."
        : "School name, two team colors, and a logo are needed for this milestone.",
      href: "/settings",
      actionLabel: "Edit team details",
      complete: brandingReady
    },
    {
      id: "season",
      title: "Choose your active season",
      description: "Make sure scores will be recorded against the right season.",
      detail: seasonReady
        ? input.activeSeasonName!.trim() + " is active."
        : "Create a season and set it active in Settings.",
      href: "/settings",
      actionLabel: "Manage seasons",
      complete: seasonReady
    },
    {
      id: "roster",
      title: "Build your team roster",
      description: "Add players and check their graduation years.",
      detail: players > 0
        ? players + " active " + (players === 1 ? "player" : "players") + " on your roster."
        : "Add your first active player to the roster.",
      href: "/roster",
      actionLabel: "Open roster",
      complete: players > 0
    },
    {
      id: "event",
      title: "Schedule your first event",
      description: "Add a match, qualifier, invitational, or tournament.",
      detail: !seasonReady
        ? "An active season is needed before an event can count toward setup."
        : events > 0
          ? events + " " + (events === 1 ? "event" : "events") + " scheduled in the active season."
          : "No events are scheduled in the active season yet.",
      href: seasonReady ? "/events" : "/settings",
      actionLabel: seasonReady ? "Manage events" : "Choose a season first",
      complete: seasonReady && events > 0
    }
  ];
  const completedCount = steps.filter((step) => step.complete).length;
  const totalCount = steps.length;

  return {
    steps,
    completedCount,
    totalCount,
    percent: Math.round((completedCount / totalCount) * 100),
    complete: completedCount === totalCount,
    nextStep: steps.find((step) => !step.complete) ?? null
  };
}
