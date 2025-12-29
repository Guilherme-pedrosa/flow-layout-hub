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
      chart_of_accounts: {
        Row: {
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
      payables: {
        Row: {
          amount: number
          bank_account_id: string | null
          chart_account_id: string | null
          company_id: string
          cost_center_id: string | null
          created_at: string
          description: string | null
          document_number: string | null
          document_type: string
          due_date: string
          forecast_converted_at: string | null
          id: string
          is_forecast: boolean | null
          is_paid: boolean | null
          notes: string | null
          paid_amount: number | null
          paid_at: string | null
          payment_method: string | null
          purchase_order_id: string | null
          reconciliation_id: string | null
          supplier_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          chart_account_id?: string | null
          company_id: string
          cost_center_id?: string | null
          created_at?: string
          description?: string | null
          document_number?: string | null
          document_type?: string
          due_date: string
          forecast_converted_at?: string | null
          id?: string
          is_forecast?: boolean | null
          is_paid?: boolean | null
          notes?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          payment_method?: string | null
          purchase_order_id?: string | null
          reconciliation_id?: string | null
          supplier_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          chart_account_id?: string | null
          company_id?: string
          cost_center_id?: string | null
          created_at?: string
          description?: string | null
          document_number?: string | null
          document_type?: string
          due_date?: string
          forecast_converted_at?: string | null
          id?: string
          is_forecast?: boolean | null
          is_paid?: boolean | null
          notes?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          payment_method?: string | null
          purchase_order_id?: string | null
          reconciliation_id?: string | null
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payables_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
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
            foreignKeyName: "payables_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      pessoa_contatos: {
        Row: {
          cargo: string | null
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
            foreignKeyName: "pessoa_contatos_pessoa_id_fkey"
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
          created_at: string
          id: string
          pessoa_id: string
          usuario_id: string | null
          valor_anterior: string | null
          valor_novo: string | null
        }
        Insert: {
          campo_alterado: string
          created_at?: string
          id?: string
          pessoa_id: string
          usuario_id?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Update: {
          campo_alterado?: string
          created_at?: string
          id?: string
          pessoa_id?: string
          usuario_id?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Relationships: [
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
      product_images: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          is_main: boolean | null
          product_id: string
          url: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_main?: boolean | null
          product_id: string
          url: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_main?: boolean | null
          product_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_suppliers: {
        Row: {
          created_at: string
          id: string
          product_id: string
          supplier_cnpj: string | null
          supplier_code: string | null
          supplier_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          supplier_cnpj?: string | null
          supplier_code?: string | null
          supplier_name: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          supplier_cnpj?: string | null
          supplier_code?: string | null
          supplier_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_suppliers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          accessory_expenses: number | null
          barcode: string | null
          benefit_code: string | null
          cest: string | null
          code: string
          controls_stock: boolean | null
          created_at: string
          description: string
          description_long: string | null
          extra_fields: Json | null
          fci_number: string | null
          final_cost: number | null
          gross_weight: number | null
          has_composition: boolean | null
          has_invoice: boolean | null
          has_variations: boolean | null
          height: number | null
          id: string
          is_active: boolean
          is_pdv_available: boolean | null
          is_sold_separately: boolean | null
          length: number | null
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
          unit: string | null
          unit_conversions: Json | null
          updated_at: string
          weight: number | null
          width: number | null
        }
        Insert: {
          accessory_expenses?: number | null
          barcode?: string | null
          benefit_code?: string | null
          cest?: string | null
          code: string
          controls_stock?: boolean | null
          created_at?: string
          description: string
          description_long?: string | null
          extra_fields?: Json | null
          fci_number?: string | null
          final_cost?: number | null
          gross_weight?: number | null
          has_composition?: boolean | null
          has_invoice?: boolean | null
          has_variations?: boolean | null
          height?: number | null
          id?: string
          is_active?: boolean
          is_pdv_available?: boolean | null
          is_sold_separately?: boolean | null
          length?: number | null
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
          unit?: string | null
          unit_conversions?: Json | null
          updated_at?: string
          weight?: number | null
          width?: number | null
        }
        Update: {
          accessory_expenses?: number | null
          barcode?: string | null
          benefit_code?: string | null
          cest?: string | null
          code?: string
          controls_stock?: boolean | null
          created_at?: string
          description?: string
          description_long?: string | null
          extra_fields?: Json | null
          fci_number?: string | null
          final_cost?: number | null
          gross_weight?: number | null
          has_composition?: boolean | null
          has_invoice?: boolean | null
          has_variations?: boolean | null
          height?: number | null
          id?: string
          is_active?: boolean
          is_pdv_available?: boolean | null
          is_sold_separately?: boolean | null
          length?: number | null
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
          unit?: string | null
          unit_conversions?: Json | null
          updated_at?: string
          weight?: number | null
          width?: number | null
        }
        Relationships: []
      }
      purchase_order_divergences: {
        Row: {
          actual_value: string | null
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
      purchase_order_items: {
        Row: {
          cfop: string | null
          chart_account_id: string | null
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
          xml_code: string | null
          xml_description: string | null
        }
        Insert: {
          cfop?: string | null
          chart_account_id?: string | null
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
          xml_code?: string | null
          xml_description?: string | null
        }
        Update: {
          cfop?: string | null
          chart_account_id?: string | null
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
          nfe_date: string | null
          nfe_imported_at: string | null
          nfe_key: string | null
          nfe_number: string | null
          nfe_series: string | null
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
          nfe_date?: string | null
          nfe_imported_at?: string | null
          nfe_key?: string | null
          nfe_number?: string | null
          nfe_series?: string | null
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
          nfe_date?: string | null
          nfe_imported_at?: string | null
          nfe_key?: string | null
          nfe_number?: string | null
          nfe_series?: string | null
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
            referencedRelation: "suppliers"
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
      sale_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          sale_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          sale_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          sale_id?: string
        }
        Relationships: [
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
          created_at?: string
          id?: string
          quantity_checked?: number
          quantity_pending?: number
          sale_product_item_id?: string
          updated_at?: string
        }
        Relationships: [
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
          id: string
          ip_address: string | null
          sale_id: string
          user_agent: string | null
          viewed_at: string
        }
        Insert: {
          id?: string
          ip_address?: string | null
          sale_id: string
          user_agent?: string | null
          viewed_at?: string
        }
        Update: {
          id?: string
          ip_address?: string | null
          sale_id?: string
          user_agent?: string | null
          viewed_at?: string
        }
        Relationships: [
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
          created_at: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          service_order_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          service_order_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          service_order_id?: string
        }
        Relationships: [
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
          equipment_model: string | null
          equipment_serial: string | null
          equipment_type: string | null
          external_service_cost: number | null
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
          seller_id: string | null
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
          equipment_model?: string | null
          equipment_serial?: string | null
          equipment_type?: string | null
          external_service_cost?: number | null
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
          seller_id?: string | null
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
          equipment_model?: string | null
          equipment_serial?: string | null
          equipment_type?: string | null
          external_service_cost?: number | null
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
          seller_id?: string | null
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
            foreignKeyName: "service_orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "users"
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
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          product_id: string
          quantity: number
          reason: string | null
          reference_id: string | null
          reference_type: string | null
          total_value: number | null
          type: string
          unit_price: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          product_id: string
          quantity: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          total_value?: number | null
          type: string
          unit_price?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          product_id?: string
          quantity?: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          total_value?: number | null
          type?: string
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
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
      users: {
        Row: {
          auth_id: string | null
          company_id: string
          created_at: string
          email: string
          id: string
          is_active: boolean
          name: string
          permissions: Json | null
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
          permissions?: Json | null
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
      get_user_company_id: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      account_type:
        | "ativo"
        | "passivo"
        | "patrimonio"
        | "receita"
        | "despesa"
        | "custo"
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
      account_type: [
        "ativo",
        "passivo",
        "patrimonio",
        "receita",
        "despesa",
        "custo",
      ],
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
