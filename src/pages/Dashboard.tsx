import { useEffect, useState, useMemo, useCallback } from 'react'
import { listarItensPlanejamento } from '@/services/planejamento'
import { listarTransacoes } from '@/services/transacoes'
import { ItemPlanejamento, Transacao, CATEGORIAS_PLANEJAMENTO } from '@/types/fluxo-caixa'
import { formatarMoeda, formatarData } from '@/lib/formatters'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Wallet,
  CheckCircle2,
  Clock,
  Loader2,
  BarChart3,
  RefreshCw,
  PieChart as PieChartIcon,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Layers,
  ArrowDownLeft,
  CircleDollarSign,
  Activity,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  Legend,
} from 'recharts'
import { Link } from 'react-router-dom'

interface CategoriaConsolidada {
  categoria: string
  valorTotal: number
  percentual: number
  valorPago: number
  valorRestante: number
  qtdItens: number
  percentualPago: number
}

// Cores para as categorias no gráfico
const CATEGORY_COLORS = [
  '#0E7C6B', // Esmeralda / Marca principal
  '#10B981', // Verde vibrante
  '#0284C7', // Azul
  '#6366F1', // Índigo
  '#8B5CF6', // Roxo
  '#EC4899', // Rosa
  '#F59E0B', // Âmbar
  '#F97316', // Laranja
  '#14B8A6', // Ciano / Teal
  '#64748B', // Ardósia
  '#84CC16', // Lima
]

export default function Dashboard() {
  const [itens, setItens] = useState<ItemPlanejamento[]>([])
  const [transacoes, setTransacoes] = useState<Transacao[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingTransacoes, setLoadingTransacoes] = useState(true)

  // Carregar dados reais do Supabase (planejamento e transações)
  const carregarDados = useCallback(async () => {
    setLoading(true)
    setLoadingTransacoes(true)
    try {
      const [listaPlanejamento, listaTransacoes] = await Promise.all([
        listarItensPlanejamento(),
        listarTransacoes(),
      ])
      setItens(listaPlanejamento)
      setTransacoes(listaTransacoes)
    } catch (err) {
      console.error('Erro ao carregar dados no dashboard:', err)
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível buscar as informações no Supabase.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
      setLoadingTransacoes(false)
    }
  }, [])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  // Consolidação dos Totais Gerais
  const totaisGerais = useMemo(() => {
    const totalGeral = itens.reduce((acc, i) => acc + (Number(i.valor_final) || 0), 0)
    const totalPago = itens.reduce((acc, i) => acc + (Number(i.total_pago) || 0), 0)
    const totalAPagar = itens.reduce((acc, i) => {
      // Se falta_pagar estiver definido no item, usa ele, senão calcula (valor_final - total_pago)
      const falta =
        typeof i.falta_pagar === 'number'
          ? i.falta_pagar
          : (Number(i.valor_final) || 0) - (Number(i.total_pago) || 0)
      return acc + falta
    }, 0)

    const percentualGeralPago = totalGeral > 0 ? (totalPago / totalGeral) * 100 : 0

    return {
      totalGeral,
      totalPago,
      totalAPagar,
      totalItens: itens.length,
      percentualGeralPago,
    }
  }, [itens])

  // Consolidação agrupada por categoria
  const categoriasConsolidadas = useMemo<CategoriaConsolidada[]>(() => {
    const mapa = new Map<
      string,
      {
        categoria: string
        valorTotal: number
        valorPago: number
        valorRestante: number
        qtdItens: number
      }
    >()

    // Inicializa o mapa com as categorias conhecidas ou apenas as presentes
    itens.forEach((item) => {
      const cat = item.categoria || 'Outros'
      const valorFinal = Number(item.valor_final) || 0
      const totalPago = Number(item.total_pago) || 0
      const valorRestante =
        typeof item.falta_pagar === 'number' ? item.falta_pagar : valorFinal - totalPago

      if (!mapa.has(cat)) {
        mapa.set(cat, {
          categoria: cat,
          valorTotal: 0,
          valorPago: 0,
          valorRestante: 0,
          qtdItens: 0,
        })
      }

      const atual = mapa.get(cat)!
      atual.valorTotal += valorFinal
      atual.valorPago += totalPago
      atual.valorRestante += valorRestante
      atual.qtdItens += 1
    })

    // Caso existam categorias no enum que não tenham itens, podemos incluir ou omitir.
    // Aqui incluímos as que possuem itens ou todas as conhecidas com dados.
    const lista = Array.from(mapa.values())

    const totalGeral = totaisGerais.totalGeral

    return lista
      .map((cat) => {
        const percentual = totalGeral > 0 ? (cat.valorTotal / totalGeral) * 100 : 0
        const percentualPago = cat.valorTotal > 0 ? (cat.valorPago / cat.valorTotal) * 100 : 0
        return {
          ...cat,
          percentual,
          percentualPago,
        }
      })
      .sort((a, b) => b.valorTotal - a.valorTotal) // Ordena por maior valor total
  }, [itens, totaisGerais.totalGeral])

  // Dados para o Gráfico de Barras Horizontais Recharts
  const chartData = useMemo(() => {
    // Ordenamos em ordem crescente de valor para que a barra com maior valor fique no topo no layout horizontal
    return [...categoriasConsolidadas]
      .sort((a, b) => a.valorTotal - b.valorTotal)
      .map((c, index) => ({
        categoria: c.categoria,
        valorTotal: c.valorTotal,
        valorPago: c.valorPago,
        valorRestante: c.valorRestante,
        percentual: c.percentual,
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      }))
  }, [categoriasConsolidadas])

  // ==========================================
  // CONSOLIDAÇÃO DO FLUXO DE CAIXA (Transações Reais)
  // ==========================================

  // 1. Totais do Fluxo de Caixa: Total Entradas, Total Saídas e Saldo Atual
  const totaisFluxoCaixa = useMemo(() => {
    const totalEntradas = transacoes.reduce((acc, t) => acc + (Number(t.entrada) || 0), 0)
    const totalSaidas = transacoes.reduce((acc, t) => acc + (Number(t.saida) || 0), 0)
    const saldoAtual = totalEntradas - totalSaidas

    return {
      totalEntradas,
      totalSaidas,
      saldoAtual,
      totalTransacoes: transacoes.length,
    }
  }, [transacoes])

  // 2. Gráfico de Linha: Evolução do Saldo Acumulado ao longo do tempo (ordem cronológica)
  const lineChartData = useMemo(() => {
    if (transacoes.length === 0) return []

    // Ordenar em ordem cronológica estrita (data ASC, criado_em ASC)
    const cronologicas = [...transacoes].sort((a, b) => {
      const dataDiff = a.data.localeCompare(b.data)
      if (dataDiff !== 0) return dataDiff
      return (a.criado_em || '').localeCompare(b.criado_em || '')
    })

    // Calcular saldo acumulado por transação e agregar por ponto temporal
    let acumulado = 0
    const pontos: {
      id: string
      data: string
      dataFormatada: string
      descricao: string
      entrada: number
      saida: number
      saldoAcumulado: number
    }[] = []

    cronologicas.forEach((t) => {
      const entrada = Number(t.entrada) || 0
      const saida = Number(t.saida) || 0
      acumulado += entrada - saida

      pontos.push({
        id: t.id,
        data: t.data,
        dataFormatada: formatarData(t.data),
        descricao: t.descricao,
        entrada,
        saida,
        saldoAcumulado: acumulado,
      })
    })

    return pontos
  }, [transacoes])

  // 3. Gráfico de Pizza: Entradas por Tipo (apenas valores > 0)
  // Categorias requeridas: Venda Direta, Investimento, Bilheteria, Cartão (e agrupar quaisquer outras entradas válidas)
  const pieChartData = useMemo(() => {
    // Categorias padrão solicitadas com cores específicas
    const CORES_ENTRADAS: Record<string, string> = {
      'Venda Direta': '#0E7C6B', // Esmeralda / Marca
      Investimento: '#0284C7', // Azul
      Bilheteria: '#F59E0B', // Âmbar
      Cartão: '#8B5CF6', // Roxo
      Outros: '#64748B', // Ardósia
    }

    const mapa = new Map<string, number>()
    let somaEntradas = 0

    transacoes.forEach((t) => {
      const entrada = Number(t.entrada) || 0
      if (entrada > 0) {
        const cat = (t.categoria || 'Outros').trim()
        mapa.set(cat, (mapa.get(cat) || 0) + entrada)
        somaEntradas += entrada
      }
    })

    if (somaEntradas === 0) return []

    const categoriasOrdenadas = ['Venda Direta', 'Investimento', 'Bilheteria', 'Cartão']
    const resultado: {
      name: string
      value: number
      percent: number
      color: string
    }[] = []

    // Adiciona as categorias principais se tiverem valor > 0
    categoriasOrdenadas.forEach((cat) => {
      const valor = mapa.get(cat) || 0
      if (valor > 0) {
        resultado.push({
          name: cat,
          value: valor,
          percent: (valor / somaEntradas) * 100,
          color: CORES_ENTRADAS[cat] || '#10B981',
        })
        mapa.delete(cat)
      }
    })

    // Adiciona outras categorias de entrada caso existam
    let fallbackIndex = 0
    const fallbackCores = ['#EC4899', '#14B8A6', '#F97316', '#64748B', '#84CC16']
    mapa.forEach((valor, cat) => {
      if (valor > 0) {
        resultado.push({
          name: cat,
          value: valor,
          percent: (valor / somaEntradas) * 100,
          color: CORES_ENTRADAS[cat] || fallbackCores[fallbackIndex % fallbackCores.length],
        })
        fallbackIndex++
      }
    })

    return resultado.sort((a, b) => b.value - a.value)
  }, [transacoes])

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-up">
      {/* Header do Dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E3E1DA]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#18211F] tracking-tight">
              Dashboard de Planejamento
            </h1>
          </div>
          <p className="text-sm text-[#5F6B68] mt-0.5">
            Consolidação orçamentária e distribuição de custos agrupados por categoria.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={carregarDados}
            disabled={loading || loadingTransacoes}
            className="rounded-xl border-[#E3E1DA] text-xs font-semibold text-[#18211F] hover:bg-white h-9 px-3 flex items-center gap-1.5 shadow-xs"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${
                loading || loadingTransacoes ? 'animate-spin text-[#0E7C6B]' : ''
              }`}
            />
            <span>Atualizar</span>
          </Button>

          <Link to="/transactions">
            <Button
              variant="outline"
              size="sm"
              className="border-[#0E7C6B] text-[#0E7C6B] hover:bg-[#E2F3EF] rounded-xl text-xs font-semibold h-9 px-3 flex items-center gap-1.5 shadow-xs"
            >
              <span>Fluxo de Caixa</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </Link>

          <Link to="/planejamento">
            <Button
              size="sm"
              className="bg-[#0E7C6B] hover:bg-[#0A6255] text-white rounded-xl shadow-sm text-xs font-semibold h-9 px-3.5 flex items-center gap-1.5"
            >
              <span>Ver Planejamento</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SEÇÃO 1: FLUXO DE CAIXA (DADOS REAIS DA TABELA TRANSACOES) */}
      {/* ========================================================= */}
      <div className="space-y-4 sm:space-y-6 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-[#E2F3EF] flex items-center justify-center text-[#0E7C6B]">
              <CircleDollarSign className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[#18211F] tracking-tight">
                Fluxo de Caixa Consolidado
              </h2>
              <p className="text-xs text-[#5F6B68]">
                Movimentações financeiras reais registradas no livro-razão (Supabase)
              </p>
            </div>
          </div>

          <Link
            to="/transactions"
            className="text-xs font-bold text-[#0E7C6B] hover:text-[#0A6255] inline-flex items-center gap-1"
          >
            Ver Livro-Razão Completo &rarr;
          </Link>
        </div>

        {/* 1. CARDS DE FLUXO DE CAIXA: Saldo Atual, Total de Entradas, Total de Saídas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
          {/* Card 1: Saldo Atual (entradas - saídas) */}
          <Card
            className={`rounded-2xl border bg-white shadow-xs hover:shadow-md transition-shadow ${
              totaisFluxoCaixa.saldoAtual >= 0 ? 'border-[#0E7C6B]/30' : 'border-rose-300/70'
            }`}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#5F6B68]">
                Saldo Atual
              </CardTitle>
              <div
                className={`h-9 w-9 rounded-xl flex items-center justify-center ${
                  totaisFluxoCaixa.saldoAtual >= 0
                    ? 'bg-[#E2F3EF] text-[#0E7C6B]'
                    : 'bg-rose-50 text-[#F43F5E]'
                }`}
              >
                <Wallet className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <div
                className={`text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums ${
                  totaisFluxoCaixa.saldoAtual >= 0 ? 'text-[#0E7C6B]' : 'text-[#F43F5E]'
                }`}
              >
                {loadingTransacoes ? (
                  <div className="h-8 w-36 bg-[#F0EEE8] animate-pulse rounded" />
                ) : (
                  formatarMoeda(totaisFluxoCaixa.saldoAtual)
                )}
              </div>
              <div className="flex items-center justify-between text-xs text-[#5F6B68] pt-1">
                <span>Entradas − Saídas</span>
                <span className="font-semibold text-[#18211F]">
                  {totaisFluxoCaixa.totalTransacoes}{' '}
                  {totaisFluxoCaixa.totalTransacoes === 1 ? 'transação' : 'transações'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Total de Entradas */}
          <Card className="rounded-2xl border border-emerald-200/70 bg-white shadow-xs hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Total de Entradas
              </CardTitle>
              <div className="h-9 w-9 rounded-xl bg-emerald-50 flex items-center justify-center text-[#10B981]">
                <TrendingUp className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-2xl sm:text-3xl font-extrabold text-[#10B981] tracking-tight tabular-nums">
                {loadingTransacoes ? (
                  <div className="h-8 w-36 bg-[#F0EEE8] animate-pulse rounded" />
                ) : (
                  formatarMoeda(totaisFluxoCaixa.totalEntradas)
                )}
              </div>
              <div className="flex items-center justify-between text-xs text-[#5F6B68] pt-1">
                <span>Receitas e aportes</span>
                <span className="font-bold text-emerald-700">{pieChartData.length} categorias</span>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Total de Saídas */}
          <Card className="rounded-2xl border border-rose-200/70 bg-white shadow-xs hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-rose-700">
                Total de Saídas
              </CardTitle>
              <div className="h-9 w-9 rounded-xl bg-rose-50 flex items-center justify-center text-[#F43F5E]">
                <TrendingDown className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-2xl sm:text-3xl font-extrabold text-[#F43F5E] tracking-tight tabular-nums">
                {loadingTransacoes ? (
                  <div className="h-8 w-36 bg-[#F0EEE8] animate-pulse rounded" />
                ) : (
                  formatarMoeda(totaisFluxoCaixa.totalSaidas)
                )}
              </div>
              <div className="flex items-center justify-between text-xs text-[#5F6B68] pt-1">
                <span>Pagamentos e despesas</span>
                <span className="font-bold text-rose-700">Desembolsos reais</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 2. GRÁFICOS DE FLUXO DE CAIXA: Linha (Evolução Saldo Acumulado) + Pizza (Entradas por Tipo) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Gráfico de Linha: Evolução do Saldo Acumulado */}
          <Card className="lg:col-span-7 rounded-2xl border border-[#E3E1DA] bg-white shadow-xs">
            <CardHeader className="pb-3 border-b border-[#E3E1DA]/70">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-[#E2F3EF] flex items-center justify-center text-[#0E7C6B]">
                    <Activity className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base sm:text-lg font-bold text-[#18211F]">
                      Evolução do Saldo Acumulado
                    </CardTitle>
                    <p className="text-xs text-[#5F6B68]">
                      Eixo X = Data cronológica, Eixo Y = Saldo acumulado (entradas somam, saídas
                      subtraem)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-[#0E7C6B]">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#0E7C6B]" /> Saldo Acumulado
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6 pb-6">
              {loadingTransacoes ? (
                <div className="h-72 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-[#0E7C6B]" />
                  <p className="text-xs font-semibold text-[#5F6B68]">
                    Carregando evolução do saldo...
                  </p>
                </div>
              ) : lineChartData.length === 0 ? (
                <div className="h-72 flex flex-col items-center justify-center text-center p-6 bg-[#FBFBFA] rounded-xl border border-dashed border-[#E3E1DA]">
                  <Activity className="h-10 w-10 text-[#5F6B68] mb-2 opacity-40" />
                  <p className="text-sm font-bold text-[#18211F]">Nenhuma transação registrada</p>
                  <p className="text-xs text-[#5F6B68] mt-1 max-w-sm">
                    Cadastre movimentações no Livro-Razão para visualizar a linha do tempo do saldo
                    acumulado.
                  </p>
                  <Link to="/transactions" className="mt-4">
                    <Button className="bg-[#0E7C6B] hover:bg-[#0A6255] text-white text-xs font-semibold rounded-xl">
                      Ir para Transações
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="w-full h-[300px] sm:h-[340px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={lineChartData}
                      margin={{ top: 15, right: 25, left: 15, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E3E1DA" vertical={false} />
                      <XAxis
                        dataKey="dataFormatada"
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
                        tickFormatter={(val) => {
                          if (Math.abs(val) >= 1000) {
                            return `R$ ${(val / 1000).toFixed(0)}k`
                          }
                          return `R$ ${val}`
                        }}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload
                            const isPositive = data.saldoAcumulado >= 0
                            return (
                              <div className="bg-white p-3.5 rounded-xl border border-[#E3E1DA] shadow-lg text-xs space-y-1.5 min-w-[210px]">
                                <div className="border-b border-[#E3E1DA] pb-1">
                                  <p className="font-bold text-[#18211F] text-sm">
                                    {data.dataFormatada}
                                  </p>
                                  <p className="text-[11px] text-[#5F6B68] truncate max-w-[200px]">
                                    {data.descricao}
                                  </p>
                                </div>
                                <div className="flex items-center justify-between gap-4 pt-0.5">
                                  <span className="text-[#5F6B68]">Saldo Acumulado:</span>
                                  <strong
                                    className={`text-sm tabular-nums ${
                                      isPositive ? 'text-[#0E7C6B]' : 'text-[#F43F5E]'
                                    }`}
                                  >
                                    {formatarMoeda(data.saldoAcumulado)}
                                  </strong>
                                </div>
                                {data.entrada > 0 && (
                                  <div className="flex items-center justify-between gap-4 text-emerald-700">
                                    <span>Entrada:</span>
                                    <span className="font-semibold tabular-nums">
                                      +{formatarMoeda(data.entrada)}
                                    </span>
                                  </div>
                                )}
                                {data.saida > 0 && (
                                  <div className="flex items-center justify-between gap-4 text-rose-700">
                                    <span>Saída:</span>
                                    <span className="font-semibold tabular-nums">
                                      −{formatarMoeda(data.saida)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="saldoAcumulado"
                        name="Saldo Acumulado"
                        stroke="#0E7C6B"
                        strokeWidth={3}
                        dot={{ fill: '#0E7C6B', r: 4, strokeWidth: 2, stroke: '#FFFFFF' }}
                        activeDot={{ r: 6, fill: '#0E7C6B', stroke: '#E2F3EF', strokeWidth: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gráfico de Pizza: Entradas por Tipo (Venda Direta, Investimento, Bilheteria, Cartão) */}
          <Card className="lg:col-span-5 rounded-2xl border border-[#E3E1DA] bg-white shadow-xs flex flex-col justify-between">
            <CardHeader className="pb-3 border-b border-[#E3E1DA]/70">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-[#E2F3EF] flex items-center justify-center text-[#0E7C6B]">
                  <PieChartIcon className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg font-bold text-[#18211F]">
                    Entradas por Tipo
                  </CardTitle>
                  <p className="text-xs text-[#5F6B68]">
                    Divisão das receitas (valores &gt; 0) por categoria
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6 pb-6 flex-1 flex flex-col justify-center">
              {loadingTransacoes ? (
                <div className="h-72 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-[#0E7C6B]" />
                  <p className="text-xs font-semibold text-[#5F6B68]">
                    Carregando divisão de entradas...
                  </p>
                </div>
              ) : pieChartData.length === 0 ? (
                <div className="h-72 flex flex-col items-center justify-center text-center p-6 bg-[#FBFBFA] rounded-xl border border-dashed border-[#E3E1DA]">
                  <PieChartIcon className="h-10 w-10 text-[#5F6B68] mb-2 opacity-40" />
                  <p className="text-sm font-bold text-[#18211F]">Nenhuma entrada registrada</p>
                  <p className="text-xs text-[#5F6B68] mt-1 max-w-xs">
                    Registre vendas diretas, bilheteria, cartões ou investimentos para visualizar a
                    fatia de cada tipo.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-full h-[220px] sm:h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieChartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={3}
                        >
                          {pieChartData.map((entry) => (
                            <Cell key={`cell-pie-${entry.name}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload
                              return (
                                <div className="bg-white p-3 rounded-xl border border-[#E3E1DA] shadow-lg text-xs space-y-1 min-w-[170px]">
                                  <div className="flex items-center gap-2 border-b border-[#E3E1DA] pb-1">
                                    <span
                                      className="h-2.5 w-2.5 rounded-full"
                                      style={{ backgroundColor: data.color }}
                                    />
                                    <p className="font-bold text-[#18211F] text-sm">{data.name}</p>
                                  </div>
                                  <div className="flex items-center justify-between gap-3 pt-0.5">
                                    <span className="text-[#5F6B68]">Total:</span>
                                    <strong className="text-[#18211F] tabular-nums">
                                      {formatarMoeda(data.value)}
                                    </strong>
                                  </div>
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-[#5F6B68]">Participação:</span>
                                    <strong className="text-[#0E7C6B] tabular-nums">
                                      {data.percent.toFixed(1)}%
                                    </strong>
                                  </div>
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Legenda Customizada com Percentuais e Cores */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#E3E1DA]/70">
                    {pieChartData.map((item) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between p-2 rounded-xl bg-[#F8F7F4] border border-[#E3E1DA]/60 text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="font-semibold text-[#18211F] truncate">{item.name}</span>
                        </div>
                        <div className="text-right shrink-0 pl-1">
                          <span className="font-bold text-[#0E7C6B] block tabular-nums text-[11px]">
                            {item.percent.toFixed(0)}%
                          </span>
                          <span className="text-[10px] text-[#5F6B68] block tabular-nums">
                            {formatarMoeda(item.value)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Divisor Visual entre Fluxo de Caixa e Planejamento */}
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-[#E3E1DA]" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-[#F8F7F4] px-3 text-xs font-bold uppercase tracking-wider text-[#5F6B68]">
            Planejamento Orçamentário
          </span>
        </div>
      </div>

      {/* CARDS DE RESUMO DO TOPO: Total Geral, Total Pago, Total a Pagar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
        {/* Card 1: Total Geral */}
        <Card className="rounded-2xl border border-[#E3E1DA] bg-white shadow-xs hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#5F6B68]">
              Total Geral
            </CardTitle>
            <div className="h-9 w-9 rounded-xl bg-[#E2F3EF] flex items-center justify-center text-[#0E7C6B]">
              <Wallet className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold text-[#18211F] tracking-tight tabular-nums">
              {loading ? (
                <div className="h-8 w-36 bg-[#F0EEE8] animate-pulse rounded" />
              ) : (
                formatarMoeda(totaisGerais.totalGeral)
              )}
            </div>
            <div className="flex items-center justify-between text-xs text-[#5F6B68] pt-1">
              <span>{totaisGerais.totalItens} itens orçados</span>
              <span className="font-semibold text-[#18211F]">
                {categoriasConsolidadas.length} categorias
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Total Pago */}
        <Card className="rounded-2xl border border-emerald-200/70 bg-white shadow-xs hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Total Pago
            </CardTitle>
            <div className="h-9 w-9 rounded-xl bg-emerald-50 flex items-center justify-center text-[#10B981]">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold text-[#10B981] tracking-tight tabular-nums">
              {loading ? (
                <div className="h-8 w-36 bg-[#F0EEE8] animate-pulse rounded" />
              ) : (
                formatarMoeda(totaisGerais.totalPago)
              )}
            </div>
            <div className="flex items-center justify-between text-xs text-[#5F6B68] pt-1">
              <span>Quitado do orçamento</span>
              <span className="font-bold text-emerald-700">
                {totaisGerais.percentualGeralPago.toFixed(1)}% pago
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Total a Pagar */}
        <Card className="rounded-2xl border border-rose-200/70 bg-white shadow-xs hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-rose-700">
              Total a Pagar
            </CardTitle>
            <div className="h-9 w-9 rounded-xl bg-rose-50 flex items-center justify-center text-[#F43F5E]">
              <Clock className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold text-[#F43F5E] tracking-tight tabular-nums">
              {loading ? (
                <div className="h-8 w-36 bg-[#F0EEE8] animate-pulse rounded" />
              ) : (
                formatarMoeda(totaisGerais.totalAPagar)
              )}
            </div>
            <div className="flex items-center justify-between text-xs text-[#5F6B68] pt-1">
              <span>Saldo em aberto</span>
              <span className="font-bold text-rose-700">
                {(100 - totaisGerais.percentualGeralPago).toFixed(1)}% pendente
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* GRÁFICO DE BARRAS HORIZONTAIS COM RECHARTS */}
      <Card className="rounded-2xl border border-[#E3E1DA] bg-white shadow-xs">
        <CardHeader className="pb-3 border-b border-[#E3E1DA]/70">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-[#E2F3EF] flex items-center justify-center text-[#0E7C6B]">
                <BarChart3 className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg font-bold text-[#18211F]">
                  Distribuição de Custos por Categoria
                </CardTitle>
                <p className="text-xs text-[#5F6B68]">
                  Comparativo de valor total orçado em cada categoria do planejamento
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-[#0E7C6B]">
                <span className="h-3 w-3 rounded-md bg-[#0E7C6B]" /> Valor Total
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6 pb-6">
          {loading ? (
            <div className="h-80 sm:h-96 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#0E7C6B]" />
              <p className="text-xs font-semibold text-[#5F6B68]">
                Carregando gráfico de custos...
              </p>
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-72 flex flex-col items-center justify-center text-center p-6 bg-[#FBFBFA] rounded-xl border border-dashed border-[#E3E1DA]">
              <Layers className="h-10 w-10 text-[#5F6B68] mb-2 opacity-40" />
              <p className="text-sm font-bold text-[#18211F]">Nenhum dado para exibir no gráfico</p>
              <p className="text-xs text-[#5F6B68] mt-1 max-w-sm">
                Cadastre itens na página de Planejamento para visualizar a distribuição dos custos.
              </p>
              <Link to="/planejamento" className="mt-4">
                <Button className="bg-[#0E7C6B] hover:bg-[#0A6255] text-white text-xs font-semibold rounded-xl">
                  Ir para Planejamento
                </Button>
              </Link>
            </div>
          ) : (
            <div className="w-full h-[400px] sm:h-[480px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={chartData}
                  margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E3E1DA" />
                  <XAxis
                    type="number"
                    stroke="#5F6B68"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#E3E1DA' }}
                    tickFormatter={(val) => {
                      if (val >= 1000) {
                        return `R$ ${(val / 1000).toFixed(0)}k`
                      }
                      return `R$ ${val}`
                    }}
                  />
                  <YAxis
                    type="category"
                    dataKey="categoria"
                    stroke="#18211F"
                    fontSize={12}
                    fontWeight={600}
                    tickLine={false}
                    axisLine={{ stroke: '#E3E1DA' }}
                    width={110}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(14, 124, 107, 0.05)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload
                        return (
                          <div className="bg-white p-3.5 rounded-xl border border-[#E3E1DA] shadow-lg text-xs space-y-1.5 min-w-[200px]">
                            <p className="font-bold text-[#18211F] text-sm border-b border-[#E3E1DA] pb-1">
                              {data.categoria}
                            </p>
                            <div className="flex items-center justify-between gap-4 pt-0.5">
                              <span className="text-[#5F6B68]">Valor Total:</span>
                              <strong className="text-[#18211F] tabular-nums">
                                {formatarMoeda(data.valorTotal)}
                              </strong>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-[#5F6B68]">% do Total Geral:</span>
                              <strong className="text-[#0E7C6B] tabular-nums">
                                {data.percentual.toFixed(2)}%
                              </strong>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-emerald-700">Valor Pago:</span>
                              <span className="text-emerald-700 font-semibold tabular-nums">
                                {formatarMoeda(data.valorPago)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-rose-700">Valor Restante:</span>
                              <span className="text-rose-700 font-semibold tabular-nums">
                                {formatarMoeda(data.valorRestante)}
                              </span>
                            </div>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar dataKey="valorTotal" name="Valor Total" radius={[0, 8, 8, 0]} barSize={22}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color || '#0E7C6B'}
                        className="transition-all hover:opacity-80"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* TABELA DE CATEGORIAS: Categoria, Valor Total, % do Total, Valor Pago, Valor Restante */}
      <Card className="rounded-2xl border border-[#E3E1DA] bg-white shadow-xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-[#E3E1DA]/70 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-[#E2F3EF] flex items-center justify-center text-[#0E7C6B]">
              <PieChartIcon className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg font-bold text-[#18211F]">
                Detalhamento por Categoria (Planejamento)
              </CardTitle>
              <p className="text-xs text-[#5F6B68]">
                Tabela consolidada com valores, percentual e status financeiro
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-[#5F6B68] bg-[#F0EEE8] px-2.5 py-1 rounded-lg">
            {categoriasConsolidadas.length}{' '}
            {categoriasConsolidadas.length === 1 ? 'categoria' : 'categorias'}
          </span>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#0E7C6B]" />
              <p className="text-xs font-semibold text-[#5F6B68]">Consolidando categorias...</p>
            </div>
          ) : categoriasConsolidadas.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <Layers className="h-10 w-10 text-[#5F6B68] mx-auto mb-2 opacity-30" />
              <p className="text-sm font-bold text-[#18211F]">Nenhuma categoria com dados</p>
              <p className="text-xs text-[#5F6B68] mt-1 max-w-sm mx-auto">
                Não há dados de planejamento cadastrados no momento.
              </p>
            </div>
          ) : (
            <>
              {/* DESKTOP / TABLET TABLE (>= 768px) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#F0EEE8] text-[#18211F] font-bold border-b border-[#E3E1DA]">
                      <th className="py-3.5 px-4 font-bold">Categoria</th>
                      <th className="py-3.5 px-4 text-right font-bold">Valor Total</th>
                      <th className="py-3.5 px-4 text-center font-bold">% do Total</th>
                      <th className="py-3.5 px-4 text-right font-bold text-emerald-800">
                        Valor Pago
                      </th>
                      <th className="py-3.5 px-4 text-right font-bold text-rose-800">
                        Valor Restante
                      </th>
                      <th className="py-3.5 px-4 text-center font-bold">Progresso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3E1DA]">
                    {categoriasConsolidadas.map((cat, index) => {
                      const quitado = cat.valorRestante <= 0 && cat.valorTotal > 0
                      return (
                        <tr
                          key={cat.categoria}
                          style={{ animationDelay: `${index * 20}ms` }}
                          className={`hover:bg-[#FBFBFA] transition-colors ${
                            quitado ? 'bg-emerald-50/20' : ''
                          }`}
                        >
                          {/* Categoria */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <span
                                className="h-3 w-3 rounded-full shrink-0"
                                style={{
                                  backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
                                }}
                              />
                              <div>
                                <span className="font-bold text-[#18211F] text-sm block">
                                  {cat.categoria}
                                </span>
                                <span className="text-[11px] text-[#5F6B68]">
                                  {cat.qtdItens} {cat.qtdItens === 1 ? 'item' : 'itens'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Valor Total */}
                          <td className="py-3.5 px-4 text-right font-extrabold text-sm text-[#18211F] tabular-nums whitespace-nowrap">
                            {formatarMoeda(cat.valorTotal)}
                          </td>

                          {/* % do Total */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold bg-[#E2F3EF] text-[#0E7C6B] border border-[#0E7C6B]/20 tabular-nums">
                              {cat.percentual.toFixed(2)}%
                            </span>
                          </td>

                          {/* Valor Pago */}
                          <td className="py-3.5 px-4 text-right font-bold text-sm text-[#10B981] tabular-nums whitespace-nowrap">
                            {formatarMoeda(cat.valorPago)}
                          </td>

                          {/* Valor Restante */}
                          <td
                            className={`py-3.5 px-4 text-right font-bold text-sm tabular-nums whitespace-nowrap ${
                              quitado ? 'text-[#10B981]' : 'text-[#F43F5E]'
                            }`}
                          >
                            {formatarMoeda(cat.valorRestante)}
                          </td>

                          {/* Barra de Progresso Pago */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap min-w-[120px]">
                            <div className="space-y-1">
                              <div className="w-full bg-[#E3E1DA] h-2 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    quitado ? 'bg-[#10B981]' : 'bg-[#0E7C6B]'
                                  }`}
                                  style={{
                                    width: `${Math.min(cat.percentualPago, 100)}%`,
                                  }}
                                />
                              </div>
                              <span className="text-[10px] text-[#5F6B68] font-semibold block text-right">
                                {cat.percentualPago.toFixed(0)}% quitado
                              </span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  {/* Linha de Totalizadores no rodapé da tabela */}
                  <tfoot>
                    <tr className="bg-[#F0EEE8] font-extrabold text-[#18211F] border-t-2 border-[#18211F]/20 text-xs">
                      <td className="py-4 px-4 uppercase tracking-wider">Total Consolidado</td>
                      <td className="py-4 px-4 text-right text-sm tabular-nums text-[#18211F]">
                        {formatarMoeda(totaisGerais.totalGeral)}
                      </td>
                      <td className="py-4 px-4 text-center tabular-nums">
                        <span className="inline-block px-2.5 py-1 rounded-full bg-[#18211F] text-white text-xs font-bold">
                          100,00%
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right text-sm tabular-nums text-[#10B981]">
                        {formatarMoeda(totaisGerais.totalPago)}
                      </td>
                      <td className="py-4 px-4 text-right text-sm tabular-nums text-[#F43F5E]">
                        {formatarMoeda(totaisGerais.totalAPagar)}
                      </td>
                      <td className="py-4 px-4 text-center text-xs text-[#5F6B68]">
                        {totaisGerais.percentualGeralPago.toFixed(1)}% total pago
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* MOBILE CARDS (< 768px) */}
              <div className="md:hidden divide-y divide-[#E3E1DA]">
                {categoriasConsolidadas.map((cat, index) => {
                  const quitado = cat.valorRestante <= 0 && cat.valorTotal > 0
                  return (
                    <div
                      key={cat.categoria}
                      className={`p-4 space-y-3 ${quitado ? 'bg-emerald-50/15' : 'bg-white'}`}
                    >
                      {/* Topo do Card */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3.5 w-3.5 rounded-full shrink-0 mt-0.5"
                            style={{
                              backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
                            }}
                          />
                          <div>
                            <h4 className="font-bold text-sm text-[#18211F] leading-tight">
                              {cat.categoria}
                            </h4>
                            <span className="text-[11px] text-[#5F6B68]">
                              {cat.qtdItens} {cat.qtdItens === 1 ? 'item' : 'itens'} no planejamento
                            </span>
                          </div>
                        </div>

                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#E2F3EF] text-[#0E7C6B] shrink-0 tabular-nums">
                          {cat.percentual.toFixed(1)}% do total
                        </span>
                      </div>

                      {/* Grade de Valores */}
                      <div className="grid grid-cols-3 gap-2 bg-[#F8F7F4] p-3 rounded-xl border border-[#E3E1DA] text-xs">
                        <div>
                          <span className="text-[#5F6B68] block text-[10px] uppercase font-semibold">
                            Valor Total
                          </span>
                          <span className="font-bold text-[#18211F] tabular-nums block mt-0.5">
                            {formatarMoeda(cat.valorTotal)}
                          </span>
                        </div>
                        <div>
                          <span className="text-emerald-700 block text-[10px] uppercase font-semibold">
                            Valor Pago
                          </span>
                          <span className="font-bold text-[#10B981] tabular-nums block mt-0.5">
                            {formatarMoeda(cat.valorPago)}
                          </span>
                        </div>
                        <div>
                          <span className="text-rose-700 block text-[10px] uppercase font-semibold">
                            Restante
                          </span>
                          <span
                            className={`font-bold tabular-nums block mt-0.5 ${
                              quitado ? 'text-[#10B981]' : 'text-[#F43F5E]'
                            }`}
                          >
                            {formatarMoeda(cat.valorRestante)}
                          </span>
                        </div>
                      </div>

                      {/* Progresso de Pagamento */}
                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between items-center text-[11px] font-semibold">
                          <span className="text-[#5F6B68]">Status de Quitação</span>
                          <span className={quitado ? 'text-emerald-700' : 'text-[#18211F]'}>
                            {cat.percentualPago.toFixed(0)}% pago
                          </span>
                        </div>
                        <div className="w-full bg-[#E3E1DA] h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              quitado ? 'bg-[#10B981]' : 'bg-[#0E7C6B]'
                            }`}
                            style={{
                              width: `${Math.min(cat.percentualPago, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Rodapé Resumo Mobile */}
                <div className="p-4 bg-[#F0EEE8] space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[#18211F]">
                    <span>Total Consolidado:</span>
                    <span className="text-sm font-extrabold tabular-nums">
                      {formatarMoeda(totaisGerais.totalGeral)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#5F6B68]">
                    <span>Total Já Pago:</span>
                    <span className="font-bold text-[#10B981] tabular-nums">
                      {formatarMoeda(totaisGerais.totalPago)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#5F6B68]">
                    <span>Total a Pagar:</span>
                    <span className="font-bold text-[#F43F5E] tabular-nums">
                      {formatarMoeda(totaisGerais.totalAPagar)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
