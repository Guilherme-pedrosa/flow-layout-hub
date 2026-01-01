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
      accounts_receivable: {
        Row: {
          amount: number
          bank_transaction_id: string | null
          client_id: string | null
          company_id: string
          created_at: string
          description: string | null
          document_number: string | null
          document_type: string | null
          due_date: string
          financial_situation_id: string | null
          id: string
          inter_boleto_id: string | null
          inter_codigo_barras: string | null
          inter_linha_digitavel: string | null
          inter_nosso_numero: string | null
          is_paid: boolean | null
          issue_date: string | null
          notes: string | null
          paid_amount: number | null
          paid_at: string | null
          payment_method: string | null
          reconciled_at: string | null
          reconciliation_id: string | null
          sale_id: string | null
          situation_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          bank_transaction_id?: string | null
          client_id?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          document_number?: string | null
          document_type?: string | null
          due_date: string
          financial_situation_id?: string | null
          id?: string
          inter_boleto_id?: string | null
          inter_codigo_barras?: string | null
          inter_linha_digitavel?: string | null
          inter_nosso_numero?: string | null
          is_paid?: boolean | null
          issue_date?: string | null
          notes?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          payment_method?: string | null
          reconciled_at?: string | null
          reconciliation_id?: string | null
          sale_id?: string | null
          situation_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_transaction_id?: string | null
          client_id?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          document_number?: string | null
          document_type?: string | null
          due_date?: string
          financial_situation_id?: string | null
          id?: string
          inter_boleto_id?: string | null
          inter_codigo_barras?: string | null
          inter_linha_digitavel?: string | null
          inter_nosso_numero?: string | null
          is_paid?: boolean | null
          issue_date?: string | null
          notes?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          payment_method?: string | null
          reconciled_at?: string | null
          reconciliation_id?: string | null
          sale_id?: string | null
          situation_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_receivable_bank_transaction_id_fkey"
            columns: ["bank_transaction_id"]
            isOneToOne: false
            referencedRelation: "bank_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_receivable_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_receivable_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_receivable_financial_situation_id_fkey"
            columns: ["financial_situation_id"]
            isOneToOne: false
            referencedRelation: "financial_situations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_receivable_reconciliation_id_fkey"
            columns: ["reconciliation_id"]
            isOneToOne: false
            referencedRelation: "bank_reconciliations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_receivable_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_receivable_situation_id_fkey"
            columns: ["situation_id"]
            isOneToOne: false
            referencedRelation: "financial_situations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_insights: {
        Row: {
          action_data: Json | null
          action_label: string | null
          action_url: string | null
          category: string
          company_id: string
          context: string | null
          created_at: string
          dismissed_at: string | null
          dismissed_by: string | null
          expires_at: string | null
          id: string
          is_dismissed: boolean
          is_read: boolean
          message: string
          metadata: Json | null
          mode: string
          priority: number
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          action_data?: Json | null
          action_label?: string | null
          action_url?: string | null
          category: string
          company_id: string
          context?: string | null
          created_at?: string
          dismissed_at?: string | null
          dismissed_by?: string | null
          expires_at?: string | null
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          message: string
          metadata?: Json | null
          mode: string
          priority?: number
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          action_data?: Json | null
          action_label?: string | null
          action_url?: string | null
          category?: string
          company_id?: string
          context?: string | null
          created_at?: string
          dismissed_at?: string | null
          dismissed_by?: string | null
          expires_at?: string | null
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          message?: string
          metadata?: Json | null
          mode?: string
          priority?: number
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_insights_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_insights_dismissed_by_fkey"
            columns: ["dismissed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_reconciliation_rules: {
        Row: {
          category: string | null
          chart_account_id: string | null
          company_id: string
          created_at: string
          description_pattern: string
          id: string
          is_active: boolean
          match_type: string
          name: string
          supplier_id: string | null
          times_used: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          chart_account_id?: string | null
          company_id: string
          created_at?: string
          description_pattern: string
          id?: string
          is_active?: boolean
          match_type: string
          name: string
          supplier_id?: string | null
          times_used?: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          chart_account_id?: string | null
          company_id?: string
          created_at?: string
          description_pattern?: string
          id?: string
          is_active?: boolean
          match_type?: string
          name?: string
          supplier_id?: string | null
          times_used?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_reconciliation_rules_chart_account_id_fkey"
            columns: ["chart_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_reconciliation_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_reconciliation_rules_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_settings: {
        Row: {
          auditora_enabled: boolean
          cash_flow_alert_days: number | null
          cash_flow_critical_days: number | null
          cfo_bot_enabled: boolean
          company_id: string
          created_at: string
          email_alerts_enabled: boolean
          especialista_enabled: boolean
          executora_enabled: boolean
          id: string
          max_purchase_excess_percent: number | null
          min_margin_threshold: number | null
          notifications_enabled: boolean
          stock_alert_days_coverage: number | null
          updated_at: string
        }
        Insert: {
          auditora_enabled?: boolean
          cash_flow_alert_days?: number | null
          cash_flow_critical_days?: number | null
          cfo_bot_enabled?: boolean
          company_id: string
          created_at?: string
          email_alerts_enabled?: boolean
          especialista_enabled?: boolean
          executora_enabled?: boolean
          id?: string
          max_purchase_excess_percent?: number | null
          min_margin_threshold?: number | null
          notifications_enabled?: boolean
          stock_alert_days_coverage?: number | null
          updated_at?: string
        }
        Update: {
          auditora_enabled?: boolean
          cash_flow_alert_days?: number | null
          cash_flow_critical_days?: number | null
          cfo_bot_enabled?: boolean
          company_id?: string
          created_at?: string
          email_alerts_enabled?: boolean
          especialista_enabled?: boolean
          executora_enabled?: boolean
          id?: string
          max_purchase_excess_percent?: number | null
          min_margin_threshold?: number | null
          notifications_enabled?: boolean
          stock_alert_days_coverage?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
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
      bank_accounts: {
        Row: {
          account_number: string | null
          account_type: string | null
          agency: string | null
          bank_name: string | null
          company_id: string
          created_at: string
          current_balance: number | null
          id: string
          initial_balance: number | null
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          account_type?: string | null
          agency?: string | null
          bank_name?: string | null
          company_id: string
          created_at?: string
          current_balance?: number | null
          id?: string
          initial_balance?: number | null
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          account_type?: string | null
          agency?: string | null
          bank_name?: string | null
          company_id?: string
          created_at?: string
          current_balance?: number | null
          id?: string
          initial_balance?: number | null
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_reconciliation_items: {
        Row: {
          amount_used: number
          created_at: string
          financial_id: string
          financial_type: string
          id: string
          reconciliation_id: string
        }
        Insert: {
          amount_used: number
          created_at?: string
          financial_id: string
          financial_type: string
          id?: string
          reconciliation_id: string
        }
        Update: {
          amount_used?: number
          created_at?: string
          financial_id?: string
          financial_type?: string
          id?: string
          reconciliation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_reconciliation_items_reconciliation_id_fkey"
            columns: ["reconciliation_id"]
            isOneToOne: false
            referencedRelation: "bank_reconciliations"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_reconciliations: {
        Row: {
          bank_transaction_id: string
          company_id: string
          created_at: string
          id: string
          is_reversed: boolean
          method: string
          notes: string | null
          reconciled_at: string
          reconciled_by: string | null
          reversal_notes: string | null
          reversed_at: string | null
          reversed_by: string | null
          total_reconciled_amount: number
          updated_at: string
        }
        Insert: {
          bank_transaction_id: string
          company_id: string
          created_at?: string
          id?: string
          is_reversed?: boolean
          method?: string
          notes?: string | null
          reconciled_at?: string
          reconciled_by?: string | null
          reversal_notes?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          total_reconciled_amount: number
          updated_at?: string
        }
        Update: {
          bank_transaction_id?: string
          company_id?: string
          created_at?: string
          id?: string
          is_reversed?: boolean
          method?: string
          notes?: string | null
          reconciled_at?: string
          reconciled_by?: string | null
          reversal_notes?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          total_reconciled_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_reconciliations_bank_transaction_id_fkey"
            columns: ["bank_transaction_id"]
            isOneToOne: false
            referencedRelation: "bank_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_reconciliations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_reconciliations_reconciled_by_fkey"
            columns: ["reconciled_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_reconciliations_reversed_by_fkey"
            columns: ["reversed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transactions: {
        Row: {
          amount: number
          bank_account_id: string | null
          category: string | null
          company_id: string
          created_at: string
          description: string | null
          external_id: string | null
          id: string
          is_reconciled: boolean
          nsu: string | null
          raw_data: Json | null
          reconciled_at: string | null
          reconciled_by: string | null
          reconciled_with_id: string | null
          reconciled_with_type: string | null
          transaction_date: string
          type: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          category?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          external_id?: string | null
          id?: string
          is_reconciled?: boolean
          nsu?: string | null
          raw_data?: Json | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciled_with_id?: string | null
          reconciled_with_type?: string | null
          transaction_date: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          category?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          external_id?: string | null
          id?: string
          is_reconciled?: boolean
          nsu?: string | null
          raw_data?: Json | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciled_with_id?: string | null
          reconciled_with_type?: string | null
          transaction_date?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_reconciled_by_fkey"
            columns: ["reconciled_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      certificados_digitais: {
        Row: {
          certificado_base64: string | null
          cnpj: string | null
          company_id: string
          created_at: string
          file_path: string | null
          id: string
          razao_social: string | null
          senha: string | null
          updated_at: string
          validade: string | null
        }
        Insert: {
          certificado_base64?: string | null
          cnpj?: string | null
          company_id: string
          created_at?: string
          file_path?: string | null
          id?: string
          razao_social?: string | null
          senha?: string | null
          updated_at?: string
          validade?: string | null
        }
        Update: {
          certificado_base64?: string | null
          cnpj?: string | null
          company_id?: string
          created_at?: string
          file_path?: string | null
          id?: string
          razao_social?: string | null
          senha?: string | null
          updated_at?: string
          validade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificados_digitais_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cfo_vigilant_alerts: {
        Row: {
          action_taken: string | null
          alert_type: string
          company_id: string
          context_data: Json | null
          created_at: string
          dismissed_at: string | null
          dismissed_by: string | null
          id: string
          is_dismissed: boolean
          is_read: boolean
          message: string
          reference_id: string | null
          reference_type: string | null
          severity: string
          title: string
        }
        Insert: {
          action_taken?: string | null
          alert_type: string
          company_id: string
          context_data?: Json | null
          created_at?: string
          dismissed_at?: string | null
          dismissed_by?: string | null
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          message: string
          reference_id?: string | null
          reference_type?: string | null
          severity?: string
          title: string
        }
        Update: {
          action_taken?: string | null
          alert_type?: string
          company_id?: string
          context_data?: Json | null
          created_at?: string
          dismissed_at?: string | null
          dismissed_by?: string | null
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          message?: string
          reference_id?: string | null
          reference_type?: string | null
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "cfo_vigilant_alerts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cfo_vigilant_alerts_dismissed_by_fkey"
            columns: ["dismissed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          account_nature: Database["public"]["Enums"]["account_nature"]
          code: string
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          type: Database["public"]["Enums"]["account_type"]
          updated_at: string
        }
        Insert: {
          account_nature?: Database["public"]["Enums"]["account_nature"]
          code: string
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          type: Database["public"]["Enums"]["account_type"]
          updated_at?: string
        }
        Update: {
          account_nature?: Database["public"]["Enums"]["account_nature"]
          code?: string
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_of_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_audit: {
        Row: {
          action: string
          checkout_id: string
          checkout_type: string
          created_at: string
          id: string
          ip_address: string | null
          items_snapshot: Json | null
          metadata: Json | null
          observations: string | null
          stock_after: Json | null
          stock_before: Json | null
          user_agent: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          checkout_id: string
          checkout_type: string
          created_at?: string
          id?: string
          ip_address?: string | null
          items_snapshot?: Json | null
          metadata?: Json | null
          observations?: string | null
          stock_after?: Json | null
          stock_before?: Json | null
          user_agent?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          checkout_id?: string
          checkout_type?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          items_snapshot?: Json | null
          metadata?: Json | null
          observations?: string | null
          stock_after?: Json | null
          stock_before?: Json | null
          user_agent?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkout_audit_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_pdfs: {
        Row: {
          checkout_id: string
          checkout_type: string
          created_at: string
          document_hash: string | null
          file_name: string
          file_size: number | null
          generated_by: string | null
          generated_by_name: string | null
          id: string
          pdf_type: string
          storage_path: string
          version: number
        }
        Insert: {
          checkout_id: string
          checkout_type: string
          created_at?: string
          document_hash?: string | null
          file_name: string
          file_size?: number | null
          generated_by?: string | null
          generated_by_name?: string | null
          id?: string
          pdf_type: string
          storage_path: string
          version?: number
        }
        Update: {
          checkout_id?: string
          checkout_type?: string
          created_at?: string
          document_hash?: string | null
          file_name?: string
          file_size?: number | null
          generated_by?: string | null
          generated_by_name?: string | null
          id?: string
          pdf_type?: string
          storage_path?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "checkout_pdfs_generated_by_fkey"
            columns: ["generated_by"]
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
          company_id: string | null
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
          company_id?: string | null
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
          company_id?: string | null
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
          {
            foreignKeyName: "cliente_contatos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente_historico: {
        Row: {
          campo_alterado: string
          cliente_id: string
          company_id: string | null
          created_at: string
          id: string
          usuario_id: string | null
          valor_anterior: string | null
          valor_novo: string | null
        }
        Insert: {
          campo_alterado: string
          cliente_id: string
          company_id?: string | null
          created_at?: string
          id?: string
          usuario_id?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Update: {
          campo_alterado?: string
          cliente_id?: string
          company_id?: string | null
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
          {
            foreignKeyName: "cliente_historico_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
          company_id: string | null
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
          company_id?: string | null
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
          company_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "clientes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          cep: string | null
          cidade: string | null
          cnpj: string | null
          created_at: string
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          is_active: boolean | null
          logo_url: string | null
          name: string
          razao_social: string | null
          telefone: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          razao_social?: string | null
          telefone?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          razao_social?: string | null
          telefone?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cost_centers: {
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
        Relationships: [
          {
            foreignKeyName: "cost_centers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      equipments: {
        Row: {
          brand: string | null
          client_id: string | null
          company_id: string
          created_at: string | null
          environment: string | null
          equipment_type: string | null
          field_equipment_id: string | null
          id: string
          is_active: boolean | null
          location_description: string | null
          model: string | null
          notes: string | null
          qr_code: string | null
          sector: string | null
          serial_number: string
          updated_at: string | null
          warranty_end: string | null
          warranty_start: string | null
        }
        Insert: {
          brand?: string | null
          client_id?: string | null
          company_id: string
          created_at?: string | null
          environment?: string | null
          equipment_type?: string | null
          field_equipment_id?: string | null
          id?: string
          is_active?: boolean | null
          location_description?: string | null
          model?: string | null
          notes?: string | null
          qr_code?: string | null
          sector?: string | null
          serial_number: string
          updated_at?: string | null
          warranty_end?: string | null
          warranty_start?: string | null
        }
        Update: {
          brand?: string | null
          client_id?: string | null
          company_id?: string
          created_at?: string | null
          environment?: string | null
          equipment_type?: string | null
          field_equipment_id?: string | null
          id?: string
          is_active?: boolean | null
          location_description?: string | null
          model?: string | null
          notes?: string | null
          qr_code?: string | null
          sector?: string | null
          serial_number?: string
          updated_at?: string | null
          warranty_end?: string | null
          warranty_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      extract_rules: {
        Row: {
          category_id: string | null
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          search_text: string
          supplier_id: string | null
          times_used: number
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          search_text: string
          supplier_id?: string | null
          times_used?: number
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          search_text?: string
          supplier_id?: string | null
          times_used?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "extract_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extract_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extract_rules_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
        ]
      }
      field_control_sync: {
        Row: {
          company_id: string
          created_at: string
          entity_type: string
          field_id: string
          id: string
          last_sync: string
          wai_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          entity_type: string
          field_id: string
          id?: string
          last_sync?: string
          wai_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          entity_type?: string
          field_id?: string
          id?: string
          last_sync?: string
          wai_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "field_control_sync_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_situations: {
        Row: {
          allows_editing: boolean
          allows_manual_change: boolean
          color: string
          company_id: string
          confirms_payment: boolean
          created_at: string
          display_order: number | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          allows_editing?: boolean
          allows_manual_change?: boolean
          color?: string
          company_id: string
          confirms_payment?: boolean
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          allows_editing?: boolean
          allows_manual_change?: boolean
          color?: string
          company_id?: string
          confirms_payment?: boolean
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_situations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inter_company_transfers: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          reference_id: string | null
          reference_type: string
          source_company_id: string
          status: string
          target_company_id: string
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          reference_id?: string | null
          reference_type: string
          source_company_id: string
          status?: string
          target_company_id: string
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          reference_id?: string | null
          reference_type?: string
          source_company_id?: string
          status?: string
          target_company_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inter_company_transfers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inter_company_transfers_source_company_id_fkey"
            columns: ["source_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inter_company_transfers_target_company_id_fkey"
            columns: ["target_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inter_credentials: {
        Row: {
          account_number: string | null
          certificate_file_path: string
          client_id: string
          client_secret: string
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          last_sync_at: string | null
          private_key_file_path: string
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          certificate_file_path: string
          client_id: string
          client_secret: string
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          private_key_file_path: string
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          certificate_file_path?: string
          client_id?: string
          client_secret?: string
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          private_key_file_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inter_credentials_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inter_dda_boletos: {
        Row: {
          beneficiario_banco: string | null
          beneficiario_documento: string | null
          beneficiario_nome: string | null
          codigo_barras: string | null
          company_id: string
          created_at: string
          data_emissao: string | null
          data_vencimento: string
          external_id: string | null
          id: string
          imported_at: string | null
          imported_to_payable_id: string | null
          linha_digitavel: string
          pagador_documento: string | null
          pagador_nome: string | null
          raw_data: Json | null
          status: string
          synced_at: string | null
          updated_at: string
          valor: number
          valor_final: number | null
        }
        Insert: {
          beneficiario_banco?: string | null
          beneficiario_documento?: string | null
          beneficiario_nome?: string | null
          codigo_barras?: string | null
          company_id: string
          created_at?: string
          data_emissao?: string | null
          data_vencimento: string
          external_id?: string | null
          id?: string
          imported_at?: string | null
          imported_to_payable_id?: string | null
          linha_digitavel: string
          pagador_documento?: string | null
          pagador_nome?: string | null
          raw_data?: Json | null
          status?: string
          synced_at?: string | null
          updated_at?: string
          valor: number
          valor_final?: number | null
        }
        Update: {
          beneficiario_banco?: string | null
          beneficiario_documento?: string | null
          beneficiario_nome?: string | null
          codigo_barras?: string | null
          company_id?: string
          created_at?: string
          data_emissao?: string | null
          data_vencimento?: string
          external_id?: string | null
          id?: string
          imported_at?: string | null
          imported_to_payable_id?: string | null
          linha_digitavel?: string
          pagador_documento?: string | null
          pagador_nome?: string | null
          raw_data?: Json | null
          status?: string
          synced_at?: string | null
          updated_at?: string
          valor?: number
          valor_final?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inter_dda_boletos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inter_dda_boletos_imported_to_payable_id_fkey"
            columns: ["imported_to_payable_id"]
            isOneToOne: false
            referencedRelation: "payables"
            referencedColumns: ["id"]
          },
        ]
      }
      inter_pix_payments: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          error_message: string | null
          id: string
          inter_end_to_end_id: string | null
          inter_response: Json | null
          inter_status: string | null
          inter_transaction_id: string | null
          payable_id: string | null
          pix_key: string
          pix_key_type: string
          processed_at: string | null
          recipient_document: string
          recipient_name: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          error_message?: string | null
          id?: string
          inter_end_to_end_id?: string | null
          inter_response?: Json | null
          inter_status?: string | null
          inter_transaction_id?: string | null
          payable_id?: string | null
          pix_key: string
          pix_key_type: string
          processed_at?: string | null
          recipient_document: string
          recipient_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          error_message?: string | null
          id?: string
          inter_end_to_end_id?: string | null
          inter_response?: Json | null
          inter_status?: string | null
          inter_transaction_id?: string | null
          payable_id?: string | null
          pix_key?: string
          pix_key_type?: string
          processed_at?: string | null
          recipient_document?: string
          recipient_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inter_pix_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inter_pix_payments_payable_id_fkey"
            columns: ["payable_id"]
            isOneToOne: false
            referencedRelation: "payables"
            referencedColumns: ["id"]
          },
        ]
      }
      margin_impact_alerts: {
        Row: {
          company_id: string
          created_at: string
          id: string
          new_cost: number | null
          new_margin_percent: number | null
          notes: string | null
          old_cost: number | null
          old_margin_percent: number | null
          potential_loss: number | null
          product_id: string | null
          purchase_order_id: string | null
          quantity: number | null
          reference_id: string
          reference_number: string | null
          reference_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          sale_price: number | null
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          new_cost?: number | null
          new_margin_percent?: number | null
          notes?: string | null
          old_cost?: number | null
          old_margin_percent?: number | null
          potential_loss?: number | null
          product_id?: string | null
          purchase_order_id?: string | null
          quantity?: number | null
          reference_id: string
          reference_number?: string | null
          reference_type: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sale_price?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          new_cost?: number | null
          new_margin_percent?: number | null
          notes?: string | null
          old_cost?: number | null
          old_margin_percent?: number | null
          potential_loss?: number | null
          product_id?: string | null
          purchase_order_id?: string | null
          quantity?: number | null
          reference_id?: string
          reference_number?: string | null
          reference_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sale_price?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "margin_impact_alerts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "margin_impact_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "margin_impact_alerts_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "margin_impact_alerts_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      nfe_config: {
        Row: {
          ambiente: string
          cfop_padrao: string | null
          company_id: string
          created_at: string
          csc_id: string | null
          csc_token: string | null
          focus_token: string | null
          id: string
          inscricao_estadual: string | null
          natureza_operacao_padrao: string | null
          proximo_numero: number
          regime_tributario: string | null
          serie_nfe: string
          updated_at: string
        }
        Insert: {
          ambiente?: string
          cfop_padrao?: string | null
          company_id: string
          created_at?: string
          csc_id?: string | null
          csc_token?: string | null
          focus_token?: string | null
          id?: string
          inscricao_estadual?: string | null
          natureza_operacao_padrao?: string | null
          proximo_numero?: number
          regime_tributario?: string | null
          serie_nfe?: string
          updated_at?: string
        }
        Update: {
          ambiente?: string
          cfop_padrao?: string | null
          company_id?: string
          created_at?: string
          csc_id?: string | null
          csc_token?: string | null
          focus_token?: string | null
          id?: string
          inscricao_estadual?: string | null
          natureza_operacao_padrao?: string | null
          proximo_numero?: number
          regime_tributario?: string | null
          serie_nfe?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nfe_config_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      nfe_emitidas: {
        Row: {
          carta_correcao_data: string | null
          carta_correcao_sequencia: number | null
          carta_correcao_texto: string | null
          cfop: string | null
          chave_acesso: string | null
          company_id: string
          created_at: string
          data_autorizacao: string | null
          data_cancelamento: string | null
          data_emissao: string | null
          destinatario_cpf_cnpj: string | null
          destinatario_id: string | null
          destinatario_nome: string | null
          id: string
          mensagem_sefaz: string | null
          natureza_operacao: string | null
          numero: string | null
          payload_envio: Json | null
          payload_retorno: Json | null
          pdf_url: string | null
          protocolo: string | null
          referencia: string
          sale_id: string | null
          serie: string | null
          status: string
          status_sefaz: string | null
          updated_at: string
          valor_cofins: number | null
          valor_desconto: number | null
          valor_frete: number | null
          valor_icms: number | null
          valor_pis: number | null
          valor_produtos: number | null
          valor_total: number | null
          xml_url: string | null
        }
        Insert: {
          carta_correcao_data?: string | null
          carta_correcao_sequencia?: number | null
          carta_correcao_texto?: string | null
          cfop?: string | null
          chave_acesso?: string | null
          company_id: string
          created_at?: string
          data_autorizacao?: string | null
          data_cancelamento?: string | null
          data_emissao?: string | null
          destinatario_cpf_cnpj?: string | null
          destinatario_id?: string | null
          destinatario_nome?: string | null
          id?: string
          mensagem_sefaz?: string | null
          natureza_operacao?: string | null
          numero?: string | null
          payload_envio?: Json | null
          payload_retorno?: Json | null
          pdf_url?: string | null
          protocolo?: string | null
          referencia: string
          sale_id?: string | null
          serie?: string | null
          status?: string
          status_sefaz?: string | null
          updated_at?: string
          valor_cofins?: number | null
          valor_desconto?: number | null
          valor_frete?: number | null
          valor_icms?: number | null
          valor_pis?: number | null
          valor_produtos?: number | null
          valor_total?: number | null
          xml_url?: string | null
        }
        Update: {
          carta_correcao_data?: string | null
          carta_correcao_sequencia?: number | null
          carta_correcao_texto?: string | null
          cfop?: string | null
          chave_acesso?: string | null
          company_id?: string
          created_at?: string
          data_autorizacao?: string | null
          data_cancelamento?: string | null
          data_emissao?: string | null
          destinatario_cpf_cnpj?: string | null
          destinatario_id?: string | null
          destinatario_nome?: string | null
          id?: string
          mensagem_sefaz?: string | null
          natureza_operacao?: string | null
          numero?: string | null
          payload_envio?: Json | null
          payload_retorno?: Json | null
          pdf_url?: string | null
          protocolo?: string | null
          referencia?: string
          sale_id?: string | null
          serie?: string | null
          status?: string
          status_sefaz?: string | null
          updated_at?: string
          valor_cofins?: number | null
          valor_desconto?: number | null
          valor_frete?: number | null
          valor_icms?: number | null
          valor_pis?: number | null
          valor_produtos?: number | null
          valor_total?: number | null
          xml_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nfe_emitidas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfe_emitidas_destinatario_id_fkey"
            columns: ["destinatario_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfe_emitidas_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      nfe_emitidas_itens: {
        Row: {
          cfop: string | null
          codigo: string | null
          created_at: string
          descricao: string
          icms_aliquota: number | null
          icms_base_calculo: number | null
          icms_valor: number | null
          id: string
          ncm: string | null
          nfe_id: string
          numero_item: number
          produto_id: string | null
          quantidade: number
          unidade: string | null
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          cfop?: string | null
          codigo?: string | null
          created_at?: string
          descricao: string
          icms_aliquota?: number | null
          icms_base_calculo?: number | null
          icms_valor?: number | null
          id?: string
          ncm?: string | null
          nfe_id: string
          numero_item: number
          produto_id?: string | null
          quantidade: number
          unidade?: string | null
          valor_total: number
          valor_unitario: number
        }
        Update: {
          cfop?: string | null
          codigo?: string | null
          created_at?: string
          descricao?: string
          icms_aliquota?: number | null
          icms_base_calculo?: number | null
          icms_valor?: number | null
          id?: string
          ncm?: string | null
          nfe_id?: string
          numero_item?: number
          produto_id?: string | null
          quantidade?: number
          unidade?: string | null
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "nfe_emitidas_itens_nfe_id_fkey"
            columns: ["nfe_id"]
            isOneToOne: false
            referencedRelation: "nfe_emitidas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfe_emitidas_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      nfe_itens: {
        Row: {
          cest: string | null
          cfop: string
          codigo_produto: string
          cofins_aliquota: number | null
          cofins_base_calculo: number | null
          cofins_situacao_tributaria: string | null
          cofins_valor: number | null
          created_at: string
          descricao: string
          icms_aliquota: number | null
          icms_base_calculo: number | null
          icms_origem: string | null
          icms_situacao_tributaria: string | null
          icms_valor: number | null
          id: string
          ncm: string | null
          nota_fiscal_id: string
          numero_item: number
          pis_aliquota: number | null
          pis_base_calculo: number | null
          pis_situacao_tributaria: string | null
          pis_valor: number | null
          product_id: string | null
          quantidade_comercial: number
          unidade_comercial: string
          valor_bruto: number
          valor_desconto: number | null
          valor_unitario: number
        }
        Insert: {
          cest?: string | null
          cfop: string
          codigo_produto: string
          cofins_aliquota?: number | null
          cofins_base_calculo?: number | null
          cofins_situacao_tributaria?: string | null
          cofins_valor?: number | null
          created_at?: string
          descricao: string
          icms_aliquota?: number | null
          icms_base_calculo?: number | null
          icms_origem?: string | null
          icms_situacao_tributaria?: string | null
          icms_valor?: number | null
          id?: string
          ncm?: string | null
          nota_fiscal_id: string
          numero_item: number
          pis_aliquota?: number | null
          pis_base_calculo?: number | null
          pis_situacao_tributaria?: string | null
          pis_valor?: number | null
          product_id?: string | null
          quantidade_comercial: number
          unidade_comercial?: string
          valor_bruto: number
          valor_desconto?: number | null
          valor_unitario: number
        }
        Update: {
          cest?: string | null
          cfop?: string
          codigo_produto?: string
          cofins_aliquota?: number | null
          cofins_base_calculo?: number | null
          cofins_situacao_tributaria?: string | null
          cofins_valor?: number | null
          created_at?: string
          descricao?: string
          icms_aliquota?: number | null
          icms_base_calculo?: number | null
          icms_origem?: string | null
          icms_situacao_tributaria?: string | null
          icms_valor?: number | null
          id?: string
          ncm?: string | null
          nota_fiscal_id?: string
          numero_item?: number
          pis_aliquota?: number | null
          pis_base_calculo?: number | null
          pis_situacao_tributaria?: string | null
          pis_valor?: number | null
          product_id?: string | null
          quantidade_comercial?: number
          unidade_comercial?: string
          valor_bruto?: number
          valor_desconto?: number | null
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "nfe_itens_nota_fiscal_id_fkey"
            columns: ["nota_fiscal_id"]
            isOneToOne: false
            referencedRelation: "notas_fiscais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfe_itens_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      nfe_logs: {
        Row: {
          created_at: string
          id: string
          mensagem: string | null
          nota_fiscal_id: string | null
          referencia: string
          request_data: Json | null
          response_data: Json | null
          status: string | null
          tipo: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          mensagem?: string | null
          nota_fiscal_id?: string | null
          referencia: string
          request_data?: Json | null
          response_data?: Json | null
          status?: string | null
          tipo: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          mensagem?: string | null
          nota_fiscal_id?: string | null
          referencia?: string
          request_data?: Json | null
          response_data?: Json | null
          status?: string | null
          tipo?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nfe_logs_nota_fiscal_id_fkey"
            columns: ["nota_fiscal_id"]
            isOneToOne: false
            referencedRelation: "notas_fiscais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfe_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      nfse_config: {
        Row: {
          ambiente: string
          codigo_municipio: string | null
          company_id: string
          created_at: string
          id: string
          inscricao_municipal: string | null
          optante_simples: boolean | null
          proximo_numero: number
          regime_tributacao: string | null
          serie_nfse: string
          updated_at: string
        }
        Insert: {
          ambiente?: string
          codigo_municipio?: string | null
          company_id: string
          created_at?: string
          id?: string
          inscricao_municipal?: string | null
          optante_simples?: boolean | null
          proximo_numero?: number
          regime_tributacao?: string | null
          serie_nfse?: string
          updated_at?: string
        }
        Update: {
          ambiente?: string
          codigo_municipio?: string | null
          company_id?: string
          created_at?: string
          id?: string
          inscricao_municipal?: string | null
          optante_simples?: boolean | null
          proximo_numero?: number
          regime_tributacao?: string | null
          serie_nfse?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nfse_config_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      nfse_emitidas: {
        Row: {
          aliquota_iss: number | null
          chave_acesso: string | null
          cnae: string | null
          codigo_servico: string | null
          codigo_verificacao: string | null
          company_id: string
          created_at: string
          data_autorizacao: string | null
          data_cancelamento: string | null
          data_emissao: string | null
          discriminacao_servicos: string | null
          id: string
          mensagem_prefeitura: string | null
          numero: string | null
          payload_envio: Json | null
          payload_retorno: Json | null
          pdf_url: string | null
          referencia: string
          serie: string | null
          service_order_id: string | null
          status: string
          status_prefeitura: string | null
          tomador_cpf_cnpj: string | null
          tomador_id: string | null
          tomador_nome: string | null
          updated_at: string
          valor_deducoes: number | null
          valor_iss: number | null
          valor_servicos: number | null
          valor_total: number | null
          xml_url: string | null
        }
        Insert: {
          aliquota_iss?: number | null
          chave_acesso?: string | null
          cnae?: string | null
          codigo_servico?: string | null
          codigo_verificacao?: string | null
          company_id: string
          created_at?: string
          data_autorizacao?: string | null
          data_cancelamento?: string | null
          data_emissao?: string | null
          discriminacao_servicos?: string | null
          id?: string
          mensagem_prefeitura?: string | null
          numero?: string | null
          payload_envio?: Json | null
          payload_retorno?: Json | null
          pdf_url?: string | null
          referencia: string
          serie?: string | null
          service_order_id?: string | null
          status?: string
          status_prefeitura?: string | null
          tomador_cpf_cnpj?: string | null
          tomador_id?: string | null
          tomador_nome?: string | null
          updated_at?: string
          valor_deducoes?: number | null
          valor_iss?: number | null
          valor_servicos?: number | null
          valor_total?: number | null
          xml_url?: string | null
        }
        Update: {
          aliquota_iss?: number | null
          chave_acesso?: string | null
          cnae?: string | null
          codigo_servico?: string | null
          codigo_verificacao?: string | null
          company_id?: string
          created_at?: string
          data_autorizacao?: string | null
          data_cancelamento?: string | null
          data_emissao?: string | null
          discriminacao_servicos?: string | null
          id?: string
          mensagem_prefeitura?: string | null
          numero?: string | null
          payload_envio?: Json | null
          payload_retorno?: Json | null
          pdf_url?: string | null
          referencia?: string
          serie?: string | null
          service_order_id?: string | null
          status?: string
          status_prefeitura?: string | null
          tomador_cpf_cnpj?: string | null
          tomador_id?: string | null
          tomador_nome?: string | null
          updated_at?: string
          valor_deducoes?: number | null
          valor_iss?: number | null
          valor_servicos?: number | null
          valor_total?: number | null
          xml_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nfse_emitidas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfse_emitidas_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfse_emitidas_tomador_id_fkey"
            columns: ["tomador_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
        ]
      }
      notas_fiscais: {
        Row: {
          chave_nfe: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          danfe_url: string | null
          data_autorizacao: string | null
          data_cancelamento: string | null
          data_emissao: string | null
          destinatario_cpf_cnpj: string | null
          destinatario_email: string | null
          destinatario_nome: string | null
          id: string
          justificativa_cancelamento: string | null
          mensagem_sefaz: string | null
          natureza_operacao: string | null
          numero: string | null
          protocolo: string | null
          referencia: string
          sale_id: string | null
          serie: string | null
          status: string
          status_sefaz: string | null
          tipo: string
          updated_at: string
          valor_cofins: number | null
          valor_desconto: number | null
          valor_frete: number | null
          valor_icms: number | null
          valor_pis: number | null
          valor_produtos: number | null
          valor_total: number | null
          xml_url: string | null
        }
        Insert: {
          chave_nfe?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          danfe_url?: string | null
          data_autorizacao?: string | null
          data_cancelamento?: string | null
          data_emissao?: string | null
          destinatario_cpf_cnpj?: string | null
          destinatario_email?: string | null
          destinatario_nome?: string | null
          id?: string
          justificativa_cancelamento?: string | null
          mensagem_sefaz?: string | null
          natureza_operacao?: string | null
          numero?: string | null
          protocolo?: string | null
          referencia: string
          sale_id?: string | null
          serie?: string | null
          status?: string
          status_sefaz?: string | null
          tipo?: string
          updated_at?: string
          valor_cofins?: number | null
          valor_desconto?: number | null
          valor_frete?: number | null
          valor_icms?: number | null
          valor_pis?: number | null
          valor_produtos?: number | null
          valor_total?: number | null
          xml_url?: string | null
        }
        Update: {
          chave_nfe?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          danfe_url?: string | null
          data_autorizacao?: string | null
          data_cancelamento?: string | null
          data_emissao?: string | null
          destinatario_cpf_cnpj?: string | null
          destinatario_email?: string | null
          destinatario_nome?: string | null
          id?: string
          justificativa_cancelamento?: string | null
          mensagem_sefaz?: string | null
          natureza_operacao?: string | null
          numero?: string | null
          protocolo?: string | null
          referencia?: string
          sale_id?: string | null
          serie?: string | null
          status?: string
          status_sefaz?: string | null
          tipo?: string
          updated_at?: string
          valor_cofins?: number | null
          valor_desconto?: number | null
          valor_frete?: number | null
          valor_icms?: number | null
          valor_pis?: number | null
          valor_produtos?: number | null
          valor_total?: number | null
          xml_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notas_fiscais_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_fiscais_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_fiscais_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      payable_attachments: {
        Row: {
          company_id: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          payable_id: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          payable_id: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          payable_id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payable_attachments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payable_attachments_payable_id_fkey"
            columns: ["payable_id"]
            isOneToOne: false
            referencedRelation: "payables"
            referencedColumns: ["id"]
          },
        ]
      }
      payables: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          bank_account_id: string | null
          bank_transaction_id: string | null
          boleto_barcode: string | null
          chart_account_id: string | null
          company_id: string
          cost_center_id: string | null
          created_at: string
          description: string | null
          document_number: string | null
          document_type: string
          due_date: string
          financial_situation_id: string | null
          forecast_converted_at: string | null
          id: string
          inter_payment_id: string | null
          is_forecast: boolean | null
          is_paid: boolean | null
          notes: string | null
          paid_amount: number | null
          paid_at: string | null
          payment_method: string | null
          payment_method_type:
            | Database["public"]["Enums"]["payment_method_type"]
            | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          pix_key: string | null
          pix_key_type: string | null
          purchase_order_id: string | null
          recipient_document: string | null
          recipient_name: string | null
          reconciliation_id: string | null
          reconciliation_source: string | null
          scheduled_payment_date: string | null
          source: string | null
          submitted_at: string | null
          submitted_by: string | null
          supplier_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          bank_account_id?: string | null
          bank_transaction_id?: string | null
          boleto_barcode?: string | null
          chart_account_id?: string | null
          company_id: string
          cost_center_id?: string | null
          created_at?: string
          description?: string | null
          document_number?: string | null
          document_type?: string
          due_date: string
          financial_situation_id?: string | null
          forecast_converted_at?: string | null
          id?: string
          inter_payment_id?: string | null
          is_forecast?: boolean | null
          is_paid?: boolean | null
          notes?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          payment_method?: string | null
          payment_method_type?:
            | Database["public"]["Enums"]["payment_method_type"]
            | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          pix_key?: string | null
          pix_key_type?: string | null
          purchase_order_id?: string | null
          recipient_document?: string | null
          recipient_name?: string | null
          reconciliation_id?: string | null
          reconciliation_source?: string | null
          scheduled_payment_date?: string | null
          source?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          supplier_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          bank_account_id?: string | null
          bank_transaction_id?: string | null
          boleto_barcode?: string | null
          chart_account_id?: string | null
          company_id?: string
          cost_center_id?: string | null
          created_at?: string
          description?: string | null
          document_number?: string | null
          document_type?: string
          due_date?: string
          financial_situation_id?: string | null
          forecast_converted_at?: string | null
          id?: string
          inter_payment_id?: string | null
          is_forecast?: boolean | null
          is_paid?: boolean | null
          notes?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          payment_method?: string | null
          payment_method_type?:
            | Database["public"]["Enums"]["payment_method_type"]
            | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          pix_key?: string | null
          pix_key_type?: string | null
          purchase_order_id?: string | null
          recipient_document?: string | null
          recipient_name?: string | null
          reconciliation_id?: string | null
          reconciliation_source?: string | null
          scheduled_payment_date?: string | null
          source?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payables_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payables_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payables_bank_transaction_id_fkey"
            columns: ["bank_transaction_id"]
            isOneToOne: false
            referencedRelation: "bank_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payables_chart_account_id_fkey"
            columns: ["chart_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payables_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payables_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payables_financial_situation_id_fkey"
            columns: ["financial_situation_id"]
            isOneToOne: false
            referencedRelation: "financial_situations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payables_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payables_reconciliation_id_fkey"
            columns: ["reconciliation_id"]
            isOneToOne: false
            referencedRelation: "bank_reconciliations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payables_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payables_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          metadata: Json | null
          new_status: string | null
          old_status: string | null
          payable_id: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_status?: string | null
          old_status?: string | null
          payable_id: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_status?: string | null
          old_status?: string | null
          payable_id?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_audit_logs_payable_id_fkey"
            columns: ["payable_id"]
            isOneToOne: false
            referencedRelation: "payables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          auto_transfer_enabled: boolean
          bank_account_id: string | null
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          receives_in_company_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          auto_transfer_enabled?: boolean
          bank_account_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          receives_in_company_id?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          auto_transfer_enabled?: boolean
          bank_account_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          receives_in_company_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_methods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_methods_receives_in_company_id_fkey"
            columns: ["receives_in_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pessoa_contatos: {
        Row: {
          cargo: string | null
          company_id: string | null
          created_at: string
          email: string | null
          id: string
          nome: string | null
          pessoa_id: string
          principal: boolean | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          cargo?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string | null
          pessoa_id: string
          principal?: boolean | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          cargo?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string | null
          pessoa_id?: string
          principal?: boolean | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pessoa_contatos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pessoa_contatos_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
        ]
      }
      pessoa_enderecos: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          company_id: string | null
          complemento: string | null
          created_at: string
          estado: string | null
          id: string
          is_principal: boolean | null
          logradouro: string | null
          numero: string | null
          pessoa_id: string
          tipo_endereco: string
          updated_at: string
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          company_id?: string | null
          complemento?: string | null
          created_at?: string
          estado?: string | null
          id?: string
          is_principal?: boolean | null
          logradouro?: string | null
          numero?: string | null
          pessoa_id: string
          tipo_endereco?: string
          updated_at?: string
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          company_id?: string | null
          complemento?: string | null
          created_at?: string
          estado?: string | null
          id?: string
          is_principal?: boolean | null
          logradouro?: string | null
          numero?: string | null
          pessoa_id?: string
          tipo_endereco?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pessoa_enderecos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pessoa_enderecos_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
        ]
      }
      pessoa_historico: {
        Row: {
          campo_alterado: string
          company_id: string | null
          created_at: string
          id: string
          pessoa_id: string
          usuario_id: string | null
          valor_anterior: string | null
          valor_novo: string | null
        }
        Insert: {
          campo_alterado: string
          company_id?: string | null
          created_at?: string
          id?: string
          pessoa_id: string
          usuario_id?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Update: {
          campo_alterado?: string
          company_id?: string | null
          created_at?: string
          id?: string
          pessoa_id?: string
          usuario_id?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pessoa_historico_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pessoa_historico_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
        ]
      }
      pessoas: {
        Row: {
          auth_id: string | null
          bairro: string | null
          cargo: string | null
          cep: string | null
          cidade: string | null
          cnae_principal: string | null
          comissao_percentual: number | null
          company_id: string | null
          complemento: string | null
          condicao_pagamento: string | null
          contribuinte_icms: boolean | null
          cpf_cnpj: string | null
          created_at: string
          created_by: string | null
          data_abertura: string | null
          data_admissao: string | null
          data_demissao: string | null
          departamento: string | null
          email: string | null
          estado: string | null
          id: string
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          is_active: boolean
          is_cliente: boolean
          is_colaborador: boolean
          is_fornecedor: boolean
          is_transportadora: boolean
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
          salario: number | null
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
          auth_id?: string | null
          bairro?: string | null
          cargo?: string | null
          cep?: string | null
          cidade?: string | null
          cnae_principal?: string | null
          comissao_percentual?: number | null
          company_id?: string | null
          complemento?: string | null
          condicao_pagamento?: string | null
          contribuinte_icms?: boolean | null
          cpf_cnpj?: string | null
          created_at?: string
          created_by?: string | null
          data_abertura?: string | null
          data_admissao?: string | null
          data_demissao?: string | null
          departamento?: string | null
          email?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          is_active?: boolean
          is_cliente?: boolean
          is_colaborador?: boolean
          is_fornecedor?: boolean
          is_transportadora?: boolean
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
          salario?: number | null
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
          auth_id?: string | null
          bairro?: string | null
          cargo?: string | null
          cep?: string | null
          cidade?: string | null
          cnae_principal?: string | null
          comissao_percentual?: number | null
          company_id?: string | null
          complemento?: string | null
          condicao_pagamento?: string | null
          contribuinte_icms?: boolean | null
          cpf_cnpj?: string | null
          created_at?: string
          created_by?: string | null
          data_abertura?: string | null
          data_admissao?: string | null
          data_demissao?: string | null
          departamento?: string | null
          email?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          is_active?: boolean
          is_cliente?: boolean
          is_colaborador?: boolean
          is_fornecedor?: boolean
          is_transportadora?: boolean
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
          salario?: number | null
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
        Relationships: [
          {
            foreignKeyName: "pessoas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      price_table_items: {
        Row: {
          created_at: string
          custom_price: number
          id: string
          price_table_id: string
          product_id: string | null
          service_id: string | null
        }
        Insert: {
          created_at?: string
          custom_price: number
          id?: string
          price_table_id: string
          product_id?: string | null
          service_id?: string | null
        }
        Update: {
          created_at?: string
          custom_price?: number
          id?: string
          price_table_id?: string
          product_id?: string | null
          service_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_table_items_price_table_id_fkey"
            columns: ["price_table_id"]
            isOneToOne: false
            referencedRelation: "price_tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_table_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_table_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      price_tables: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_tables_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      product_brands: {
        Row: {
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      product_cost_history: {
        Row: {
          company_id: string | null
          created_at: string
          custo_anterior: number
          custo_novo: number
          documento_referencia: string | null
          estoque_anterior: number | null
          estoque_novo: number | null
          id: string
          observacoes: string | null
          product_id: string
          quantidade: number | null
          tipo_movimentacao: string
          usuario_id: string | null
          usuario_nome: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          custo_anterior?: number
          custo_novo?: number
          documento_referencia?: string | null
          estoque_anterior?: number | null
          estoque_novo?: number | null
          id?: string
          observacoes?: string | null
          product_id: string
          quantidade?: number | null
          tipo_movimentacao: string
          usuario_id?: string | null
          usuario_nome?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          custo_anterior?: number
          custo_novo?: number
          documento_referencia?: string | null
          estoque_anterior?: number | null
          estoque_novo?: number | null
          id?: string
          observacoes?: string | null
          product_id?: string
          quantidade?: number | null
          tipo_movimentacao?: string
          usuario_id?: string | null
          usuario_nome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_cost_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_cost_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_groups: {
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
        Relationships: [
          {
            foreignKeyName: "product_groups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          company_id: string | null
          created_at: string
          display_order: number | null
          id: string
          is_main: boolean | null
          product_id: string
          url: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          is_main?: boolean | null
          product_id: string
          url: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          is_main?: boolean | null
          product_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_stock_locations: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          is_primary: boolean | null
          location_id: string
          max_quantity: number | null
          min_quantity: number | null
          product_id: string
          quantity: number
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean | null
          location_id: string
          max_quantity?: number | null
          min_quantity?: number | null
          product_id: string
          quantity?: number
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean | null
          location_id?: string
          max_quantity?: number | null
          min_quantity?: number | null
          product_id?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_stock_locations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_stock_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "stock_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_stock_locations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_subgroups: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          group_id: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          group_id: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          group_id?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_subgroups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_subgroups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "product_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      product_suppliers: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          is_preferred: boolean | null
          last_purchase_date: string | null
          last_purchase_price: number | null
          lead_time_days: number | null
          min_order_qty: number | null
          product_id: string
          supplier_cnpj: string | null
          supplier_code: string | null
          supplier_id: string | null
          supplier_name: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          is_preferred?: boolean | null
          last_purchase_date?: string | null
          last_purchase_price?: number | null
          lead_time_days?: number | null
          min_order_qty?: number | null
          product_id: string
          supplier_cnpj?: string | null
          supplier_code?: string | null
          supplier_id?: string | null
          supplier_name: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          is_preferred?: boolean | null
          last_purchase_date?: string | null
          last_purchase_price?: number | null
          lead_time_days?: number | null
          min_order_qty?: number | null
          product_id?: string
          supplier_cnpj?: string | null
          supplier_code?: string | null
          supplier_id?: string | null
          supplier_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_suppliers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_suppliers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_suppliers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          accessory_expenses: number | null
          average_cost: number | null
          barcode: string | null
          benefit_code: string | null
          brand_id: string | null
          category_id: string | null
          cest: string | null
          code: string
          company_id: string | null
          controls_stock: boolean | null
          created_at: string
          default_location_id: string | null
          description: string
          description_long: string | null
          extra_fields: Json | null
          fci_number: string | null
          final_cost: number | null
          gross_weight: number | null
          group_id: string | null
          has_composition: boolean | null
          has_invoice: boolean | null
          has_variations: boolean | null
          height: number | null
          id: string
          is_active: boolean
          is_pdv_available: boolean | null
          is_sold_separately: boolean | null
          length: number | null
          location: string | null
          max_stock: number | null
          min_stock: number | null
          ncm: string | null
          ncm_description: string | null
          ncm_validated: boolean | null
          net_weight: number | null
          origin: string | null
          other_expenses: number | null
          product_group: string | null
          purchase_price: number | null
          quantity: number | null
          sale_price: number | null
          specific_product: string | null
          subgroup_id: string | null
          unit: string | null
          unit_conversions: Json | null
          updated_at: string
          weight: number | null
          width: number | null
        }
        Insert: {
          accessory_expenses?: number | null
          average_cost?: number | null
          barcode?: string | null
          benefit_code?: string | null
          brand_id?: string | null
          category_id?: string | null
          cest?: string | null
          code: string
          company_id?: string | null
          controls_stock?: boolean | null
          created_at?: string
          default_location_id?: string | null
          description: string
          description_long?: string | null
          extra_fields?: Json | null
          fci_number?: string | null
          final_cost?: number | null
          gross_weight?: number | null
          group_id?: string | null
          has_composition?: boolean | null
          has_invoice?: boolean | null
          has_variations?: boolean | null
          height?: number | null
          id?: string
          is_active?: boolean
          is_pdv_available?: boolean | null
          is_sold_separately?: boolean | null
          length?: number | null
          location?: string | null
          max_stock?: number | null
          min_stock?: number | null
          ncm?: string | null
          ncm_description?: string | null
          ncm_validated?: boolean | null
          net_weight?: number | null
          origin?: string | null
          other_expenses?: number | null
          product_group?: string | null
          purchase_price?: number | null
          quantity?: number | null
          sale_price?: number | null
          specific_product?: string | null
          subgroup_id?: string | null
          unit?: string | null
          unit_conversions?: Json | null
          updated_at?: string
          weight?: number | null
          width?: number | null
        }
        Update: {
          accessory_expenses?: number | null
          average_cost?: number | null
          barcode?: string | null
          benefit_code?: string | null
          brand_id?: string | null
          category_id?: string | null
          cest?: string | null
          code?: string
          company_id?: string | null
          controls_stock?: boolean | null
          created_at?: string
          default_location_id?: string | null
          description?: string
          description_long?: string | null
          extra_fields?: Json | null
          fci_number?: string | null
          final_cost?: number | null
          gross_weight?: number | null
          group_id?: string | null
          has_composition?: boolean | null
          has_invoice?: boolean | null
          has_variations?: boolean | null
          height?: number | null
          id?: string
          is_active?: boolean
          is_pdv_available?: boolean | null
          is_sold_separately?: boolean | null
          length?: number | null
          location?: string | null
          max_stock?: number | null
          min_stock?: number | null
          ncm?: string | null
          ncm_description?: string | null
          ncm_validated?: boolean | null
          net_weight?: number | null
          origin?: string | null
          other_expenses?: number | null
          product_group?: string | null
          purchase_price?: number | null
          quantity?: number | null
          sale_price?: number | null
          specific_product?: string | null
          subgroup_id?: string | null
          unit?: string | null
          unit_conversions?: Json | null
          updated_at?: string
          weight?: number | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_default_location_id_fkey"
            columns: ["default_location_id"]
            isOneToOne: false
            referencedRelation: "stock_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "product_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_subgroup_id_fkey"
            columns: ["subgroup_id"]
            isOneToOne: false
            referencedRelation: "product_subgroups"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_divergences: {
        Row: {
          actual_value: string | null
          company_id: string | null
          created_at: string
          difference: number | null
          divergence_type: string
          expected_value: string | null
          field_name: string | null
          id: string
          is_resolved: boolean | null
          item_id: string | null
          purchase_order_id: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          actual_value?: string | null
          company_id?: string | null
          created_at?: string
          difference?: number | null
          divergence_type: string
          expected_value?: string | null
          field_name?: string | null
          id?: string
          is_resolved?: boolean | null
          item_id?: string | null
          purchase_order_id: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          actual_value?: string | null
          company_id?: string | null
          created_at?: string
          difference?: number | null
          divergence_type?: string
          expected_value?: string | null
          field_name?: string | null
          id?: string
          is_resolved?: boolean | null
          item_id?: string | null
          purchase_order_id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_divergences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_divergences_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_divergences_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_divergences_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_installments: {
        Row: {
          amount: number
          company_id: string | null
          created_at: string
          due_date: string
          id: string
          installment_number: number
          nfe_original_amount: number | null
          nfe_original_date: string | null
          purchase_order_id: string
          source: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          company_id?: string | null
          created_at?: string
          due_date: string
          id?: string
          installment_number?: number
          nfe_original_amount?: number | null
          nfe_original_date?: string | null
          purchase_order_id: string
          source?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string | null
          created_at?: string
          due_date?: string
          id?: string
          installment_number?: number
          nfe_original_amount?: number | null
          nfe_original_date?: string | null
          purchase_order_id?: string
          source?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_installments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_installments_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          calculated_unit_cost: number | null
          cfop: string | null
          chart_account_id: string | null
          company_id: string | null
          cost_breakdown: Json | null
          cost_center_id: string | null
          created_at: string
          description: string | null
          divergence_details: Json | null
          final_unit_cost: number | null
          freight_allocated: number | null
          has_divergence: boolean | null
          id: string
          ncm: string | null
          nfe_quantity: number | null
          nfe_total_value: number | null
          nfe_unit_price: number | null
          product_id: string | null
          purchase_order_id: string
          quantity: number
          quantity_received: number | null
          total_value: number | null
          unit_price: number | null
          weight: number | null
          xml_code: string | null
          xml_description: string | null
        }
        Insert: {
          calculated_unit_cost?: number | null
          cfop?: string | null
          chart_account_id?: string | null
          company_id?: string | null
          cost_breakdown?: Json | null
          cost_center_id?: string | null
          created_at?: string
          description?: string | null
          divergence_details?: Json | null
          final_unit_cost?: number | null
          freight_allocated?: number | null
          has_divergence?: boolean | null
          id?: string
          ncm?: string | null
          nfe_quantity?: number | null
          nfe_total_value?: number | null
          nfe_unit_price?: number | null
          product_id?: string | null
          purchase_order_id: string
          quantity: number
          quantity_received?: number | null
          total_value?: number | null
          unit_price?: number | null
          weight?: number | null
          xml_code?: string | null
          xml_description?: string | null
        }
        Update: {
          calculated_unit_cost?: number | null
          cfop?: string | null
          chart_account_id?: string | null
          company_id?: string | null
          cost_breakdown?: Json | null
          cost_center_id?: string | null
          created_at?: string
          description?: string | null
          divergence_details?: Json | null
          final_unit_cost?: number | null
          freight_allocated?: number | null
          has_divergence?: boolean | null
          id?: string
          ncm?: string | null
          nfe_quantity?: number | null
          nfe_total_value?: number | null
          nfe_unit_price?: number | null
          product_id?: string | null
          purchase_order_id?: string
          quantity?: number
          quantity_received?: number | null
          total_value?: number | null
          unit_price?: number | null
          weight?: number | null
          xml_code?: string | null
          xml_description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_chart_account_id_fkey"
            columns: ["chart_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_limits: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          max_monthly_total: number | null
          max_per_transaction: number | null
          purpose: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_monthly_total?: number | null
          max_per_transaction?: number | null
          purpose?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_monthly_total?: number | null
          max_per_transaction?: number | null
          purpose?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_limits_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_limits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_receipt_items: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          product_id: string | null
          purchase_order_item_id: string
          quantity_expected: number
          quantity_pending: number | null
          quantity_received: number
          receipt_id: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          product_id?: string | null
          purchase_order_item_id: string
          quantity_expected?: number
          quantity_pending?: number | null
          quantity_received?: number
          receipt_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          product_id?: string | null
          purchase_order_item_id?: string
          quantity_expected?: number
          quantity_pending?: number | null
          quantity_received?: number
          receipt_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_receipt_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_receipt_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_receipt_items_purchase_order_item_id_fkey"
            columns: ["purchase_order_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_receipt_items_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_receipt_logs: {
        Row: {
          action: string
          barcode_scanned: string | null
          company_id: string | null
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          quantity: number | null
          receipt_id: string
          receipt_item_id: string | null
          user_agent: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          barcode_scanned?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          quantity?: number | null
          receipt_id: string
          receipt_item_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          barcode_scanned?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          quantity?: number | null
          receipt_id?: string
          receipt_item_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_receipt_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_receipt_logs_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_receipt_logs_receipt_item_id_fkey"
            columns: ["receipt_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_receipt_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_receipt_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_receipts: {
        Row: {
          company_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          notes: string | null
          purchase_order_id: string
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          purchase_order_id: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          purchase_order_id?: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_receipts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_receipts_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_receipts_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_statuses: {
        Row: {
          color: string | null
          company_id: string
          created_at: string
          display_order: number | null
          financial_behavior: string
          id: string
          is_active: boolean
          is_default: boolean | null
          name: string
          requires_receipt: boolean
          stock_behavior: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          company_id: string
          created_at?: string
          display_order?: number | null
          financial_behavior?: string
          id?: string
          is_active?: boolean
          is_default?: boolean | null
          name: string
          requires_receipt?: boolean
          stock_behavior?: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string
          display_order?: number | null
          financial_behavior?: string
          id?: string
          is_active?: boolean
          is_default?: boolean | null
          name?: string
          requires_receipt?: boolean
          stock_behavior?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_statuses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          chart_account_id: string | null
          company_id: string | null
          cost_center_id: string | null
          created_at: string
          created_by: string | null
          cte_carrier_id: string | null
          cte_date: string | null
          cte_freight_value: number | null
          cte_imported_at: string | null
          cte_key: string | null
          cte_number: string | null
          cte_xml_url: string | null
          financial_generated: boolean | null
          financial_generated_at: string | null
          financial_notes: string | null
          freight_value: number | null
          has_external_freight: boolean | null
          id: string
          invoice_date: string | null
          invoice_number: string | null
          invoice_series: string | null
          nfe_cfop_saida: string | null
          nfe_date: string | null
          nfe_imported_at: string | null
          nfe_key: string | null
          nfe_natureza_operacao: string | null
          nfe_number: string | null
          nfe_series: string | null
          nfe_supplier_cnpj: string | null
          nfe_supplier_name: string | null
          nfe_xml_url: string | null
          observations: string | null
          order_number: number
          payment_method: string | null
          purpose: string | null
          reapproval_reason: string | null
          receipt_date: string | null
          receipt_status: string | null
          requester_id: string | null
          requires_reapproval: boolean | null
          status: string | null
          status_id: string | null
          stock_entry_done: boolean | null
          stock_entry_done_at: string | null
          supplier_address: string | null
          supplier_cnpj: string | null
          supplier_id: string | null
          supplier_name: string | null
          total_value: number | null
          updated_at: string
          xml_url: string | null
        }
        Insert: {
          chart_account_id?: string | null
          company_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          cte_carrier_id?: string | null
          cte_date?: string | null
          cte_freight_value?: number | null
          cte_imported_at?: string | null
          cte_key?: string | null
          cte_number?: string | null
          cte_xml_url?: string | null
          financial_generated?: boolean | null
          financial_generated_at?: string | null
          financial_notes?: string | null
          freight_value?: number | null
          has_external_freight?: boolean | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_series?: string | null
          nfe_cfop_saida?: string | null
          nfe_date?: string | null
          nfe_imported_at?: string | null
          nfe_key?: string | null
          nfe_natureza_operacao?: string | null
          nfe_number?: string | null
          nfe_series?: string | null
          nfe_supplier_cnpj?: string | null
          nfe_supplier_name?: string | null
          nfe_xml_url?: string | null
          observations?: string | null
          order_number?: number
          payment_method?: string | null
          purpose?: string | null
          reapproval_reason?: string | null
          receipt_date?: string | null
          receipt_status?: string | null
          requester_id?: string | null
          requires_reapproval?: boolean | null
          status?: string | null
          status_id?: string | null
          stock_entry_done?: boolean | null
          stock_entry_done_at?: string | null
          supplier_address?: string | null
          supplier_cnpj?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          total_value?: number | null
          updated_at?: string
          xml_url?: string | null
        }
        Update: {
          chart_account_id?: string | null
          company_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          cte_carrier_id?: string | null
          cte_date?: string | null
          cte_freight_value?: number | null
          cte_imported_at?: string | null
          cte_key?: string | null
          cte_number?: string | null
          cte_xml_url?: string | null
          financial_generated?: boolean | null
          financial_generated_at?: string | null
          financial_notes?: string | null
          freight_value?: number | null
          has_external_freight?: boolean | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_series?: string | null
          nfe_cfop_saida?: string | null
          nfe_date?: string | null
          nfe_imported_at?: string | null
          nfe_key?: string | null
          nfe_natureza_operacao?: string | null
          nfe_number?: string | null
          nfe_series?: string | null
          nfe_supplier_cnpj?: string | null
          nfe_supplier_name?: string | null
          nfe_xml_url?: string | null
          observations?: string | null
          order_number?: number
          payment_method?: string | null
          purpose?: string | null
          reapproval_reason?: string | null
          receipt_date?: string | null
          receipt_status?: string | null
          requester_id?: string | null
          requires_reapproval?: boolean | null
          status?: string | null
          status_id?: string | null
          stock_entry_done?: boolean | null
          stock_entry_done_at?: string | null
          supplier_address?: string | null
          supplier_cnpj?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          total_value?: number | null
          updated_at?: string
          xml_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_chart_account_id_fkey"
            columns: ["chart_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_cte_carrier_id_fkey"
            columns: ["cte_carrier_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
        ]
      }
      quick_categories: {
        Row: {
          chart_account_id: string | null
          company_id: string
          created_at: string
          default_cost_center_id: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          chart_account_id?: string | null
          company_id: string
          created_at?: string
          default_cost_center_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          chart_account_id?: string | null
          company_id?: string
          created_at?: string
          default_cost_center_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quick_categories_chart_account_id_fkey"
            columns: ["chart_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quick_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quick_categories_default_cost_center_id_fkey"
            columns: ["default_cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      receivable_attachments: {
        Row: {
          company_id: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          receivable_id: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          receivable_id: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          receivable_id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receivable_attachments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receivable_attachments_receivable_id_fkey"
            columns: ["receivable_id"]
            isOneToOne: false
            referencedRelation: "accounts_receivable"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_audit_log: {
        Row: {
          bank_transaction_id: string | null
          company_id: string
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          reconciliation_id: string | null
          user_id: string | null
        }
        Insert: {
          bank_transaction_id?: string | null
          company_id: string
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          reconciliation_id?: string | null
          user_id?: string | null
        }
        Update: {
          bank_transaction_id?: string | null
          company_id?: string
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          reconciliation_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_audit_log_bank_transaction_id_fkey"
            columns: ["bank_transaction_id"]
            isOneToOne: false
            referencedRelation: "bank_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_audit_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_audit_log_reconciliation_id_fkey"
            columns: ["reconciliation_id"]
            isOneToOne: false
            referencedRelation: "bank_reconciliations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_suggestions: {
        Row: {
          bank_transaction_id: string | null
          company_id: string | null
          confidence_score: number | null
          created_at: string | null
          extrato_chave_pix: string | null
          extrato_cpf_cnpj: string | null
          extrato_data: string | null
          extrato_descricao: string | null
          extrato_nome: string | null
          extrato_valor: number | null
          id: string
          match_reason: string | null
          payable_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
        }
        Insert: {
          bank_transaction_id?: string | null
          company_id?: string | null
          confidence_score?: number | null
          created_at?: string | null
          extrato_chave_pix?: string | null
          extrato_cpf_cnpj?: string | null
          extrato_data?: string | null
          extrato_descricao?: string | null
          extrato_nome?: string | null
          extrato_valor?: number | null
          id?: string
          match_reason?: string | null
          payable_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Update: {
          bank_transaction_id?: string | null
          company_id?: string | null
          confidence_score?: number | null
          created_at?: string | null
          extrato_chave_pix?: string | null
          extrato_cpf_cnpj?: string | null
          extrato_data?: string | null
          extrato_descricao?: string | null
          extrato_nome?: string | null
          extrato_valor?: number | null
          id?: string
          match_reason?: string | null
          payable_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_suggestions_bank_transaction_id_fkey"
            columns: ["bank_transaction_id"]
            isOneToOne: false
            referencedRelation: "bank_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_suggestions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_suggestions_payable_id_fkey"
            columns: ["payable_id"]
            isOneToOne: false
            referencedRelation: "payables"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_attachments: {
        Row: {
          company_id: string | null
          created_at: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          sale_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          sale_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_attachments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_attachments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_checkout_items: {
        Row: {
          barcode_scanned: string | null
          checked_at: string | null
          checked_by: string | null
          company_id: string | null
          created_at: string
          id: string
          quantity_checked: number
          quantity_pending: number
          sale_product_item_id: string
          updated_at: string
        }
        Insert: {
          barcode_scanned?: string | null
          checked_at?: string | null
          checked_by?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          quantity_checked?: number
          quantity_pending?: number
          sale_product_item_id: string
          updated_at?: string
        }
        Update: {
          barcode_scanned?: string | null
          checked_at?: string | null
          checked_by?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          quantity_checked?: number
          quantity_pending?: number
          sale_product_item_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_checkout_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_checkout_items_sale_product_item_id_fkey"
            columns: ["sale_product_item_id"]
            isOneToOne: false
            referencedRelation: "sale_product_items"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_installments: {
        Row: {
          amount: number
          company_id: string | null
          created_at: string
          due_date: string
          id: string
          installment_number: number
          is_paid: boolean | null
          paid_at: string | null
          payment_method: string | null
          sale_id: string
        }
        Insert: {
          amount: number
          company_id?: string | null
          created_at?: string
          due_date: string
          id?: string
          installment_number: number
          is_paid?: boolean | null
          paid_at?: string | null
          payment_method?: string | null
          sale_id: string
        }
        Update: {
          amount?: number
          company_id?: string | null
          created_at?: string
          due_date?: string
          id?: string
          installment_number?: number
          is_paid?: boolean | null
          paid_at?: string | null
          payment_method?: string | null
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_installments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_installments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_pdf_templates: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          template_config: Json | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          template_config?: Json | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          template_config?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_pdf_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_product_items: {
        Row: {
          company_id: string | null
          created_at: string
          details: string | null
          discount_type: string | null
          discount_value: number | null
          id: string
          price_table_id: string | null
          product_id: string | null
          quantity: number
          sale_id: string
          subtotal: number
          unit_price: number
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          details?: string | null
          discount_type?: string | null
          discount_value?: number | null
          id?: string
          price_table_id?: string | null
          product_id?: string | null
          quantity?: number
          sale_id: string
          subtotal?: number
          unit_price?: number
        }
        Update: {
          company_id?: string | null
          created_at?: string
          details?: string | null
          discount_type?: string | null
          discount_value?: number | null
          id?: string
          price_table_id?: string | null
          product_id?: string | null
          quantity?: number
          sale_id?: string
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_product_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_product_items_price_table_id_fkey"
            columns: ["price_table_id"]
            isOneToOne: false
            referencedRelation: "price_tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_product_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_product_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_quote_views: {
        Row: {
          company_id: string | null
          id: string
          ip_address: string | null
          sale_id: string
          user_agent: string | null
          viewed_at: string
        }
        Insert: {
          company_id?: string | null
          id?: string
          ip_address?: string | null
          sale_id: string
          user_agent?: string | null
          viewed_at?: string
        }
        Update: {
          company_id?: string | null
          id?: string
          ip_address?: string | null
          sale_id?: string
          user_agent?: string | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_quote_views_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_quote_views_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_service_items: {
        Row: {
          company_id: string | null
          created_at: string
          details: string | null
          discount_type: string | null
          discount_value: number | null
          id: string
          quantity: number
          sale_id: string
          service_description: string
          service_id: string | null
          subtotal: number
          unit_price: number
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          details?: string | null
          discount_type?: string | null
          discount_value?: number | null
          id?: string
          quantity?: number
          sale_id: string
          service_description: string
          service_id?: string | null
          subtotal?: number
          unit_price?: number
        }
        Update: {
          company_id?: string | null
          created_at?: string
          details?: string | null
          discount_type?: string | null
          discount_value?: number | null
          id?: string
          quantity?: number
          sale_id?: string
          service_description?: string
          service_id?: string | null
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_service_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_service_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_service_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_statuses: {
        Row: {
          checkout_behavior: string
          color: string | null
          company_id: string
          created_at: string
          display_order: number | null
          financial_behavior: string
          id: string
          is_active: boolean
          is_default: boolean | null
          name: string
          stock_behavior: string
          updated_at: string
        }
        Insert: {
          checkout_behavior?: string
          color?: string | null
          company_id: string
          created_at?: string
          display_order?: number | null
          financial_behavior?: string
          id?: string
          is_active?: boolean
          is_default?: boolean | null
          name: string
          stock_behavior?: string
          updated_at?: string
        }
        Update: {
          checkout_behavior?: string
          color?: string | null
          company_id?: string
          created_at?: string
          display_order?: number | null
          financial_behavior?: string
          id?: string
          is_active?: boolean
          is_default?: boolean | null
          name?: string
          stock_behavior?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_statuses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          carrier: string | null
          checkout_status: string | null
          client_id: string | null
          company_id: string
          cost_center_id: string | null
          created_at: string
          created_by: string | null
          delivery_address: Json | null
          delivery_date: string | null
          discount_percent: number | null
          discount_value: number | null
          extra_observation: string | null
          financial_status: string | null
          freight_value: number | null
          id: string
          installments: number | null
          internal_observations: string | null
          nfe_emitted_at: string | null
          nfe_number: string | null
          observations: string | null
          os_gc: string | null
          os_number: string | null
          payment_type: string | null
          products_total: number | null
          quote_number: string | null
          sale_date: string
          sale_number: number
          sales_channel: string | null
          seller_id: string | null
          services_total: number | null
          status_id: string | null
          technician_id: string | null
          total_value: number | null
          tracking_token: string | null
          updated_at: string
        }
        Insert: {
          carrier?: string | null
          checkout_status?: string | null
          client_id?: string | null
          company_id: string
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          delivery_address?: Json | null
          delivery_date?: string | null
          discount_percent?: number | null
          discount_value?: number | null
          extra_observation?: string | null
          financial_status?: string | null
          freight_value?: number | null
          id?: string
          installments?: number | null
          internal_observations?: string | null
          nfe_emitted_at?: string | null
          nfe_number?: string | null
          observations?: string | null
          os_gc?: string | null
          os_number?: string | null
          payment_type?: string | null
          products_total?: number | null
          quote_number?: string | null
          sale_date?: string
          sale_number?: number
          sales_channel?: string | null
          seller_id?: string | null
          services_total?: number | null
          status_id?: string | null
          technician_id?: string | null
          total_value?: number | null
          tracking_token?: string | null
          updated_at?: string
        }
        Update: {
          carrier?: string | null
          checkout_status?: string | null
          client_id?: string | null
          company_id?: string
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          delivery_address?: Json | null
          delivery_date?: string | null
          discount_percent?: number | null
          discount_value?: number | null
          extra_observation?: string | null
          financial_status?: string | null
          freight_value?: number | null
          id?: string
          installments?: number | null
          internal_observations?: string | null
          nfe_emitted_at?: string | null
          nfe_number?: string | null
          observations?: string | null
          os_gc?: string | null
          os_number?: string | null
          payment_type?: string | null
          products_total?: number | null
          quote_number?: string | null
          sale_date?: string
          sale_number?: number
          sales_channel?: string | null
          seller_id?: string | null
          services_total?: number | null
          status_id?: string | null
          technician_id?: string | null
          total_value?: number | null
          tracking_token?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "sale_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      service_order_attachments: {
        Row: {
          company_id: string | null
          created_at: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          service_order_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          service_order_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          service_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_order_attachments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_attachments_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      service_order_checkout_items: {
        Row: {
          barcode_scanned: string | null
          checked_at: string | null
          checked_by: string | null
          company_id: string | null
          created_at: string
          id: string
          quantity_checked: number
          quantity_pending: number
          service_order_product_item_id: string
          updated_at: string
        }
        Insert: {
          barcode_scanned?: string | null
          checked_at?: string | null
          checked_by?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          quantity_checked?: number
          quantity_pending?: number
          service_order_product_item_id: string
          updated_at?: string
        }
        Update: {
          barcode_scanned?: string | null
          checked_at?: string | null
          checked_by?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          quantity_checked?: number
          quantity_pending?: number
          service_order_product_item_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_order_checkout_items_checked_by_fkey"
            columns: ["checked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_checkout_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_checkout_items_service_order_product_item_id_fkey"
            columns: ["service_order_product_item_id"]
            isOneToOne: false
            referencedRelation: "service_order_product_items"
            referencedColumns: ["id"]
          },
        ]
      }
      service_order_installments: {
        Row: {
          amount: number
          company_id: string | null
          created_at: string
          due_date: string
          id: string
          installment_number: number
          is_paid: boolean | null
          paid_at: string | null
          payment_method: string | null
          service_order_id: string
        }
        Insert: {
          amount: number
          company_id?: string | null
          created_at?: string
          due_date: string
          id?: string
          installment_number: number
          is_paid?: boolean | null
          paid_at?: string | null
          payment_method?: string | null
          service_order_id: string
        }
        Update: {
          amount?: number
          company_id?: string | null
          created_at?: string
          due_date?: string
          id?: string
          installment_number?: number
          is_paid?: boolean | null
          paid_at?: string | null
          payment_method?: string | null
          service_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_order_installments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_installments_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      service_order_product_items: {
        Row: {
          company_id: string | null
          created_at: string
          details: string | null
          discount_type: string | null
          discount_value: number | null
          id: string
          price_table_id: string | null
          product_id: string | null
          purchase_price: number | null
          quantity: number
          service_order_id: string
          subtotal: number
          unit_price: number
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          details?: string | null
          discount_type?: string | null
          discount_value?: number | null
          id?: string
          price_table_id?: string | null
          product_id?: string | null
          purchase_price?: number | null
          quantity?: number
          service_order_id: string
          subtotal?: number
          unit_price?: number
        }
        Update: {
          company_id?: string | null
          created_at?: string
          details?: string | null
          discount_type?: string | null
          discount_value?: number | null
          id?: string
          price_table_id?: string | null
          product_id?: string | null
          purchase_price?: number | null
          quantity?: number
          service_order_id?: string
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_order_product_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_product_items_price_table_id_fkey"
            columns: ["price_table_id"]
            isOneToOne: false
            referencedRelation: "price_tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_product_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_product_items_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      service_order_service_items: {
        Row: {
          company_id: string | null
          cost_price: number | null
          created_at: string
          details: string | null
          discount_type: string | null
          discount_value: number | null
          id: string
          quantity: number
          service_description: string
          service_id: string | null
          service_order_id: string
          subtotal: number
          unit_price: number
        }
        Insert: {
          company_id?: string | null
          cost_price?: number | null
          created_at?: string
          details?: string | null
          discount_type?: string | null
          discount_value?: number | null
          id?: string
          quantity?: number
          service_description: string
          service_id?: string | null
          service_order_id: string
          subtotal?: number
          unit_price?: number
        }
        Update: {
          company_id?: string | null
          cost_price?: number | null
          created_at?: string
          details?: string | null
          discount_type?: string | null
          discount_value?: number | null
          id?: string
          quantity?: number
          service_description?: string
          service_id?: string | null
          service_order_id?: string
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_order_service_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_service_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_service_items_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      service_order_statuses: {
        Row: {
          checkout_behavior: string
          color: string | null
          company_id: string
          created_at: string
          display_order: number | null
          financial_behavior: string
          id: string
          is_active: boolean
          is_default: boolean | null
          name: string
          opens_field_activity: boolean | null
          stock_behavior: string
          updated_at: string
        }
        Insert: {
          checkout_behavior?: string
          color?: string | null
          company_id: string
          created_at?: string
          display_order?: number | null
          financial_behavior?: string
          id?: string
          is_active?: boolean
          is_default?: boolean | null
          name: string
          opens_field_activity?: boolean | null
          stock_behavior?: string
          updated_at?: string
        }
        Update: {
          checkout_behavior?: string
          color?: string | null
          company_id?: string
          created_at?: string
          display_order?: number | null
          financial_behavior?: string
          id?: string
          is_active?: boolean
          is_default?: boolean | null
          name?: string
          opens_field_activity?: boolean | null
          stock_behavior?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_order_statuses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      service_orders: {
        Row: {
          carrier: string | null
          checkout_status: string | null
          client_id: string | null
          company_id: string
          cost_center_id: string | null
          created_at: string
          created_by: string | null
          delivery_address: Json | null
          delivery_date: string | null
          diagnosis: string | null
          discount_percent: number | null
          discount_value: number | null
          equipment_brand: string | null
          equipment_id: string | null
          equipment_model: string | null
          equipment_serial: string | null
          equipment_type: string | null
          estimated_duration: number | null
          external_service_cost: number | null
          field_order_id: string | null
          field_sync_status: string | null
          field_synced_at: string | null
          field_task_id: string | null
          financial_status: string | null
          finished_at: string | null
          freight_value: number | null
          id: string
          installments: number | null
          internal_observations: string | null
          labor_cost: number | null
          nfe_emitted_at: string | null
          nfe_number: string | null
          observations: string | null
          order_date: string
          order_number: number
          parts_cost: number | null
          payment_type: string | null
          products_total: number | null
          reported_issue: string | null
          sales_channel: string | null
          scheduled_time: string | null
          seller_id: string | null
          service_type_id: string | null
          services_total: number | null
          solution: string | null
          started_at: string | null
          status_id: string | null
          technician_id: string | null
          total_cost: number | null
          total_value: number | null
          tracking_token: string | null
          updated_at: string
          warranty_until: string | null
        }
        Insert: {
          carrier?: string | null
          checkout_status?: string | null
          client_id?: string | null
          company_id: string
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          delivery_address?: Json | null
          delivery_date?: string | null
          diagnosis?: string | null
          discount_percent?: number | null
          discount_value?: number | null
          equipment_brand?: string | null
          equipment_id?: string | null
          equipment_model?: string | null
          equipment_serial?: string | null
          equipment_type?: string | null
          estimated_duration?: number | null
          external_service_cost?: number | null
          field_order_id?: string | null
          field_sync_status?: string | null
          field_synced_at?: string | null
          field_task_id?: string | null
          financial_status?: string | null
          finished_at?: string | null
          freight_value?: number | null
          id?: string
          installments?: number | null
          internal_observations?: string | null
          labor_cost?: number | null
          nfe_emitted_at?: string | null
          nfe_number?: string | null
          observations?: string | null
          order_date?: string
          order_number?: number
          parts_cost?: number | null
          payment_type?: string | null
          products_total?: number | null
          reported_issue?: string | null
          sales_channel?: string | null
          scheduled_time?: string | null
          seller_id?: string | null
          service_type_id?: string | null
          services_total?: number | null
          solution?: string | null
          started_at?: string | null
          status_id?: string | null
          technician_id?: string | null
          total_cost?: number | null
          total_value?: number | null
          tracking_token?: string | null
          updated_at?: string
          warranty_until?: string | null
        }
        Update: {
          carrier?: string | null
          checkout_status?: string | null
          client_id?: string | null
          company_id?: string
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          delivery_address?: Json | null
          delivery_date?: string | null
          diagnosis?: string | null
          discount_percent?: number | null
          discount_value?: number | null
          equipment_brand?: string | null
          equipment_id?: string | null
          equipment_model?: string | null
          equipment_serial?: string | null
          equipment_type?: string | null
          estimated_duration?: number | null
          external_service_cost?: number | null
          field_order_id?: string | null
          field_sync_status?: string | null
          field_synced_at?: string | null
          field_task_id?: string | null
          financial_status?: string | null
          finished_at?: string | null
          freight_value?: number | null
          id?: string
          installments?: number | null
          internal_observations?: string | null
          labor_cost?: number | null
          nfe_emitted_at?: string | null
          nfe_number?: string | null
          observations?: string | null
          order_date?: string
          order_number?: number
          parts_cost?: number | null
          payment_type?: string | null
          products_total?: number | null
          reported_issue?: string | null
          sales_channel?: string | null
          scheduled_time?: string | null
          seller_id?: string | null
          service_type_id?: string | null
          services_total?: number | null
          solution?: string | null
          started_at?: string | null
          status_id?: string | null
          technician_id?: string | null
          total_cost?: number | null
          total_value?: number | null
          tracking_token?: string | null
          updated_at?: string
          warranty_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "service_order_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      service_types: {
        Row: {
          color: string | null
          company_id: string
          created_at: string | null
          default_duration: number | null
          description: string | null
          field_service_id: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          company_id: string
          created_at?: string | null
          default_duration?: number | null
          description?: string | null
          field_service_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string | null
          default_duration?: number | null
          description?: string | null
          field_service_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          code: string
          company_id: string
          created_at: string
          description: string
          id: string
          is_active: boolean | null
          sale_price: number | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          description: string
          id?: string
          is_active?: boolean | null
          sale_price?: number | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean | null
          sale_price?: number | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_locations: {
        Row: {
          aisle: string | null
          code: string
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          level: string | null
          name: string
          shelf: string | null
          updated_at: string
          zone: string | null
        }
        Insert: {
          aisle?: string | null
          code: string
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          level?: string | null
          name: string
          shelf?: string | null
          updated_at?: string
          zone?: string | null
        }
        Update: {
          aisle?: string | null
          code?: string
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          level?: string | null
          name?: string
          shelf?: string | null
          updated_at?: string
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_locations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          calculated_unit_cost: number | null
          company_id: string | null
          cost_breakdown: Json | null
          created_at: string
          created_by: string | null
          freight_allocated: number | null
          id: string
          product_id: string
          quantity: number
          reason: string | null
          reference_id: string | null
          reference_type: string | null
          taxes_credited: number | null
          taxes_included: number | null
          total_value: number | null
          type: string
          unit_price: number | null
        }
        Insert: {
          calculated_unit_cost?: number | null
          company_id?: string | null
          cost_breakdown?: Json | null
          created_at?: string
          created_by?: string | null
          freight_allocated?: number | null
          id?: string
          product_id: string
          quantity: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          taxes_credited?: number | null
          taxes_included?: number | null
          total_value?: number | null
          type: string
          unit_price?: number | null
        }
        Update: {
          calculated_unit_cost?: number | null
          company_id?: string | null
          cost_breakdown?: Json | null
          created_at?: string
          created_by?: string | null
          freight_allocated?: number | null
          id?: string
          product_id?: string
          quantity?: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          taxes_credited?: number | null
          taxes_included?: number | null
          total_value?: number | null
          type?: string
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_bank_accounts: {
        Row: {
          agencia: string | null
          banco: string | null
          company_id: string | null
          conta: string | null
          created_at: string
          id: string
          is_principal: boolean | null
          pessoa_id: string
          pix_key: string | null
          pix_key_type: string | null
          tipo_conta: string | null
          updated_at: string
        }
        Insert: {
          agencia?: string | null
          banco?: string | null
          company_id?: string | null
          conta?: string | null
          created_at?: string
          id?: string
          is_principal?: boolean | null
          pessoa_id: string
          pix_key?: string | null
          pix_key_type?: string | null
          tipo_conta?: string | null
          updated_at?: string
        }
        Update: {
          agencia?: string | null
          banco?: string | null
          company_id?: string | null
          conta?: string | null
          created_at?: string
          id?: string
          is_principal?: boolean | null
          pessoa_id?: string
          pix_key?: string | null
          pix_key_type?: string | null
          tipo_conta?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_bank_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_bank_accounts_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          company_id: string
          complemento: string | null
          cpf_cnpj: string | null
          created_at: string
          email: string | null
          estado: string | null
          id: string
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          is_active: boolean
          logradouro: string | null
          nome_fantasia: string | null
          numero: string | null
          observacoes: string | null
          razao_social: string
          telefone: string | null
          tipo_pessoa: string
          updated_at: string
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          company_id: string
          complemento?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          is_active?: boolean
          logradouro?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          observacoes?: string | null
          razao_social: string
          telefone?: string | null
          tipo_pessoa?: string
          updated_at?: string
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          company_id?: string
          complemento?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          is_active?: boolean
          logradouro?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          observacoes?: string | null
          razao_social?: string
          telefone?: string | null
          tipo_pessoa?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
      user_companies: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_default: boolean
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_default?: boolean
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_default?: boolean
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_companies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_id: string | null
          company_id: string | null
          created_at: string
          email: string
          field_employee_id: string | null
          id: string
          is_active: boolean
          name: string
          permissions: Json | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          auth_id?: string | null
          company_id?: string | null
          created_at?: string
          email: string
          field_employee_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          permissions?: Json | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          auth_id?: string | null
          company_id?: string | null
          created_at?: string
          email?: string
          field_employee_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          permissions?: Json | null
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
      ai_get_clientes_analysis: {
        Args: { p_company_id: string }
        Returns: Json
      }
      ai_get_compras_analysis: { Args: { p_company_id: string }; Returns: Json }
      ai_get_contratos_analysis: {
        Args: { p_company_id: string }
        Returns: Json
      }
      ai_get_financial_dashboard: {
        Args: {
          p_company_id: string
          p_end_date?: string
          p_start_date?: string
        }
        Returns: Json
      }
      ai_get_full_company_overview: {
        Args: { p_company_id: string }
        Returns: Json
      }
      ai_get_inadimplencia_analysis: {
        Args: { p_company_id: string }
        Returns: Json
      }
      ai_get_os_analysis: { Args: { p_company_id: string }; Returns: Json }
      ai_get_produtos_analysis: {
        Args: { p_company_id: string }
        Returns: Json
      }
      ai_get_purchase_suggestions: {
        Args: { p_company_id: string }
        Returns: Json
      }
      ai_get_vendas_analysis: {
        Args: { p_company_id: string; p_periodo_dias?: number }
        Returns: Json
      }
      get_user_companies: { Args: never; Returns: string[] }
      get_user_company_id: { Args: never; Returns: string }
      increment_rule_usage: { Args: { rule_id: string }; Returns: undefined }
      is_admin: { Args: never; Returns: boolean }
      user_belongs_to_company: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      account_nature: "sintetica" | "analitica"
      account_type:
        | "ativo"
        | "passivo"
        | "patrimonio"
        | "receita"
        | "despesa"
        | "custo"
      cliente_status: "ativo" | "inativo" | "bloqueado"
      payment_method_type: "boleto" | "pix" | "transferencia" | "outro"
      payment_status:
        | "open"
        | "ready_to_pay"
        | "submitted_for_approval"
        | "approved"
        | "sent_to_bank"
        | "paid"
        | "failed"
        | "cancelled"
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
      account_nature: ["sintetica", "analitica"],
      account_type: [
        "ativo",
        "passivo",
        "patrimonio",
        "receita",
        "despesa",
        "custo",
      ],
      cliente_status: ["ativo", "inativo", "bloqueado"],
      payment_method_type: ["boleto", "pix", "transferencia", "outro"],
      payment_status: [
        "open",
        "ready_to_pay",
        "submitted_for_approval",
        "approved",
        "sent_to_bank",
        "paid",
        "failed",
        "cancelled",
      ],
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
