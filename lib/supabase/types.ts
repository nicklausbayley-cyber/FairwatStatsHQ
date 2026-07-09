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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
