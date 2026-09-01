import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  listarTransacoes,
  criarTransacao,
  atualizarTransacao,
  excluirTransacao,
  obterUrlComprovante,
} from '@/services/transacoes'
import { Transacao, NovaTransacaoPayload } from '@/types/fluxo-caixa'
import { useAuth } from '@/hooks/use-mobile'
import { formatarMoeda, formatarData } from '@/lib/formatters'
import { CountUp } from '@/components/CountUp'
import { ModalTransacao } from '@/components/ModalTransacao'
import { DialogExcluir } from '@/components/DialogExcluir'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  Paperclip,
  ArrowRight,
  Loader2,
  Calendar,
  Pencil,
  Trash2,
  Receipt,
  FileSpreadsheet,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, Legend } from 'recharts'

export default function Index() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [transacoes, setTransacoes] = useState<Transacao[]>([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState<'mes' | 'trimestre' | 'ano' | 'tudo'>('mes')

  // Modal create/edit
  const [modalOpen, setModalOpen] = useState(false)
  const [transacaoParaEditar, setTransacaoParaEditar] = useState<Transacao | null>(null)

  // Dialog delete
  const [dialogExcluirOpen, setDialogExcluirOpen] = useState(false)
  const [transacaoParaExcluir, setTransacaoParaExcluir] = useState<Transacao | null>(null)

  // Load transactions
  const carregarDados = useCallback(async () => {
    setLoading(true)
    try {
      const lista = await listarTransacoes()
      setTransacoes(lista)
    } catch (err) {
      console.error('Erro ao carregar transações:', err)
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar as transações do banco.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregarDados()

    const handleUpdateEvent = () => carregarDados()
    window.addEventListener('fluxo-caixa-updated', handleUpdateEvent)
    return () => window.removeEventListener('fluxo-caixa-updated', handleUpdateEvent)
  }, [carregarDados])

  // Filter by selected period
  const transacoesFiltradas = useMemo(() => {
    if (periodo === 'tudo') return transacoes

    const hoje = new Date()
    const anoAtual = hoje.getFullYear()
    const mesAtual = hoje.getMonth()

    return transacoes.filter((t) => {
      if (!t.data) return false
      const [anoStr, mesStr, diaStr] = t.data.split('-')
      const ano = parseInt(anoStr, 10)
      const mes = parseInt(mesStr, 10) - 1
      const dia = parseInt(diaStr, 10)
      const dataTx = new Date(ano, mes, dia)

      if (periodo === 'mes') {
        return ano === anoAtual && mes === mesAtual
      }
      if (periodo === 'trimestre') {
        const tresMesesAtras = new Date(hoje)
        tresMesesAtras.setMonth(hoje.getMonth() - 3)
        return dataTx >= tresMesesAtras && dataTx <= hoje
      }
      if (periodo === 'ano') {
        return ano === anoAtual
      }
      return true
    })
  }, [transacoes, periodo])

  // Totals
  const { totalEntradas, totalSaidas, saldoPeriodo } = useMemo(() => {
    const entradas = transacoesFiltradas.reduce((acc, t) => acc + (t.entrada || 0), 0)
    const saidas = transacoesFiltradas.reduce((acc, t) => acc + (t.saida || 0), 0)
    return {
      totalEntradas: entradas,
      totalSaidas: saidas,
      saldoPeriodo: entradas - saidas,
    }
  }, [transacoesFiltradas])

  // General cumulative balance across ALL transactions
  const saldoGeralAtual = useMemo(() => {
    if (transacoes.length === 0) return 0
    // Transacoes is ordered data desc, so first item has latest balance if ordered chronologically
    // Calculate sum of all
    const ent = transacoes.reduce((acc, t) => acc + (t.entrada || 0), 0)
    const sai = transacoes.reduce((acc, t) => acc + (t.saida || 0), 0)
    return ent - sai
  }, [transacoes])

  // Chart data: daily grouped income vs expense
  const chartData = useMemo(() => {
    const map = new Map<string, { data: string; label: string; entradas: number; saidas: number }>()

    // Sort chronologically
    const ordenadas = [...transacoesFiltradas].sort((a, b) => a.data.localeCompare(b.data))

    ordenadas.forEach((t) => {
      const dataKey = t.data
      const [ano, mes, dia] = dataKey.split('-')
      const label = `${dia}/${mes}`

      if (!map.has(dataKey)) {
        map.set(dataKey, { data: dataKey, label, entradas: 0, saidas: 0 })
      }

      const item = map.get(dataKey)!
      item.entradas += t.entrada || 0
      item.saidas += t.saida || 0
    })

    return Array.from(map.values())
  }, [transacoesFiltradas])

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { nome: string; total: number; entradas: number; saidas: number }>()

    transacoesFiltradas.forEach((t) => {
      const cat = t.categoria || 'Outros'
      if (!map.has(cat)) {
        map.set(cat, { nome: cat, total: 0, entradas: 0, saidas: 0 })
      }
      const item = map.get(cat)!
      item.total += (t.entrada || 0) + (t.saida || 0)
      item.entradas += t.entrada || 0
      item.saidas += t.saida || 0
    })

    const lista = Array.from(map.values()).sort((a, b) => b.total - a.total)
    const maxTotal = lista.length > 0 ? Math.max(...lista.map((c) => c.total)) : 1

    return lista.map((item) => ({
      ...item,
      percent: maxTotal > 0 ? (item.total / maxTotal) * 100 : 0,
    }))
  }, [transacoesFiltradas])

  // Recent 5 transactions
  const transacoesRecentes = useMemo(() => {
    return transacoes.slice(0, 5)
  }, [transacoes])

  // Handlers
  const handleOpenNewModal = () => {
    setTransacaoParaEditar(null)
    setModalOpen(true)
  }

  const handleOpenEditModal = (t: Transacao) => {
    setTransacaoParaEditar(t)
    setModalOpen(true)
  }

  const handleOpenDeleteDialog = (t: Transacao) => {
    setTransacaoParaExcluir(t)
    setDialogExcluirOpen(true)
  }

  const handleSaveTransaction = async (payload: NovaTransacaoPayload, id?: string) => {
    if (!user) return
    if (id) {
      await atualizarTransacao(id, payload)
    } else {
      await criarTransacao(payload, user.id)
    }
    await carregarDados()
  }

  const handleConfirmDelete = async () => {
    if (!transacaoParaExcluir) return
    try {
      await excluirTransacao(transacaoParaExcluir.id, transacaoParaExcluir.comprovante_url)
      toast({
        title: 'Transação excluída',
        description: 'A movimentação foi removida com sucesso.',
      })
      await carregarDados()
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível remover a transação.',
        variant: 'destructive',
      })
    }
  }

  const handleVerComprovante = async (url: string) => {
    const publicUrl = await obterUrlComprovante(url)
    if (publicUrl) {
      window.open(publicUrl, '_blank')
    }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header: Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E3E1DA]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#18211F] tracking-tight">
            Visão Geral
          </h1>
          <p className="text-sm text-[#5F6B68] mt-0.5">
            Demonstrativo do fluxo de caixa e movimentações financeiras da equipe.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Period selector */}
          <div className="flex items-center p-1 bg-[#F0EEE8] rounded-xl border border-[#E3E1DA] text-xs font-semibold">
            <button
              onClick={() => setPeriodo('mes')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                periodo === 'mes'
                  ? 'bg-white text-[#18211F] shadow-sm font-bold'
                  : 'text-[#5F6B68] hover:text-[#18211F]'
              }`}
            >
              Este mês
            </button>
            <button
              onClick={() => setPeriodo('trimestre')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                periodo === 'trimestre'
                  ? 'bg-white text-[#18211F] shadow-sm font-bold'
                  : 'text-[#5F6B68] hover:text-[#18211F]'
              }`}
            >
              3 Meses
            </button>
            <button
              onClick={() => setPeriodo('ano')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                periodo === 'ano'
                  ? 'bg-white text-[#18211F] shadow-sm font-bold'
                  : 'text-[#5F6B68] hover:text-[#18211F]'
              }`}
            >
              Este ano
            </button>
            <button
              onClick={() => setPeriodo('tudo')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                periodo === 'tudo'
                  ? 'bg-white text-[#18211F] shadow-sm font-bold'
                  : 'text-[#5F6B68] hover:text-[#18211F]'
              }`}
            >
              Tudo
            </button>
          </div>

          <Button
            onClick={handleOpenNewModal}
            className="bg-[#0E7C6B] hover:bg-[#0A6255] text-white rounded-xl shadow-md font-semibold text-xs sm:text-sm h-9 sm:h-10 px-3.5 flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nova Transação</span>
            <span className="sm:hidden">Nova</span>
          </Button>
        </div>
      </div>

      {/* SUMMARY CARDS ROW (3 CARDS) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        {/* Card Saldo do Período */}
        <Card className="rounded-2xl border border-[#E3E1DA] bg-white shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#5F6B68]">
              Saldo do Período
            </CardTitle>
            <div className="h-8 w-8 rounded-xl bg-[#E2F3EF] flex items-center justify-center text-[#0E7C6B]">
              <Wallet className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div
              className={`text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums ${
                saldoPeriodo >= 0 ? 'text-[#0E7C6B]' : 'text-[#F43F5E]'
              }`}
            >
              {loading ? (
                <div className="h-8 w-32 bg-[#F0EEE8] animate-pulse rounded" />
              ) : (
                <CountUp endValue={saldoPeriodo} />
              )}
            </div>
            <p className="text-xs text-[#5F6B68]">
              {transacoesFiltradas.length}{' '}
              {transacoesFiltradas.length === 1 ? 'transação' : 'transações'} no período
            </p>
          </CardContent>
        </Card>

        {/* Card Entradas */}
        <Card className="rounded-2xl border border-[#E3E1DA] bg-white shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Entradas
            </CardTitle>
            <div className="h-8 w-8 rounded-xl bg-emerald-50 flex items-center justify-center text-[#10B981]">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#10B981] tabular-nums">
              {loading ? (
                <div className="h-8 w-32 bg-[#F0EEE8] animate-pulse rounded" />
              ) : (
                <CountUp endValue={totalEntradas} />
              )}
            </div>
            <p className="text-xs text-[#5F6B68]">Total recebido no período</p>
          </CardContent>
        </Card>

        {/* Card Saídas */}
        <Card className="rounded-2xl border border-[#E3E1DA] bg-white shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-rose-700">
              Saídas
            </CardTitle>
            <div className="h-8 w-8 rounded-xl bg-rose-50 flex items-center justify-center text-[#F43F5E]">
              <TrendingDown className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#F43F5E] tabular-nums">
              {loading ? (
                <div className="h-8 w-32 bg-[#F0EEE8] animate-pulse rounded" />
              ) : (
                <CountUp endValue={totalSaidas} />
              )}
            </div>
            <p className="text-xs text-[#5F6B68]">Total gasto no período</p>
          </CardContent>
        </Card>
      </div>

      {/* CHARTS & CATEGORY BREAKDOWN ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Flow Area Chart */}
        <Card className="lg:col-span-7 rounded-2xl border border-[#E3E1DA] bg-white shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-[#18211F]">
                  Fluxo no Período
                </CardTitle>
                <p className="text-xs text-[#5F6B68]">Entradas vs Saídas diárias</p>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-[#10B981]">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#10B981]" /> Entradas
                </span>
                <span className="flex items-center gap-1.5 text-[#F43F5E]">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#F43F5E]" /> Saídas
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-[#0E7C6B]" />
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-[#FBFBFA] rounded-xl border border-dashed border-[#E3E1DA]">
                <Calendar className="h-8 w-8 text-[#5F6B68] mb-2 opacity-50" />
                <p className="text-sm font-semibold text-[#18211F]">Sem movimentações no período</p>
                <p className="text-xs text-[#5F6B68] mt-1">
                  Cadastre sua primeira transação para visualizar o gráfico.
                </p>
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="corEntradas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="corSaidas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="label"
                      stroke="#5F6B68"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#E3E1DA' }}
                    />
                    <YAxis
                      stroke="#5F6B68"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#E3E1DA' }}
                      tickFormatter={(val) => `R$${val}`}
                    />
                    <Tooltip
                      formatter={(val: number) => [formatarMoeda(val), '']}
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '12px',
                        border: '1px solid #E3E1DA',
                        boxShadow: '0 4px 12px rgba(16,32,30,.08)',
                        fontSize: '12px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="entradas"
                      name="Entradas"
                      stroke="#10B981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#corEntradas)"
                    />
                    <Area
                      type="monotone"
                      dataKey="saidas"
                      name="Saídas"
                      stroke="#F43F5E"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#corSaidas)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Categories Breakdown */}
        <Card className="lg:col-span-5 rounded-2xl border border-[#E3E1DA] bg-white shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-[#18211F]">Por Categoria</CardTitle>
            <p className="text-xs text-[#5F6B68]">Volume total movimentado por categoria</p>
          </CardHeader>
          <CardContent className="pt-2 flex-1 flex flex-col justify-center">
            {loading ? (
              <div className="h-56 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-[#0E7C6B]" />
              </div>
            ) : categoryBreakdown.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#5F6B68]">
                Nenhuma categoria registrada no período.
              </div>
            ) : (
              <div className="space-y-3.5">
                {categoryBreakdown.slice(0, 5).map((cat) => (
                  <div key={cat.nome} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-[#18211F]">{cat.nome}</span>
                      <span className="tabular-nums text-[#5F6B68]">
                        {formatarMoeda(cat.total)}
                      </span>
                    </div>
                    {/* Bar */}
                    <div className="w-full h-2 bg-[#F0EEE8] rounded-full overflow-hidden flex">
                      <div
                        className="bg-[#0E7C6B] h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(cat.percent, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* RECENT TRANSACTIONS CARD & SHORTCUT TABLE */}
      <Card className="rounded-2xl border border-[#E3E1DA] bg-white shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-[#E3E1DA]">
          <div>
            <CardTitle className="text-base font-bold text-[#18211F]">
              Movimentações Recentes
            </CardTitle>
            <p className="text-xs text-[#5F6B68]">Últimos lançamentos registrados no livro-razão</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/transactions')}
            className="text-xs font-bold text-[#0E7C6B] hover:text-[#0A6255] hover:bg-[#E2F3EF] flex items-center gap-1 rounded-xl"
          >
            Ver todas <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#0E7C6B]" />
            </div>
          ) : transacoesRecentes.length === 0 ? (
            <div className="text-center py-12 p-4">
              <Receipt className="h-10 w-10 text-[#5F6B68] mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold text-[#18211F]">Nenhuma transação encontrada</p>
              <p className="text-xs text-[#5F6B68] mt-1 max-w-sm mx-auto">
                Registre uma nova transação para começar a acompanhar o fluxo de caixa.
              </p>
              <Button
                onClick={handleOpenNewModal}
                className="mt-4 bg-[#0E7C6B] hover:bg-[#0A6255] text-white text-xs font-semibold rounded-xl"
              >
                Nova Transação
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-[#E3E1DA]">
              {transacoesRecentes.map((t) => {
                const isEntrada = t.entrada > 0
                return (
                  <div
                    key={t.id}
                    className="p-4 sm:px-6 flex items-center justify-between gap-3 hover:bg-[#FBFBFA] transition-colors"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div
                        className={`h-9 w-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                          isEntrada ? 'bg-emerald-50 text-[#10B981]' : 'bg-rose-50 text-[#F43F5E]'
                        }`}
                      >
                        {isEntrada ? '↓' : '↑'}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[#18211F] truncate">
                            {t.descricao}
                          </span>
                          {t.comprovante_url && (
                            <button
                              onClick={() => handleVerComprovante(t.comprovante_url!)}
                              title="Ver Comprovante Anexo"
                              className="text-[#0E7C6B] hover:text-[#0A6255] shrink-0"
                            >
                              <Paperclip className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#5F6B68] mt-0.5">
                          <span>{formatarData(t.data)}</span>
                          <span>&bull;</span>
                          <span className="font-medium bg-[#F0EEE8] px-2 py-0.5 rounded-md text-[11px]">
                            {t.categoria}
                          </span>
                          <span>&bull;</span>
                          <span className="text-[11px] font-semibold text-[#18211F]">
                            {t.responsavel}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-right">
                      <div className="space-y-0.5">
                        <span
                          className={`text-sm font-extrabold tabular-nums block ${
                            isEntrada ? 'text-[#10B981]' : 'text-[#F43F5E]'
                          }`}
                        >
                          {isEntrada ? '+' : '−'} {formatarMoeda(isEntrada ? t.entrada : t.saida)}
                        </span>
                        <span className="text-[11px] text-[#5F6B68] tabular-nums block">
                          Acumulado: {formatarMoeda(t.saldo_acumulado)}
                        </span>
                      </div>

                      <div className="hidden sm:flex items-center gap-1 pl-2 border-l border-[#E3E1DA]">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEditModal(t)}
                          className="h-8 w-8 rounded-lg text-[#5F6B68] hover:text-[#0E7C6B] hover:bg-[#E2F3EF]"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDeleteDialog(t)}
                          className="h-8 w-8 rounded-lg text-[#5F6B68] hover:text-[#F43F5E] hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL CRIAR/EDITAR */}
      <ModalTransacao
        open={modalOpen}
        onOpenChange={setModalOpen}
        transacaoParaEditar={transacaoParaEditar}
        onSave={handleSaveTransaction}
        onSuccess={carregarDados}
      />

      {/* DIALOG EXCLUIR */}
      <DialogExcluir
        open={dialogExcluirOpen}
        onOpenChange={setDialogExcluirOpen}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
