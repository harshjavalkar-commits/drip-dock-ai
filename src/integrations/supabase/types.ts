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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      calendar_plans: {
        Row: {
          created_at: string
          id: string
          item_ids: string[]
          occasion: string | null
          outfit_id: string | null
          plan_date: string
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_ids?: string[]
          occasion?: string | null
          outfit_id?: string | null
          plan_date: string
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_ids?: string[]
          occasion?: string | null
          outfit_id?: string | null
          plan_date?: string
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_plans_outfit_id_fkey"
            columns: ["outfit_id"]
            isOneToOne: false
            referencedRelation: "outfits"
            referencedColumns: ["id"]
          },
        ]
      }
      clothing_items: {
        Row: {
          brand: string | null
          category: string
          color: string | null
          created_at: string
          favorite: boolean
          fit: string | null
          id: string
          image_url: string | null
          last_worn_at: string | null
          material: string | null
          name: string
          notes: string | null
          occasions: string[]
          pattern: string | null
          purchase_date: string | null
          purchase_price: number | null
          seasons: string[]
          updated_at: string
          user_id: string
          wear_count: number
        }
        Insert: {
          brand?: string | null
          category: string
          color?: string | null
          created_at?: string
          favorite?: boolean
          fit?: string | null
          id?: string
          image_url?: string | null
          last_worn_at?: string | null
          material?: string | null
          name: string
          notes?: string | null
          occasions?: string[]
          pattern?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          seasons?: string[]
          updated_at?: string
          user_id: string
          wear_count?: number
        }
        Update: {
          brand?: string | null
          category?: string
          color?: string | null
          created_at?: string
          favorite?: boolean
          fit?: string | null
          id?: string
          image_url?: string | null
          last_worn_at?: string | null
          material?: string | null
          name?: string
          notes?: string | null
          occasions?: string[]
          pattern?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          seasons?: string[]
          updated_at?: string
          user_id?: string
          wear_count?: number
        }
        Relationships: []
      }
      outfits: {
        Row: {
          created_at: string
          explanation: string | null
          id: string
          item_ids: string[]
          occasion: string | null
          score: number | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          explanation?: string | null
          id?: string
          item_ids?: string[]
          occasion?: string | null
          score?: number | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          explanation?: string | null
          id?: string
          item_ids?: string[]
          occasion?: string | null
          score?: number | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      packing_lists: {
        Row: {
          checklist: Json
          created_at: string
          destination: string
          duration_days: number
          id: string
          notes: string | null
          trip_type: string | null
          user_id: string
          weather: string | null
        }
        Insert: {
          checklist?: Json
          created_at?: string
          destination: string
          duration_days?: number
          id?: string
          notes?: string | null
          trip_type?: string | null
          user_id: string
          weather?: string | null
        }
        Update: {
          checklist?: Json
          created_at?: string
          destination?: string
          duration_days?: number
          id?: string
          notes?: string | null
          trip_type?: string | null
          user_id?: string
          weather?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          home_city: string | null
          id: string
          style_notes: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          home_city?: string | null
          id: string
          style_notes?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          home_city?: string | null
          id?: string
          style_notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      wear_logs: {
        Row: {
          created_at: string
          id: string
          item_id: string
          user_id: string
          worn_on: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          user_id: string
          worn_on?: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          user_id?: string
          worn_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "wear_logs_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "clothing_items"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlist_items: {
        Row: {
          category: string | null
          created_at: string
          id: string
          link: string | null
          name: string
          notes: string | null
          price: number | null
          priority: string
          store: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          link?: string | null
          name: string
          notes?: string | null
          price?: number | null
          priority?: string
          store?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          link?: string | null
          name?: string
          notes?: string | null
          price?: number | null
          priority?: string
          store?: string | null
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
