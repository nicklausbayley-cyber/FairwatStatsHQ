import {
  SeasonManagement,
  type SeasonSettings
} from "../../components/settings/season-management";
import { TeamSettingsForm } from "../../components/settings/team-settings-form";
import { EmptyState, PageHeader } from "../../components/ui/primitives";
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
        <EmptyState title="Settings unavailable" message={settings.message} />
      </section>
    );
  }

  if (settings.status === "empty") {
    return (
      <section className="space-y-6">
        <SettingsHeader />
        <EmptyState message={settings.message} />
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
    <PageHeader
      eyebrow="Team Setup"
      title="Settings"
      description={
        teamName
          ? `${teamName}${schoolName ? ` at ${schoolName}` : ""} branding, seasons, and team details.`
          : "Manage team branding, seasons, and basic setup details."
      }
    />
  );
}
