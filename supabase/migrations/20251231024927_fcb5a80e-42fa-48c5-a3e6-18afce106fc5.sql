-- =====================================================
-- PROMPT 1: CORREÇÃO URGENTE DE RLS POLICIES
-- =====================================================

-- =====================================================
-- PARTE 1: Adicionar company_id nas tabelas que faltam
-- =====================================================

-- Tabela clientes
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Tabela cliente_contatos
ALTER TABLE public.cliente_contatos
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Tabela cliente_historico  
ALTER TABLE public.cliente_historico
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Tabela products
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Tabela purchase_orders
ALTER TABLE public.purchase_orders
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Tabela purchase_order_items
ALTER TABLE public.purchase_order_items
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Tabela sale_product_items
ALTER TABLE public.sale_product_items
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Tabela sale_service_items
ALTER TABLE public.sale_service_items
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Tabela sale_checkout_items
ALTER TABLE public.sale_checkout_items
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Tabela sale_installments
ALTER TABLE public.sale_installments
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Tabela sale_attachments
ALTER TABLE public.sale_attachments
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Tabela stock_movements
ALTER TABLE public.stock_movements
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Tabela pessoa_contatos
ALTER TABLE public.pessoa_contatos
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Tabela pessoa_enderecos
ALTER TABLE public.pessoa_enderecos
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Tabela pessoa_historico
ALTER TABLE public.pessoa_historico
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Tabela service_order_service_items
ALTER TABLE public.service_order_service_items
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Tabela service_order_product_items
ALTER TABLE public.service_order_product_items
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Tabela service_order_checkout_items
ALTER TABLE public.service_order_checkout_items
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Tabela service_order_installments
ALTER TABLE public.service_order_installments
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Tabela service_order_attachments
ALTER TABLE public.service_order_attachments
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Tabela supplier_bank_accounts
ALTER TABLE public.supplier_bank_accounts
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Tabela suppliers
ALTER TABLE public.suppliers
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Tabela product_suppliers
ALTER TABLE public.product_suppliers
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Tabela product_images
ALTER TABLE public.product_images
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Tabela product_stock_locations
ALTER TABLE public.product_stock_locations
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Tabela product_cost_history
ALTER TABLE public.product_cost_history
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Tabela product_categories
ALTER TABLE public.product_categories
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Tabela product_brands
ALTER TABLE public.product_brands
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Tabela product_subgroups
ALTER TABLE public.product_subgroups
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Tabela stock_locations
ALTER TABLE public.stock_locations
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Tabela quick_categories
ALTER TABLE public.quick_categories
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Tabela purchase_order_statuses
ALTER TABLE public.purchase_order_statuses
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Tabela purchase_order_installments
ALTER TABLE public.purchase_order_installments
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Tabela purchase_order_receipts
ALTER TABLE public.purchase_order_receipts
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Tabela purchase_order_receipt_items
ALTER TABLE public.purchase_order_receipt_items
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Tabela purchase_order_receipt_logs
ALTER TABLE public.purchase_order_receipt_logs
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Tabela purchase_order_divergences
ALTER TABLE public.purchase_order_divergences
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Tabela purchase_order_limits
ALTER TABLE public.purchase_order_limits
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Tabela reconciliation_suggestions
ALTER TABLE public.reconciliation_suggestions
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Tabela sale_statuses
ALTER TABLE public.sale_statuses
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Tabela sale_pdf_templates
ALTER TABLE public.sale_pdf_templates
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Tabela sale_quote_views
ALTER TABLE public.sale_quote_views
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Tabela service_order_statuses
ALTER TABLE public.service_order_statuses
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Tabela system_settings
ALTER TABLE public.system_settings
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Tabela price_tables
ALTER TABLE public.price_tables
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- =====================================================
-- PARTE 2: Remover policies inseguras (USING true)
-- =====================================================

-- accounts_receivable
DROP POLICY IF EXISTS "Acesso público para accounts_receivable" ON public.accounts_receivable;

-- ai_insights
DROP POLICY IF EXISTS "Anyone can insert insights" ON public.ai_insights;
DROP POLICY IF EXISTS "Anyone can update insights" ON public.ai_insights;
DROP POLICY IF EXISTS "Anyone can view insights" ON public.ai_insights;

-- audit_logs
DROP POLICY IF EXISTS "Acesso público para audit_logs" ON public.audit_logs;

-- bank_accounts
DROP POLICY IF EXISTS "Acesso público para bank_accounts" ON public.bank_accounts;

-- bank_reconciliation_items
DROP POLICY IF EXISTS "Acesso público para bank_reconciliation_items" ON public.bank_reconciliation_items;

-- bank_reconciliations
DROP POLICY IF EXISTS "Acesso público para bank_reconciliations" ON public.bank_reconciliations;

-- bank_transactions
DROP POLICY IF EXISTS "Acesso público para bank_transactions" ON public.bank_transactions;

-- chart_of_accounts
DROP POLICY IF EXISTS "Acesso público para chart_of_accounts" ON public.chart_of_accounts;

-- checkout_audit
DROP POLICY IF EXISTS "Permitir inserção de logs" ON public.checkout_audit;
DROP POLICY IF EXISTS "Permitir leitura de logs de checkout" ON public.checkout_audit;

-- checkout_pdfs
DROP POLICY IF EXISTS "Permitir inserção de PDFs" ON public.checkout_pdfs;
DROP POLICY IF EXISTS "Permitir leitura de PDFs" ON public.checkout_pdfs;

-- cliente_contatos
DROP POLICY IF EXISTS "Acesso público para contatos" ON public.cliente_contatos;

-- cliente_historico
DROP POLICY IF EXISTS "Acesso público para histórico" ON public.cliente_historico;

-- clientes
DROP POLICY IF EXISTS "Acesso público para clientes" ON public.clientes;

-- companies
DROP POLICY IF EXISTS "Acesso público para companies" ON public.companies;

-- cost_centers
DROP POLICY IF EXISTS "Acesso público para cost_centers" ON public.cost_centers;

-- financial_situations
DROP POLICY IF EXISTS "Acesso público para financial_situations" ON public.financial_situations;

-- inter_company_transfers
DROP POLICY IF EXISTS "Acesso público para inter_company_transfers" ON public.inter_company_transfers;

-- inter_credentials
DROP POLICY IF EXISTS "Permitir acesso a inter_credentials" ON public.inter_credentials;

-- inter_dda_boletos
DROP POLICY IF EXISTS "Acesso público para inter_dda_boletos" ON public.inter_dda_boletos;

-- inter_pix_payments
DROP POLICY IF EXISTS "Acesso público para inter_pix_payments" ON public.inter_pix_payments;

-- nfe_itens
DROP POLICY IF EXISTS "Allow all access to nfe_itens" ON public.nfe_itens;

-- nfe_logs
DROP POLICY IF EXISTS "Allow all access to nfe_logs" ON public.nfe_logs;

-- notas_fiscais
DROP POLICY IF EXISTS "Allow all access to notas_fiscais" ON public.notas_fiscais;

-- payables
DROP POLICY IF EXISTS "Acesso público para payables" ON public.payables;

-- payment_audit_logs
DROP POLICY IF EXISTS "Acesso público para payment_audit_logs" ON public.payment_audit_logs;

-- payment_methods
DROP POLICY IF EXISTS "Acesso público para payment_methods" ON public.payment_methods;

-- pessoa_contatos
DROP POLICY IF EXISTS "Acesso público para pessoa_contatos" ON public.pessoa_contatos;

-- pessoa_enderecos
DROP POLICY IF EXISTS "Acesso público para pessoa_enderecos" ON public.pessoa_enderecos;

-- pessoa_historico
DROP POLICY IF EXISTS "Acesso público para pessoa_historico" ON public.pessoa_historico;

-- pessoas
DROP POLICY IF EXISTS "Acesso público para pessoas" ON public.pessoas;

-- price_table_items
DROP POLICY IF EXISTS "Acesso público para price_table_items" ON public.price_table_items;

-- price_tables
DROP POLICY IF EXISTS "Acesso público para price_tables" ON public.price_tables;

-- products
DROP POLICY IF EXISTS "Acesso público para products" ON public.products;

-- product_groups
DROP POLICY IF EXISTS "Acesso público para product_groups" ON public.product_groups;

-- purchase_orders
DROP POLICY IF EXISTS "Acesso público para purchase_orders" ON public.purchase_orders;

-- purchase_order_items
DROP POLICY IF EXISTS "Acesso público para purchase_order_items" ON public.purchase_order_items;

-- purchase_order_statuses
DROP POLICY IF EXISTS "Acesso público para purchase_order_statuses" ON public.purchase_order_statuses;

-- sales
DROP POLICY IF EXISTS "Acesso público para sales" ON public.sales;

-- services
DROP POLICY IF EXISTS "Acesso público para services" ON public.services;

-- service_orders
DROP POLICY IF EXISTS "Acesso público para service_orders" ON public.service_orders;

-- stock_movements
DROP POLICY IF EXISTS "Acesso público para stock_movements" ON public.stock_movements;

-- stock_locations
DROP POLICY IF EXISTS "Acesso público para stock_locations" ON public.stock_locations;

-- users
DROP POLICY IF EXISTS "Acesso público para users" ON public.users;

-- user_companies
DROP POLICY IF EXISTS "Acesso público para user_companies" ON public.user_companies;

-- suppliers
DROP POLICY IF EXISTS "Acesso público para suppliers" ON public.suppliers;

-- supplier_bank_accounts
DROP POLICY IF EXISTS "Acesso público para supplier_bank_accounts" ON public.supplier_bank_accounts;

-- product_suppliers
DROP POLICY IF EXISTS "Acesso público para product_suppliers" ON public.product_suppliers;

-- product_images
DROP POLICY IF EXISTS "Acesso público para product_images" ON public.product_images;

-- product_stock_locations
DROP POLICY IF EXISTS "Acesso público para product_stock_locations" ON public.product_stock_locations;

-- product_cost_history
DROP POLICY IF EXISTS "Acesso público para product_cost_history" ON public.product_cost_history;

-- product_categories
DROP POLICY IF EXISTS "Acesso público para product_categories" ON public.product_categories;

-- product_brands
DROP POLICY IF EXISTS "Acesso público para product_brands" ON public.product_brands;

-- product_subgroups
DROP POLICY IF EXISTS "Acesso público para product_subgroups" ON public.product_subgroups;

-- quick_categories
DROP POLICY IF EXISTS "Acesso público para quick_categories" ON public.quick_categories;

-- purchase_order_installments
DROP POLICY IF EXISTS "Acesso público para purchase_order_installments" ON public.purchase_order_installments;

-- purchase_order_receipts
DROP POLICY IF EXISTS "Acesso público para purchase_order_receipts" ON public.purchase_order_receipts;

-- purchase_order_receipt_items
DROP POLICY IF EXISTS "Acesso público para purchase_order_receipt_items" ON public.purchase_order_receipt_items;

-- purchase_order_receipt_logs
DROP POLICY IF EXISTS "Acesso público para purchase_order_receipt_logs" ON public.purchase_order_receipt_logs;

-- purchase_order_divergences
DROP POLICY IF EXISTS "Acesso público para purchase_order_divergences" ON public.purchase_order_divergences;

-- purchase_order_limits
DROP POLICY IF EXISTS "Acesso público para purchase_order_limits" ON public.purchase_order_limits;

-- reconciliation_suggestions
DROP POLICY IF EXISTS "Acesso público para reconciliation_suggestions" ON public.reconciliation_suggestions;

-- sale_statuses
DROP POLICY IF EXISTS "Acesso público para sale_statuses" ON public.sale_statuses;

-- sale_pdf_templates
DROP POLICY IF EXISTS "Acesso público para sale_pdf_templates" ON public.sale_pdf_templates;

-- sale_quote_views
DROP POLICY IF EXISTS "Acesso público para sale_quote_views" ON public.sale_quote_views;

-- sale_product_items
DROP POLICY IF EXISTS "Acesso público para sale_product_items" ON public.sale_product_items;

-- sale_service_items
DROP POLICY IF EXISTS "Acesso público para sale_service_items" ON public.sale_service_items;

-- sale_checkout_items
DROP POLICY IF EXISTS "Acesso público para sale_checkout_items" ON public.sale_checkout_items;

-- sale_installments
DROP POLICY IF EXISTS "Acesso público para sale_installments" ON public.sale_installments;

-- sale_attachments
DROP POLICY IF EXISTS "Acesso público para sale_attachments" ON public.sale_attachments;

-- service_order_statuses
DROP POLICY IF EXISTS "Acesso público para service_order_statuses" ON public.service_order_statuses;

-- service_order_service_items
DROP POLICY IF EXISTS "Acesso público para service_order_service_items" ON public.service_order_service_items;

-- service_order_product_items
DROP POLICY IF EXISTS "Acesso público para service_order_product_items" ON public.service_order_product_items;

-- service_order_checkout_items
DROP POLICY IF EXISTS "Acesso público para service_order_checkout_items" ON public.service_order_checkout_items;

-- service_order_installments
DROP POLICY IF EXISTS "Acesso público para service_order_installments" ON public.service_order_installments;

-- service_order_attachments
DROP POLICY IF EXISTS "Acesso público para service_order_attachments" ON public.service_order_attachments;

-- system_settings
DROP POLICY IF EXISTS "Acesso público para system_settings" ON public.system_settings;

-- =====================================================
-- PARTE 3: Criar novas policies seguras
-- =====================================================

-- accounts_receivable
CREATE POLICY "Usuários acessam accounts_receivable da empresa"
ON public.accounts_receivable FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- ai_insights
CREATE POLICY "Usuários acessam ai_insights da empresa"
ON public.ai_insights FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- audit_logs
CREATE POLICY "Usuários acessam audit_logs da empresa"
ON public.audit_logs FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- bank_accounts
CREATE POLICY "Usuários acessam bank_accounts da empresa"
ON public.bank_accounts FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- bank_reconciliations
CREATE POLICY "Usuários acessam bank_reconciliations da empresa"
ON public.bank_reconciliations FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- bank_reconciliation_items (via join)
CREATE POLICY "Usuários acessam bank_reconciliation_items da empresa"
ON public.bank_reconciliation_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.bank_reconciliations br
    WHERE br.id = bank_reconciliation_items.reconciliation_id
    AND br.company_id IN (SELECT get_user_companies())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bank_reconciliations br
    WHERE br.id = bank_reconciliation_items.reconciliation_id
    AND br.company_id IN (SELECT get_user_companies())
  )
);

-- bank_transactions
CREATE POLICY "Usuários acessam bank_transactions da empresa"
ON public.bank_transactions FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- chart_of_accounts
CREATE POLICY "Usuários acessam chart_of_accounts da empresa"
ON public.chart_of_accounts FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- checkout_audit
CREATE POLICY "Permitir inserção de checkout_audit"
ON public.checkout_audit FOR INSERT
WITH CHECK (true);

CREATE POLICY "Usuários leem checkout_audit"
ON public.checkout_audit FOR SELECT
USING (true);

-- checkout_pdfs
CREATE POLICY "Permitir inserção de checkout_pdfs"
ON public.checkout_pdfs FOR INSERT
WITH CHECK (true);

CREATE POLICY "Usuários leem checkout_pdfs"
ON public.checkout_pdfs FOR SELECT
USING (true);

-- clientes
CREATE POLICY "Usuários acessam clientes da empresa"
ON public.clientes FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- cliente_contatos
CREATE POLICY "Usuários acessam cliente_contatos da empresa"
ON public.cliente_contatos FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- cliente_historico
CREATE POLICY "Usuários acessam cliente_historico da empresa"
ON public.cliente_historico FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- companies
CREATE POLICY "Usuários acessam suas companies"
ON public.companies FOR ALL
USING (id IN (SELECT get_user_companies()))
WITH CHECK (id IN (SELECT get_user_companies()));

-- cost_centers
CREATE POLICY "Usuários acessam cost_centers da empresa"
ON public.cost_centers FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- financial_situations
CREATE POLICY "Usuários acessam financial_situations da empresa"
ON public.financial_situations FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- inter_company_transfers
CREATE POLICY "Usuários acessam inter_company_transfers da empresa"
ON public.inter_company_transfers FOR ALL
USING (source_company_id IN (SELECT get_user_companies()) OR target_company_id IN (SELECT get_user_companies()))
WITH CHECK (source_company_id IN (SELECT get_user_companies()));

-- inter_credentials
CREATE POLICY "Usuários acessam inter_credentials da empresa"
ON public.inter_credentials FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- inter_dda_boletos
CREATE POLICY "Usuários acessam inter_dda_boletos da empresa"
ON public.inter_dda_boletos FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- inter_pix_payments
CREATE POLICY "Usuários acessam inter_pix_payments da empresa"
ON public.inter_pix_payments FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- notas_fiscais
CREATE POLICY "Usuários acessam notas_fiscais da empresa"
ON public.notas_fiscais FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- nfe_itens (via join)
CREATE POLICY "Usuários acessam nfe_itens da empresa"
ON public.nfe_itens FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.notas_fiscais nf
    WHERE nf.id = nfe_itens.nota_fiscal_id
    AND nf.company_id IN (SELECT get_user_companies())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.notas_fiscais nf
    WHERE nf.id = nfe_itens.nota_fiscal_id
    AND nf.company_id IN (SELECT get_user_companies())
  )
);

-- nfe_logs
CREATE POLICY "Usuários acessam nfe_logs da empresa"
ON public.nfe_logs FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.notas_fiscais nf
    WHERE nf.id = nfe_logs.nota_fiscal_id
    AND nf.company_id IN (SELECT get_user_companies())
  )
  OR nota_fiscal_id IS NULL
)
WITH CHECK (true);

-- payables
CREATE POLICY "Usuários acessam payables da empresa"
ON public.payables FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- payment_audit_logs (via join)
CREATE POLICY "Usuários acessam payment_audit_logs da empresa"
ON public.payment_audit_logs FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.payables p
    WHERE p.id = payment_audit_logs.payable_id
    AND p.company_id IN (SELECT get_user_companies())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.payables p
    WHERE p.id = payment_audit_logs.payable_id
    AND p.company_id IN (SELECT get_user_companies())
  )
);

-- payment_methods
CREATE POLICY "Usuários acessam payment_methods da empresa"
ON public.payment_methods FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- pessoas
CREATE POLICY "Usuários acessam pessoas da empresa"
ON public.pessoas FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- pessoa_contatos
CREATE POLICY "Usuários acessam pessoa_contatos da empresa"
ON public.pessoa_contatos FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- pessoa_enderecos
CREATE POLICY "Usuários acessam pessoa_enderecos da empresa"
ON public.pessoa_enderecos FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- pessoa_historico
CREATE POLICY "Usuários acessam pessoa_historico da empresa"
ON public.pessoa_historico FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- products
CREATE POLICY "Usuários acessam products da empresa"
ON public.products FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- product_groups
CREATE POLICY "Usuários acessam product_groups da empresa"
ON public.product_groups FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- product_categories
CREATE POLICY "Usuários acessam product_categories da empresa"
ON public.product_categories FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- product_brands
CREATE POLICY "Usuários acessam product_brands da empresa"
ON public.product_brands FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- product_subgroups
CREATE POLICY "Usuários acessam product_subgroups da empresa"
ON public.product_subgroups FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- product_suppliers
CREATE POLICY "Usuários acessam product_suppliers da empresa"
ON public.product_suppliers FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- product_images
CREATE POLICY "Usuários acessam product_images da empresa"
ON public.product_images FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- product_stock_locations
CREATE POLICY "Usuários acessam product_stock_locations da empresa"
ON public.product_stock_locations FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- product_cost_history
CREATE POLICY "Usuários acessam product_cost_history da empresa"
ON public.product_cost_history FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- purchase_orders
CREATE POLICY "Usuários acessam purchase_orders da empresa"
ON public.purchase_orders FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- purchase_order_items
CREATE POLICY "Usuários acessam purchase_order_items da empresa"
ON public.purchase_order_items FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- purchase_order_statuses
CREATE POLICY "Usuários acessam purchase_order_statuses da empresa"
ON public.purchase_order_statuses FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- purchase_order_installments
CREATE POLICY "Usuários acessam purchase_order_installments da empresa"
ON public.purchase_order_installments FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- purchase_order_receipts
CREATE POLICY "Usuários acessam purchase_order_receipts da empresa"
ON public.purchase_order_receipts FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- purchase_order_receipt_items
CREATE POLICY "Usuários acessam purchase_order_receipt_items da empresa"
ON public.purchase_order_receipt_items FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- purchase_order_receipt_logs
CREATE POLICY "Usuários acessam purchase_order_receipt_logs da empresa"
ON public.purchase_order_receipt_logs FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- purchase_order_divergences
CREATE POLICY "Usuários acessam purchase_order_divergences da empresa"
ON public.purchase_order_divergences FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- purchase_order_limits
CREATE POLICY "Usuários acessam purchase_order_limits da empresa"
ON public.purchase_order_limits FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- sales
CREATE POLICY "Usuários acessam sales da empresa"
ON public.sales FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- sale_product_items
CREATE POLICY "Usuários acessam sale_product_items da empresa"
ON public.sale_product_items FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- sale_service_items
CREATE POLICY "Usuários acessam sale_service_items da empresa"
ON public.sale_service_items FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- sale_checkout_items
CREATE POLICY "Usuários acessam sale_checkout_items da empresa"
ON public.sale_checkout_items FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- sale_installments
CREATE POLICY "Usuários acessam sale_installments da empresa"
ON public.sale_installments FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- sale_attachments
CREATE POLICY "Usuários acessam sale_attachments da empresa"
ON public.sale_attachments FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- sale_statuses
CREATE POLICY "Usuários acessam sale_statuses da empresa"
ON public.sale_statuses FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- sale_pdf_templates
CREATE POLICY "Usuários acessam sale_pdf_templates da empresa"
ON public.sale_pdf_templates FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- sale_quote_views (leitura pública para links de orçamento)
CREATE POLICY "Leitura pública de sale_quote_views"
ON public.sale_quote_views FOR SELECT
USING (true);

CREATE POLICY "Inserção de sale_quote_views"
ON public.sale_quote_views FOR INSERT
WITH CHECK (true);

-- services
CREATE POLICY "Usuários acessam services da empresa"
ON public.services FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- service_orders
CREATE POLICY "Usuários acessam service_orders da empresa"
ON public.service_orders FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- service_order_statuses
CREATE POLICY "Usuários acessam service_order_statuses da empresa"
ON public.service_order_statuses FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- service_order_service_items
CREATE POLICY "Usuários acessam service_order_service_items da empresa"
ON public.service_order_service_items FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- service_order_product_items
CREATE POLICY "Usuários acessam service_order_product_items da empresa"
ON public.service_order_product_items FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- service_order_checkout_items
CREATE POLICY "Usuários acessam service_order_checkout_items da empresa"
ON public.service_order_checkout_items FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- service_order_installments
CREATE POLICY "Usuários acessam service_order_installments da empresa"
ON public.service_order_installments FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- service_order_attachments
CREATE POLICY "Usuários acessam service_order_attachments da empresa"
ON public.service_order_attachments FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- stock_movements
CREATE POLICY "Usuários acessam stock_movements da empresa"
ON public.stock_movements FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- stock_locations
CREATE POLICY "Usuários acessam stock_locations da empresa"
ON public.stock_locations FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- suppliers
CREATE POLICY "Usuários acessam suppliers da empresa"
ON public.suppliers FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- supplier_bank_accounts
CREATE POLICY "Usuários acessam supplier_bank_accounts da empresa"
ON public.supplier_bank_accounts FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- quick_categories
CREATE POLICY "Usuários acessam quick_categories da empresa"
ON public.quick_categories FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- reconciliation_suggestions
CREATE POLICY "Usuários acessam reconciliation_suggestions da empresa"
ON public.reconciliation_suggestions FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- system_settings
CREATE POLICY "Usuários acessam system_settings da empresa"
ON public.system_settings FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- price_tables
CREATE POLICY "Usuários acessam price_tables da empresa"
ON public.price_tables FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- price_table_items (via join)
CREATE POLICY "Usuários acessam price_table_items da empresa"
ON public.price_table_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.price_tables pt
    WHERE pt.id = price_table_items.price_table_id
    AND pt.company_id IN (SELECT get_user_companies())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.price_tables pt
    WHERE pt.id = price_table_items.price_table_id
    AND pt.company_id IN (SELECT get_user_companies())
  )
);

-- users
CREATE POLICY "Usuários acessam users da empresa"
ON public.users FOR ALL
USING (
  auth_id = auth.uid() 
  OR company_id IN (SELECT get_user_companies())
)
WITH CHECK (
  auth_id = auth.uid() 
  OR company_id IN (SELECT get_user_companies())
);

-- user_companies
CREATE POLICY "Usuários acessam user_companies da empresa"
ON public.user_companies FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));