export type CategoriaTransacao =
  | 'Venda Direta'
  | 'Investimento'
  | 'Bilheteria'
  | 'Cartão'
  | 'Pagamento Fornecedor'
  | 'Despesa Variável'

export const CATEGORIAS_TRANSACOES: CategoriaTransacao[] = [
  'Venda Direta',
  'Investimento',
  'Bilheteria',
  'Cartão',
  'Pagamento Fornecedor',
  'Despesa Variável',
]

export type ResponsavelTransacao = 'Gutto' | 'Ruan' | 'PC' | 'Junior' | 'Evento'

export const RESPONSAVEIS_TRANSACOES: ResponsavelTransacao[] = [
  'Gutto',
  'Ruan',
  'PC',
  'Junior',
  'Evento',
]

export interface Transacao {
  id: string
  data: string // YYYY-MM-DD
  descricao: string
  categoria: CategoriaTransacao | string
  entrada: number
  saida: number
  responsavel: ResponsavelTransacao | string
  saldo_acumulado: number
  comprovante_url?: string | null
  observacoes?: string | null
  criado_por: string
  criado_em: string
}

export interface NovaTransacaoPayload {
  data: string
  descricao: string
  categoria: CategoriaTransacao | string
  entrada: number
  saida: number
  responsavel: ResponsavelTransacao | string
  comprovante_url?: string | null
  observacoes?: string | null
}

export type FormaPagamentoVenda = 'PIX' | 'Cartão' | 'Dinheiro'

export const FORMAS_PAGAMENTO_VENDA: FormaPagamentoVenda[] = ['PIX', 'Cartão', 'Dinheiro']

export interface VendaIngresso {
  id: string
  nome_comprador: string
  cpf?: string | null
  email?: string | null
  telefone?: string | null
  qtd_ingressos: number
  valor_unitario: number
  valor_total: number
  nome_pagador: string
  forma_pagamento: string
  comprovante_url?: string | null
  transacao_id?: string | null
  criado_em: string
}

export interface NovaVendaIngressoPayload {
  nome_comprador: string
  cpf?: string | null
  email?: string | null
  telefone?: string | null
  qtd_ingressos: number
  valor_unitario: number
  valor_total: number
  nome_pagador?: string | null
  forma_pagamento: FormaPagamentoVenda | string
  comprovante_url?: string | null
}
