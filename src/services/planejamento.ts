import { supabase } from '@/lib/supabase/client'
import { ItemPlanejamento, NovoItemPlanejamentoPayload } from '@/types/fluxo-caixa'

// Tipagem de registro do banco para planejamento_itens
interface PlanejamentoItemRow {
  id: string
  categoria: string
  item: string
  responsavel: string
  quantidade: number | string
  valor_unitario: number | string
  valor_final: number | string
  gutto: number | string
  ruan: number | string
  pc: number | string
  junior: number | string
  evento: number | string
  total_pago: number | string
  falta_pagar: number | string
  status: string
  criado_por?: string | null
  criado_em: string
  atualizado_em: string
}

export async function listarItensPlanejamento(): Promise<ItemPlanejamento[]> {
  const { data, error } = await (supabase as any)
    .from('planejamento_itens')
    .select('*')
    .order('criado_em', { ascending: false })

  if (error) {
    console.error('Erro ao listar itens de planejamento:', error)
    throw new Error(error.message || 'Erro ao buscar itens de planejamento.')
  }

  const rows = (data || []) as PlanejamentoItemRow[]

  return rows.map((item) => ({
    id: item.id,
    categoria: item.categoria,
    item: item.item,
    responsavel: item.responsavel,
    quantidade: Number(item.quantidade) || 0,
    valor_unitario: Number(item.valor_unitario) || 0,
    valor_final: Number(item.valor_final) || 0,
    gutto: Number(item.gutto) || 0,
    ruan: Number(item.ruan) || 0,
    pc: Number(item.pc) || 0,
    junior: Number(item.junior) || 0,
    evento: Number(item.evento) || 0,
    total_pago: Number(item.total_pago) || 0,
    falta_pagar: Number(item.falta_pagar) || 0,
    status: item.status,
    criado_por: item.criado_por,
    criado_em: item.criado_em,
    atualizado_em: item.atualizado_em,
  }))
}

export async function buscarItemPlanejamentoPorId(id: string): Promise<ItemPlanejamento> {
  const { data, error } = await (supabase as any)
    .from('planejamento_itens')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Erro ao buscar item de planejamento por ID:', error)
    throw new Error(error.message || 'Item não encontrado.')
  }

  const item = data as PlanejamentoItemRow

  return {
    id: item.id,
    categoria: item.categoria,
    item: item.item,
    responsavel: item.responsavel,
    quantidade: Number(item.quantidade) || 0,
    valor_unitario: Number(item.valor_unitario) || 0,
    valor_final: Number(item.valor_final) || 0,
    gutto: Number(item.gutto) || 0,
    ruan: Number(item.ruan) || 0,
    pc: Number(item.pc) || 0,
    junior: Number(item.junior) || 0,
    evento: Number(item.evento) || 0,
    total_pago: Number(item.total_pago) || 0,
    falta_pagar: Number(item.falta_pagar) || 0,
    status: item.status,
    criado_por: item.criado_por,
    criado_em: item.criado_em,
    atualizado_em: item.atualizado_em,
  }
}

export async function criarItemPlanejamento(
  payload: NovoItemPlanejamentoPayload,
  userId?: string,
): Promise<ItemPlanejamento> {
  const { data, error } = await (supabase as any)
    .from('planejamento_itens')
    .insert([
      {
        categoria: payload.categoria,
        item: payload.item,
        responsavel: payload.responsavel,
        quantidade: payload.quantidade,
        valor_unitario: payload.valor_unitario,
        valor_final: payload.valor_final,
        gutto: payload.gutto,
        ruan: payload.ruan,
        pc: payload.pc,
        junior: payload.junior,
        evento: payload.evento,
        total_pago: payload.total_pago,
        falta_pagar: payload.falta_pagar,
        status: payload.status,
        criado_por: userId || null,
        atualizado_em: new Date().toISOString(),
      },
    ])
    .select()
    .single()

  if (error) {
    console.error('Erro ao criar item de planejamento:', error)
    throw new Error(error.message || 'Erro ao criar item de planejamento.')
  }

  const item = data as PlanejamentoItemRow

  return {
    id: item.id,
    categoria: item.categoria,
    item: item.item,
    responsavel: item.responsavel,
    quantidade: Number(item.quantidade) || 0,
    valor_unitario: Number(item.valor_unitario) || 0,
    valor_final: Number(item.valor_final) || 0,
    gutto: Number(item.gutto) || 0,
    ruan: Number(item.ruan) || 0,
    pc: Number(item.pc) || 0,
    junior: Number(item.junior) || 0,
    evento: Number(item.evento) || 0,
    total_pago: Number(item.total_pago) || 0,
    falta_pagar: Number(item.falta_pagar) || 0,
    status: item.status,
    criado_por: item.criado_por,
    criado_em: item.criado_em,
    atualizado_em: item.atualizado_em,
  }
}

export async function atualizarItemPlanejamento(
  id: string,
  payload: Partial<NovoItemPlanejamentoPayload>,
): Promise<ItemPlanejamento> {
  const { data, error } = await (supabase as any)
    .from('planejamento_itens')
    .update({
      ...payload,
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Erro ao atualizar item de planejamento:', error)
    throw new Error(error.message || 'Erro ao atualizar item de planejamento.')
  }

  const item = data as PlanejamentoItemRow

  return {
    id: item.id,
    categoria: item.categoria,
    item: item.item,
    responsavel: item.responsavel,
    quantidade: Number(item.quantidade) || 0,
    valor_unitario: Number(item.valor_unitario) || 0,
    valor_final: Number(item.valor_final) || 0,
    gutto: Number(item.gutto) || 0,
    ruan: Number(item.ruan) || 0,
    pc: Number(item.pc) || 0,
    junior: Number(item.junior) || 0,
    evento: Number(item.evento) || 0,
    total_pago: Number(item.total_pago) || 0,
    falta_pagar: Number(item.falta_pagar) || 0,
    status: item.status,
    criado_por: item.criado_por,
    criado_em: item.criado_em,
    atualizado_em: item.atualizado_em,
  }
}

export async function excluirItemPlanejamento(id: string): Promise<void> {
  const { error } = await (supabase as any).from('planejamento_itens').delete().eq('id', id)

  if (error) {
    console.error('Erro ao excluir item de planejamento:', error)
    throw new Error(error.message || 'Erro ao excluir item.')
  }
}
