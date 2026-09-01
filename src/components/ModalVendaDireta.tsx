import { useState, useRef, useEffect, useMemo } from 'react'
import {
  FormaPagamentoVenda,
  FORMAS_PAGAMENTO_VENDA,
  NovaVendaIngressoPayload,
} from '@/types/fluxo-caixa'
import {
  uploadComprovante,
  registrarVendaDiretaIngresso,
  processarComprovanteComIA,
} from '@/services/transacoes'
import { useAuth } from '@/hooks/use-mobile'
import { formatarMoeda, formatarBytes } from '@/lib/formatters'
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
import {
  Ticket,
  Upload,
  X,
  FileText,
  Loader2,
  AlertCircle,
  Paperclip,
  CheckCircle2,
  User,
  CreditCard,
  Phone,
  Mail,
  FileBadge,
  Sparkles,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface ModalVendaDiretaProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function ModalVendaDireta({ open, onOpenChange, onSuccess }: ModalVendaDiretaProps) {
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form Fields
  const [dataVenda, setDataVenda] = useState<string>(new Date().toISOString().split('T')[0])
  const [nomeComprador, setNomeComprador] = useState('')
  const [cpf, setCpf] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [qtdIngressos, setQtdIngressos] = useState<number>(1)
  const [valorUnitario, setValorUnitario] = useState<number>(100)
  const [nomePagador, setNomePagador] = useState('')
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamentoVenda>('PIX')

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  // Submission state
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isReadingReceipt, setIsReadingReceipt] = useState(false)
  const [uploadedStoragePath, setUploadedStoragePath] = useState<string | null>(null)

  // Valor Total calculado automaticamente
  const valorTotal = useMemo(() => {
    const qtd = Number(qtdIngressos) || 0
    const unit = Number(valorUnitario) || 0
    return Math.max(0, Number((qtd * unit).toFixed(2)))
  }, [qtdIngressos, valorUnitario])

  // Reset modal state when opened
  useEffect(() => {
    if (open) {
      setDataVenda(new Date().toISOString().split('T')[0])
      setNomeComprador('')
      setCpf('')
      setEmail('')
      setTelefone('')
      setQtdIngressos(1)
      setValorUnitario(100)
      setNomePagador('')
      setFormaPagamento('PIX')
      setSelectedFile(null)
      setPreviewUrl(null)
      setFileError(null)
      setErrorMsg(null)
      setUploadedStoragePath(null)
    }
  }, [open])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null)
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setFileError('O comprovante deve ter no máximo 5MB.')
      return
    }

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf']
    if (!validTypes.includes(file.type) && !file.name.match(/\.(png|jpe?g|webp|pdf)$/i)) {
      setFileError('Formato inválido. Use imagem (PNG, JPG, WEBP) ou PDF.')
      return
    }

    setSelectedFile(file)
    if (file.type.startsWith('image/')) {
      const objUrl = URL.createObjectURL(file)
      setPreviewUrl(objUrl)
    } else {
      setPreviewUrl(null)
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setUploadedStoragePath(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleLerComprovanteComIA = async () => {
    setErrorMsg(null)
    if (!user) {
      setErrorMsg('Usuário não autenticado.')
      return
    }

    if (!selectedFile && !uploadedStoragePath) {
      setErrorMsg('Nenhum comprovante anexado.')
      return
    }

    setIsReadingReceipt(true)
    try {
      let targetPath = uploadedStoragePath

      // Se ainda não enviamos ao storage, enviar agora
      if (selectedFile && !uploadedStoragePath) {
        targetPath = await uploadComprovante(selectedFile, user.id)
        setUploadedStoragePath(targetPath)
      }

      if (!targetPath) {
        throw new Error('Nenhum comprovante disponível para leitura.')
      }

      const extraidos = await processarComprovanteComIA(targetPath)

      let preencheuAlgo = false

      // Valor extraído: ajustar valorUnitario considerando qtdIngressos ou calcular
      if (extraidos.valor !== null && extraidos.valor !== undefined) {
        const qtd = Number(qtdIngressos) || 1
        // Se a quantidade for 1, valor unitário = valor total
        if (qtd <= 1) {
          setValorUnitario(extraidos.valor)
        } else {
          // Se o usuário já informou quantidade > 1, calcula unitário
          setValorUnitario(Number((extraidos.valor / qtd).toFixed(2)))
        }
        preencheuAlgo = true
      }

      if (extraidos.data) {
        setDataVenda(extraidos.data)
        preencheuAlgo = true
      }

      if (extraidos.nome_pagador) {
        if (!nomeComprador.trim()) {
          setNomeComprador(extraidos.nome_pagador)
        }
        setNomePagador(extraidos.nome_pagador)
        preencheuAlgo = true
      }

      if (extraidos.forma_pagamento) {
        if (FORMAS_PAGAMENTO_VENDA.includes(extraidos.forma_pagamento as FormaPagamentoVenda)) {
          setFormaPagamento(extraidos.forma_pagamento as FormaPagamentoVenda)
          preencheuAlgo = true
        }
      }

      if (preencheuAlgo) {
        toast({
          title: 'Comprovante lido!',
          description: 'Campos preenchidos automaticamente. Revise os dados antes de salvar.',
        })
      } else {
        toast({
          title: 'Leitura concluída',
          description:
            'Não foram encontrados dados legíveis nos padrões esperados. Preencha manualmente.',
          variant: 'default',
        })
      }
    } catch (err: unknown) {
      console.error('Erro ao ler comprovante com IA:', err)
      const msg =
        err instanceof Error
          ? err.message
          : 'Não foi possível ler o comprovante com IA. Tente novamente ou preencha manualmente.'
      setErrorMsg(msg)
      toast({
        title: 'Falha na leitura do comprovante',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setIsReadingReceipt(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!nomeComprador.trim()) {
      setErrorMsg('Informe o nome do comprador.')
      return
    }

    if (!qtdIngressos || qtdIngressos < 1) {
      setErrorMsg('A quantidade de ingressos deve ser de pelo menos 1.')
      return
    }

    if (valorUnitario === undefined || valorUnitario < 0) {
      setErrorMsg('Informe um valor unitário válido.')
      return
    }

    if (!formaPagamento) {
      setErrorMsg('Selecione a forma de pagamento.')
      return
    }

    if (!user) {
      setErrorMsg('Usuário não autenticado.')
      return
    }

    setSaving(true)

    try {
      let uploadedComprovantePath: string | null = null

      // Upload do comprovante para o bucket comprovantes
      if (selectedFile) {
        uploadedComprovantePath =
          uploadedStoragePath || (await uploadComprovante(selectedFile, user.id))
      }

      const payload: NovaVendaIngressoPayload = {
        nome_comprador: nomeComprador.trim(),
        cpf: cpf.trim() || null,
        email: email.trim() || null,
        telefone: telefone.trim() || null,
        qtd_ingressos: Number(qtdIngressos),
        valor_unitario: Number(valorUnitario),
        valor_total: valorTotal,
        nome_pagador: nomePagador.trim() || nomeComprador.trim(),
        forma_pagamento: formaPagamento,
        comprovante_url: uploadedComprovantePath,
      }

      await registrarVendaDiretaIngresso(payload, user.id, dataVenda)

      toast({
        title: 'Venda Direta Registrada!',
        description: `Ingressos salvos e entrada de ${formatarMoeda(valorTotal)} adicionada ao Fluxo de Caixa.`,
      })

      // Trigger custom event so all pages re-fetch
      window.dispatchEvent(new CustomEvent('fluxo-caixa-updated'))

      onOpenChange(false)
      if (onSuccess) {
        onSuccess()
      }
    } catch (err: unknown) {
      console.error('Erro ao registrar venda direta:', err)
      const msg =
        err instanceof Error ? err.message : 'Não foi possível registrar a venda de ingressos.'
      setErrorMsg(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[92vh] overflow-y-auto bg-white rounded-2xl p-6 shadow-2xl border border-[#E3E1DA]">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-[#E2F3EF] text-[#0E7C6B] flex items-center justify-center shrink-0">
              <Ticket className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-[#18211F]">
                Venda Direta de Ingressos
              </DialogTitle>
              <DialogDescription className="text-xs text-[#5F6B68]">
                Cadastre a venda avulsa e gere automaticamente uma entrada de Fluxo de Caixa.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {errorMsg && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Data da Venda */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="data-venda" className="text-xs font-semibold text-[#18211F]">
                Data da Venda *
              </Label>
              <Input
                id="data-venda"
                type="date"
                required
                value={dataVenda}
                onChange={(e) => setDataVenda(e.target.value)}
                className="bg-[#FBFBFA] border-[#E3E1DA] focus:border-[#0E7C6B] focus:ring-[#0E7C6B]/30 rounded-xl text-xs sm:text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="forma-pagamento"
                className="text-xs font-semibold text-[#18211F] flex items-center gap-1.5"
              >
                <CreditCard className="h-3.5 w-3.5 text-[#0E7C6B]" />
                Forma de Pagamento *
              </Label>
              <Select
                value={formaPagamento}
                onValueChange={(val) => setFormaPagamento(val as FormaPagamentoVenda)}
              >
                <SelectTrigger
                  id="forma-pagamento"
                  className="bg-[#FBFBFA] border-[#E3E1DA] rounded-xl text-xs sm:text-sm"
                >
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#E3E1DA] rounded-xl">
                  {FORMAS_PAGAMENTO_VENDA.map((fp) => (
                    <SelectItem key={fp} value={fp} className="cursor-pointer">
                      {fp}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Nome do Comprador */}
          <div className="space-y-1.5">
            <Label
              htmlFor="nome-comprador"
              className="text-xs font-semibold text-[#18211F] flex items-center gap-1.5"
            >
              <User className="h-3.5 w-3.5 text-[#0E7C6B]" />
              Nome do Comprador *
            </Label>
            <Input
              id="nome-comprador"
              type="text"
              placeholder="Nome completo do comprador"
              required
              value={nomeComprador}
              onChange={(e) => setNomeComprador(e.target.value)}
              className="bg-[#FBFBFA] border-[#E3E1DA] focus:border-[#0E7C6B] focus:ring-[#0E7C6B]/30 rounded-xl text-xs sm:text-sm"
            />
          </div>

          {/* Grid: CPF, Email, Telefone */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="cpf"
                className="text-xs font-semibold text-[#18211F] flex items-center gap-1"
              >
                <FileBadge className="h-3.5 w-3.5 text-[#5F6B68]" />
                CPF
              </Label>
              <Input
                id="cpf"
                type="text"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                className="bg-[#FBFBFA] border-[#E3E1DA] focus:border-[#0E7C6B] focus:ring-[#0E7C6B]/30 rounded-xl text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-xs font-semibold text-[#18211F] flex items-center gap-1"
              >
                <Mail className="h-3.5 w-3.5 text-[#5F6B68]" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="comprador@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-[#FBFBFA] border-[#E3E1DA] focus:border-[#0E7C6B] focus:ring-[#0E7C6B]/30 rounded-xl text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="telefone"
                className="text-xs font-semibold text-[#18211F] flex items-center gap-1"
              >
                <Phone className="h-3.5 w-3.5 text-[#5F6B68]" />
                Telefone
              </Label>
              <Input
                id="telefone"
                type="tel"
                placeholder="(00) 00000-0000"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="bg-[#FBFBFA] border-[#E3E1DA] focus:border-[#0E7C6B] focus:ring-[#0E7C6B]/30 rounded-xl text-xs"
              />
            </div>
          </div>

          {/* Nome do Pagador (opcional) */}
          <div className="space-y-1.5">
            <Label htmlFor="nome-pagador" className="text-xs font-semibold text-[#18211F]">
              Nome do Pagador{' '}
              <span className="text-[#5F6B68] font-normal">
                (opcional, se diferente do comprador)
              </span>
            </Label>
            <Input
              id="nome-pagador"
              type="text"
              placeholder="Preencha se outra pessoa pagou a conta/PIX"
              value={nomePagador}
              onChange={(e) => setNomePagador(e.target.value)}
              className="bg-[#FBFBFA] border-[#E3E1DA] focus:border-[#0E7C6B] focus:ring-[#0E7C6B]/30 rounded-xl text-xs sm:text-sm"
            />
          </div>

          {/* Grid: Quantidade, Valor Unitário, Valor Total */}
          <div className="p-3.5 rounded-2xl bg-[#F0EEE8]/70 border border-[#E3E1DA] space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Quantidade */}
              <div className="space-y-1.5">
                <Label htmlFor="qtd-ingressos" className="text-xs font-semibold text-[#18211F]">
                  Quantidade *
                </Label>
                <Input
                  id="qtd-ingressos"
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={qtdIngressos}
                  onChange={(e) => setQtdIngressos(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="bg-white border-[#E3E1DA] focus:border-[#0E7C6B] rounded-xl text-center font-bold text-sm"
                />
              </div>

              {/* Valor Unitário */}
              <div className="space-y-1.5">
                <Label htmlFor="valor-unitario" className="text-xs font-semibold text-[#18211F]">
                  Valor Unitário (R$) *
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#5F6B68]">
                    R$
                  </span>
                  <Input
                    id="valor-unitario"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={valorUnitario}
                    onChange={(e) => setValorUnitario(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="pl-9 bg-white border-[#E3E1DA] focus:border-[#0E7C6B] rounded-xl font-bold text-sm"
                  />
                </div>
              </div>

              {/* Valor Total Calculado */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[#0E7C6B] uppercase tracking-wider">
                  Valor Total
                </Label>
                <div className="h-10 px-3.5 rounded-xl bg-[#E2F3EF] border border-[#0E7C6B]/30 flex items-center justify-between">
                  <span className="text-xs text-[#0E7C6B] font-semibold">Entrada</span>
                  <span className="text-base font-extrabold text-[#0E7C6B] tabular-nums">
                    {formatarMoeda(valorTotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Upload Comprovante */}
          <div className="space-y-2 pt-1">
            <Label className="text-xs font-semibold text-[#18211F] flex items-center gap-1.5">
              <Paperclip className="h-3.5 w-3.5 text-[#0E7C6B]" />
              Comprovante (Imagem / PDF)
            </Label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />

            {selectedFile ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-xl border border-[#0E7C6B]/40 bg-[#E2F3EF]/40">
                  <div className="flex items-center gap-3 overflow-hidden">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="h-10 w-10 object-cover rounded-lg border border-[#0E7C6B]/20"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-[#0E7C6B]/10 flex items-center justify-center text-[#0E7C6B]">
                        <FileText className="h-5 w-5" />
                      </div>
                    )}
                    <div className="truncate text-xs">
                      <p className="font-semibold text-[#18211F] truncate">{selectedFile.name}</p>
                      <p className="text-[#5F6B68]">{formatarBytes(selectedFile.size)}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveFile}
                    className="text-red-600 hover:bg-red-50 hover:text-red-700 h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Botão de Ler Comprovante com IA */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleLerComprovanteComIA}
                  disabled={isReadingReceipt || saving}
                  className="w-full bg-[#E2F3EF] hover:bg-[#cbebe3] text-[#0E7C6B] border border-[#0E7C6B]/30 font-semibold rounded-xl text-xs py-2 h-auto flex items-center justify-center gap-2 transition-colors shadow-xs"
                >
                  {isReadingReceipt ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Analisando Comprovante com IA...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5 text-[#0E7C6B]" />
                      Ler Comprovante com IA
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#E3E1DA] hover:border-[#0E7C6B] rounded-xl p-4 text-center cursor-pointer transition-colors bg-[#FBFBFA] hover:bg-[#F0EEE8]"
              >
                <Upload className="h-6 w-6 mx-auto text-[#5F6B68] mb-1.5" />
                <p className="text-xs font-semibold text-[#18211F]">
                  Clique para anexar o comprovante do pagamento
                </p>
                <p className="text-[11px] text-[#5F6B68] mt-0.5">
                  Formatos aceitos: Imagens (PNG, JPG, WEBP) ou PDF (máx. 5MB)
                </p>
              </div>
            )}

            {fileError && (
              <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                <AlertCircle className="h-3 w-3" /> {fileError}
              </p>
            )}
          </div>

          {/* Footer actions */}
          <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-[#E3E1DA]">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="rounded-xl border-[#E3E1DA] text-[#5F6B68] hover:bg-[#F0EEE8]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#0E7C6B] hover:bg-[#0A6255] text-white font-semibold flex items-center gap-2 px-5 shadow-sm"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Registrando Venda...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Salvar Venda Direta
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
