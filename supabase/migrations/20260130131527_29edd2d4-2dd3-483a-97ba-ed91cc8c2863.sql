-- Dropar políticas atuais de proposals
DROP POLICY IF EXISTS "Users can create proposals for accessible companies" ON proposals;
DROP POLICY IF EXISTS "Users can view their accessible company proposals" ON proposals;
DROP POLICY IF EXISTS "Users can update their accessible company proposals" ON proposals;
DROP POLICY IF EXISTS "Users can delete their accessible company proposals" ON proposals;

-- Recriar políticas com lógica inline (sem usar função helper)
-- INSERT: verificar via subquery direta
CREATE POLICY "Proposals INSERT"
ON proposals FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.auth_id = auth.uid()
    AND (
      u.company_id = proposals.company_id
      OR EXISTS (
        SELECT 1 FROM user_companies uc
        WHERE uc.user_id = u.id
        AND uc.company_id = proposals.company_id
      )
    )
  )
);

-- SELECT
CREATE POLICY "Proposals SELECT"
ON proposals FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.auth_id = auth.uid()
    AND (
      u.company_id = proposals.company_id
      OR EXISTS (
        SELECT 1 FROM user_companies uc
        WHERE uc.user_id = u.id
        AND uc.company_id = proposals.company_id
      )
    )
  )
);

-- UPDATE
CREATE POLICY "Proposals UPDATE"
ON proposals FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.auth_id = auth.uid()
    AND (
      u.company_id = proposals.company_id
      OR EXISTS (
        SELECT 1 FROM user_companies uc
        WHERE uc.user_id = u.id
        AND uc.company_id = proposals.company_id
      )
    )
  )
);

-- DELETE
CREATE POLICY "Proposals DELETE"
ON proposals FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.auth_id = auth.uid()
    AND (
      u.company_id = proposals.company_id
      OR EXISTS (
        SELECT 1 FROM user_companies uc
        WHERE uc.user_id = u.id
        AND uc.company_id = proposals.company_id
      )
    )
  )
);