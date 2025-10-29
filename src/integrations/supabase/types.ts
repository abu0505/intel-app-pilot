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
      chat_histories: {
        Row: {
          content: string
          created_at: string | null
          id: string
          message_type: string | null
          notebook_id: string | null
          session_id: string | null
          sources_referenced: string[] | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          message_type?: string | null
          notebook_id?: string | null
          session_id?: string | null
          sources_referenced?: string[] | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          message_type?: string | null
          notebook_id?: string | null
          session_id?: string | null
          sources_referenced?: string[] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_histories_notebook_id_fkey"
            columns: ["notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
        ]
      }
      embeddings: {
        Row: {
          chunk_index: number
          chunk_text: string
          created_at: string | null
          embedding: string | null
          id: string
          source_id: string
        }
        Insert: {
          chunk_index: number
          chunk_text: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          source_id: string
        }
        Update: {
          chunk_index?: number
          chunk_text?: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "embeddings_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcard_progress: {
        Row: {
          card_index: number
          created_at: string | null
          easiness_factor: number | null
          flashcard_id: string
          id: string
          interval_days: number | null
          is_learned: boolean | null
          last_reviewed_at: string | null
          next_review_at: string | null
          repetitions: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          card_index: number
          created_at?: string | null
          easiness_factor?: number | null
          flashcard_id: string
          id?: string
          interval_days?: number | null
          is_learned?: boolean | null
          last_reviewed_at?: string | null
          next_review_at?: string | null
          repetitions?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          card_index?: number
          created_at?: string | null
          easiness_factor?: number | null
          flashcard_id?: string
          id?: string
          interval_days?: number | null
          is_learned?: boolean | null
          last_reviewed_at?: string | null
          next_review_at?: string | null
          repetitions?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      flashcards: {
        Row: {
          average_retention_percentage: number | null
          card_count: number | null
          cards: Json
          created_at: string | null
          id: string
          notebook_id: string | null
          source_ids: string[] | null
          study_algorithm: string | null
          times_studied: number | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          average_retention_percentage?: number | null
          card_count?: number | null
          cards: Json
          created_at?: string | null
          id?: string
          notebook_id?: string | null
          source_ids?: string[] | null
          study_algorithm?: string | null
          times_studied?: number | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          average_retention_percentage?: number | null
          card_count?: number | null
          cards?: Json
          created_at?: string | null
          id?: string
          notebook_id?: string | null
          source_ids?: string[] | null
          study_algorithm?: string | null
          times_studied?: number | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_notebook_id_fkey"
            columns: ["notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
        ]
      }
      notebooks: {
        Row: {
          created_at: string | null
          icon: string | null
          id: string
          is_deleted: boolean | null
          last_opened_at: string | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: string
          is_deleted?: boolean | null
          last_opened_at?: string | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: string
          is_deleted?: boolean | null
          last_opened_at?: string | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          total_quizzes_generated: number | null
          total_sources_uploaded: number | null
          total_study_hours: number | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          total_quizzes_generated?: number | null
          total_sources_uploaded?: number | null
          total_study_hours?: number | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          total_quizzes_generated?: number | null
          total_sources_uploaded?: number | null
          total_study_hours?: number | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          answers_provided: Json
          completed_at: string | null
          correct_answers: number | null
          id: string
          is_passed: boolean | null
          quiz_id: string
          score_percentage: number
          time_spent_seconds: number | null
          user_id: string
        }
        Insert: {
          answers_provided: Json
          completed_at?: string | null
          correct_answers?: number | null
          id?: string
          is_passed?: boolean | null
          quiz_id: string
          score_percentage: number
          time_spent_seconds?: number | null
          user_id: string
        }
        Update: {
          answers_provided?: Json
          completed_at?: string | null
          correct_answers?: number | null
          id?: string
          is_passed?: boolean | null
          quiz_id?: string
          score_percentage?: number
          time_spent_seconds?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          average_score_percentage: number | null
          created_at: string | null
          difficulty_level: string | null
          id: string
          notebook_id: string | null
          question_count: number | null
          questions: Json
          source_ids: string[] | null
          times_taken: number | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          average_score_percentage?: number | null
          created_at?: string | null
          difficulty_level?: string | null
          id?: string
          notebook_id?: string | null
          question_count?: number | null
          questions: Json
          source_ids?: string[] | null
          times_taken?: number | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          average_score_percentage?: number | null
          created_at?: string | null
          difficulty_level?: string | null
          id?: string
          notebook_id?: string | null
          question_count?: number | null
          questions?: Json
          source_ids?: string[] | null
          times_taken?: number | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_notebook_id_fkey"
            columns: ["notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          ai_summary: string | null
          content: string
          content_hash: string | null
          created_at: string | null
          id: string
          is_archived: boolean | null
          key_topics: string[] | null
          notebook_id: string | null
          processing_status: string | null
          source_description: string | null
          source_name: string
          source_type: string
          source_url: string | null
          updated_at: string | null
          user_id: string
          word_count: number | null
        }
        Insert: {
          ai_summary?: string | null
          content: string
          content_hash?: string | null
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          key_topics?: string[] | null
          notebook_id?: string | null
          processing_status?: string | null
          source_description?: string | null
          source_name: string
          source_type: string
          source_url?: string | null
          updated_at?: string | null
          user_id: string
          word_count?: number | null
        }
        Update: {
          ai_summary?: string | null
          content?: string
          content_hash?: string | null
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          key_topics?: string[] | null
          notebook_id?: string | null
          processing_status?: string | null
          source_description?: string | null
          source_name?: string
          source_type?: string
          source_url?: string | null
          updated_at?: string | null
          user_id?: string
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sources_notebook_id_fkey"
            columns: ["notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          last_opened_notebook_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          last_opened_notebook_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          last_opened_notebook_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_last_opened_notebook_id_fkey"
            columns: ["last_opened_notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
