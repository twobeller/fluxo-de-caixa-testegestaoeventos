import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  listarItensPlanejamento,
  criarItemPlanejamento,
  atualizarItemPlanejamento,
  excluirItemPlanejamento,
} from '@/services/planejamento'
import {
  ItemPlanejamento,
  NovoItemPlanejamentoPayload,
  CATEGORIAS_PLANEJAMENTO,
  STATUS_PLANEJAMENTO,
  StatusPlanejamento,
} from '@/types/fluxo-caixa'
import { useAuth } from '@/hooks/use-mobile'
import { formatarMoeda } from '@/lib/formatters'
import { ModalItemPlanejamento } from '@/components/ModalItemPlanejamento'
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
  Pencil,
  Trash2,
  FilterX,
  Loader2,
  CalendarCheck2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

const ITEMS_PER_PAGE = 10

export default function Planejamento() {
  const { user } = useAuth()

  // State
  const [itens, setItens] = useState<ItemPlanejamento[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [busca, setBusca] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas')
  const [statusFiltro, setStatusFiltro] = useState('todos')
  const [pagina, setPagina] = useState(1)

  // Modais
  const [modalOpen, setModalOpen] = useState(false)
  const [itemParaEditar, setItemParaEditar] = useState<ItemPlanejamento | null>(null)
  const [dialogExcluirOpen, setDialogExcluirOpen] = useState(false)
  const [itemParaExcluir, setItemParaExcluir] = useState<ItemPlanejamento | null>(null)

  // Carregar dados reais do Supabase
  const carregarDados = useCallback(async () => {
    setLoading(true)
    try {
      const lista = await listarItensPlanejamento()
      setItens(lista)
    } catch (err) {
      console.error('Erro ao carregar planejamento:', err)
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar os itens do planejamento.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  // Limpar filtros
  const handleLimparFiltros = () => {
    setBusca('')
    setCategoriaFiltro('todas')
    setStatusFiltro('todos')
    setPagina(1)
  }

  const isFiltering = Boolean(busca) || categoriaFiltro !== 'todas' || statusFiltro !== 'todos'

  // Filtragem
  const itensFiltrados = useMemo(() => {
    return itens.filter((i) => {
      if (busca) {
        const query = busca.toLowerCase()
        const matchItem = i.item.toLowerCase().includes(query)
        const matchCat = i.categoria.toLowerCase().includes(query)
        const matchResp = i.responsavel.toLowerCase().includes(query)
        if (!matchItem && !matchCat && !matchResp) return false
      }

      if (categoriaFiltro !== 'todas' && i.categoria !== categoriaFiltro) {
        return false
      }

      if (statusFiltro !== 'todos' && i.status !== statusFiltro) {
        return false
      }

      return true
    })
  }, [itens, busca, categoriaFiltro, statusFiltro])

  // Totais e Métricas do Planejamento
  const resumoGeral = useMemo(() => {
    const totalGasto = itens.reduce((acc, i) => acc + (i.valor_final || 0), 0)
    const totalPago = itens.reduce((acc, i) => acc + (i.total_pago || 0), 0)
    const totalFalta = itens.reduce((acc, i) => acc + (i.falta_pagar || 0), 0)

    const totalGutto = itens.reduce((acc, i) => acc + (i.gutto || 0), 0)
    const totalRuan = itens.reduce((acc, i) => acc + (i.ruan || 0), 0)
    const totalPc = itens.reduce((acc, i) => acc + (i.pc || 0), 0)
    const totalJunior = itens.reduce((acc, i) => acc + (i.junior || 0), 0)
    const totalEvento = itens.reduce((acc, i) => acc + (i.evento || 0), 0)

    return {
      totalGasto,
      totalPago,
      totalFalta,
      totalGutto,
      totalRuan,
      totalPc,
      totalJunior,
      totalEvento,
      totalItens: itens.length,
    }
  }, [itens])

  // Paginação
  const totalPages = Math.max(1, Math.ceil(itensFiltrados.length / ITEMS_PER_PAGE))
  const currentPage = Math.min(Math.max(1, pagina), totalPages)

  const paginatedItens = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    return itensFiltrados.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [itensFiltrados, currentPage])

  // Ações CRUD
  const handleOpenNewModal = () => {
    setItemParaEditar(null)
    setModalOpen(true)
  }

  const handleOpenEditModal = (item: ItemPlanejamento) => {
    setItemParaEditar(item)
    setModalOpen(true)
  }

  const handleOpenDeleteDialog = (item: ItemPlanejamento) => {
    setItemParaExcluir(item)
    setDialogExcluirOpen(true)
  }

  const handleSaveItem = async (payload: NovoItemPlanejamentoPayload, id?: string) => {
    if (id) {
      await atualizarItemPlanejamento(id, payload)
    } else {
      await criarItemPlanejamento(payload, user?.id)
    }
    await carregarDados()
  }

  const handleConfirmDelete = async () => {
    if (!itemParaExcluir) return
    try {
      await excluirItemPlanejamento(itemParaExcluir.id)
      toast({
        title: 'Item excluído',
        description: 'Item removido do planejamento com sucesso.',
      })
      await carregarDados()
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível remover o item.',
        variant: 'destructive',
      })
    }
  }

  // Renderizador de Badge de Status:
  // Verde: Pago Total
  // Amarelo: Pago Parcial
  // Vermelho: Pendente
  const renderStatusBadge = (statusStr: string, faltaPagar: number) => {
    if (statusStr === 'Pago Total' || faltaPagar <= 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <CheckCircle2 className="h-3 w-3 text-emerald-700" />
          Pago Total
        </span>
      )
    }
    if (statusStr === 'Pago Parcial') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
          <Clock className="h-3 w-3 text-amber-700" />
          Pago Parcial
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
        <AlertTriangle className="h-3 w-3 text-rose-700" />
        Pendente
      </span>
    )
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E3E1DA]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#18211F] tracking-tight">
            Planejamento
          </h1>
          <p className="text-sm text-[#5F6B68] mt-0.5">
            Gestão orçamentária, controle de custos e divisão de despesas por sócio.
          </p>
        </div>

        <Button
          onClick={handleOpenNewModal}
          className="bg-[#0E7C6B] hover:bg-[#0A6255] text-white rounded-xl shadow-md font-semibold text-xs sm:text-sm h-10 px-4 flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Novo Item
        </Button>
      </div>

      {/* CARDS DE RESUMO DO PLANEJAMENTO */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Total Orçado / Final */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E3E1DA] shadow-xs">
          <span className="text-xs font-semibold text-[#5F6B68] block">Total Orçado</span>
          <span className="text-xl sm:text-2xl font-extrabold text-[#18211F] tabular-nums block mt-1">
            {formatarMoeda(resumoGeral.totalGasto)}
          </span>
          <span className="text-[11px] text-[#5F6B68] block mt-1">
            {resumoGeral.totalItens} {resumoGeral.totalItens === 1 ? 'item' : 'itens'} no total
          </span>
        </div>

        {/* Total Já Pago */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-emerald-100 shadow-xs bg-emerald-50/20">
          <span className="text-xs font-semibold text-emerald-800 block">Total Já Pago</span>
          <span className="text-xl sm:text-2xl font-extrabold text-[#10B981] tabular-nums block mt-1">
            {formatarMoeda(resumoGeral.totalPago)}
          </span>
          <span className="text-[11px] text-[#5F6B68] block mt-1">Soma dos repasses e contas</span>
        </div>

        {/* Falta Pagar */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-rose-100 shadow-xs bg-rose-50/20">
          <span className="text-xs font-semibold text-rose-800 block">Falta Pagar</span>
          <span className="text-xl sm:text-2xl font-extrabold text-[#F43F5E] tabular-nums block mt-1">
            {formatarMoeda(resumoGeral.totalFalta)}
          </span>
          <span className="text-[11px] text-[#5F6B68] block mt-1">
            Saldo em aberto para quitação
          </span>
        </div>
      </div>

      {/* DETALHAMENTO DE PAGAMENTOS POR SÓCIO */}
      <div className="bg-[#10201E] text-white p-4 sm:px-6 rounded-2xl shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#9FB5B0] uppercase tracking-wider">
            Aportes & Pagamentos por Sócio
          </span>
          <span className="text-xs text-[#9FB5B0]">
            Total Pago:{' '}
            <strong className="text-[#10B981]">{formatarMoeda(resumoGeral.totalPago)}</strong>
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1 text-xs">
          <div className="bg-[#1D3431] p-3 rounded-xl border border-[#23534B]/40">
            <span className="text-[#9FB5B0] block text-[11px]">Gutto</span>
            <span className="font-bold text-sm text-white tabular-nums block mt-0.5">
              {formatarMoeda(resumoGeral.totalGutto)}
            </span>
          </div>
          <div className="bg-[#1D3431] p-3 rounded-xl border border-[#23534B]/40">
            <span className="text-[#9FB5B0] block text-[11px]">Ruan</span>
            <span className="font-bold text-sm text-white tabular-nums block mt-0.5">
              {formatarMoeda(resumoGeral.totalRuan)}
            </span>
          </div>
          <div className="bg-[#1D3431] p-3 rounded-xl border border-[#23534B]/40">
            <span className="text-[#9FB5B0] block text-[11px]">PC</span>
            <span className="font-bold text-sm text-white tabular-nums block mt-0.5">
              {formatarMoeda(resumoGeral.totalPc)}
            </span>
          </div>
          <div className="bg-[#1D3431] p-3 rounded-xl border border-[#23534B]/40">
            <span className="text-[#9FB5B0] block text-[11px]">Junior</span>
            <span className="font-bold text-sm text-white tabular-nums block mt-0.5">
              {formatarMoeda(resumoGeral.totalJunior)}
            </span>
          </div>
          <div className="col-span-2 sm:col-span-1 bg-[#1D3431] p-3 rounded-xl border border-[#23534B]/40">
            <span className="text-[#9FB5B0] block text-[11px]">Evento</span>
            <span className="font-bold text-sm text-[#10B981] tabular-nums block mt-0.5">
              {formatarMoeda(resumoGeral.totalEvento)}
            </span>
          </div>
        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E3E1DA] space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Busca */}
          <div className="sm:col-span-5 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5F6B68]" />
            <Input
              type="text"
              placeholder="Buscar por item, responsável..."
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value)
                setPagina(1)
              }}
              className="pl-10 h-10 bg-[#FBFBFA] border-[#E3E1DA] focus:border-[#0E7C6B] focus:ring-[#0E7C6B]/30 rounded-xl text-xs sm:text-sm"
            />
          </div>

          {/* Categoria Select */}
          <div className="sm:col-span-3">
            <Select
              value={categoriaFiltro}
              onValueChange={(val) => {
                setCategoriaFiltro(val)
                setPagina(1)
              }}
            >
              <SelectTrigger className="h-10 bg-[#FBFBFA] border-[#E3E1DA] rounded-xl text-xs">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent className="bg-white border-[#E3E1DA] rounded-xl">
                <SelectItem value="todas">Todas Categorias</SelectItem>
                {CATEGORIAS_PLANEJAMENTO.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Select */}
          <div className="sm:col-span-3">
            <Select
              value={statusFiltro}
              onValueChange={(val) => {
                setStatusFiltro(val)
                setPagina(1)
              }}
            >
              <SelectTrigger className="h-10 bg-[#FBFBFA] border-[#E3E1DA] rounded-xl text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-white border-[#E3E1DA] rounded-xl">
                <SelectItem value="todos">Todos Status</SelectItem>
                {STATUS_PLANEJAMENTO.map((st) => (
                  <SelectItem key={st} value={st}>
                    {st}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Limpar */}
          <div className="sm:col-span-1 flex items-center">
            {isFiltering && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLimparFiltros}
                className="w-full h-10 px-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-xl flex items-center justify-center gap-1"
                title="Limpar filtros"
              >
                <FilterX className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">Limpar</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* TABELA (DESKTOP) E CARDS (MOBILE) */}
      <div className="bg-white rounded-2xl border border-[#E3E1DA] shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#0E7C6B]" />
            <p className="text-xs font-semibold text-[#5F6B68]">Carregando planejamento...</p>
          </div>
        ) : paginatedItens.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <CalendarCheck2 className="h-12 w-12 text-[#5F6B68] mx-auto mb-3 opacity-30" />
            <h3 className="text-base font-bold text-[#18211F]">Nenhum item encontrado</h3>
            <p className="text-xs text-[#5F6B68] mt-1 max-w-sm mx-auto">
              {isFiltering
                ? 'Nenhum item corresponde aos filtros selecionados. Tente limpar os filtros.'
                : 'Ainda não há itens no planejamento. Clique no botão abaixo para adicionar.'}
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
                Novo Item
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* DESKTOP TABLE */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#F0EEE8] text-[#18211F] font-bold border-b border-[#E3E1DA]">
                    <th className="py-3 px-3">Categoria</th>
                    <th className="py-3 px-3">Item</th>
                    <th className="py-3 px-3">Responsável</th>
                    <th className="py-3 px-2 text-center">Qtd</th>
                    <th className="py-3 px-3 text-right">Valor Unit.</th>
                    <th className="py-3 px-3 text-right font-bold text-[#18211F]">Valor Final</th>
                    <th className="py-3 px-2 text-right text-[#5F6B68]">Gutto</th>
                    <th className="py-3 px-2 text-right text-[#5F6B68]">Ruan</th>
                    <th className="py-3 px-2 text-right text-[#5F6B68]">PC</th>
                    <th className="py-3 px-2 text-right text-[#5F6B68]">Junior</th>
                    <th className="py-3 px-2 text-right text-[#5F6B68]">Evento</th>
                    <th className="py-3 px-3 text-right text-emerald-800">Total Pago</th>
                    <th className="py-3 px-3 text-right text-rose-800">Falta Pagar</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-center w-20">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3E1DA]">
                  {paginatedItens.map((i, index) => {
                    const quitado = i.falta_pagar <= 0
                    return (
                      <tr
                        key={i.id}
                        style={{ animationDelay: `${index * 25}ms` }}
                        className={`hover:bg-[#FBFBFA] transition-colors ${
                          quitado ? 'bg-emerald-50/20' : ''
                        }`}
                      >
                        {/* Categoria */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#F0EEE8] text-[#18211F] border border-[#E3E1DA]">
                            {i.categoria}
                          </span>
                        </td>

                        {/* Item */}
                        <td
                          className="py-3 px-3 font-semibold text-[#18211F] max-w-[180px] truncate"
                          title={i.item}
                        >
                          {i.item}
                        </td>

                        {/* Responsável */}
                        <td className="py-3 px-3 text-[#5F6B68] whitespace-nowrap font-medium">
                          <span className="inline-block px-2 py-0.5 rounded bg-[#E2F3EF]/70 text-[#0E7C6B] font-semibold text-[11px]">
                            {i.responsavel}
                          </span>
                        </td>

                        {/* Qtd */}
                        <td className="py-3 px-2 text-center tabular-nums font-semibold">
                          {i.quantidade}
                        </td>

                        {/* Valor Unit */}
                        <td className="py-3 px-3 text-right tabular-nums text-[#5F6B68]">
                          {formatarMoeda(i.valor_unitario)}
                        </td>

                        {/* Valor Final */}
                        <td className="py-3 px-3 text-right tabular-nums font-bold text-[#18211F]">
                          {formatarMoeda(i.valor_final)}
                        </td>

                        {/* Gutto */}
                        <td className="py-3 px-2 text-right tabular-nums text-[#5F6B68]">
                          {i.gutto > 0 ? formatarMoeda(i.gutto) : '—'}
                        </td>

                        {/* Ruan */}
                        <td className="py-3 px-2 text-right tabular-nums text-[#5F6B68]">
                          {i.ruan > 0 ? formatarMoeda(i.ruan) : '—'}
                        </td>

                        {/* PC */}
                        <td className="py-3 px-2 text-right tabular-nums text-[#5F6B68]">
                          {i.pc > 0 ? formatarMoeda(i.pc) : '—'}
                        </td>

                        {/* Junior */}
                        <td className="py-3 px-2 text-right tabular-nums text-[#5F6B68]">
                          {i.junior > 0 ? formatarMoeda(i.junior) : '—'}
                        </td>

                        {/* Evento */}
                        <td className="py-3 px-2 text-right tabular-nums text-[#5F6B68]">
                          {i.evento > 0 ? formatarMoeda(i.evento) : '—'}
                        </td>

                        {/* Total Pago */}
                        <td className="py-3 px-3 text-right tabular-nums font-bold text-[#10B981]">
                          {formatarMoeda(i.total_pago)}
                        </td>

                        {/* Falta Pagar */}
                        <td
                          className={`py-3 px-3 text-right tabular-nums font-bold whitespace-nowrap ${
                            quitado ? 'text-[#10B981]' : 'text-[#F43F5E]'
                          }`}
                        >
                          {formatarMoeda(i.falta_pagar)}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {renderStatusBadge(i.status, i.falta_pagar)}
                        </td>

                        {/* Ações */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEditModal(i)}
                              title="Editar item"
                              className="h-7 w-7 rounded-lg text-[#5F6B68] hover:text-[#0E7C6B] hover:bg-[#E2F3EF]"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDeleteDialog(i)}
                              title="Excluir item"
                              className="h-7 w-7 rounded-lg text-[#5F6B68] hover:text-[#F43F5E] hover:bg-rose-50"
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

            {/* TABLET / MOBILE STACKED CARDS (<1024px) */}
            <div className="lg:hidden divide-y divide-[#E3E1DA]">
              {paginatedItens.map((i) => {
                const quitado = i.falta_pagar <= 0
                return (
                  <div
                    key={i.id}
                    className={`p-4 space-y-3 ${quitado ? 'bg-emerald-50/15' : 'bg-white'}`}
                  >
                    {/* Header do Card */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-semibold bg-[#F0EEE8] px-2 py-0.5 rounded text-[#18211F]">
                            {i.categoria}
                          </span>
                          <span className="text-[11px] font-bold text-[#0E7C6B] bg-[#E2F3EF] px-2 py-0.5 rounded">
                            {i.responsavel}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm sm:text-base text-[#18211F] mt-1.5">
                          {i.item}
                        </h4>
                        <span className="text-xs text-[#5F6B68]">
                          Qtd: <strong>{i.quantidade}</strong> &bull; Unit:{' '}
                          {formatarMoeda(i.valor_unitario)}
                        </span>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs text-[#5F6B68] block">Valor Final</span>
                        <span className="text-base font-extrabold text-[#18211F] tabular-nums block">
                          {formatarMoeda(i.valor_final)}
                        </span>
                        <div className="mt-1">{renderStatusBadge(i.status, i.falta_pagar)}</div>
                      </div>
                    </div>

                    {/* Divisão dos sócios */}
                    <div className="p-2.5 bg-[#F8F7F4] rounded-xl border border-[#E3E1DA] grid grid-cols-5 gap-1 text-center text-[10px]">
                      <div>
                        <span className="text-[#5F6B68] block">Gutto</span>
                        <span className="font-bold text-[#18211F] tabular-nums">
                          {formatarMoeda(i.gutto)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#5F6B68] block">Ruan</span>
                        <span className="font-bold text-[#18211F] tabular-nums">
                          {formatarMoeda(i.ruan)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#5F6B68] block">PC</span>
                        <span className="font-bold text-[#18211F] tabular-nums">
                          {formatarMoeda(i.pc)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#5F6B68] block">Junior</span>
                        <span className="font-bold text-[#18211F] tabular-nums">
                          {formatarMoeda(i.junior)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#5F6B68] block">Evento</span>
                        <span className="font-bold text-[#0E7C6B] tabular-nums">
                          {formatarMoeda(i.evento)}
                        </span>
                      </div>
                    </div>

                    {/* Footer do Card com Totais e Ações */}
                    <div className="flex items-center justify-between pt-1 border-t border-[#F0EEE8] text-xs">
                      <div className="flex items-center gap-3">
                        <div>
                          <span className="text-[#5F6B68] block text-[11px]">Total Pago:</span>
                          <span className="font-bold text-[#10B981] tabular-nums">
                            {formatarMoeda(i.total_pago)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#5F6B68] block text-[11px]">Falta Pagar:</span>
                          <span
                            className={`font-bold tabular-nums ${
                              quitado ? 'text-[#10B981]' : 'text-[#F43F5E]'
                            }`}
                          >
                            {formatarMoeda(i.falta_pagar)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditModal(i)}
                          className="h-8 px-2.5 text-xs font-semibold text-[#5F6B68] hover:text-[#0E7C6B]"
                        >
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDeleteDialog(i)}
                          className="h-8 px-2.5 text-xs font-semibold text-[#F43F5E] hover:bg-rose-50"
                        >
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* PAGINAÇÃO */}
            <div className="p-4 border-t border-[#E3E1DA] flex items-center justify-between gap-2 bg-[#FBFBFA]">
              <p className="text-xs text-[#5F6B68] font-medium">
                Página {currentPage} de {totalPages} ({itensFiltrados.length} itens)
              </p>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  className="rounded-xl border-[#E3E1DA] text-xs h-8 px-3 text-[#18211F]"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPagina((p) => Math.min(totalPages, p + 1))}
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

      {/* MODAL NOVO / EDITAR */}
      <ModalItemPlanejamento
        open={modalOpen}
        onOpenChange={setModalOpen}
        itemParaEditar={itemParaEditar}
        onSave={handleSaveItem}
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
