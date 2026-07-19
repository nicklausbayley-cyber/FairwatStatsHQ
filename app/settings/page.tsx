import {
  SeasonManagement,
  type SeasonSettings
} from "../../components/settings/season-management";
import { TeamSettingsForm } from "../../components/settings/team-settings-form";
import {
  requireTeamStaff,
  type CurrentTeamContext
} from "../../lib/auth/get-current-team";

export const dynamic = "force-dynamic";

type TeamSettings = {
  id: string;
  name: string;
  school_name: string | null;
  mascot: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  logo_url: string | null;
  contact_email: string | null;
};

type SeasonSettingsRow = {
  id: string;
  name: string;
  starts_on: string | null;
  ends_on: string | null;
  is_active: boolean;
};

type SettingsState =
  | {
      status: "ready";
      team: TeamSettings;
      seasons: SeasonSettingsRow[];
    }
  | {
      status: "empty";
      message: string;
    }
  | {
      status: "error";
      message: string;
    };

async function getSettingsData(
  currentTeam: CurrentTeamContext
): Promise<SettingsState> {
  try {
    const { supabase, team } = currentTeam;

    const { data: seasons, error: seasonsError } = await supabase
      .from("seasons")
      .select("id, name, starts_on, ends_on, is_active")
      .eq("team_id", team.id)
      .order("starts_on", { ascending: false })
      .order("created_at", { ascending: false });

    if (seasonsError) {
      return {
        status: "error",
        message: seasonsError.message
      };
    }

    return {
      status: "ready",
      team: team as TeamSettings,
      seasons: (seasons ?? []) as SeasonSettingsRow[]
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Unable to load team settings."
    };
  }
}

function toSeasonSettings(seasons: SeasonSettingsRow[]): SeasonSettings[] {
  return seasons.map((season) => ({
    id: season.id,
    name: season.name,
    startsOn: season.starts_on,
    endsOn: season.ends_on,
    isActive: season.is_active
  }));
}

export default async function SettingsPage() {
  const currentTeam = await requireTeamStaff();
  const settings = await getSettingsData(currentTeam);

  if (settings.status === "error") {
    return (
      <section className="space-y-6">
        <SettingsHeader />
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
          <p className="font-semibold">Settings unavailable</p>
          <p className="mt-1">{settings.message}</p>
        </div>
      </section>
    );
  }

  if (settings.status === "empty") {
    return (
      <section className="space-y-6">
        <SettingsHeader />
        <div className="rounded-lg border border-gray-200 bg-white p-5 text-sm leading-6 text-gray-600 shadow-sm">
          {settings.message}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <SettingsHeader
        teamName={settings.team.name}
        schoolName={settings.team.school_name}
      />
      <TeamSettingsForm
        team={{
          name: settings.team.name,
          schoolName: settings.team.school_name,
          mascot: settings.team.mascot,
          primaryColor: settings.team.primary_color,
          secondaryColor: settings.team.secondary_color,
          logoUrl: settings.team.logo_url,
          contactEmail: settings.team.contact_email
        }}
      />
      <SeasonManagement seasons={toSeasonSettings(settings.seasons)} />
    </section>
  );
}

function SettingsHeader({
  teamName,
  schoolName
}: {
  teamName?: string;
  schoolName?: string | null;
}) {
  return (
    <div className="rounded-lg border border-green-900/10 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
        Team Setup
      </p>
      <div className="mt-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">
            Settings
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-gray-600">
            {teamName
              ? `${teamName}${schoolName ? ` at ${schoolName}` : ""} branding, seasons, and team details.`
              : "Manage team branding, seasons, and basic setup details."}
          </p>
        </div>
      </div>
    </div>
  );
}
