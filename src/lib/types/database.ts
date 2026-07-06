export type UserRole = "admin" | "coach" | "player";

export type EventType =
  | "practice"
  | "match"
  | "invitational"
  | "qualifier"
  | "tournament";

export type TeamSummary = {
  id: string;
  name: string;
  school_name: string | null;
  mascot: string | null;
  primary_color: string | null;
};

export type TeamProfile = {
  id: string;
  team_id: string;
  role: UserRole;
  full_name: string;
  email: string;
  avatar_url: string | null;
};

export type CurrentUserContext = {
  userId: string;
  email: string | null;
  profile: TeamProfile;
  team: TeamSummary;
};
