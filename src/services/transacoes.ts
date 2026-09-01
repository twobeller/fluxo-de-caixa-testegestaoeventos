import { supabase } from '@/lib/supabase/client'
import {
  Transacao,
  NovaTransacaoPayload,
  FormaPagamentoVenda,
  VendaIngresso,
  NovaVendaIngressoPayload,
} from '@/types/fluxo-caixa'

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

export async function registrarVendaDiretaIngresso(
  payload: NovaVendaIngressoPayload,
  userId: string,
  dataTransacao?: string,
): Promise<{ transacao: Transacao; venda: VendaIngresso }> {
  const dataHoje = dataTransacao || new Date().toISOString().split('T')[0]
  const compradorNome = payload.nome_comprador.trim()
  const pagadorNome = payload.nome_pagador?.trim() || compradorNome
  const valorTotal = Number((payload.qtd_ingressos * payload.valor_unitario).toFixed(2))

  // 1. Criar transação de Entrada no Fluxo de Caixa
  const observacoesDetalhes = [
    `Comprador: ${compradorNome}`,
    payload.cpf ? `CPF: ${payload.cpf.trim()}` : null,
    payload.email ? `Email: ${payload.email.trim()}` : null,
    payload.telefone ? `Tel: ${payload.telefone.trim()}` : null,
    pagadorNome !== compradorNome ? `Pagador: ${pagadorNome}` : null,
    `Qtd: ${payload.qtd_ingressos}x R$ ${payload.valor_unitario.toFixed(2)}`,
    `Pagamento: ${payload.forma_pagamento}`,
  ]
    .filter(Boolean)
    .join(' | ')

  const transacaoResult = await criarTransacao(
    {
      data: dataHoje,
      descricao: `VENDA DIRETA - ${compradorNome}`,
      categoria: 'Venda Direta',
      entrada: valorTotal,
      saida: 0,
      responsavel: 'Evento',
      comprovante_url: payload.comprovante_url || null,
      observacoes: observacoesDetalhes,
    },
    userId,
  )

  // 2. Registrar na tabela vendas_ingressos
  const { data: vendaData, error: vendaError } = await supabase
    .from('vendas_ingressos')
    .insert([
      {
        nome_comprador: compradorNome,
        cpf: payload.cpf?.trim() || null,
        email: payload.email?.trim() || null,
        telefone: payload.telefone?.trim() || null,
        qtd_ingressos: payload.qtd_ingressos,
        valor_unitario: payload.valor_unitario,
        valor_total: valorTotal,
        nome_pagador: pagadorNome,
        forma_pagamento: payload.forma_pagamento,
        comprovante_url: payload.comprovante_url || null,
        transacao_id: transacaoResult.id,
      } as any,
    ])
    .select()
    .single()

  if (vendaError) {
    console.error('Erro ao registrar venda de ingressos:', vendaError)
    throw vendaError
  }

  return {
    transacao: transacaoResult,
    venda: {
      id: vendaData.id,
      nome_comprador: vendaData.nome_comprador,
      cpf: (vendaData as any).cpf || null,
      email: (vendaData as any).email || null,
      telefone: (vendaData as any).telefone || null,
      qtd_ingressos: Number(vendaData.qtd_ingressos),
      valor_unitario: Number(vendaData.valor_unitario),
      valor_total: Number(vendaData.valor_total),
      nome_pagador: vendaData.nome_pagador,
      forma_pagamento: vendaData.forma_pagamento,
      comprovante_url: vendaData.comprovante_url,
      transacao_id: vendaData.transacao_id,
      criado_em: vendaData.criado_em,
    },
  }
}

export interface DadosComprovanteExtraidos {
  valor?: number | null
  data?: string | null
  nome_pagador?: string | null
  forma_pagamento?: FormaPagamentoVenda | string | null
  raw?: Record<string, any>
}

export async function processarComprovanteComIA(
  storagePathOuUrl: string,
): Promise<DadosComprovanteExtraidos> {
  // 1. Obter URL pública ou assinada válida acessível pela Edge Function
  const publicOrSignedUrl = await obterUrlComprovante(storagePathOuUrl)
  if (!publicOrSignedUrl) {
    throw new Error('Não foi possível obter o endereço do arquivo do comprovante.')
  }

  // 2. Chamar a Edge Function "ler-comprovante"
  const { data, error } = await supabase.functions.invoke('ler-comprovante', {
    body: {
      imageUrl: publicOrSignedUrl,
      url: publicOrSignedUrl,
    },
  })

  if (error) {
    console.error('Erro retornado pela Edge Function ler-comprovante:', error)
    throw new Error(
      'Não foi possível processar o comprovante com IA. Verifique a imagem e tente novamente.',
    )
  }

  if (!data) {
    throw new Error('Nenhuma informação foi retornada pela análise do comprovante.')
  }

  if (data.error) {
    throw new Error(
      typeof data.error === 'string' ? data.error : 'Falha na extração dos dados do comprovante.',
    )
  }

  // 3. Normalizar os dados retornados
  // O retorno pode conter chaves variadas dependendo do Gemini (ex: valor, data, nome_pagador, nome do pagador, forma_pagamento, forma de pagamento)
  const result: Record<string, any> = typeof data === 'object' ? data : {}

  // Extrair valor
  let valorExtraido: number | null = null
  const valorRaw =
    result.valor ??
    result.valor_total ??
    result.valor_pago ??
    result.valorPago ??
    result.value ??
    result.amount

  if (typeof valorRaw === 'number') {
    valorExtraido = valorRaw
  } else if (typeof valorRaw === 'string') {
    // Ex: "R$ 150,00" ou "150.00" ou "1.250,50"
    const cleaned = valorRaw.replace(/R\$/gi, '').replace(/\s/g, '').trim()
    if (cleaned.includes(',') && cleaned.includes('.')) {
      // Formato brasileiro com ponto de milhar 1.250,50
      valorExtraido = parseFloat(cleaned.replace(/\./g, '').replace(',', '.'))
    } else if (cleaned.includes(',')) {
      valorExtraido = parseFloat(cleaned.replace(',', '.'))
    } else {
      valorExtraido = parseFloat(cleaned)
    }
  }

  // Extrair data (esperado YYYY-MM-DD no input date do HTML)
  let dataExtraida: string | null = null
  const dataRaw = result.data ?? result.date ?? result.data_pagamento ?? result.dataPagamento
  if (typeof dataRaw === 'string') {
    const limpa = dataRaw.trim()
    // Caso DD/MM/YYYY ou DD-MM-YYYY
    const brMatch = limpa.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/)
    if (brMatch) {
      const dia = brMatch[1].padStart(2, '0')
      const mes = brMatch[2].padStart(2, '0')
      const ano = brMatch[3]
      dataExtraida = `${ano}-${mes}-${dia}`
    } else if (limpa.match(/^\d{4}-\d{2}-\d{2}/)) {
      dataExtraida = limpa.slice(0, 10)
    }
  }

  // Extrair nome do pagador
  let pagadorExtraido: string | null = null
  const pagadorRaw =
    result.nome_pagador ??
    result['nome do pagador'] ??
    result.nomeDoPagador ??
    result.pagador ??
    result.payer ??
    result.nome_cliente ??
    result.cliente ??
    result.nome
  if (typeof pagadorRaw === 'string' && pagadorRaw.trim()) {
    pagadorExtraido = pagadorRaw.trim()
  }

  // Extrair forma de pagamento (PIX/cartão/dinheiro)
  let formaExtraida: FormaPagamentoVenda | string | null = null
  const formaRaw = (
    result.forma_pagamento ??
    result['forma de pagamento'] ??
    result.formaDePagamento ??
    result.metodo_pagamento ??
    result.metodo ??
    result.tipo_pagamento ??
    ''
  )
    .toString()
    .toLowerCase()

  if (formaRaw.includes('pix')) {
    formaExtraida = 'PIX'
  } else if (
    formaRaw.includes('cart') ||
    formaRaw.includes('crédito') ||
    formaRaw.includes('debito') ||
    formaRaw.includes('débito')
  ) {
    formaExtraida = 'Cartão'
  } else if (
    formaRaw.includes('dinheiro') ||
    formaRaw.includes('espécie') ||
    formaRaw.includes('cash')
  ) {
    formaExtraida = 'Dinheiro'
  }

  return {
    valor: valorExtraido && !isNaN(valorExtraido) ? valorExtraido : null,
    data: dataExtraida,
    nome_pagador: pagadorExtraido,
    forma_pagamento: formaExtraida,
    raw: result,
  }
}

export async function listarVendasIngressos(): Promise<VendaIngresso[]> {
  const { data, error } = await supabase
    .from('vendas_ingressos')
    .select('*')
    .order('criado_em', { ascending: false })

  if (error) {
    console.error('Erro ao listar vendas de ingressos:', error)
    throw error
  }

  return (data || []).map((v) => ({
    id: v.id,
    nome_comprador: v.nome_comprador,
    cpf: (v as any).cpf || null,
    email: (v as any).email || null,
    telefone: (v as any).telefone || null,
    qtd_ingressos: Number(v.qtd_ingressos) || 0,
    valor_unitario: Number(v.valor_unitario) || 0,
    valor_total: Number(v.valor_total) || 0,
    nome_pagador: v.nome_pagador,
    forma_pagamento: v.forma_pagamento,
    comprovante_url: v.comprovante_url,
    transacao_id: v.transacao_id,
    criado_em: v.criado_em,
  }))
}
