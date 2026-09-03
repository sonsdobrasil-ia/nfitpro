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
      ebook_reading_progress: {
        Row: {
          created_at: string
          ebook_id: string
          id: string
          pagina_atual: number
          percentual: number
          total_paginas: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ebook_id: string
          id?: string
          pagina_atual?: number
          percentual?: number
          total_paginas?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ebook_id?: string
          id?: string
          pagina_atual?: number
          percentual?: number
          total_paginas?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ebook_reading_progress_ebook_id_fkey"
            columns: ["ebook_id"]
            isOneToOne: false
            referencedRelation: "ebooks"
            referencedColumns: ["id"]
          },
        ]
      }
      ebooks: {
        Row: {
          autor: string | null
          capa_url: string | null
          categoria: string | null
          created_at: string
          descricao: string | null
          html_url: string | null
          html_preview_url: string | null
          id: string
          paginas: number | null
          pdf_url: string | null
          preco: number | null
          publicado: boolean
          subtitulo: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          autor?: string | null
          capa_url?: string | null
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          html_url?: string | null
          html_preview_url?: string | null
          id?: string
          paginas?: number | null
          pdf_url?: string | null
          preco?: number | null
          publicado?: boolean
          subtitulo?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          autor?: string | null
          capa_url?: string | null
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          html_url?: string | null
          html_preview_url?: string | null
          id?: string
          paginas?: number | null
          pdf_url?: string | null
          preco?: number | null
          publicado?: boolean
          subtitulo?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_webhook_events: {
        Row: {
          created_at: string
          email: string | null
          error: string | null
          event_type: string | null
          external_id: string | null
          id: string
          payload: Json
          processed: boolean
          provider: string
          status: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          error?: string | null
          event_type?: string | null
          external_id?: string | null
          id?: string
          payload: Json
          processed?: boolean
          provider?: string
          status?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          error?: string | null
          event_type?: string | null
          external_id?: string | null
          id?: string
          payload?: Json
          processed?: boolean
          provider?: string
          status?: string | null
        }
        Relationships: []
      }
      plans: {
        Row: {
          ativo: boolean
          cakto_offer_id: string | null
          checkout_url: string | null
          created_at: string
          descricao: string | null
          destaque: boolean
          id: string
          intervalo: string
          nome: string
          ordem: number
          preco: number
          provider: string
          slug: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cakto_offer_id?: string | null
          checkout_url?: string | null
          created_at?: string
          descricao?: string | null
          destaque?: boolean
          id?: string
          intervalo?: string
          nome: string
          ordem?: number
          preco?: number
          provider?: string
          slug: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cakto_offer_id?: string | null
          checkout_url?: string | null
          created_at?: string
          descricao?: string | null
          destaque?: boolean
          id?: string
          intervalo?: string
          nome?: string
          ordem?: number
          preco?: number
          provider?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          altura: number | null
          created_at: string
          dias_lembrete: string[] | null
          email: string | null
          horario_lembrete: string | null
          id: string
          meta: string | null
          nome: string | null
          onboarding_done: boolean | null
          peso: number | null
          tema: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          altura?: number | null
          created_at?: string
          dias_lembrete?: string[] | null
          email?: string | null
          horario_lembrete?: string | null
          id?: string
          meta?: string | null
          nome?: string | null
          onboarding_done?: boolean | null
          peso?: number | null
          tema?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          altura?: number | null
          created_at?: string
          dias_lembrete?: string[] | null
          email?: string | null
          horario_lembrete?: string | null
          id?: string
          meta?: string | null
          nome?: string | null
          onboarding_done?: boolean | null
          peso?: number | null
          tema?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string
          current_period_end: string | null
          email: string | null
          id: string
          plan_id: string | null
          plano: string | null
          provider: string
          provider_customer_id: string | null
          provider_subscription_id: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          email?: string | null
          id?: string
          plan_id?: string | null
          plano?: string | null
          provider?: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          email?: string | null
          id?: string
          plan_id?: string | null
          plano?: string | null
          provider?: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscribers_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
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
        Relationships: []
      }
      workout_logs: {
        Row: {
          concluido: boolean | null
          created_at: string
          data: string
          duracao: number
          esforco: number | null
          id: string
          numero_treino: number
          observacao: string | null
          semana: number
          user_id: string
        }
        Insert: {
          concluido?: boolean | null
          created_at?: string
          data?: string
          duracao: number
          esforco?: number | null
          id?: string
          numero_treino: number
          observacao?: string | null
          semana: number
          user_id: string
        }
        Update: {
          concluido?: boolean | null
          created_at?: string
          data?: string
          duracao?: number
          esforco?: number | null
          id?: string
          numero_treino?: number
          observacao?: string | null
          semana?: number
          user_id?: string
        }
        Relationships: []
      }
      weight_history: {
        Row: {
          created_at: string
          data: string
          id: string
          peso: number
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: string
          id?: string
          peso: number
          user_id: string
        }
        Update: {
          created_at?: string
          data?: string
          id?: string
          peso?: number
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "admin" | "user"
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
    },
  },
} as const
