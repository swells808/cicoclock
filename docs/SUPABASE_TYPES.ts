/**
 * CICO Supabase TypeScript Types
 * 
 * This file provides type-safe access to the Supabase database.
 * Copy this file to your Expo project: src/integrations/supabase/types.ts
 * 
 * Usage:
 * ```typescript
 * import { Database, Tables, Enums } from '@/integrations/supabase/types';
 * 
 * // Get row type for a table
 * type Profile = Tables<'profiles'>;
 * type TimeEntry = Tables<'time_entries'>;
 * 
 * // Get enum type
 * type AppRole = Enums<'app_role'>;
 * ```
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admin_time_adjustments: {
        Row: {
          action_type: string
          admin_user_id: string
          affected_user_id: string
          company_id: string
          created_at: string
          id: string
          new_end_time: string
          new_start_time: string | null
          old_end_time: string | null
          old_start_time: string | null
          reason: string | null
          time_entry_id: string
          timestamp: string
        }
        Insert: {
          action_type: string
          admin_user_id: string
          affected_user_id: string
          company_id: string
          created_at?: string
          id?: string
          new_end_time: string
          new_start_time?: string | null
          old_end_time?: string | null
          old_start_time?: string | null
          reason?: string | null
          time_entry_id: string
          timestamp?: string
        }
        Update: {
          action_type?: string
          admin_user_id?: string
          affected_user_id?: string
          company_id?: string
          created_at?: string
          id?: string
          new_end_time?: string
          new_start_time?: string | null
          old_end_time?: string | null
          old_start_time?: string | null
          reason?: string | null
          time_entry_id?: string
          timestamp?: string
        }
        Relationships: []
      }
      badge_templates: {
        Row: {
          background_url: string | null
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          template_config: Json
          updated_at: string
        }
        Insert: {
          background_url?: string | null
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          template_config?: Json
          updated_at?: string
        }
        Update: {
          background_url?: string | null
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          template_config?: Json
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          city: string | null
          company_id: string
          company_name: string
          contact_person_name: string | null
          contact_person_title: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          notes: string | null
          phone: string | null
          postal_code: string | null
          state_province: string | null
          street_address: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          company_id: string
          company_name: string
          contact_person_name?: string | null
          contact_person_title?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          state_province?: string | null
          street_address?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          company_id?: string
          company_name?: string
          contact_person_name?: string | null
          contact_person_title?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          state_province?: string | null
          street_address?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          city: string
          company_logo_url: string | null
          company_name: string
          country: string
          created_at: string
          departments: string[] | null
          id: string
          industry: string | null
          phone: string
          postal_code: string
          state_province: string
          street_address: string
          updated_at: string
          website: string | null
        }
        Insert: {
          city: string
          company_logo_url?: string | null
          company_name: string
          country: string
          created_at?: string
          departments?: string[] | null
          id?: string
          industry?: string | null
          phone: string
          postal_code: string
          state_province: string
          street_address: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          city?: string
          company_logo_url?: string | null
          company_name?: string
          country?: string
          created_at?: string
          departments?: string[] | null
          id?: string
          industry?: string | null
          phone?: string
          postal_code?: string
          state_province?: string
          street_address?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      company_features: {
        Row: {
          company_id: string
          created_at: string
          employee_pin: boolean
          geolocation: boolean
          id: string
          mapbox_public_token: string | null
          photo_capture: boolean
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          employee_pin?: boolean
          geolocation?: boolean
          id?: string
          mapbox_public_token?: string | null
          photo_capture?: boolean
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          employee_pin?: boolean
          geolocation?: boolean
          id?: string
          mapbox_public_token?: string | null
          photo_capture?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      department_schedules: {
        Row: {
          company_id: string
          created_at: string | null
          day_of_week: number
          department_id: string
          end_time: string | null
          id: string
          is_day_off: boolean | null
          start_time: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          day_of_week: number
          department_id: string
          end_time?: string | null
          id?: string
          is_day_off?: boolean | null
          start_time?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          day_of_week?: number
          department_id?: string
          end_time?: string | null
          id?: string
          is_day_off?: boolean | null
          start_time?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      departments: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      employee_assignments: {
        Row: {
          assigned_date: string | null
          category: Database["public"]["Enums"]["assignment_category"]
          company_id: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          notes: string | null
          profile_id: string
          return_date: string | null
          serial_number: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_date?: string | null
          category: Database["public"]["Enums"]["assignment_category"]
          company_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          notes?: string | null
          profile_id: string
          return_date?: string | null
          serial_number?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_date?: string | null
          category?: Database["public"]["Enums"]["assignment_category"]
          company_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          notes?: string | null
          profile_id?: string
          return_date?: string | null
          serial_number?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      employee_schedules: {
        Row: {
          company_id: string
          created_at: string | null
          day_of_week: number
          end_time: string | null
          id: string
          is_day_off: boolean | null
          profile_id: string
          start_time: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          day_of_week: number
          end_time?: string | null
          id?: string
          is_day_off?: boolean | null
          profile_id: string
          start_time?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          day_of_week?: number
          end_time?: string | null
          id?: string
          is_day_off?: boolean | null
          profile_id?: string
          start_time?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      overtime_entries: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string | null
          date: string
          hours: number
          id: string
          profile_id: string
          reason: string | null
          status: Database["public"]["Enums"]["overtime_status"] | null
          time_entry_id: string | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string | null
          date: string
          hours: number
          id?: string
          profile_id: string
          reason?: string | null
          status?: Database["public"]["Enums"]["overtime_status"] | null
          time_entry_id?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string | null
          date?: string
          hours?: number
          id?: string
          profile_id?: string
          reason?: string | null
          status?: Database["public"]["Enums"]["overtime_status"] | null
          time_entry_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address_city: string | null
          address_country: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          avatar_url: string | null
          company_id: string | null
          created_at: string
          date_of_hire: string | null
          department_id: string | null
          display_name: string | null
          email: string | null
          employee_id: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          pin: string | null
          status: string
          trade_number: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address_city?: string | null
          address_country?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          date_of_hire?: string | null
          department_id?: string | null
          display_name?: string | null
          email?: string | null
          employee_id?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          pin?: string | null
          status?: string
          trade_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address_city?: string | null
          address_country?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          date_of_hire?: string | null
          department_id?: string | null
          display_name?: string | null
          email?: string | null
          employee_id?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          pin?: string | null
          status?: string
          trade_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      project_tasks: {
        Row: {
          assignee_id: string | null
          created_at: string
          due_date: string | null
          id: string
          name: string
          project_id: string
          status: string | null
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          name: string
          project_id: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          name?: string
          project_id?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_team_members: {
        Row: {
          created_at: string
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          budget_per_hour: number | null
          client_id: string | null
          company_id: string
          created_at: string
          department_id: string | null
          description: string | null
          end_date: string | null
          estimated_hours: number | null
          hourly_rate: number | null
          id: string
          is_active: boolean
          name: string
          start_date: string | null
          status: string | null
          track_overtime: boolean | null
          updated_at: string
        }
        Insert: {
          budget_per_hour?: number | null
          client_id?: string | null
          company_id: string
          created_at?: string
          department_id?: string | null
          description?: string | null
          end_date?: string | null
          estimated_hours?: number | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          name: string
          start_date?: string | null
          status?: string | null
          track_overtime?: boolean | null
          updated_at?: string
        }
        Update: {
          budget_per_hour?: number | null
          client_id?: string | null
          company_id?: string
          created_at?: string
          department_id?: string | null
          description?: string | null
          end_date?: string | null
          estimated_hours?: number | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          name?: string
          start_date?: string | null
          status?: string | null
          track_overtime?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      report_execution_log: {
        Row: {
          error_message: string | null
          executed_at: string
          id: string
          recipients_count: number
          scheduled_report_id: string
          status: string
        }
        Insert: {
          error_message?: string | null
          executed_at?: string
          id?: string
          recipients_count?: number
          scheduled_report_id: string
          status: string
        }
        Update: {
          error_message?: string | null
          executed_at?: string
          id?: string
          recipients_count?: number
          scheduled_report_id?: string
          status?: string
        }
        Relationships: []
      }
      scheduled_report_recipients: {
        Row: {
          created_at: string
          email: string
          id: string
          profile_id: string | null
          scheduled_report_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          profile_id?: string | null
          scheduled_report_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          profile_id?: string | null
          scheduled_report_id?: string
        }
        Relationships: []
      }
      scheduled_reports: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string | null
          report_config: Json | null
          report_type: string
          schedule_day_of_month: number | null
          schedule_day_of_week: number | null
          schedule_frequency: string
          schedule_time: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string | null
          report_config?: Json | null
          report_type: string
          schedule_day_of_month?: number | null
          schedule_day_of_week?: number | null
          schedule_frequency: string
          schedule_time?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string | null
          report_config?: Json | null
          report_type?: string
          schedule_day_of_month?: number | null
          schedule_day_of_week?: number | null
          schedule_frequency?: string
          schedule_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string
          features: string[]
          id: string
          name: string
          price: number
          stripe_price_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          features?: string[]
          id?: string
          name: string
          price: number
          stripe_price_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          features?: string[]
          id?: string
          name?: string
          price?: number
          stripe_price_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      task_activities: {
        Row: {
          action_type: Database["public"]["Enums"]["task_action_type"]
          company_id: string
          created_at: string
          id: string
          profile_id: string
          project_id: string
          task_id: string
          task_type_id: string
          time_entry_id: string
          timestamp: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_type: Database["public"]["Enums"]["task_action_type"]
          company_id: string
          created_at?: string
          id?: string
          profile_id: string
          project_id: string
          task_id: string
          task_type_id: string
          time_entry_id: string
          timestamp?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_type?: Database["public"]["Enums"]["task_action_type"]
          company_id?: string
          created_at?: string
          id?: string
          profile_id?: string
          project_id?: string
          task_id?: string
          task_type_id?: string
          time_entry_id?: string
          timestamp?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      task_types: {
        Row: {
          code: string
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      time_entries: {
        Row: {
          clock_in_address: string | null
          clock_in_latitude: number | null
          clock_in_longitude: number | null
          clock_in_photo_url: string | null
          clock_out_address: string | null
          clock_out_latitude: number | null
          clock_out_longitude: number | null
          clock_out_photo_url: string | null
          company_id: string
          created_at: string
          description: string | null
          duration_minutes: number | null
          end_time: string | null
          id: string
          is_break: boolean
          profile_id: string | null
          project_id: string | null
          start_time: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          clock_in_address?: string | null
          clock_in_latitude?: number | null
          clock_in_longitude?: number | null
          clock_in_photo_url?: string | null
          clock_out_address?: string | null
          clock_out_latitude?: number | null
          clock_out_longitude?: number | null
          clock_out_photo_url?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          id?: string
          is_break?: boolean
          profile_id?: string | null
          project_id?: string | null
          start_time: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          clock_in_address?: string | null
          clock_in_latitude?: number | null
          clock_in_longitude?: number | null
          clock_in_photo_url?: string | null
          clock_out_address?: string | null
          clock_out_latitude?: number | null
          clock_out_longitude?: number | null
          clock_out_photo_url?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          id?: string
          is_break?: boolean
          profile_id?: string | null
          project_id?: string | null
          start_time?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      time_off_requests: {
        Row: {
          company_id: string
          created_at: string | null
          end_date: string
          hours_requested: number | null
          id: string
          profile_id: string
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string
          status: Database["public"]["Enums"]["time_off_status"] | null
          type: Database["public"]["Enums"]["time_off_type"]
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          end_date: string
          hours_requested?: number | null
          id?: string
          profile_id: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["time_off_status"] | null
          type: Database["public"]["Enums"]["time_off_type"]
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          end_date?: string
          hours_requested?: number | null
          id?: string
          profile_id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["time_off_status"] | null
          type?: Database["public"]["Enums"]["time_off_type"]
          updated_at?: string | null
        }
        Relationships: []
      }
      user_certifications: {
        Row: {
          cert_code: string
          cert_name: string
          cert_number: string | null
          certifier_name: string | null
          company_id: string
          created_at: string
          expiry_date: string | null
          id: string
          issue_date: string | null
          profile_id: string
          status: string
          updated_at: string
        }
        Insert: {
          cert_code: string
          cert_name: string
          cert_number?: string | null
          certifier_name?: string | null
          company_id: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          profile_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          cert_code?: string
          cert_name?: string
          cert_number?: string | null
          certifier_name?: string | null
          company_id?: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          profile_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          profile_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      authenticate_employee_pin: {
        Args: { _company_id: string; _pin: string }
        Returns: {
          display_name: string
          first_name: string
          last_name: string
          profile_id: string
          user_id: string
        }[]
      }
      get_current_user_company_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      lookup_employee_by_identifier: {
        Args: { _company_id: string; _identifier: string }
        Returns: {
          display_name: string
          employee_id: string
          first_name: string
          has_pin: boolean
          last_name: string
          phone: string
          profile_id: string
          user_id: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "supervisor" | "employee" | "foreman"
      assignment_category:
        | "tools"
        | "fleet"
        | "tech_assets"
        | "equipment"
        | "cards"
      overtime_status: "pending" | "approved" | "denied"
      task_action_type: "start" | "finish"
      time_off_status: "pending" | "approved" | "denied" | "cancelled"
      time_off_type: "vacation" | "sick" | "personal" | "bereavement" | "other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// ============================================================================
// Helper Types - Use these for cleaner code
// ============================================================================

type DefaultSchema = Database[Extract<keyof Database, "public">]

/**
 * Get the Row type for a table
 * @example type Profile = Tables<'profiles'>
 */
export type Tables<
  TableName extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
> = (DefaultSchema["Tables"] &
  DefaultSchema["Views"])[TableName] extends { Row: infer R }
  ? R
  : never

/**
 * Get the Insert type for a table
 * @example type NewProfile = TablesInsert<'profiles'>
 */
export type TablesInsert<
  TableName extends keyof DefaultSchema["Tables"]
> = DefaultSchema["Tables"][TableName] extends { Insert: infer I }
  ? I
  : never

/**
 * Get the Update type for a table
 * @example type ProfileUpdate = TablesUpdate<'profiles'>
 */
export type TablesUpdate<
  TableName extends keyof DefaultSchema["Tables"]
> = DefaultSchema["Tables"][TableName] extends { Update: infer U }
  ? U
  : never

/**
 * Get an Enum type
 * @example type AppRole = Enums<'app_role'>
 */
export type Enums<
  EnumName extends keyof DefaultSchema["Enums"]
> = DefaultSchema["Enums"][EnumName]

// ============================================================================
// Commonly Used Type Aliases
// ============================================================================

// Table Row Types
export type Profile = Tables<'profiles'>
export type TimeEntry = Tables<'time_entries'>
export type Project = Tables<'projects'>
export type Company = Tables<'companies'>
export type CompanyFeatures = Tables<'company_features'>
export type Department = Tables<'departments'>
export type TimeOffRequest = Tables<'time_off_requests'>
export type TaskActivity = Tables<'task_activities'>
export type TaskType = Tables<'task_types'>
export type OvertimeEntry = Tables<'overtime_entries'>
export type EmployeeSchedule = Tables<'employee_schedules'>
export type UserRole = Tables<'user_roles'>
export type UserCertification = Tables<'user_certifications'>

// Enum Types
export type AppRole = Enums<'app_role'>
export type TimeOffType = Enums<'time_off_type'>
export type TimeOffStatus = Enums<'time_off_status'>
export type TaskActionType = Enums<'task_action_type'>
export type OvertimeStatus = Enums<'overtime_status'>
export type AssignmentCategory = Enums<'assignment_category'>

// ============================================================================
// Enum Constants - Useful for dropdowns and validation
// ============================================================================

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "supervisor", "employee", "foreman"],
      assignment_category: [
        "tools",
        "fleet",
        "tech_assets",
        "equipment",
        "cards",
      ],
      overtime_status: ["pending", "approved", "denied"],
      task_action_type: ["start", "finish"],
      time_off_status: ["pending", "approved", "denied", "cancelled"],
      time_off_type: ["vacation", "sick", "personal", "bereavement", "other"],
    },
  },
} as const
