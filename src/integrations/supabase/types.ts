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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      buyer_schedule: {
        Row: {
          buyer1_name: string | null
          buyer1_notes: string | null
          buyer1_phone: string | null
          buyer2_name: string | null
          buyer2_notes: string | null
          buyer2_phone: string | null
          created_at: string
          id: string
          realtor_id: string
          schedule_date: string
          time_slot: string
          updated_at: string
        }
        Insert: {
          buyer1_name?: string | null
          buyer1_notes?: string | null
          buyer1_phone?: string | null
          buyer2_name?: string | null
          buyer2_notes?: string | null
          buyer2_phone?: string | null
          created_at?: string
          id?: string
          realtor_id: string
          schedule_date: string
          time_slot: string
          updated_at?: string
        }
        Update: {
          buyer1_name?: string | null
          buyer1_notes?: string | null
          buyer1_phone?: string | null
          buyer2_name?: string | null
          buyer2_notes?: string | null
          buyer2_phone?: string | null
          created_at?: string
          id?: string
          realtor_id?: string
          schedule_date?: string
          time_slot?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyer_schedule_realtor_id_fkey"
            columns: ["realtor_id"]
            isOneToOne: false
            referencedRelation: "realtors"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          country_id: string
          created_at: string
          id: string
          manager_id: string | null
          name: string
        }
        Insert: {
          country_id: string
          created_at?: string
          id?: string
          manager_id?: string | null
          name: string
        }
        Update: {
          country_id?: string
          created_at?: string
          id?: string
          manager_id?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "cities_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cities_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      deals: {
        Row: {
          client_name: string
          commission: number | null
          created_at: string
          deal_date: string
          deal_value: number
          id: string
          is_exclusive: boolean | null
          is_key: boolean | null
          realtor_id: string
        }
        Insert: {
          client_name: string
          commission?: number | null
          created_at?: string
          deal_date?: string
          deal_value: number
          id?: string
          is_exclusive?: boolean | null
          is_key?: boolean | null
          realtor_id: string
        }
        Update: {
          client_name?: string
          commission?: number | null
          created_at?: string
          deal_date?: string
          deal_value?: number
          id?: string
          is_exclusive?: boolean | null
          is_key?: boolean | null
          realtor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_realtor_id_fkey"
            columns: ["realtor_id"]
            isOneToOne: false
            referencedRelation: "realtors"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnoses: {
        Row: {
          client_name: string
          created_at: string
          diagnosis_date: string
          id: string
          notes: string | null
          realtor_id: string
          status: string
        }
        Insert: {
          client_name: string
          created_at?: string
          diagnosis_date?: string
          id?: string
          notes?: string | null
          realtor_id: string
          status?: string
        }
        Update: {
          client_name?: string
          created_at?: string
          diagnosis_date?: string
          id?: string
          notes?: string | null
          realtor_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnoses_realtor_id_fkey"
            columns: ["realtor_id"]
            isOneToOne: false
            referencedRelation: "realtors"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          read: boolean | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          read?: boolean | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read?: boolean | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      offices: {
        Row: {
          address: string | null
          city_id: string
          created_at: string
          id: string
          manager_id: string | null
          name: string
        }
        Insert: {
          address?: string | null
          city_id: string
          created_at?: string
          id?: string
          manager_id?: string | null
          name: string
        }
        Update: {
          address?: string | null
          city_id?: string
          created_at?: string
          id?: string
          manager_id?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "offices_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offices_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          inactivity_reason: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          inactivity_reason?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          inactivity_reason?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      realtor_goals: {
        Row: {
          created_at: string
          deals_goal: number | null
          exclusives_goal: number | null
          id: string
          keys_goal: number | null
          month: number
          realtor_id: string
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          deals_goal?: number | null
          exclusives_goal?: number | null
          id?: string
          keys_goal?: number | null
          month: number
          realtor_id: string
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          deals_goal?: number | null
          exclusives_goal?: number | null
          id?: string
          keys_goal?: number | null
          month?: number
          realtor_id?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "realtor_goals_realtor_id_fkey"
            columns: ["realtor_id"]
            isOneToOne: false
            referencedRelation: "realtors"
            referencedColumns: ["id"]
          },
        ]
      }
      realtors: {
        Row: {
          confidence: boolean | null
          created_at: string
          hire_date: string
          id: string
          level: number
          sales_resilience: boolean | null
          success_mindset: boolean | null
          team_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence?: boolean | null
          created_at?: string
          hire_date?: string
          id?: string
          level?: number
          sales_resilience?: boolean | null
          success_mindset?: boolean | null
          team_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence?: boolean | null
          created_at?: string
          hire_date?: string
          id?: string
          level?: number
          sales_resilience?: boolean | null
          success_mindset?: boolean | null
          team_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "realtors_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "realtors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          leader_id: string | null
          name: string
          office_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          leader_id?: string | null
          name: string
          office_id: string
        }
        Update: {
          created_at?: string
          id?: string
          leader_id?: string | null
          name?: string
          office_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
        ]
      }
      training_group_trainees: {
        Row: {
          created_at: string
          email: string | null
          group_id: string
          id: string
          intro_completed: boolean
          level: string | null
          name: string
          phone: string | null
          position: string | null
          training_stage: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          group_id: string
          id?: string
          intro_completed?: boolean
          level?: string | null
          name: string
          phone?: string | null
          position?: string | null
          training_stage?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          group_id?: string
          id?: string
          intro_completed?: boolean
          level?: string | null
          name?: string
          phone?: string | null
          position?: string | null
          training_stage?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_group_trainees_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "training_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      training_groups: {
        Row: {
          created_at: string
          created_by: string | null
          current_day: number
          id: string
          leader_id: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_day?: number
          id?: string
          leader_id: string
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_day?: number
          id?: string
          leader_id?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_groups_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      training_progress: {
        Row: {
          exam_completed: boolean | null
          handover_completed: boolean | null
          id: string
          lecture_completed: boolean | null
          practical_completed: boolean | null
          realtor_id: string
          section: string
          subsection: string
          updated_at: string
          video_completed: boolean | null
        }
        Insert: {
          exam_completed?: boolean | null
          handover_completed?: boolean | null
          id?: string
          lecture_completed?: boolean | null
          practical_completed?: boolean | null
          realtor_id: string
          section: string
          subsection: string
          updated_at?: string
          video_completed?: boolean | null
        }
        Update: {
          exam_completed?: boolean | null
          handover_completed?: boolean | null
          id?: string
          lecture_completed?: boolean | null
          practical_completed?: boolean | null
          realtor_id?: string
          section?: string
          subsection?: string
          updated_at?: string
          video_completed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "training_progress_realtor_id_fkey"
            columns: ["realtor_id"]
            isOneToOne: false
            referencedRelation: "realtors"
            referencedColumns: ["id"]
          },
        ]
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
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_realtor_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      setup_manager_account: {
        Args: {
          p_cities?: string[]
          p_city_name?: string
          p_email: string
          p_full_name: string
          p_role: Database["public"]["Enums"]["app_role"]
          p_team_name?: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "realtor"
        | "team_leader"
        | "office_manager"
        | "regional_manager"
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
      app_role: [
        "admin",
        "realtor",
        "team_leader",
        "office_manager",
        "regional_manager",
      ],
    },
  },
} as const
