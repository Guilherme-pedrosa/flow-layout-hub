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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          company_id: string
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          metadata_json: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          company_id: string
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          metadata_json?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          metadata_json?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente_contatos: {
        Row: {
          cargo: string | null
          cliente_id: string
          created_at: string
          email: string | null
          id: string
          nome: string | null
          principal: boolean | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          cargo?: string | null
          cliente_id: string
          created_at?: string
          email?: string | null
          id?: string
          nome?: string | null
          principal?: boolean | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          cargo?: string | null
          cliente_id?: string
          created_at?: string
          email?: string | null
          id?: string
          nome?: string | null
          principal?: boolean | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cliente_contatos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente_historico: {
        Row: {
          campo_alterado: string
          cliente_id: string
          created_at: string
          id: string
          usuario_id: string | null
          valor_anterior: string | null
          valor_novo: string | null
        }
        Insert: {
          campo_alterado: string
          cliente_id: string
          created_at?: string
          id?: string
          usuario_id?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Update: {
          campo_alterado?: string
          cliente_id?: string
          created_at?: string
          id?: string
          usuario_id?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cliente_historico_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnae_principal: string | null
          complemento: string | null
          condicao_pagamento: string | null
          contribuinte_icms: boolean | null
          cpf_cnpj: string | null
          created_at: string
          created_by: string | null
          data_abertura: string | null
          email: string | null
          estado: string | null
          id: string
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          limite_credito: number | null
          logradouro: string | null
          nome_fantasia: string | null
          numero: string | null
          observacoes_comerciais: string | null
          observacoes_fiscais: string | null
          observacoes_internas: string | null
          razao_social: string | null
          regime_tributario:
            | Database["public"]["Enums"]["regime_tributario"]
            | null
          responsavel_comercial: string | null
          responsavel_tecnico: string | null
          retencao_impostos: boolean | null
          situacao_cadastral: string | null
          sla_padrao: string | null
          status: Database["public"]["Enums"]["cliente_status"]
          telefone: string | null
          tipo_cliente:
            | Database["public"]["Enums"]["tipo_cliente_comercial"]
            | null
          tipo_pessoa: Database["public"]["Enums"]["tipo_pessoa"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnae_principal?: string | null
          complemento?: string | null
          condicao_pagamento?: string | null
          contribuinte_icms?: boolean | null
          cpf_cnpj?: string | null
          created_at?: string
          created_by?: string | null
          data_abertura?: string | null
          email?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          limite_credito?: number | null
          logradouro?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          observacoes_comerciais?: string | null
          observacoes_fiscais?: string | null
          observacoes_internas?: string | null
          razao_social?: string | null
          regime_tributario?:
            | Database["public"]["Enums"]["regime_tributario"]
            | null
          responsavel_comercial?: string | null
          responsavel_tecnico?: string | null
          retencao_impostos?: boolean | null
          situacao_cadastral?: string | null
          sla_padrao?: string | null
          status?: Database["public"]["Enums"]["cliente_status"]
          telefone?: string | null
          tipo_cliente?:
            | Database["public"]["Enums"]["tipo_cliente_comercial"]
            | null
          tipo_pessoa?: Database["public"]["Enums"]["tipo_pessoa"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnae_principal?: string | null
          complemento?: string | null
          condicao_pagamento?: string | null
          contribuinte_icms?: boolean | null
          cpf_cnpj?: string | null
          created_at?: string
          created_by?: string | null
          data_abertura?: string | null
          email?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          limite_credito?: number | null
          logradouro?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          observacoes_comerciais?: string | null
          observacoes_fiscais?: string | null
          observacoes_internas?: string | null
          razao_social?: string | null
          regime_tributario?:
            | Database["public"]["Enums"]["regime_tributario"]
            | null
          responsavel_comercial?: string | null
          responsavel_tecnico?: string | null
          retencao_impostos?: boolean | null
          situacao_cadastral?: string | null
          sla_padrao?: string | null
          status?: Database["public"]["Enums"]["cliente_status"]
          telefone?: string | null
          tipo_cliente?:
            | Database["public"]["Enums"]["tipo_cliente_comercial"]
            | null
          tipo_pessoa?: Database["public"]["Enums"]["tipo_pessoa"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          cnpj: string | null
          created_at: string
          id: string
          name: string
          timezone: string | null
          updated_at: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          id?: string
          name: string
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          id?: string
          name?: string
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          company_id: string
          id: string
          key: string
          updated_at: string
          value_json: Json | null
        }
        Insert: {
          company_id: string
          id?: string
          key: string
          updated_at?: string
          value_json?: Json | null
        }
        Update: {
          company_id?: string
          id?: string
          key?: string
          updated_at?: string
          value_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_id: string | null
          company_id: string
          created_at: string
          email: string
          id: string
          is_active: boolean
          name: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          auth_id?: string | null
          company_id: string
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          name: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          auth_id?: string | null
          company_id?: string
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_company_id: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      cliente_status: "ativo" | "inativo" | "bloqueado"
      regime_tributario:
        | "simples_nacional"
        | "lucro_presumido"
        | "lucro_real"
        | "mei"
      tipo_cliente_comercial: "avulso" | "contrato" | "grande_conta"
      tipo_pessoa: "PF" | "PJ"
      user_role: "admin" | "financeiro" | "operador" | "tecnico"
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
      cliente_status: ["ativo", "inativo", "bloqueado"],
      regime_tributario: [
        "simples_nacional",
        "lucro_presumido",
        "lucro_real",
        "mei",
      ],
      tipo_cliente_comercial: ["avulso", "contrato", "grande_conta"],
      tipo_pessoa: ["PF", "PJ"],
      user_role: ["admin", "financeiro", "operador", "tecnico"],
    },
  },
} as const
