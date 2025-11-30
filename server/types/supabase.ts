export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type AppRole = 'admin' | 'realtor'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          email: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          email: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          email?: string
          created_at?: string
          updated_at?: string
        }
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: AppRole
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: AppRole
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: AppRole
          created_at?: string
        }
      }
      countries: {
        Row: {
          id: string
          name: string
          code: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          code: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string
          created_at?: string
        }
      }
      cities: {
        Row: {
          id: string
          name: string
          country_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          country_id: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          country_id?: string
          created_at?: string
        }
      }
      offices: {
        Row: {
          id: string
          name: string
          city_id: string
          address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          city_id: string
          address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          city_id?: string
          address?: string | null
          created_at?: string
        }
      }
      teams: {
        Row: {
          id: string
          name: string
          office_id: string
          leader_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          office_id: string
          leader_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          office_id?: string
          leader_id?: string | null
          created_at?: string
        }
      }
      realtors: {
        Row: {
          id: string
          user_id: string
          team_id: string | null
          level: number
          hire_date: string
          confidence: boolean
          sales_resilience: boolean
          success_mindset: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          team_id?: string | null
          level?: number
          hire_date?: string
          confidence?: boolean
          sales_resilience?: boolean
          success_mindset?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          team_id?: string | null
          level?: number
          hire_date?: string
          confidence?: boolean
          sales_resilience?: boolean
          success_mindset?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      deals: {
        Row: {
          id: string
          realtor_id: string
          client_name: string
          deal_value: number
          commission: number | null
          deal_date: string
          created_at: string
        }
        Insert: {
          id?: string
          realtor_id: string
          client_name: string
          deal_value: number
          commission?: number | null
          deal_date?: string
          created_at?: string
        }
        Update: {
          id?: string
          realtor_id?: string
          client_name?: string
          deal_value?: number
          commission?: number | null
          deal_date?: string
          created_at?: string
        }
      }
      diagnoses: {
        Row: {
          id: string
          realtor_id: string
          client_name: string
          diagnosis_date: string
          status: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          realtor_id: string
          client_name: string
          diagnosis_date?: string
          status?: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          realtor_id?: string
          client_name?: string
          diagnosis_date?: string
          status?: string
          notes?: string | null
          created_at?: string
        }
      }
      training_progress: {
        Row: {
          id: string
          realtor_id: string
          section: string
          subsection: string
          lecture_completed: boolean
          video_completed: boolean
          practical_completed: boolean
          handover_completed: boolean
          exam_completed: boolean
          updated_at: string
        }
        Insert: {
          id?: string
          realtor_id: string
          section: string
          subsection: string
          lecture_completed?: boolean
          video_completed?: boolean
          practical_completed?: boolean
          handover_completed?: boolean
          exam_completed?: boolean
          updated_at?: string
        }
        Update: {
          id?: string
          realtor_id?: string
          section?: string
          subsection?: string
          lecture_completed?: boolean
          video_completed?: boolean
          practical_completed?: boolean
          handover_completed?: boolean
          exam_completed?: boolean
          updated_at?: string
        }
      }
    }
  }
}


