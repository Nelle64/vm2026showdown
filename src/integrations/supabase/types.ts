export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      api_sync_logs: {
        Row: {
          created_at: string
          id: string
          message: string | null
          provider: string
          status: string
          synced_count: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          provider: string
          status: string
          synced_count?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          provider?: string
          status?: string
          synced_count?: number | null
        }
        Relationships: []
      }
      bonus_answers: {
        Row: {
          answer: Json
          created_at: string
          id: string
          points: number | null
          question_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answer: Json
          created_at?: string
          id?: string
          points?: number | null
          question_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answer?: Json
          created_at?: string
          id?: string
          points?: number | null
          question_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bonus_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "bonus_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      bonus_questions: {
        Row: {
          answer_type: Database["public"]["Enums"]["bonus_type"]
          correct_answer: Json | null
          created_at: string
          created_by: string
          game_id: string
          id: string
          lock_at: string
          match_id: string | null
          options: Json | null
          points: number
          question: string
          status: Database["public"]["Enums"]["bonus_status"]
        }
        Insert: {
          answer_type: Database["public"]["Enums"]["bonus_type"]
          correct_answer?: Json | null
          created_at?: string
          created_by: string
          game_id: string
          id?: string
          lock_at: string
          match_id?: string | null
          options?: Json | null
          points?: number
          question: string
          status?: Database["public"]["Enums"]["bonus_status"]
        }
        Update: {
          answer_type?: Database["public"]["Enums"]["bonus_type"]
          correct_answer?: Json | null
          created_at?: string
          created_by?: string
          game_id?: string
          id?: string
          lock_at?: string
          match_id?: string | null
          options?: Json | null
          points?: number
          question?: string
          status?: Database["public"]["Enums"]["bonus_status"]
        }
        Relationships: [
          {
            foreignKeyName: "bonus_questions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bonus_questions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      game_join_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          game_id: string
          id: string
          message: string | null
          status: Database["public"]["Enums"]["join_request_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          game_id: string
          id?: string
          message?: string | null
          status?: Database["public"]["Enums"]["join_request_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          game_id?: string
          id?: string
          message?: string | null
          status?: Database["public"]["Enums"]["join_request_status"]
          user_id?: string
        }
        Relationships: []
      }
      game_members: {
        Row: {
          game_id: string
          id: string
          is_admin: boolean
          joined_at: string
          user_id: string
        }
        Insert: {
          game_id: string
          id?: string
          is_admin?: boolean
          joined_at?: string
          user_id: string
        }
        Update: {
          game_id?: string
          id?: string
          is_admin?: boolean
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_members_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          created_at: string
          description: string | null
          id: string
          invite_code: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          invite_code?: string
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          invite_code?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          away_score: number | null
          away_team_id: string | null
          created_at: string
          external_id: string | null
          group_letter: string | null
          home_score: number | null
          home_team_id: string | null
          id: string
          kickoff_at: string
          stage: string
          status: Database["public"]["Enums"]["match_status"]
          updated_at: string
          venue: string | null
        }
        Insert: {
          away_score?: number | null
          away_team_id?: string | null
          created_at?: string
          external_id?: string | null
          group_letter?: string | null
          home_score?: number | null
          home_team_id?: string | null
          id?: string
          kickoff_at: string
          stage?: string
          status?: Database["public"]["Enums"]["match_status"]
          updated_at?: string
          venue?: string | null
        }
        Update: {
          away_score?: number | null
          away_team_id?: string | null
          created_at?: string
          external_id?: string | null
          group_letter?: string | null
          home_score?: number | null
          home_team_id?: string | null
          id?: string
          kickoff_at?: string
          stage?: string
          status?: Database["public"]["Enums"]["match_status"]
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      predictions: {
        Row: {
          away_score: number
          created_at: string
          game_id: string
          home_score: number
          id: string
          match_id: string
          points: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          away_score: number
          created_at?: string
          game_id: string
          home_score: number
          id?: string
          match_id: string
          points?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          away_score?: number
          created_at?: string
          game_id?: string
          home_score?: number
          id?: string
          match_id?: string
          points?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "predictions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          total_points: number
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id: string
          total_points?: number
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          total_points?: number
          updated_at?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          code: string
          created_at: string
          external_id: string | null
          flag_emoji: string | null
          group_letter: string | null
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          external_id?: string | null
          flag_emoji?: string | null
          group_letter?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          external_id?: string | null
          flag_emoji?: string | null
          group_letter?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      compute_points: {
        Args: { p_away: number; p_home: number; r_away: number; r_home: number }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_bonus_open: { Args: { _question_id: string }; Returns: boolean }
      is_game_admin: {
        Args: { _game_id: string; _user_id: string }
        Returns: boolean
      }
      is_game_member: {
        Args: { _game_id: string; _user_id: string }
        Returns: boolean
      }
      is_match_locked: { Args: { _match_id: string }; Returns: boolean }
      request_join_by_code: {
        Args: { _code: string }
        Returns: {
          already_member: boolean
          game_id: string
          game_name: string
          status: Database["public"]["Enums"]["join_request_status"]
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
      bonus_status: "open" | "locked" | "settled"
      bonus_type:
        | "number"
        | "text"
        | "multi_choice"
        | "team"
        | "player"
        | "multiple_choice"
      join_request_status: "pending" | "approved" | "rejected"
      match_status:
        | "scheduled"
        | "locked"
        | "live"
        | "finished"
        | "postponed"
        | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      bonus_status: ["open", "locked", "settled"],
      bonus_type: [
        "number",
        "text",
        "multi_choice",
        "team",
        "player",
        "multiple_choice",
      ],
      join_request_status: ["pending", "approved", "rejected"],
      match_status: [
        "scheduled",
        "locked",
        "live",
        "finished",
        "postponed",
        "cancelled",
      ],
    },
  },
} as const
