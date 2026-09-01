import { useState, useEffect } from 'react'
import {
  CATEGORIAS_PLANEJAMENTO,
  STATUS_PLANEJAMENTO,
  CategoriaPlanejamento,
  StatusPlanejamento,
  ItemPlanejamento,
  NovoItemPlanejamentoPayload,
} from '@/types/fluxo-caixa'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatarMoeda } from '@/lib/formatters'
import { Loader2, AlertCircle, Calculator, CheckCircle2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface ModalItemPlanejamentoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemParaEditar?: ItemPlanejamento | null
  onSuccess: () => void
  onSave: (payload: NovoItemPlanejamentoPayload, id?: string) => Promise<void>
}

export function ModalItemPlanejamento({
  open,
  onOpenChange,
  itemParaEditar,
  onSuccess,
  onSave,
}: ModalItemPlanejamentoProps) {
  const [categoria, setCategoria] = useState<CategoriaPlanejamento | ''>('')
  const [item, setItem] = useState('')
  const [responsavel, setResponsavel] = useState('')
  const [quantidadeStr, setQuantidadeStr] = useState<string>('1')
  const [valorUnitarioStr, setValorUnitarioStr] = useState<string>('')

  // Campos manuais de sócios
  const [guttoStr, setGuttoStr] = useState<string>('')
  const [ruanStr, setRuanStr] = useState<string>('')
  const [pcStr, setPcStr] = useState<string>('')
  const [juniorStr, setJuniorStr] = useState<string>('')

  const [status, setStatus] = useState<StatusPlanejamento>('Pendente')

  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Helper para converter string de input em número seguro
  const parseNum = (str: string): number => {
    if (!str) return 0
    const limpo = str.replace(/\./g, '').replace(',', '.').trim()
    const val = parseFloat(limpo)
    return isNaN(val) ? 0 : Math.max(0, val)
  }

  // Preencher dados ao abrir/editar
  useEffect(() => {
    if (open) {
      setErrorMsg(null)
      if (itemParaEditar) {
        setCategoria(
          CATEGORIAS_PLANEJAMENTO.includes(itemParaEditar.categoria as CategoriaPlanejamento)
            ? (itemParaEditar.categoria as CategoriaPlanejamento)
            : '',
        )
        setItem(itemParaEditar.item || '')
        setResponsavel(itemParaEditar.responsavel || '')
        setQuantidadeStr(itemParaEditar.quantidade?.toString() || '1')
        setValorUnitarioStr(
          itemParaEditar.valor_unitario > 0
            ? itemParaEditar.valor_unitario.toString().replace('.', ',')
            : '',
        )
        setGuttoStr(
          itemParaEditar.gutto > 0 ? itemParaEditar.gutto.toString().replace('.', ',') : '',
        )
        setRuanStr(itemParaEditar.ruan > 0 ? itemParaEditar.ruan.toString().replace('.', ',') : '')
        setPcStr(itemParaEditar.pc > 0 ? itemParaEditar.pc.toString().replace('.', ',') : '')
        setJuniorStr(
          itemParaEditar.junior > 0 ? itemParaEditar.junior.toString().replace('.', ',') : '',
        )
        setStatus(
          STATUS_PLANEJAMENTO.includes(itemParaEditar.status as StatusPlanejamento)
            ? (itemParaEditar.status as StatusPlanejamento)
            : 'Pendente',
        )
      } else {
        setCategoria('')
        setItem('')
        setResponsavel('')
        setQuantidadeStr('1')
        setValorUnitarioStr('')
        setGuttoStr('')
        setRuanStr('')
        setPcStr('')
        setJuniorStr('')
        setStatus('Pendente')
      }
    }
  }, [open, itemParaEditar])

  // Cálculos automáticos em tempo real:
  // 1. valor_final = quantidade × valor_unitario
  // 2. evento = valor_final - gutto - ruan - pc - junior (automático / somente leitura)
  // 3. total_pago = gutto + ruan + pc + junior + evento
  // 4. falta_pagar = valor_final - total_pago
  const qtd = parseNum(quantidadeStr) || 1
  const valorUnit = parseNum(valorUnitarioStr)
  const valorFinalCalculado = Number((qtd * valorUnit).toFixed(2))

  const guttoVal = parseNum(guttoStr)
  const ruanVal = parseNum(ruanStr)
  const pcVal = parseNum(pcStr)
  const juniorVal = parseNum(juniorStr)

  const eventoCalculado = Number(
    (valorFinalCalculado - guttoVal - ruanVal - pcVal - juniorVal).toFixed(2),
  )
  const totalPagoCalculado = Number(
    (guttoVal + ruanVal + pcVal + juniorVal + eventoCalculado).toFixed(2),
  )
  const faltaPagarCalculado = Number((valorFinalCalculado - totalPagoCalculado).toFixed(2))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!categoria) {
      setErrorMsg('Selecione uma categoria.')
      return
    }

    if (!item.trim()) {
      setErrorMsg('Informe o nome do item.')
      return
    }

    if (!responsavel.trim()) {
      setErrorMsg('Informe o responsável pelo item.')
      return
    }

    if (qtd < 1) {
      setErrorMsg('A quantidade deve ser de no mínimo 1.')
      return
    }

    if (valorUnit < 0) {
      setErrorMsg('O valor unitário deve ser maior ou igual a zero.')
      return
    }

    setSaving(true)

    try {
      const payload: NovoItemPlanejamentoPayload = {
        categoria,
        item: item.trim(),
        responsavel: responsavel.trim(),
        quantidade: qtd,
        valor_unitario: valorUnit,
        valor_final: valorFinalCalculado,
        gutto: guttoVal,
        ruan: ruanVal,
        pc: pcVal,
        junior: juniorVal,
        evento: eventoCalculado,
        total_pago: totalPagoCalculado,
        falta_pagar: faltaPagarCalculado,
        status,
      }

      await onSave(payload, itemParaEditar?.id)

      toast({
        title: itemParaEditar ? 'Item atualizado!' : 'Item adicionado ao planejamento!',
        description: `${item.trim()} salvo com sucesso.`,
      })

      onOpenChange(false)
      onSuccess()
    } catch (err: unknown) {
      console.error('Erro ao salvar item do planejamento:', err)
      const msg = err instanceof Error ? err.message : 'Falha ao salvar item.'
      setErrorMsg(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[92vh] overflow-y-auto bg-white rounded-2xl p-6 shadow-xl border border-[#E3E1DA]">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl font-bold text-[#18211F]">
            {itemParaEditar ? 'Editar Item de Planejamento' : 'Novo Item de Planejamento'}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-[#5F6B68]">
            Preencha os dados do item, valores e a contribuição individual de cada sócio/evento.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="flex items-center gap-2.5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Categoria e Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#18211F]">Categoria *</Label>
              <Select
                value={categoria}
                onValueChange={(val) => setCategoria(val as CategoriaPlanejamento)}
              >
                <SelectTrigger className="bg-[#FBFBFA] border-[#E3E1DA] rounded-xl text-xs sm:text-sm focus:ring-[#0E7C6B]/30">
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#E3E1DA] rounded-xl">
                  {CATEGORIAS_PLANEJAMENTO.map((cat) => (
                    <SelectItem key={cat} value={cat} className="cursor-pointer text-xs sm:text-sm">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#18211F]">Status de Pagamento *</Label>
              <Select value={status} onValueChange={(val) => setStatus(val as StatusPlanejamento)}>
                <SelectTrigger className="bg-[#FBFBFA] border-[#E3E1DA] rounded-xl text-xs sm:text-sm focus:ring-[#0E7C6B]/30">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#E3E1DA] rounded-xl">
                  <SelectItem value="Pago Total" className="cursor-pointer text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span>Pago Total</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="Pago Parcial" className="cursor-pointer text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      <span>Pago Parcial</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="Pendente" className="cursor-pointer text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-rose-500" />
                      <span>Pendente</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>{' '}
          </div>

          {/* Item e Responsável */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="item-nome" className="text-xs font-semibold text-[#18211F]">
                Item / Descrição *
              </Label>
              <Input
                id="item-nome"
                type="text"
                placeholder="Ex.: Palco Principal, DJ Convidado..."
                required
                value={item}
                onChange={(e) => setItem(e.target.value)}
                className="bg-[#FBFBFA] border-[#E3E1DA] focus:border-[#0E7C6B] focus:ring-[#0E7C6B]/30 rounded-xl text-xs sm:text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="item-responsavel" className="text-xs font-semibold text-[#18211F]">
                Responsável *
              </Label>
              <Input
                id="item-responsavel"
                type="text"
                placeholder="Ex.: Gutto, Ruan, Equipe..."
                required
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
                className="bg-[#FBFBFA] border-[#E3E1DA] focus:border-[#0E7C6B] focus:ring-[#0E7C6B]/30 rounded-xl text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Quantidade, Valor Unitário e Valor Final */}
          <div className="p-3.5 bg-[#F8F7F4] rounded-xl border border-[#E3E1DA] space-y-3">
            <div className="text-xs font-bold text-[#18211F] flex items-center gap-1.5">
              <Calculator className="h-4 w-4 text-[#0E7C6B]" />
              Valores e Quantidades
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="item-qtd" className="text-[11px] font-semibold text-[#5F6B68]">
                  Quantidade *
                </Label>
                <Input
                  id="item-qtd"
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={quantidadeStr}
                  onChange={(e) => setQuantidadeStr(e.target.value)}
                  className="bg-white border-[#E3E1DA] focus:border-[#0E7C6B] rounded-xl text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label
                  htmlFor="item-valor-unit"
                  className="text-[11px] font-semibold text-[#5F6B68]"
                >
                  Valor Unitário (R$)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#5F6B68]">
                    R$
                  </span>
                  <Input
                    id="item-valor-unit"
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={valorUnitarioStr}
                    onChange={(e) => setValorUnitarioStr(e.target.value)}
                    className="pl-9 bg-white border-[#E3E1DA] focus:border-[#0E7C6B] rounded-xl text-xs sm:text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-[#5F6B68]">
                  Valor Final (Calculado)
                </Label>
                <div className="h-10 px-3 bg-[#EAE8E1] border border-[#D5D3CB] rounded-xl flex items-center font-bold text-xs sm:text-sm text-[#18211F] tabular-nums">
                  {formatarMoeda(valorFinalCalculado)}
                </div>
              </div>
            </div>
          </div>

          {/* Divisão dos Pagamentos: Sócios (Manual) e Evento (Calculado) */}
          <div className="p-3.5 bg-[#F8F7F4] rounded-xl border border-[#E3E1DA] space-y-3">
            <div>
              <span className="text-xs font-bold text-[#18211F] block">Divisão dos Pagamentos</span>
              <span className="text-[11px] text-[#5F6B68] block">
                Insira o valor pago por cada sócio. O valor do <strong>Evento</strong> é calculado
                automaticamente (Valor Final - Sócios).
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div className="space-y-1">
                <Label htmlFor="item-gutto" className="text-[11px] font-semibold text-[#18211F]">
                  Gutto (R$)
                </Label>
                <Input
                  id="item-gutto"
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={guttoStr}
                  onChange={(e) => setGuttoStr(e.target.value)}
                  className="bg-white border-[#E3E1DA] focus:border-[#0E7C6B] rounded-lg text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="item-ruan" className="text-[11px] font-semibold text-[#18211F]">
                  Ruan (R$)
                </Label>
                <Input
                  id="item-ruan"
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={ruanStr}
                  onChange={(e) => setRuanStr(e.target.value)}
                  className="bg-white border-[#E3E1DA] focus:border-[#0E7C6B] rounded-lg text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="item-pc" className="text-[11px] font-semibold text-[#18211F]">
                  PC (R$)
                </Label>
                <Input
                  id="item-pc"
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={pcStr}
                  onChange={(e) => setPcStr(e.target.value)}
                  className="bg-white border-[#E3E1DA] focus:border-[#0E7C6B] rounded-lg text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="item-junior" className="text-[11px] font-semibold text-[#18211F]">
                  Junior (R$)
                </Label>
                <Input
                  id="item-junior"
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={juniorStr}
                  onChange={(e) => setJuniorStr(e.target.value)}
                  className="bg-white border-[#E3E1DA] focus:border-[#0E7C6B] rounded-lg text-xs"
                />
              </div>

              <div className="col-span-2 sm:col-span-1 space-y-1">
                <Label className="text-[11px] font-semibold text-[#18211F]">
                  Evento (Calculado)
                </Label>
                <div
                  className={`h-9 px-2.5 bg-[#EAE8E1] border border-[#D5D3CB] rounded-lg flex items-center font-bold text-xs tabular-nums truncate ${
                    eventoCalculado < 0 ? 'text-amber-700' : 'text-[#0E7C6B]'
                  }`}
                  title={formatarMoeda(eventoCalculado)}
                >
                  {formatarMoeda(eventoCalculado)}
                </div>
              </div>
            </div>
          </div>

          {/* Resumo Automático: Total Pago e Falta Pagar */}
          <div className="grid grid-cols-2 gap-3 p-3.5 bg-[#10201E] text-white rounded-xl shadow-inner">
            <div>
              <span className="text-[11px] text-[#9FB5B0] block">Total Pago (Soma dos Sócios)</span>
              <span className="text-sm sm:text-base font-extrabold text-[#10B981] tabular-nums">
                {formatarMoeda(totalPagoCalculado)}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-[#9FB5B0] block">Falta Pagar</span>
              <span
                className={`text-sm sm:text-base font-extrabold tabular-nums flex items-center justify-end gap-1 ${
                  faltaPagarCalculado <= 0 ? 'text-[#10B981]' : 'text-[#F43F5E]'
                }`}
              >
                {faltaPagarCalculado <= 0 && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981]" />
                )}
                {formatarMoeda(faltaPagarCalculado)}
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-[#E3E1DA]">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="rounded-xl border-[#E3E1DA] text-[#5F6B68] hover:bg-[#F0EEE8] text-xs sm:text-sm"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#0E7C6B] hover:bg-[#0A6255] text-white font-semibold flex items-center gap-2 px-5 text-xs sm:text-sm"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : itemParaEditar ? (
                'Salvar Alterações'
              ) : (
                'Adicionar Item'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
