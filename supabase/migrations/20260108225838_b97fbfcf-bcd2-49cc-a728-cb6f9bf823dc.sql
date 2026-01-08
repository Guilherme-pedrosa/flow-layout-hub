-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage document types of their company" ON public.document_types;
DROP POLICY IF EXISTS "Users can view document types of their company" ON public.document_types;

-- Create proper policies with WITH CHECK for INSERT/UPDATE
CREATE POLICY "Users can view document types of their company" 
ON public.document_types 
FOR SELECT 
USING (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can insert document types for their company" 
ON public.document_types 
FOR INSERT 
WITH CHECK (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can update document types of their company" 
ON public.document_types 
FOR UPDATE 
USING (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()))
WITH CHECK (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can delete document types of their company" 
ON public.document_types 
FOR DELETE 
USING (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));