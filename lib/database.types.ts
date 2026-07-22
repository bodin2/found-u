// Supabase JSON columns store heterogeneous app payloads at the DB boundary.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches generated Supabase client expectations
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
      match_dismissals: {
        Row: {
          id: string;
          lost_id: string;
          found_id: string;
          dismissed_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          lost_id: string;
          found_id: string;
          dismissed_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["match_dismissals"]["Row"]>;
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
      agent_chat_logs: {
        Row: {
          id: string;
          user_id: string;
          session_id: string | null;
          provider: string;
          model: string | null;
          settings_snapshot: Json | null;
          routing: Json | null;
          request_messages: Json | null;
          response_parts: Json | null;
          steps: Json | null;
          truncated: boolean;
          finish_reason: string | null;
          error: string | null;
          duration_ms: number | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["agent_chat_logs"]["Row"]> & {
          user_id: string;
          provider: string;
        };
        Update: Partial<Database["public"]["Tables"]["agent_chat_logs"]["Row"]>;
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
      drop_off_locations: {
        Row: {
          id: string;
          value: string;
          label: string;
          sort_order: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["drop_off_locations"]["Row"]> & {
          value: string;
          label: string;
        };
        Update: Partial<Database["public"]["Tables"]["drop_off_locations"]["Row"]>;
        Relationships: [];
      };
      system_config: {
        Row: {
          id: string;
          config_data: Json;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["system_config"]["Row"]> & { id: string };
        Update: Partial<Database["public"]["Tables"]["system_config"]["Row"]>;
        Relationships: [];
      };
      help_pages: {
        Row: {
          slug: string;
          title: string;
          description: string | null;
          intro: string | null;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["help_pages"]["Row"]> & {
          slug: string;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["help_pages"]["Row"]>;
        Relationships: [];
      };
      help_sections: {
        Row: {
          id: string;
          page_slug: string;
          section_type: string;
          audience: string;
          title: string;
          body: string;
          image_url: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["help_sections"]["Row"]> & {
          page_slug: string;
          title: string;
          body: string;
        };
        Update: Partial<Database["public"]["Tables"]["help_sections"]["Row"]>;
        Relationships: [];
      };
      articles: {
        Row: {
          id: string;
          slug: string;
          section: string;
          status: string;
          title: string;
          excerpt: string | null;
          cover_image_url: string | null;
          author_name: string | null;
          tags: string[];
          content_json: Record<string, unknown>;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["articles"]["Row"]> & {
          slug: string;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["articles"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      confirm_item_match: {
        Args: { p_lost_id: string; p_found_id: string };
        Returns: Json;
      };
      unmatch_item_match: {
        Args: { p_lost_id: string; p_found_id: string };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
