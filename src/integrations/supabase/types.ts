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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      button_presses: {
        Row: {
          created_at: string
          id: string
          people_count: number
          pressed_at: string
          sector: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          people_count: number
          pressed_at?: string
          sector: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          people_count?: number
          pressed_at?: string
          sector?: number
          user_id?: string
        }
        Relationships: []
      }
      client_consultations: {
        Row: {
          button_press_id: string
          consultation_type: Database["public"]["Enums"]["consultation_type"]
          created_at: string
          id: string
          outcome: Database["public"]["Enums"]["consultation_outcome"]
          recorded_at: string
          refusal_reason: Database["public"]["Enums"]["refusal_reason"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          button_press_id: string
          consultation_type: Database["public"]["Enums"]["consultation_type"]
          created_at?: string
          id?: string
          outcome: Database["public"]["Enums"]["consultation_outcome"]
          recorded_at?: string
          refusal_reason?: Database["public"]["Enums"]["refusal_reason"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          button_press_id?: string
          consultation_type?: Database["public"]["Enums"]["consultation_type"]
          created_at?: string
          id?: string
          outcome?: Database["public"]["Enums"]["consultation_outcome"]
          recorded_at?: string
          refusal_reason?: Database["public"]["Enums"]["refusal_reason"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_consultations_button_press_id_fkey"
            columns: ["button_press_id"]
            isOneToOne: true
            referencedRelation: "button_presses"
            referencedColumns: ["id"]
          },
        ]
      }
      client_deals: {
        Row: {
          button_press_id: string
          closed_at: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          button_press_id: string
          closed_at?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          button_press_id?: string
          closed_at?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_deals_button_press_id_fkey"
            columns: ["button_press_id"]
            isOneToOne: true
            referencedRelation: "button_presses"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_otps: {
        Row: {
          created_at: string
          custom_code: string
          email: string
          expires_at: string
          id: string
          original_otp: string
          used: boolean
        }
        Insert: {
          created_at?: string
          custom_code: string
          email: string
          expires_at?: string
          id?: string
          original_otp: string
          used?: boolean
        }
        Update: {
          created_at?: string
          custom_code?: string
          email?: string
          expires_at?: string
          id?: string
          original_otp?: string
          used?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      seller_breaks: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          shift_id: string
          started_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          shift_id: string
          started_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          shift_id?: string
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_breaks_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "seller_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_shifts: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          started_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          started_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      admin_get_daily_stats: { Args: never; Returns: Json }
      admin_get_funnel_stats: { Args: never; Returns: Json }
      admin_get_monthly_stats: { Args: never; Returns: Json }
      admin_get_seller_stats: { Args: never; Returns: Json }
      admin_get_total_stats: { Args: never; Returns: Json }
      auto_close_stale_shifts: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      consultation_outcome: "proposal_sent" | "project_offered" | "refused"
      consultation_type: "express" | "deep"
      refusal_reason: "price" | "product" | "other"
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
      app_role: ["admin", "moderator", "user"],
      consultation_outcome: ["proposal_sent", "project_offered", "refused"],
      consultation_type: ["express", "deep"],
      refusal_reason: ["price", "product", "other"],
    },
  },
} as const
