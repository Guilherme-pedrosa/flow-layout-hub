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
      purchase_order_items: {
        Row: {
          cfop: string | null
          created_at: string
          id: string
          ncm: string | null
          product_id: string | null
          purchase_order_id: string
          quantity: number
          total_value: number | null
          unit_price: number | null
          xml_code: string | null
          xml_description: string | null
        }
        Insert: {
          cfop?: string | null
          created_at?: string
          id?: string
          ncm?: string | null
          product_id?: string | null
          purchase_order_id: string
          quantity: number
          total_value?: number | null
          unit_price?: number | null
          xml_code?: string | null
          xml_description?: string | null
        }
        Update: {
          cfop?: string | null
          created_at?: string
          id?: string
          ncm?: string | null
          product_id?: string | null
          purchase_order_id?: string
          quantity?: number
          total_value?: number | null
          unit_price?: number | null
          xml_code?: string | null
          xml_description?: string | null
        }
        Relationships: [
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
          financial_notes: string | null
          id: string
          invoice_date: string | null
          invoice_number: string | null
          invoice_series: string | null
          payment_method: string | null
          status: string | null
          status_id: string | null
          supplier_address: string | null
          supplier_cnpj: string | null
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
          financial_notes?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_series?: string | null
          payment_method?: string | null
          status?: string | null
          status_id?: string | null
          supplier_address?: string | null
          supplier_cnpj?: string | null
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
          financial_notes?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_series?: string | null
          payment_method?: string | null
          status?: string | null
          status_id?: string | null
          supplier_address?: string | null
          supplier_cnpj?: string | null
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
            foreignKeyName: "purchase_orders_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_statuses"
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
          freight_value: number | null
          id: string
          installments: number | null
          internal_observations: string | null
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
          freight_value?: number | null
          id?: string
          installments?: number | null
          internal_observations?: string | null
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
          freight_value?: number | null
          id?: string
          installments?: number | null
          internal_observations?: string | null
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
