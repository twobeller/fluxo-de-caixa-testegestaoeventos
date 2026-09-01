import { useState, useRef, useEffect } from 'react'
import {
  CATEGORIAS_TRANSACOES,
  RESPONSAVEIS_TRANSACOES,
  CategoriaTransacao,
  ResponsavelTransacao,
  Transacao,
  NovaTransacaoPayload,
} from '@/types/fluxo-caixa'
import { uploadComprovante, obterUrlComprovante } from '@/services/transacoes'
import { useAuth } from '@/hooks/use-mobile'
import { formatarBytes } from '@/lib/formatters'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Upload, X, FileText, Loader2, AlertCircle, Paperclip, CheckCircle2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface ModalTransacaoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transacaoParaEditar?: Transacao | null
  onSuccess: () => void
  onSave: (payload: NovaTransacaoPayload, id?: string) => Promise<void>
}

export function ModalTransacao({
  open,
  onOpenChange,
  transacaoParaEditar,
  onSuccess,
  onSave,
}: ModalTransacaoProps) {
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [tipo, setTipo] = useState<'entrada' | 'saida'>('entrada')
  const [data, setData] = useState<string>(new Date().toISOString().split('T')[0])
  const [descricao, setDescricao] = useState('')
  const [categoria, setCategoria] = useState<CategoriaTransacao | ''>('')
  const [valorStr, setValorStr] = useState<string>('')
  const [responsavel, setResponsavel] = useState<ResponsavelTransacao | ''>('')
  const [observacoes, setObservacoes] = useState('')

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [existingComprovanteUrl, setExistingComprovanteUrl] = useState<string | null>(null)
  const [existingPublicUrl, setExistingPublicUrl] = useState<string | null>(null)
  const [removerComprovanteAtual, setRemoverComprovanteAtual] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setErrorMsg(null)
      setFileError(null)
      setSelectedFile(null)
      setRemoverComprovanteAtual(false)

      if (transacaoParaEditar) {
        const isSaida = transacaoParaEditar.saida > 0
        setTipo(isSaida ? 'saida' : 'entrada')
        setData(transacaoParaEditar.data || new Date().toISOString().split('T')[0])
        setDescricao(transacaoParaEditar.descricao || '')
        setCategoria(
          CATEGORIAS_TRANSACOES.includes(transacaoParaEditar.categoria as CategoriaTransacao)
            ? (transacaoParaEditar.categoria as CategoriaTransacao)
            : '',
        )
        const valorNum = isSaida ? transacaoParaEditar.saida : transacaoParaEditar.entrada
        setValorStr(valorNum > 0 ? valorNum.toString().replace('.', ',') : '')
        setResponsavel(
          RESPONSAVEIS_TRANSACOES.includes(transacaoParaEditar.responsavel as ResponsavelTransacao)
            ? (transacaoParaEditar.responsavel as ResponsavelTransacao)
            : '',
        )
        setObservacoes(transacaoParaEditar.observacoes || '')
        setExistingComprovanteUrl(transacaoParaEditar.comprovante_url || null)

        if (transacaoParaEditar.comprovante_url) {
          obterUrlComprovante(transacaoParaEditar.comprovante_url).then((url) => {
            setExistingPublicUrl(url)
          })
        } else {
          setExistingPublicUrl(null)
        }
      } else {
        setTipo('entrada')
        setData(new Date().toISOString().split('T')[0])
        setDescricao('')
        setCategoria('')
        setValorStr('')
        setResponsavel('')
        setObservacoes('')
        setExistingComprovanteUrl(null)
        setExistingPublicUrl(null)
      }
    }
  }, [open, transacaoParaEditar])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null)
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setFileError('Arquivo deve ter no máximo 5MB.')
      return
    }

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf']
    if (!validTypes.includes(file.type) && !file.name.match(/\.(png|jpe?g|webp|pdf)$/i)) {
      setFileError('Formato inválido. Use PNG, JPG ou PDF.')
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

  const handleRemoveSelectedFile = () => {
    setSelectedFile(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!descricao.trim()) {
      setErrorMsg('Informe a descrição da transação.')
      return
    }

    if (!categoria) {
      setErrorMsg('Selecione uma categoria.')
      return
    }

    if (!responsavel) {
      setErrorMsg('Selecione um responsável.')
      return
    }

    const valorLimpo = valorStr.replace(/\./g, '').replace(',', '.').trim()
    const valor = parseFloat(valorLimpo)
    if (isNaN(valor) || valor <= 0) {
      setErrorMsg('Informe um valor válido maior que zero.')
      return
    }

    if (!data) {
      setErrorMsg('Informe a data da transação.')
      return
    }

    setSaving(true)

    try {
      let finalComprovanteUrl = existingComprovanteUrl

      if (removerComprovanteAtual) {
        finalComprovanteUrl = null
      }

      if (selectedFile && user) {
        const uploadedPath = await uploadComprovante(selectedFile, user.id)
        finalComprovanteUrl = uploadedPath
      }

      const payload: NovaTransacaoPayload = {
        data,
        descricao: descricao.trim(),
        categoria,
        entrada: tipo === 'entrada' ? valor : 0,
        saida: tipo === 'saida' ? valor : 0,
        responsavel,
        comprovante_url: finalComprovanteUrl,
        observacoes: observacoes.trim() || null,
      }

      await onSave(payload, transacaoParaEditar?.id)

      toast({
        title: transacaoParaEditar ? 'Transação atualizada!' : 'Transação salva com sucesso!',
        description: `${descricao} (${tipo === 'entrada' ? 'Entrada' : 'Saída'}) registrada.`,
      })

      onOpenChange(false)
      onSuccess()
    } catch (err: unknown) {
      console.error('Erro ao salvar:', err)
      const msg = err instanceof Error ? err.message : 'Falha ao salvar a transação.'
      setErrorMsg(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[580px] max-h-[90vh] overflow-y-auto bg-white rounded-2xl p-6 shadow-xl border border-[#E3E1DA]">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl font-bold text-[#18211F]">
            {transacaoParaEditar ? 'Editar Transação' : 'Nova Transação'}
          </DialogTitle>
          <DialogDescription className="text-sm text-[#5F6B68]">
            Preencha os dados do fluxo de caixa e anexe comprovantes fiscais ou recibos.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="flex items-center gap-2.5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Tipo de movimentação: Entrada ou Saída */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-[#5F6B68]">
              Tipo de Movimentação *
            </Label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#F0EEE8] rounded-xl">
              <button
                type="button"
                onClick={() => setTipo('entrada')}
                className={`py-2 px-4 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                  tipo === 'entrada'
                    ? 'bg-[#10B981] text-white shadow-sm'
                    : 'text-[#5F6B68] hover:text-[#18211F]'
                }`}
              >
                <span className="text-base">↓</span> Entrada (R$)
              </button>
              <button
                type="button"
                onClick={() => setTipo('saida')}
                className={`py-2 px-4 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                  tipo === 'saida'
                    ? 'bg-[#F43F5E] text-white shadow-sm'
                    : 'text-[#5F6B68] hover:text-[#18211F]'
                }`}
              >
                <span className="text-base">↑</span> Saída (R$)
              </button>
            </div>
          </div>

          {/* Grid: Data e Valor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="data-transacao" className="text-xs font-semibold text-[#18211F]">
                Data *
              </Label>
              <Input
                id="data-transacao"
                type="date"
                required
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="bg-[#FBFBFA] border-[#E3E1DA] focus:border-[#0E7C6B] focus:ring-[#0E7C6B]/30 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="valor-transacao" className="text-xs font-semibold text-[#18211F]">
                Valor ({tipo === 'entrada' ? 'Entrada' : 'Saída'}) *
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[#5F6B68]">
                  R$
                </span>
                <Input
                  id="valor-transacao"
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  required
                  value={valorStr}
                  onChange={(e) => setValorStr(e.target.value)}
                  className={`pl-10 tabular-nums font-semibold bg-[#FBFBFA] border-[#E3E1DA] rounded-xl ${
                    tipo === 'entrada' ? 'text-[#10B981]' : 'text-[#F43F5E]'
                  } focus:border-[#0E7C6B] focus:ring-[#0E7C6B]/30`}
                />
              </div>
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <Label htmlFor="descricao-transacao" className="text-xs font-semibold text-[#18211F]">
              Descrição *
            </Label>
            <Input
              id="descricao-transacao"
              type="text"
              placeholder="Ex.: Venda de produtos, Cachê, Fornecedor de bebidas..."
              required
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="bg-[#FBFBFA] border-[#E3E1DA] focus:border-[#0E7C6B] focus:ring-[#0E7C6B]/30 rounded-xl"
            />
          </div>

          {/* Grid: Categoria e Responsável */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#18211F]">Categoria *</Label>
              <Select
                value={categoria}
                onValueChange={(val) => setCategoria(val as CategoriaTransacao)}
              >
                <SelectTrigger className="bg-[#FBFBFA] border-[#E3E1DA] rounded-xl focus:ring-[#0E7C6B]/30">
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#E3E1DA] rounded-xl">
                  {CATEGORIAS_TRANSACOES.map((cat) => (
                    <SelectItem key={cat} value={cat} className="cursor-pointer">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#18211F]">Responsável *</Label>
              <Select
                value={responsavel}
                onValueChange={(val) => setResponsavel(val as ResponsavelTransacao)}
              >
                <SelectTrigger className="bg-[#FBFBFA] border-[#E3E1DA] rounded-xl focus:ring-[#0E7C6B]/30">
                  <SelectValue placeholder="Selecione o responsável" />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#E3E1DA] rounded-xl">
                  {RESPONSAVEIS_TRANSACOES.map((resp) => (
                    <SelectItem key={resp} value={resp} className="cursor-pointer">
                      {resp}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Upload Comprovante */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-[#18211F] flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5 text-[#0E7C6B]" />
                Anexar Comprovante (PNG, JPG ou PDF máx 5MB)
              </Label>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Existing receipt in edit mode */}
            {existingComprovanteUrl && !removerComprovanteAtual && !selectedFile && (
              <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-200 bg-emerald-50/60">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <div className="truncate text-xs">
                    <span className="font-semibold text-emerald-900 block">
                      Comprovante já anexado
                    </span>
                    {existingPublicUrl ? (
                      <a
                        href={existingPublicUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-700 underline hover:text-emerald-900"
                      >
                        Visualizar arquivo atual
                      </a>
                    ) : (
                      <span className="text-emerald-700">Arquivo salvo</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-[#0E7C6B] hover:bg-emerald-100/50"
                  >
                    Trocar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setRemoverComprovanteAtual(true)}
                    className="text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    Remover
                  </Button>
                </div>
              </div>
            )}

            {/* New selected file */}
            {selectedFile && (
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
                  onClick={handleRemoveSelectedFile}
                  className="text-red-600 hover:bg-red-50 hover:text-red-700 h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Upload drop/click zone if no file is currently staged */}
            {!selectedFile && (!existingComprovanteUrl || removerComprovanteAtual) && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#E3E1DA] hover:border-[#0E7C6B] rounded-xl p-4 text-center cursor-pointer transition-colors bg-[#FBFBFA] hover:bg-[#F0EEE8]"
              >
                <Upload className="h-6 w-6 mx-auto text-[#5F6B68] mb-1.5" />
                <p className="text-xs font-semibold text-[#18211F]">
                  Clique para selecionar ou arraste o comprovante
                </p>
                <p className="text-[11px] text-[#5F6B68] mt-0.5">
                  Formatos aceitos: PNG, JPG, PDF (máx. 5MB)
                </p>
              </div>
            )}

            {fileError && (
              <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                <AlertCircle className="h-3 w-3" /> {fileError}
              </p>
            )}
          </div>

          {/* Observações */}
          <div className="space-y-1.5">
            <Label htmlFor="observacoes-transacao" className="text-xs font-semibold text-[#18211F]">
              Observações (opcional)
            </Label>
            <Textarea
              id="observacoes-transacao"
              placeholder="Detalhes adicionais, número de nota fiscal, PIX..."
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="bg-[#FBFBFA] border-[#E3E1DA] focus:border-[#0E7C6B] focus:ring-[#0E7C6B]/30 rounded-xl resize-none text-xs"
            />
          </div>

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
              className="rounded-xl bg-[#0E7C6B] hover:bg-[#0A6255] text-white font-semibold flex items-center gap-2 px-5"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : transacaoParaEditar ? (
                'Salvar Alterações'
              ) : (
                'Salvar Transação'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
