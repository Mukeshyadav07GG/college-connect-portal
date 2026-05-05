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
      active_sessions: {
        Row: {
          created_at: string
          device_info: string | null
          session_token: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: string | null
          session_token: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: string | null
          session_token?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          body: string
          category: string | null
          created_at: string
          created_by: string | null
          id: string
          title: string
        }
        Insert: {
          body: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          title: string
        }
        Update: {
          body?: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          title?: string
        }
        Relationships: []
      }
      assignment_submissions: {
        Row: {
          assignment_id: string
          file_url: string
          id: string
          student_id: string
          submitted_at: string
        }
        Insert: {
          assignment_id: string
          file_url: string
          id?: string
          student_id: string
          submitted_at?: string
        }
        Update: {
          assignment_id?: string
          file_url?: string
          id?: string
          student_id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          created_at: string
          created_by: string | null
          deadline: string | null
          description: string | null
          file_url: string | null
          id: string
          subject_code: string | null
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          file_url?: string | null
          id?: string
          subject_code?: string | null
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          file_url?: string | null
          id?: string
          subject_code?: string | null
          title?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          created_at: string
          date: string
          id: string
          marked_by: string | null
          status: string
          student_id: string
          subject_code: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          marked_by?: string | null
          status: string
          student_id: string
          subject_code: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          marked_by?: string | null
          status?: string
          student_id?: string
          subject_code?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          event_date: string
          id: string
          location: string | null
          title: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          event_date: string
          id?: string
          location?: string | null
          title: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          event_date?: string
          id?: string
          location?: string | null
          title?: string
        }
        Relationships: []
      }
      faculty: {
        Row: {
          avatar_url: string | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          name: string
          role: string | null
          subjects: string[] | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          name: string
          role?: string | null
          subjects?: string[] | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          name?: string
          role?: string | null
          subjects?: string[] | null
        }
        Relationships: []
      }
      hostel_allocations: {
        Row: {
          ac_type: string
          assigned_by: string | null
          created_at: string
          floor: string | null
          hostel_name: string
          hostel_type: string
          id: string
          room_no: string
          sharing: number
          student_id: string
          updated_at: string
          wifi: boolean
        }
        Insert: {
          ac_type?: string
          assigned_by?: string | null
          created_at?: string
          floor?: string | null
          hostel_name: string
          hostel_type: string
          id?: string
          room_no: string
          sharing?: number
          student_id: string
          updated_at?: string
          wifi?: boolean
        }
        Update: {
          ac_type?: string
          assigned_by?: string | null
          created_at?: string
          floor?: string | null
          hostel_name?: string
          hostel_type?: string
          id?: string
          room_no?: string
          sharing?: number
          student_id?: string
          updated_at?: string
          wifi?: boolean
        }
        Relationships: []
      }
      hostel_images: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          image_url: string
          uploaded_by: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          uploaded_by?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      login_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          device_info: string | null
          id: string
          ip_hint: string | null
          requesting_token: string
          status: Database["public"]["Enums"]["login_request_status"]
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          device_info?: string | null
          id?: string
          ip_hint?: string | null
          requesting_token: string
          status?: Database["public"]["Enums"]["login_request_status"]
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          device_info?: string | null
          id?: string
          ip_hint?: string | null
          requesting_token?: string
          status?: Database["public"]["Enums"]["login_request_status"]
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          aadhar: string | null
          avatar_url: string | null
          bio: string | null
          branch: string | null
          course: string | null
          created_at: string
          dob: string | null
          email: string | null
          employee_id: string | null
          full_name: string
          id: string
          phone: string | null
          roll_number: string | null
          section: string | null
          semester: string | null
          updated_at: string
          user_id: string
          year: string | null
        }
        Insert: {
          aadhar?: string | null
          avatar_url?: string | null
          bio?: string | null
          branch?: string | null
          course?: string | null
          created_at?: string
          dob?: string | null
          email?: string | null
          employee_id?: string | null
          full_name: string
          id?: string
          phone?: string | null
          roll_number?: string | null
          section?: string | null
          semester?: string | null
          updated_at?: string
          user_id: string
          year?: string | null
        }
        Update: {
          aadhar?: string | null
          avatar_url?: string | null
          bio?: string | null
          branch?: string | null
          course?: string | null
          created_at?: string
          dob?: string | null
          email?: string | null
          employee_id?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          roll_number?: string | null
          section?: string | null
          semester?: string | null
          updated_at?: string
          user_id?: string
          year?: string | null
        }
        Relationships: []
      }
      results: {
        Row: {
          created_at: string
          exam_type: string
          id: string
          marks: number
          max_marks: number
          student_id: string
          subject_code: string
        }
        Insert: {
          created_at?: string
          exam_type: string
          id?: string
          marks: number
          max_marks?: number
          student_id: string
          subject_code: string
        }
        Update: {
          created_at?: string
          exam_type?: string
          id?: string
          marks?: number
          max_marks?: number
          student_id?: string
          subject_code?: string
        }
        Relationships: []
      }
      student_documents: {
        Row: {
          amount: number | null
          created_at: string
          file_url: string
          id: string
          receipt_no: string | null
          student_id: string | null
          title: string
          type: string
          uploaded_by: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          file_url: string
          id?: string
          receipt_no?: string | null
          student_id?: string | null
          title: string
          type?: string
          uploaded_by?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          file_url?: string
          id?: string
          receipt_no?: string | null
          student_id?: string | null
          title?: string
          type?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      student_fees: {
        Row: {
          created_at: string
          id: string
          paid_amount: number
          student_id: string
          total_fee: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          paid_amount?: number
          student_id: string
          total_fee?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          paid_amount?: number
          student_id?: string
          total_fee?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      subject_notes: {
        Row: {
          created_at: string
          file_path: string
          id: string
          subject_code: string
          title: string
          unit_number: number | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_path: string
          id?: string
          subject_code: string
          title: string
          unit_number?: number | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_path?: string
          id?: string
          subject_code?: string
          title?: string
          unit_number?: number | null
          uploaded_by?: string | null
        }
        Relationships: []
      }
      subjects: {
        Row: {
          branch: string | null
          code: string
          completion: number | null
          created_at: string
          faculty_name: string | null
          id: string
          name: string
          semester: string | null
          units: Json | null
        }
        Insert: {
          branch?: string | null
          code: string
          completion?: number | null
          created_at?: string
          faculty_name?: string | null
          id?: string
          name: string
          semester?: string | null
          units?: Json | null
        }
        Update: {
          branch?: string | null
          code?: string
          completion?: number | null
          created_at?: string
          faculty_name?: string | null
          id?: string
          name?: string
          semester?: string | null
          units?: Json | null
        }
        Relationships: []
      }
      syllabus_problems: {
        Row: {
          created_at: string
          file_url: string
          id: string
          student_id: string
          subject_code: string
          title: string
          unit_number: number
        }
        Insert: {
          created_at?: string
          file_url: string
          id?: string
          student_id: string
          subject_code: string
          title: string
          unit_number: number
        }
        Update: {
          created_at?: string
          file_url?: string
          id?: string
          student_id?: string
          subject_code?: string
          title?: string
          unit_number?: number
        }
        Relationships: []
      }
      syllabus_units: {
        Row: {
          id: string
          progress: number
          subject_code: string
          unit_number: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          progress?: number
          subject_code: string
          unit_number: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          progress?: number
          subject_code?: string
          unit_number?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      timetable: {
        Row: {
          branch: string
          created_at: string
          day: string
          faculty_name: string | null
          id: string
          room: string | null
          section: string
          semester: string
          slot: number
          subject_code: string | null
        }
        Insert: {
          branch: string
          created_at?: string
          day: string
          faculty_name?: string | null
          id?: string
          room?: string | null
          section: string
          semester: string
          slot: number
          subject_code?: string | null
        }
        Update: {
          branch?: string
          created_at?: string
          day?: string
          faculty_name?: string | null
          id?: string
          room?: string | null
          section?: string
          semester?: string
          slot?: number
          subject_code?: string | null
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
          role: Database["public"]["Enums"]["app_role"]
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
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_fee_manager: { Args: { _user_id: string }; Returns: boolean }
      update_student_fee: {
        Args: { _paid_amount: number; _student_id: string; _total_fee: number }
        Returns: {
          paid_amount: number
          payment_diff: number
          remaining_amount: number
          total_fee: number
        }[]
      }
      update_unit_progress: {
        Args: { _progress: number; _subject_code: string; _unit_number: number }
        Returns: number
      }
    }
    Enums: {
      app_role: "student" | "faculty" | "admin"
      login_request_status: "pending" | "approved" | "denied" | "expired"
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
      app_role: ["student", "faculty", "admin"],
      login_request_status: ["pending", "approved", "denied", "expired"],
    },
  },
} as const
