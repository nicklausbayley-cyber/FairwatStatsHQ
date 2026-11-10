export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      teams: {
        Row: {
          id: string;
          name: string;
          school_name: string | null;
          mascot: string | null;
          primary_color: string | null;
          secondary_color: string | null;
          logo_url: string | null;
          contact_email: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          school_name?: string | null;
          mascot?: string | null;
          primary_color?: string | null;
          secondary_color?: string | null;
          logo_url?: string | null;
          contact_email?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          school_name?: string | null;
          mascot?: string | null;
          primary_color?: string | null;
          secondary_color?: string | null;
          logo_url?: string | null;
          contact_email?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      staff_team_access: {
        Row: {
          user_id: string;
          team_id: string;
          role: "admin" | "coach";
          created_at: string;
        };
        Insert: {
          user_id: string;
          team_id: string;
          role: "admin" | "coach";
          created_at?: string;
        };
        Update: {
          user_id?: string;
          team_id?: string;
          role?: "admin" | "coach";
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          team_id: string;
          role: "admin" | "coach" | "player";
          full_name: string;
          email: string;
          created_at: string;
        };
        Insert: {
          id: string;
          team_id: string;
          role?: "admin" | "coach" | "player";
          full_name: string;
          email: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          role?: "admin" | "coach" | "player";
          full_name?: string;
          email?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      seasons: {
        Row: {
          id: string;
          team_id: string;
          name: string;
          starts_on: string | null;
          ends_on: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          name: string;
          starts_on?: string | null;
          ends_on?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          name?: string;
          starts_on?: string | null;
          ends_on?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      players: {
        Row: {
          id: string;
          team_id: string;
          profile_id: string | null;
          first_name: string;
          last_name: string;
          graduation_year: number | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          profile_id?: string | null;
          first_name: string;
          last_name: string;
          graduation_year?: number | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          profile_id?: string | null;
          first_name?: string;
          last_name?: string;
          graduation_year?: number | null;
          status?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          team_id: string;
          season_id: string | null;
          name: string;
          event_type:
            | "practice"
            | "match"
            | "invitational"
            | "qualifier"
            | "tournament";
          event_date: string;
          course_name: string | null;
          course_id: string | null;
          hole_selection: "front_9" | "back_9" | "full_18" | null;
          location: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          season_id?: string | null;
          name: string;
          event_type:
            | "practice"
            | "match"
            | "invitational"
            | "qualifier"
            | "tournament";
          event_date: string;
          course_name?: string | null;
          course_id?: string | null;
          hole_selection?: "front_9" | "back_9" | "full_18" | null;
          location?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          season_id?: string | null;
          name?: string;
          event_type?:
            | "practice"
            | "match"
            | "invitational"
            | "qualifier"
            | "tournament";
          event_date?: string;
          course_name?: string | null;
          course_id?: string | null;
          hole_selection?: "front_9" | "back_9" | "full_18" | null;
          location?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      courses: {
        Row: {
          id: string;
          team_id: string;
          name: string;
          location: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          name: string;
          location?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          name?: string;
          location?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      course_holes: {
        Row: {
          id: string;
          course_id: string;
          hole_number: number;
          par: number;
          handicap: number | null;
          yardage: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          hole_number: number;
          par: number;
          handicap?: number | null;
          yardage?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          hole_number?: number;
          par?: number;
          handicap?: number | null;
          yardage?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      rounds: {
        Row: {
          id: string;
          team_id: string;
          season_id: string | null;
          event_id: string | null;
          player_id: string;
          submitted_by: string | null;
          counts_toward_lineup: boolean;
          played_on: string;
          holes: number;
          score: number;
          par: number | null;
          fairways_hit: number | null;
          fairways_possible: number | null;
          greens_in_regulation: number | null;
          gir_possible: number | null;
          putts: number | null;
          penalties: number | null;
          three_putts: number | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          season_id?: string | null;
          event_id?: string | null;
          player_id: string;
          submitted_by?: string | null;
          counts_toward_lineup?: boolean;
          played_on: string;
          holes: number;
          score: number;
          par?: number | null;
          fairways_hit?: number | null;
          fairways_possible?: number | null;
          greens_in_regulation?: number | null;
          gir_possible?: number | null;
          putts?: number | null;
          penalties?: number | null;
          three_putts?: number | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          season_id?: string | null;
          event_id?: string | null;
          player_id?: string;
          submitted_by?: string | null;
          counts_toward_lineup?: boolean;
          played_on?: string;
          holes?: number;
          score?: number;
          par?: number | null;
          fairways_hit?: number | null;
          fairways_possible?: number | null;
          greens_in_regulation?: number | null;
          gir_possible?: number | null;
          putts?: number | null;
          penalties?: number | null;
          three_putts?: number | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      round_holes: {
        Row: {
          id: string;
          team_id: string;
          round_id: string;
          player_id: string;
          event_id: string | null;
          course_id: string | null;
          hole_number: number;
          par: number;
          handicap: number | null;
          score: number;
          putts: number | null;
          fir: boolean | null;
          gir: boolean | null;
          penalty: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          round_id: string;
          player_id: string;
          event_id?: string | null;
          course_id?: string | null;
          hole_number: number;
          par: number;
          handicap?: number | null;
          score: number;
          putts?: number | null;
          fir?: boolean | null;
          gir?: boolean | null;
          penalty?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          round_id?: string;
          player_id?: string;
          event_id?: string | null;
          course_id?: string | null;
          hole_number?: number;
          par?: number;
          handicap?: number | null;
          score?: number;
          putts?: number | null;
          fir?: boolean | null;
          gir?: boolean | null;
          penalty?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      player_season_summaries: {
        Row: {
          id: string;
          team_id: string;
          player_id: string;
          season_id: string;
          updated_by: string | null;
          season_summary: string | null;
          strengths: string | null;
          development_areas: string | null;
          next_season_goals: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          player_id: string;
          season_id: string;
          updated_by?: string | null;
          season_summary?: string | null;
          strengths?: string | null;
          development_areas?: string | null;
          next_season_goals?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          player_id?: string;
          season_id?: string;
          updated_by?: string | null;
          season_summary?: string | null;
          strengths?: string | null;
          development_areas?: string | null;
          next_season_goals?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      coach_notes: {
        Row: {
          id: string;
          team_id: string;
          player_id: string;
          author_id: string;
          note: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          player_id: string;
          author_id: string;
          note: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          player_id?: string;
          author_id?: string;
          note?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      revoke_staff_team_access: {
        Args: {
          target_user_id: string;
          target_team_id: string;
          actor_user_id: string;
        };
        Returns: Json;
      };
      support_team_inventory: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      support_team_dashboard: {
        Args: { target_team_id: string };
        Returns: Json;
      };
      support_team_courses: {
        Args: { target_team_id: string };
        Returns: Json;
      };
      support_save_course: {
        Args: {
          p_actor_id: string;
          p_team_id: string;
          p_course_id: string | null;
          p_name: string;
          p_location: string | null;
          p_holes: Json;
        };
        Returns: string;
      };
    };
    Enums: {
      user_role: "admin" | "coach" | "player";
      event_type:
        | "practice"
        | "match"
        | "invitational"
        | "qualifier"
        | "tournament";
    };
    CompositeTypes: Record<string, never>;
  };
};
