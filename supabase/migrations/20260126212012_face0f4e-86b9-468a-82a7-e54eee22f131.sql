-- Corrigir políticas RLS para proposals considerando user_companies
-- O usuário pode ter acesso a múltiplas empresas via user_companies

-- Remover políticas antigas
DROP POLICY IF EXISTS "Users can view their company proposals" ON proposals;
DROP POLICY IF EXISTS "Users can create their company proposals" ON proposals;
DROP POLICY IF EXISTS "Users can update their company proposals" ON proposals;
DROP POLICY IF EXISTS "Users can delete their company proposals" ON proposals;

-- Criar função helper para verificar acesso à empresa
CREATE OR REPLACE FUNCTION public.user_has_company_access(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users u
    WHERE u.auth_id = auth.uid()
    AND (
      u.company_id = p_company_id
      OR EXISTS (
        SELECT 1 FROM user_companies uc
        WHERE uc.user_id = u.id
        AND uc.company_id = p_company_id
      )
    )
  );
$$;

-- Recriar políticas usando a função helper
CREATE POLICY "Users can view their accessible company proposals"
ON proposals FOR SELECT
USING (user_has_company_access(company_id));

CREATE POLICY "Users can create proposals for accessible companies"
ON proposals FOR INSERT
WITH CHECK (user_has_company_access(company_id));

CREATE POLICY "Users can update their accessible company proposals"
ON proposals FOR UPDATE
USING (user_has_company_access(company_id));

CREATE POLICY "Users can delete their accessible company proposals"
ON proposals FOR DELETE
USING (user_has_company_access(company_id));

-- Aplicar mesma correção nas tabelas relacionadas
DROP POLICY IF EXISTS "Users can view their company proposal items" ON proposal_items;
DROP POLICY IF EXISTS "Users can create their company proposal items" ON proposal_items;
DROP POLICY IF EXISTS "Users can update their company proposal items" ON proposal_items;
DROP POLICY IF EXISTS "Users can delete their company proposal items" ON proposal_items;

CREATE POLICY "Users can view proposal items for accessible companies"
ON proposal_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM proposals p
  WHERE p.id = proposal_items.proposal_id
  AND user_has_company_access(p.company_id)
));

CREATE POLICY "Users can create proposal items for accessible companies"
ON proposal_items FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM proposals p
  WHERE p.id = proposal_items.proposal_id
  AND user_has_company_access(p.company_id)
));

CREATE POLICY "Users can update proposal items for accessible companies"
ON proposal_items FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM proposals p
  WHERE p.id = proposal_items.proposal_id
  AND user_has_company_access(p.company_id)
));

CREATE POLICY "Users can delete proposal items for accessible companies"
ON proposal_items FOR DELETE
USING (EXISTS (
  SELECT 1 FROM proposals p
  WHERE p.id = proposal_items.proposal_id
  AND user_has_company_access(p.company_id)
));

-- Aplicar para proposal_sections
DROP POLICY IF EXISTS "Users can view their company proposal sections" ON proposal_sections;
DROP POLICY IF EXISTS "Users can manage their company proposal sections" ON proposal_sections;

CREATE POLICY "Users can view proposal sections for accessible companies"
ON proposal_sections FOR SELECT
USING (EXISTS (
  SELECT 1 FROM proposals p
  WHERE p.id = proposal_sections.proposal_id
  AND user_has_company_access(p.company_id)
));

CREATE POLICY "Users can manage proposal sections for accessible companies"
ON proposal_sections FOR ALL
USING (EXISTS (
  SELECT 1 FROM proposals p
  WHERE p.id = proposal_sections.proposal_id
  AND user_has_company_access(p.company_id)
));

-- Aplicar para proposal_images
DROP POLICY IF EXISTS "Users can view their company proposal images" ON proposal_images;
DROP POLICY IF EXISTS "Users can manage their company proposal images" ON proposal_images;

CREATE POLICY "Users can view proposal images for accessible companies"
ON proposal_images FOR SELECT
USING (EXISTS (
  SELECT 1 FROM proposals p
  WHERE p.id = proposal_images.proposal_id
  AND user_has_company_access(p.company_id)
));

CREATE POLICY "Users can manage proposal images for accessible companies"
ON proposal_images FOR ALL
USING (EXISTS (
  SELECT 1 FROM proposals p
  WHERE p.id = proposal_images.proposal_id
  AND user_has_company_access(p.company_id)
));

-- Aplicar para proposal_terms
DROP POLICY IF EXISTS "Users can view their company proposal terms" ON proposal_terms;
DROP POLICY IF EXISTS "Users can manage their company proposal terms" ON proposal_terms;

CREATE POLICY "Users can view proposal terms for accessible companies"
ON proposal_terms FOR SELECT
USING (EXISTS (
  SELECT 1 FROM proposals p
  WHERE p.id = proposal_terms.proposal_id
  AND user_has_company_access(p.company_id)
));

CREATE POLICY "Users can manage proposal terms for accessible companies"
ON proposal_terms FOR ALL
USING (EXISTS (
  SELECT 1 FROM proposals p
  WHERE p.id = proposal_terms.proposal_id
  AND user_has_company_access(p.company_id)
));

-- Aplicar para proposal_company_settings
DROP POLICY IF EXISTS "Users can view their company proposal settings" ON proposal_company_settings;
DROP POLICY IF EXISTS "Users can create their company proposal settings" ON proposal_company_settings;
DROP POLICY IF EXISTS "Users can update their company proposal settings" ON proposal_company_settings;

CREATE POLICY "Users can view proposal settings for accessible companies"
ON proposal_company_settings FOR SELECT
USING (user_has_company_access(company_id));

CREATE POLICY "Users can create proposal settings for accessible companies"
ON proposal_company_settings FOR INSERT
WITH CHECK (user_has_company_access(company_id));

CREATE POLICY "Users can update proposal settings for accessible companies"
ON proposal_company_settings FOR UPDATE
USING (user_has_company_access(company_id));

-- Aplicar para proposal_term_templates
DROP POLICY IF EXISTS "Users can view their company term templates" ON proposal_term_templates;
DROP POLICY IF EXISTS "Users can manage their company term templates" ON proposal_term_templates;

CREATE POLICY "Users can view term templates for accessible companies"
ON proposal_term_templates FOR SELECT
USING (user_has_company_access(company_id));

CREATE POLICY "Users can manage term templates for accessible companies"
ON proposal_term_templates FOR ALL
USING (user_has_company_access(company_id));

-- Aplicar para proposal_audit
DROP POLICY IF EXISTS "Users can view their company proposal audit logs" ON proposal_audit;
DROP POLICY IF EXISTS "Users can create proposal audit logs" ON proposal_audit;

CREATE POLICY "Users can view proposal audit for accessible companies"
ON proposal_audit FOR SELECT
USING (EXISTS (
  SELECT 1 FROM proposals p
  WHERE p.id = proposal_audit.proposal_id
  AND user_has_company_access(p.company_id)
));

CREATE POLICY "Users can create proposal audit for accessible companies"
ON proposal_audit FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM proposals p
  WHERE p.id = proposal_audit.proposal_id
  AND user_has_company_access(p.company_id)
));

-- Aplicar para proposal_generated_files
DROP POLICY IF EXISTS "Users can view their company proposal files" ON proposal_generated_files;
DROP POLICY IF EXISTS "Users can manage their company proposal files" ON proposal_generated_files;

CREATE POLICY "Users can view proposal files for accessible companies"
ON proposal_generated_files FOR SELECT
USING (EXISTS (
  SELECT 1 FROM proposals p
  WHERE p.id = proposal_generated_files.proposal_id
  AND user_has_company_access(p.company_id)
));

CREATE POLICY "Users can manage proposal files for accessible companies"
ON proposal_generated_files FOR ALL
USING (EXISTS (
  SELECT 1 FROM proposals p
  WHERE p.id = proposal_generated_files.proposal_id
  AND user_has_company_access(p.company_id)
));