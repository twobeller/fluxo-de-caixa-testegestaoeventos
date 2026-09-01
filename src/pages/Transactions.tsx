import { useEffect, useState, useMemo, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  listarTransacoes,
  criarTransacao,
  atualizarTransacao,
  excluirTransacao,
  obterUrlComprovante,
} from '@/services/transacoes'
import {
  Transacao,
  NovaTransacaoPayload,
  CATEGORIAS_TRANSACOES,
  RESPONSAVEIS_TRANSACOES,
} from '@/types/fluxo-caixa'
import { useAuth } from '@/hooks/use-mobile'
import { formatarMoeda, formatarData } from '@/lib/formatters'
import { ModalTransacao } from '@/components/ModalTransacao'
import { DialogExcluir } from '@/components/DialogExcluir'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  Plus,
  Paperclip,
  Pencil,
  Trash2,
  FilterX,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Receipt,
  FileSpreadsheet,
  ArrowUpDown,
  ExternalLink,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

const ITEMS_PER_PAGE = 10

export default function Transactions() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // Transactions State
  const [transacoes, setTransacoes] = useState<Transacao[]>([])
  const [loading, setLoading] = useState(true)

  // Filters from URL Search Params or default
  const busca = searchParams.get('busca') || ''
  const tipoFiltro = (searchParams.get('tipo') as 'todos' | 'entradas' | 'saidas') || 'todos'
  const categoriaFiltro = searchParams.get('categoria') || 'todas'
  const responsavelFiltro = searchParams.get('responsavel') || 'todos'
  const mesFiltro = searchParams.get('mes') || '' // YYYY-MM
  const pagina = parseInt(searchParams.get('pagina') || '1', 10)

  // Modals state
  const [modalOpen, setModalOpen] = useState(false)
  const [transacaoParaEditar, setTransacaoParaEditar] = useState<Transacao | null>(null)
  const [dialogExcluirOpen, setDialogExcluirOpen] = useState(false)
  const [transacaoParaExcluir, setTransacaoParaExcluir] = useState<Transacao | null>(null)

  // Fetch transactions
  const carregarDados = useCallback(async () => {
    setLoading(true)
    try {
      const lista = await listarTransacoes()
      setTransacoes(lista)
    } catch (err) {
      console.error('Erro ao carregar transações:', err)
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível buscar as transações.',
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

  // Update URL param helper
  const updateParam = (key: string, value: string | null) => {
    const newParams = new URLSearchParams(searchParams)
    if (value === null || value === '' || value === 'todos' || value === 'todas') {
      newParams.delete(key)
    } else {
      newParams.set(key, value)
    }
    // Reset page to 1 on filter change
    if (key !== 'pagina') {
      newParams.delete('pagina')
    }
    setSearchParams(newParams)
  }

  const handleLimparFiltros = () => {
    setSearchParams(new URLSearchParams())
  }

  const isFiltering =
    Boolean(busca) ||
    tipoFiltro !== 'todos' ||
    categoriaFiltro !== 'todas' ||
    responsavelFiltro !== 'todos' ||
    Boolean(mesFiltro)

  // Filtered list
  const transacoesFiltradas = useMemo(() => {
    return transacoes.filter((t) => {
      // Search in description, category or responsavel
      if (busca) {
        const query = busca.toLowerCase()
        const matchDesc = t.descricao.toLowerCase().includes(query)
        const matchCat = t.categoria.toLowerCase().includes(query)
        const matchResp = t.responsavel.toLowerCase().includes(query)
        if (!matchDesc && !matchCat && !matchResp) return false
      }

      // Tipo (entradas / saidas)
      if (tipoFiltro === 'entradas' && t.entrada <= 0) return false
      if (tipoFiltro === 'saidas' && t.saida <= 0) return false

      // Categoria
      if (categoriaFiltro !== 'todas' && t.categoria !== categoriaFiltro) {
        return false
      }

      // Responsavel
      if (responsavelFiltro !== 'todos' && t.responsavel !== responsavelFiltro) {
        return false
      }

      // Mes (YYYY-MM)
      if (mesFiltro && t.data) {
        if (!t.data.startsWith(mesFiltro)) return false
      }

      return true
    })
  }, [transacoes, busca, tipoFiltro, categoriaFiltro, responsavelFiltro, mesFiltro])

  // Summary of filtered results
  const resumoFiltrado = useMemo(() => {
    const totalEnt = transacoesFiltradas.reduce((acc, t) => acc + (t.entrada || 0), 0)
    const totalSai = transacoesFiltradas.reduce((acc, t) => acc + (t.saida || 0), 0)
    return {
      totalEnt,
      totalSai,
      saldo: totalEnt - totalSai,
      totalCount: transacoesFiltradas.length,
    }
  }, [transacoesFiltradas])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(transacoesFiltradas.length / ITEMS_PER_PAGE))
  const currentPage = Math.min(Math.max(1, pagina), totalPages)

  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    return transacoesFiltradas.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [transacoesFiltradas, currentPage])

  // Action handlers
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
        description: 'Registro removido com sucesso.',
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E3E1DA]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#18211F] tracking-tight">
            Transações
          </h1>
          <p className="text-sm text-[#5F6B68] mt-0.5">
            Tabela completa do fluxo de caixa e histórico de movimentações.
          </p>
        </div>

        <Button
          onClick={handleOpenNewModal}
          className="bg-[#0E7C6B] hover:bg-[#0A6255] text-white rounded-xl shadow-md font-semibold text-xs sm:text-sm h-10 px-4 flex items-center gap-1.5 shrink-0"
        >
          <Plus className="h-4 w-4" />
          Nova Transação
        </Button>
      </div>

      {/* FILTERS BAR */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E3E1DA] space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Search */}
          <div className="lg:col-span-4 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5F6B68]" />
            <Input
              type="text"
              placeholder="Buscar por descrição..."
              value={busca}
              onChange={(e) => updateParam('busca', e.target.value)}
              className="pl-10 h-10 bg-[#FBFBFA] border-[#E3E1DA] focus:border-[#0E7C6B] focus:ring-[#0E7C6B]/30 rounded-xl text-xs sm:text-sm"
            />
          </div>

          {/* Tipo Segmented Control */}
          <div className="lg:col-span-3 flex items-center p-1 bg-[#F0EEE8] rounded-xl border border-[#E3E1DA] text-xs font-semibold">
            <button
              onClick={() => updateParam('tipo', 'todos')}
              className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
                tipoFiltro === 'todos'
                  ? 'bg-white text-[#18211F] shadow-sm font-bold'
                  : 'text-[#5F6B68] hover:text-[#18211F]'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => updateParam('tipo', 'entradas')}
              className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
                tipoFiltro === 'entradas'
                  ? 'bg-[#10B981] text-white shadow-sm font-bold'
                  : 'text-[#5F6B68] hover:text-[#10B981]'
              }`}
            >
              Entradas
            </button>
            <button
              onClick={() => updateParam('tipo', 'saidas')}
              className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
                tipoFiltro === 'saidas'
                  ? 'bg-[#F43F5E] text-white shadow-sm font-bold'
                  : 'text-[#5F6B68] hover:text-[#F43F5E]'
              }`}
            >
              Saídas
            </button>
          </div>

          {/* Categoria Select */}
          <div className="lg:col-span-2">
            <Select value={categoriaFiltro} onValueChange={(val) => updateParam('categoria', val)}>
              <SelectTrigger className="h-10 bg-[#FBFBFA] border-[#E3E1DA] rounded-xl text-xs">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent className="bg-white border-[#E3E1DA] rounded-xl">
                <SelectItem value="todas">Todas Categorias</SelectItem>
                {CATEGORIAS_TRANSACOES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Responsável Select */}
          <div className="lg:col-span-2">
            <Select
              value={responsavelFiltro}
              onValueChange={(val) => updateParam('responsavel', val)}
            >
              <SelectTrigger className="h-10 bg-[#FBFBFA] border-[#E3E1DA] rounded-xl text-xs">
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent className="bg-white border-[#E3E1DA] rounded-xl">
                <SelectItem value="todos">Todos Responsáveis</SelectItem>
                {RESPONSAVEIS_TRANSACOES.map((resp) => (
                  <SelectItem key={resp} value={resp}>
                    {resp}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Month input / Clear */}
          <div className="lg:col-span-1 flex items-center gap-1.5">
            {isFiltering && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLimparFiltros}
                className="w-full h-10 px-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-xl flex items-center justify-center gap-1"
                title="Limpar filtros"
              >
                <FilterX className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Limpar</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* SUMMARY BANNER */}
      <div className="bg-[#10201E] text-white p-4 sm:px-6 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-2 text-xs font-medium text-[#9FB5B0]">
          <span>
            {resumoFiltrado.totalCount}{' '}
            {resumoFiltrado.totalCount === 1 ? 'transação' : 'transações'}
          </span>
          <span>&bull;</span>
          <span>
            Página {currentPage} de {totalPages}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-sm font-semibold tabular-nums">
          <div className="flex items-center gap-1.5">
            <span className="text-[#9FB5B0]">Entradas:</span>
            <span className="text-[#10B981] font-bold">
              {formatarMoeda(resumoFiltrado.totalEnt)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[#9FB5B0]">Saídas:</span>
            <span className="text-[#F43F5E] font-bold">
              {formatarMoeda(resumoFiltrado.totalSai)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 pl-3 border-l border-[#1D3431]">
            <span className="text-[#9FB5B0]">Saldo:</span>
            <span
              className={`font-extrabold ${resumoFiltrado.saldo >= 0 ? 'text-[#10B981]' : 'text-[#F43F5E]'}`}
            >
              {formatarMoeda(resumoFiltrado.saldo)}
            </span>
          </div>
        </div>
      </div>

      {/* TRANSACTIONS TABLE (DESKTOP) & STACKED CARDS (MOBILE) */}
      <div className="bg-white rounded-2xl border border-[#E3E1DA] shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#0E7C6B]" />
            <p className="text-xs font-semibold text-[#5F6B68]">Carregando transações...</p>
          </div>
        ) : paginatedTransactions.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <Receipt className="h-12 w-12 text-[#5F6B68] mx-auto mb-3 opacity-30" />
            <h3 className="text-base font-bold text-[#18211F]">Nenhuma transação encontrada</h3>
            <p className="text-xs text-[#5F6B68] mt-1 max-w-sm mx-auto">
              {isFiltering
                ? 'Nenhuma movimentação corresponde aos filtros selecionados. Tente limpar os filtros.'
                : 'Ainda não há transações cadastradas. Clique no botão abaixo para adicionar.'}
            </p>
            {isFiltering ? (
              <Button
                variant="outline"
                onClick={handleLimparFiltros}
                className="mt-4 text-xs font-semibold rounded-xl border-[#E3E1DA]"
              >
                Limpar filtros
              </Button>
            ) : (
              <Button
                onClick={handleOpenNewModal}
                className="mt-4 bg-[#0E7C6B] hover:bg-[#0A6255] text-white text-xs font-semibold rounded-xl"
              >
                Nova Transação
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* DESKTOP TABLE (≥640px) */}
            {/* EXACT ORDER: Data, Descrição, Categoria, Entrada (R$), Saída (R$), Responsável, Saldo Acumulado */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#F0EEE8] text-[#18211F] font-bold border-b border-[#E3E1DA]">
                    <th className="py-3.5 px-4 font-bold">Data</th>
                    <th className="py-3.5 px-4 font-bold">Descrição</th>
                    <th className="py-3.5 px-4 font-bold">Categoria</th>
                    <th className="py-3.5 px-4 font-bold text-right text-emerald-800">
                      Entrada (R$)
                    </th>
                    <th className="py-3.5 px-4 font-bold text-right text-rose-800">Saída (R$)</th>
                    <th className="py-3.5 px-4 font-bold">Responsável</th>
                    <th className="py-3.5 px-4 font-bold text-right">Saldo Acumulado</th>
                    <th className="py-3.5 px-4 font-bold text-center w-24">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3E1DA]">
                  {paginatedTransactions.map((t, index) => {
                    const isEntrada = t.entrada > 0
                    const isSaida = t.saida > 0

                    return (
                      <tr
                        key={t.id}
                        style={{ animationDelay: `${index * 30}ms` }}
                        className="animate-row-in hover:bg-[#FBFBFA] transition-colors group"
                      >
                        {/* 1. Data */}
                        <td className="py-3.5 px-4 font-semibold text-[#18211F] whitespace-nowrap">
                          {formatarData(t.data)}
                        </td>

                        {/* 2. Descrição + Comprovante link */}
                        <td className="py-3.5 px-4 font-medium text-[#18211F]">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{t.descricao}</span>
                            {t.comprovante_url && (
                              <button
                                onClick={() => handleVerComprovante(t.comprovante_url!)}
                                title="Abrir comprovante anexado"
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0E7C6B] hover:text-[#0A6255] bg-[#E2F3EF] px-1.5 py-0.5 rounded-md transition-colors"
                              >
                                <Paperclip className="h-3 w-3" />
                                <span>Anexo</span>
                              </button>
                            )}
                          </div>
                          {t.observacoes && (
                            <p className="text-[11px] text-[#5F6B68] truncate max-w-xs mt-0.5">
                              {t.observacoes}
                            </p>
                          )}
                        </td>

                        {/* 3. Categoria */}
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#F0EEE8] text-[#18211F] border border-[#E3E1DA]">
                            {t.categoria}
                          </span>
                        </td>

                        {/* 4. Entrada (R$) */}
                        <td className="py-3.5 px-4 text-right tabular-nums font-bold text-[#10B981]">
                          {isEntrada ? formatarMoeda(t.entrada) : '—'}
                        </td>

                        {/* 5. Saída (R$) */}
                        <td className="py-3.5 px-4 text-right tabular-nums font-bold text-[#F43F5E]">
                          {isSaida ? formatarMoeda(t.saida) : '—'}
                        </td>

                        {/* 6. Responsável */}
                        <td className="py-3.5 px-4 font-semibold text-[#18211F] whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-[#E2F3EF]/60 text-[#0E7C6B] font-bold text-xs">
                            {t.responsavel}
                          </span>
                        </td>

                        {/* 7. Saldo Acumulado */}
                        <td className="py-3.5 px-4 text-right tabular-nums font-extrabold whitespace-nowrap text-[#18211F]">
                          <span
                            className={t.saldo_acumulado < 0 ? 'text-[#F43F5E]' : 'text-[#0E7C6B]'}
                          >
                            {formatarMoeda(t.saldo_acumulado)}
                          </span>
                        </td>

                        {/* 8. Ações */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEditModal(t)}
                              title="Editar transação"
                              className="h-8 w-8 rounded-lg text-[#5F6B68] hover:text-[#0E7C6B] hover:bg-[#E2F3EF]"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDeleteDialog(t)}
                              title="Excluir transação"
                              className="h-8 w-8 rounded-lg text-[#5F6B68] hover:text-[#F43F5E] hover:bg-rose-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE STACKED CARDS (≤640px) */}
            <div className="sm:hidden divide-y divide-[#E3E1DA]">
              {paginatedTransactions.map((t) => {
                const isEntrada = t.entrada > 0
                return (
                  <div key={t.id} className="p-4 space-y-3 bg-white">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[#5F6B68]">
                            {formatarData(t.data)}
                          </span>
                          <span className="text-xs font-bold text-[#0E7C6B] bg-[#E2F3EF] px-2 py-0.5 rounded">
                            {t.responsavel}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-[#18211F] mt-1">{t.descricao}</h4>
                      </div>

                      <div className="text-right">
                        <span
                          className={`text-base font-extrabold tabular-nums block ${
                            isEntrada ? 'text-[#10B981]' : 'text-[#F43F5E]'
                          }`}
                        >
                          {isEntrada ? '+' : '−'} {formatarMoeda(isEntrada ? t.entrada : t.saida)}
                        </span>
                        <span className="text-[11px] text-[#5F6B68] tabular-nums block mt-0.5">
                          Saldo: {formatarMoeda(t.saldo_acumulado)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-[#F0EEE8]">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold bg-[#F0EEE8] px-2 py-0.5 rounded text-[#18211F]">
                          {t.categoria}
                        </span>

                        {t.comprovante_url && (
                          <button
                            onClick={() => handleVerComprovante(t.comprovante_url!)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#0E7C6B] hover:underline"
                          >
                            <Paperclip className="h-3.5 w-3.5" /> Comprovante
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditModal(t)}
                          className="h-7 px-2 text-xs font-semibold text-[#0E7C6B]"
                        >
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDeleteDialog(t)}
                          className="h-7 px-2 text-xs font-semibold text-[#F43F5E]"
                        >
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* PAGINATION FOOTER */}
            <div className="p-4 border-t border-[#E3E1DA] flex items-center justify-between gap-2 bg-[#FBFBFA]">
              <p className="text-xs text-[#5F6B68] font-medium">
                Página {currentPage} de {totalPages} ({transacoesFiltradas.length} itens)
              </p>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => updateParam('pagina', (currentPage - 1).toString())}
                  className="rounded-xl border-[#E3E1DA] text-xs h-8 px-3 text-[#18211F]"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => updateParam('pagina', (currentPage + 1).toString())}
                  className="rounded-xl border-[#E3E1DA] text-xs h-8 px-3 text-[#18211F]"
                >
                  Próxima
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* MODAL CRIAR / EDITAR */}
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
