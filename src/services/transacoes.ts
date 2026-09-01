import { supabase } from '@/lib/supabase/client'
import { Transacao, NovaTransacaoPayload } from '@/types/fluxo-caixa'

export async function recalcularSaldosAcumulados(): Promise<void> {
  const { data, error } = await supabase
    .from('transacoes')
    .select('id, data, entrada, saida, criado_em')
    .order('data', { ascending: true })
    .order('criado_em', { ascending: true })

  if (error || !data) {
    console.error('Erro ao buscar transações para recalcular saldo:', error)
    return
  }

  let acumulado = 0
  for (const item of data) {
    const ent = Number(item.entrada) || 0
    const sai = Number(item.saida) || 0
    acumulado += ent - sai

    await supabase.from('transacoes').update({ saldo_acumulado: acumulado }).eq('id', item.id)
  }
}

export async function listarTransacoes(): Promise<Transacao[]> {
  const { data, error } = await supabase
    .from('transacoes')
    .select('*')
    .order('data', { ascending: false })
    .order('criado_em', { ascending: false })

  if (error) {
    console.error('Erro ao listar transações:', error)
    throw error
  }

  return (data || []).map((t) => ({
    id: t.id,
    data: t.data,
    descricao: t.descricao,
    categoria: t.categoria,
    entrada: Number(t.entrada) || 0,
    saida: Number(t.saida) || 0,
    responsavel: t.responsavel,
    saldo_acumulado: Number(t.saldo_acumulado) || 0,
    comprovante_url: t.comprovante_url,
    observacoes: t.observacoes,
    criado_por: t.criado_por,
    criado_em: t.criado_em,
  }))
}

export async function buscarTransacaoPorId(id: string): Promise<Transacao | null> {
  const { data, error } = await supabase.from('transacoes').select('*').eq('id', id).single()

  if (error) {
    console.error('Erro ao buscar transação por ID:', error)
    return null
  }

  return {
    id: data.id,
    data: data.data,
    descricao: data.descricao,
    categoria: data.categoria,
    entrada: Number(data.entrada) || 0,
    saida: Number(data.saida) || 0,
    responsavel: data.responsavel,
    saldo_acumulado: Number(data.saldo_acumulado) || 0,
    comprovante_url: data.comprovante_url,
    observacoes: data.observacoes,
    criado_por: data.criado_por,
    criado_em: data.criado_em,
  }
}

export async function criarTransacao(
  payload: NovaTransacaoPayload,
  userId: string,
): Promise<Transacao> {
  const { data, error } = await supabase
    .from('transacoes')
    .insert([
      {
        data: payload.data,
        descricao: payload.descricao.trim(),
        categoria: payload.categoria,
        entrada: payload.entrada || 0,
        saida: payload.saida || 0,
        responsavel: payload.responsavel,
        saldo_acumulado: 0,
        comprovante_url: payload.comprovante_url || null,
        observacoes: payload.observacoes?.trim() || null,
        criado_por: userId,
      },
    ])
    .select()
    .single()

  if (error) {
    console.error('Erro ao inserir transação:', error)
    throw error
  }

  await recalcularSaldosAcumulados()

  const atualizado = await buscarTransacaoPorId(data.id)
  return (
    atualizado || {
      id: data.id,
      data: data.data,
      descricao: data.descricao,
      categoria: data.categoria,
      entrada: Number(data.entrada) || 0,
      saida: Number(data.saida) || 0,
      responsavel: data.responsavel,
      saldo_acumulado: Number(data.saldo_acumulado) || 0,
      comprovante_url: data.comprovante_url,
      observacoes: data.observacoes,
      criado_por: data.criado_por,
      criado_em: data.criado_em,
    }
  )
}

export async function atualizarTransacao(
  id: string,
  payload: Partial<NovaTransacaoPayload>,
): Promise<Transacao> {
  const updateData: {
    data?: string
    descricao?: string
    categoria?: string
    entrada?: number
    saida?: number
    responsavel?: string
    comprovante_url?: string | null
    observacoes?: string | null
  } = {}

  if (payload.data !== undefined) updateData.data = payload.data
  if (payload.descricao !== undefined) updateData.descricao = payload.descricao.trim()
  if (payload.categoria !== undefined) updateData.categoria = payload.categoria
  if (payload.entrada !== undefined) updateData.entrada = payload.entrada
  if (payload.saida !== undefined) updateData.saida = payload.saida
  if (payload.responsavel !== undefined) updateData.responsavel = payload.responsavel
  if (payload.comprovante_url !== undefined) updateData.comprovante_url = payload.comprovante_url
  if (payload.observacoes !== undefined)
    updateData.observacoes = payload.observacoes?.trim() || null

  const { error } = await supabase.from('transacoes').update(updateData).eq('id', id)

  if (error) {
    console.error('Erro ao atualizar transação:', error)
    throw error
  }

  await recalcularSaldosAcumulados()

  const atualizado = await buscarTransacaoPorId(id)
  if (!atualizado) throw new Error('Transação não encontrada após atualização')
  return atualizado
}

export async function excluirTransacao(id: string, comprovanteUrl?: string | null): Promise<void> {
  if (comprovanteUrl) {
    await removerComprovanteStorage(comprovanteUrl)
  }

  const { error } = await supabase.from('transacoes').delete().eq('id', id)

  if (error) {
    console.error('Erro ao excluir transação:', error)
    throw error
  }

  await recalcularSaldosAcumulados()
}

export async function uploadComprovante(file: File, userId: string): Promise<string> {
  const fileExt = file.name.split('.').pop()
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const filePath = `${userId}/${Date.now()}_${cleanFileName}`

  const { error: uploadError } = await supabase.storage
    .from('comprovantes')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type || (fileExt === 'pdf' ? 'application/pdf' : 'image/jpeg'),
    })

  if (uploadError) {
    console.error('Erro no upload do comprovante:', uploadError)
    throw uploadError
  }

  return filePath
}

export async function removerComprovanteStorage(pathOrUrl: string): Promise<void> {
  try {
    let cleanPath = pathOrUrl
    if (pathOrUrl.includes('/comprovantes/')) {
      cleanPath = pathOrUrl.split('/comprovantes/')[1]
    }
    await supabase.storage.from('comprovantes').remove([cleanPath])
  } catch (err) {
    console.warn('Falha não-bloqueante ao remover comprovante do bucket:', err)
  }
}

export async function obterUrlComprovante(pathOrUrl: string): Promise<string> {
  if (!pathOrUrl) return ''

  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return pathOrUrl
  }

  const { data: signedData, error: signedError } = await supabase.storage
    .from('comprovantes')
    .createSignedUrl(pathOrUrl, 3600)

  if (!signedError && signedData?.signedUrl) {
    return signedData.signedUrl
  }

  const { data: publicData } = supabase.storage.from('comprovantes').getPublicUrl(pathOrUrl)

  return publicData.publicUrl
}
