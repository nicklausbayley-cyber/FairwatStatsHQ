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
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          school_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          school_name?: string | null;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
