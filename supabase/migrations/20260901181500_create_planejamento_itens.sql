-- Criação da tabela planejamento_itens
CREATE TABLE IF NOT EXISTS public.planejamento_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria TEXT NOT NULL,
  item TEXT NOT NULL,
  responsavel TEXT NOT NULL,
  quantidade NUMERIC NOT NULL DEFAULT 1,
  valor_unitario NUMERIC NOT NULL DEFAULT 0,
  valor_final NUMERIC NOT NULL DEFAULT 0,
  gutto NUMERIC NOT NULL DEFAULT 0,
  ruan NUMERIC NOT NULL DEFAULT 0,
  pc NUMERIC NOT NULL DEFAULT 0,
  junior NUMERIC NOT NULL DEFAULT 0,
  evento NUMERIC NOT NULL DEFAULT 0,
  total_pago NUMERIC NOT NULL DEFAULT 0,
  falta_pagar NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Pendente',
  criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para otimização de consultas e ordenação
CREATE INDEX IF NOT EXISTS idx_planejamento_itens_categoria ON public.planejamento_itens (categoria);
CREATE INDEX IF NOT EXISTS idx_planejamento_itens_status ON public.planejamento_itens (status);
CREATE INDEX IF NOT EXISTS idx_planejamento_itens_responsavel ON public.planejamento_itens (responsavel);
CREATE INDEX IF NOT EXISTS idx_planejamento_itens_criado_em ON public.planejamento_itens (criado_em);

-- Habilitar RLS
ALTER TABLE public.planejamento_itens ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para usuários autenticados (mesmo padrão do projeto)
DROP POLICY IF EXISTS "authenticated_select_planejamento" ON public.planejamento_itens;
CREATE POLICY "authenticated_select_planejamento" ON public.planejamento_itens
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_planejamento" ON public.planejamento_itens;
CREATE POLICY "authenticated_insert_planejamento" ON public.planejamento_itens
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_planejamento" ON public.planejamento_itens;
CREATE POLICY "authenticated_update_planejamento" ON public.planejamento_itens
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_planejamento" ON public.planejamento_itens;
CREATE POLICY "authenticated_delete_planejamento" ON public.planejamento_itens
  FOR DELETE TO authenticated USING (true);
