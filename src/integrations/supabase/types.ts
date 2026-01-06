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
    PostgrestVersion: "13.0.4"
  }
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
          old_end_time: string | null
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
          old_end_time?: string | null
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
          old_end_time?: string | null
          reason?: string | null
          time_entry_id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_time_adjustments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_time_adjustments_time_entry_id_fkey"
            columns: ["time_entry_id"]
            isOneToOne: false
            referencedRelation: "time_entries"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "company_features_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "department_schedules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_schedules_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "employee_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_assignments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "employee_schedules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_schedules_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "overtime_entries_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overtime_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overtime_entries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overtime_entries_time_entry_id_fkey"
            columns: ["time_entry_id"]
            isOneToOne: false
            referencedRelation: "time_entries"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "project_tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "project_team_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "fk_projects_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "report_execution_log_scheduled_report_id_fkey"
            columns: ["scheduled_report_id"]
            isOneToOne: false
            referencedRelation: "scheduled_reports"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "scheduled_report_recipients_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_report_recipients_scheduled_report_id_fkey"
            columns: ["scheduled_report_id"]
            isOneToOne: false
            referencedRelation: "scheduled_reports"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "scheduled_reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "task_activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_activities_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_activities_task_type_id_fkey"
            columns: ["task_type_id"]
            isOneToOne: false
            referencedRelation: "task_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_activities_time_entry_id_fkey"
            columns: ["time_entry_id"]
            isOneToOne: false
            referencedRelation: "time_entries"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "fk_time_entries_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_time_entries_project"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "time_off_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_off_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_off_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "user_roles_profile_id_fkey"
            columns: ["profile_id"]
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
