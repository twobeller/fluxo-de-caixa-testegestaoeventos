-- Adicionar colunas cpf, email e telefone na tabela vendas_ingressos
ALTER TABLE public.vendas_ingressos
  ADD COLUMN IF NOT EXISTS cpf TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS telefone TEXT;

-- Manter/garantir políticas de RLS idempotentes
DROP POLICY IF EXISTS "authenticated_select_vendas" ON public.vendas_ingressos;
CREATE POLICY "authenticated_select_vendas" ON public.vendas_ingressos
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_vendas" ON public.vendas_ingressos;
CREATE POLICY "authenticated_insert_vendas" ON public.vendas_ingressos
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_vendas" ON public.vendas_ingressos;
CREATE POLICY "authenticated_update_vendas" ON public.vendas_ingressos
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_vendas" ON public.vendas_ingressos;
CREATE POLICY "authenticated_delete_vendas" ON public.vendas_ingressos
  FOR DELETE TO authenticated USING (true);
