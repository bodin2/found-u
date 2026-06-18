export type Json = any;

export interface Database {
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string;
          student_id: string | null;
          email: string;
          display_name: string;
          photo_url: string | null;
          role: "user" | "admin";
          first_name: string | null;
          last_name: string | null;
          nickname: string | null;
          shown_name: string | null;
          is_student_verified: boolean;
          auth_methods: Json | null;
          must_change_password: boolean;
          has_seen_tutorial: boolean;
          ban_status: string;
          ban_reason: string | null;
          banned_at: string | null;
          banned_by: string | null;
          timeout_until: string | null;
          school_password_hash: string | null;
          current_password_hash: string | null;
          has_logged_in_once: boolean;
          linked_uid: string | null;
          pin_hash: string | null;
          passkey_credentials: Json | null;
          status: "active" | "disabled";
          import_batch_id: string | null;
          grade_level: string | null;
          room_number: string | null;
          is_registered: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["accounts"]["Row"]> & { id: string };
        Update: Partial<Database["public"]["Tables"]["accounts"]["Row"]>;
        Relationships: [];
      };
      passkey_lookup: {
        Row: {
          credential_id: string;
          student_id: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["passkey_lookup"]["Row"]> & { credential_id: string; student_id: string };
        Update: Partial<Database["public"]["Tables"]["passkey_lookup"]["Row"]>;
        Relationships: [];
      };
      admin_whitelist: {
        Row: {
          email: string;
          added_by: string | null;
          added_at: string | null;
          note: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["admin_whitelist"]["Row"]> & { email: string };
        Update: Partial<Database["public"]["Tables"]["admin_whitelist"]["Row"]>;
        Relationships: [];
      };
      lost_items: {
        Row: Record<string, Json | undefined>;
        Insert: Record<string, Json | undefined>;
        Update: Record<string, Json | undefined>;
        Relationships: [];
      };
      found_items: {
        Row: Record<string, Json | undefined>;
        Insert: Record<string, Json | undefined>;
        Update: Record<string, Json | undefined>;
        Relationships: [];
      };
      app_settings: {
        Row: {
          id: string;
          settings: Json;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["app_settings"]["Row"]> & { id: string };
        Update: Partial<Database["public"]["Tables"]["app_settings"]["Row"]>;
        Relationships: [];
      };
      ai_usage: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["ai_usage"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["ai_usage"]["Row"]>;
        Relationships: [];
      };
      error_logs: {
        Row: Record<string, Json | undefined>;
        Insert: Record<string, Json | undefined>;
        Update: Record<string, Json | undefined>;
        Relationships: [];
      };
      activity_logs: {
        Row: Record<string, Json | undefined>;
        Insert: Record<string, Json | undefined>;
        Update: Record<string, Json | undefined>;
        Relationships: [];
      };
      nfc_tags: {
        Row: Record<string, Json | undefined>;
        Insert: Record<string, Json | undefined>;
        Update: Record<string, Json | undefined>;
        Relationships: [];
      };
      nfc_found_reports: {
        Row: Record<string, Json | undefined>;
        Insert: Record<string, Json | undefined>;
        Update: Record<string, Json | undefined>;
        Relationships: [];
      };
      categories: {
        Row: Record<string, Json | undefined>;
        Insert: Record<string, Json | undefined>;
        Update: Record<string, Json | undefined>;
        Relationships: [];
      };
      locations: {
        Row: Record<string, Json | undefined>;
        Insert: Record<string, Json | undefined>;
        Update: Record<string, Json | undefined>;
        Relationships: [];
      };
      contact_types: {
        Row: Record<string, Json | undefined>;
        Insert: Record<string, Json | undefined>;
        Update: Record<string, Json | undefined>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
