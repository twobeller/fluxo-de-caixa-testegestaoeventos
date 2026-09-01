import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  buscarTransacaoPorId,
  obterUrlComprovante,
  excluirTransacao,
  atualizarTransacao,
} from '@/services/transacoes'
import { Transacao, NovaTransacaoPayload } from '@/types/fluxo-caixa'
import { formatarMoeda, formatarDataExtenso, formatarData } from '@/lib/formatters'
import { ModalTransacao } from '@/components/ModalTransacao'
import { DialogExcluir } from '@/components/DialogExcluir'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ArrowLeft,
  Calendar,
  User,
  Tag,
  Paperclip,
  ExternalLink,
  Pencil,
  Trash2,
  FileText,
  Loader2,
  Wallet,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

export default function TransactionDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [transacao, setTransacao] = useState<Transacao | null>(null)
  const [comprovanteUrl, setComprovanteUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Modals
  const [modalOpen, setModalOpen] = useState(false)
  const [dialogExcluirOpen, setDialogExcluirOpen] = useState(false)

  const carregarTransacao = async () => {
    if (!id) return
    setLoading(true)
    try {
      const data = await buscarTransacaoPorId(id)
      setTransacao(data)
      if (data?.comprovante_url) {
        const url = await obterUrlComprovante(data.comprovante_url)
        setComprovanteUrl(url)
      } else {
        setComprovanteUrl(null)
      }
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao buscar transação',
        description: 'Não foi possível carregar os detalhes.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarTransacao()
  }, [id])

  const handleSaveTransaction = async (payload: NovaTransacaoPayload) => {
    if (!id) return
    await atualizarTransacao(id, payload)
    await carregarTransacao()
  }

  const handleConfirmDelete = async () => {
    if (!transacao) return
    try {
      await excluirTransacao(transacao.id, transacao.comprovante_url)
      toast({
        title: 'Transação excluída',
        description: 'O lançamento foi removido com sucesso.',
      })
      navigate('/transactions')
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível remover a transação.',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#0E7C6B]" />
        <p className="text-xs font-semibold text-[#5F6B68]">Carregando detalhes...</p>
      </div>
    )
  }

  if (!transacao) {
    return (
      <div className="py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-[#18211F]">Transação não encontrada</h2>
        <p className="text-xs text-[#5F6B68]">
          A transação solicitada pode ter sido excluída ou não existe.
        </p>
        <Button
          onClick={() => navigate('/transactions')}
          className="bg-[#0E7C6B] hover:bg-[#0A6255] text-white rounded-xl text-xs font-semibold"
        >
          Voltar para Transações
        </Button>
      </div>
    )
  }

  const isEntrada = transacao.entrada > 0
  const isImage =
    comprovanteUrl &&
    (comprovanteUrl.includes('.png') ||
      comprovanteUrl.includes('.jpg') ||
      comprovanteUrl.includes('.jpeg') ||
      comprovanteUrl.includes('.webp') ||
      comprovanteUrl.startsWith('data:image'))

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-up">
      {/* Back Link & Actions */}
      <div className="flex items-center justify-between">
        <Link
          to="/transactions"
          className="inline-flex items-center gap-2 text-xs font-bold text-[#0E7C6B] hover:text-[#0A6255] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Transações
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setModalOpen(true)}
            className="rounded-xl border-[#E3E1DA] text-xs font-semibold text-[#18211F] hover:bg-[#F0EEE8] flex items-center gap-1.5"
          >
            <Pencil className="h-3.5 w-3.5 text-[#0E7C6B]" />
            Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDialogExcluirOpen(true)}
            className="rounded-xl border-[#E3E1DA] text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Excluir
          </Button>
        </div>
      </div>

      {/* Main Info Card */}
      <Card className="rounded-3xl border border-[#E3E1DA] bg-white shadow-sm overflow-hidden">
        <div className="p-6 sm:p-8 space-y-6">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E3E1DA]">
            <div className="space-y-1">
              <span
                className={`inline-block text-xs font-extrabold uppercase px-3 py-1 rounded-full tracking-wider ${
                  isEntrada ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}
              >
                {isEntrada ? 'Entrada (+)' : 'Saída (−)'}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#18211F] tracking-tight pt-1">
                {transacao.descricao}
              </h1>
              <p className="text-xs text-[#5F6B68] flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {formatarDataExtenso(transacao.data)}
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span
                className={`text-3xl sm:text-4xl font-extrabold tabular-nums tracking-tight ${
                  isEntrada ? 'text-[#10B981]' : 'text-[#F43F5E]'
                }`}
              >
                {isEntrada ? '+' : '−'}{' '}
                {formatarMoeda(isEntrada ? transacao.entrada : transacao.saida)}
              </span>
              <p className="text-xs text-[#5F6B68] tabular-nums mt-0.5">
                Saldo Acumulado: {formatarMoeda(transacao.saldo_acumulado)}
              </p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
            <div className="p-4 bg-[#FBFBFA] rounded-2xl border border-[#E3E1DA] space-y-1">
              <div className="flex items-center gap-2 text-[#5F6B68] font-semibold text-xs">
                <Tag className="h-3.5 w-3.5 text-[#0E7C6B]" />
                Categoria
              </div>
              <p className="font-bold text-[#18211F] text-base">{transacao.categoria}</p>
            </div>

            <div className="p-4 bg-[#FBFBFA] rounded-2xl border border-[#E3E1DA] space-y-1">
              <div className="flex items-center gap-2 text-[#5F6B68] font-semibold text-xs">
                <User className="h-3.5 w-3.5 text-[#0E7C6B]" />
                Responsável
              </div>
              <p className="font-bold text-[#18211F] text-base">{transacao.responsavel}</p>
            </div>
          </div>

          {/* Observações */}
          {transacao.observacoes && (
            <div className="space-y-1.5 p-4 bg-[#FBFBFA] rounded-2xl border border-[#E3E1DA]">
              <span className="text-xs font-bold text-[#5F6B68]">Observações</span>
              <p className="text-xs sm:text-sm text-[#18211F] whitespace-pre-wrap leading-relaxed">
                {transacao.observacoes}
              </p>
            </div>
          )}

          {/* Comprovante Section */}
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-bold text-[#18211F] flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-[#0E7C6B]" />
              Comprovante Anexado
            </h3>

            {comprovanteUrl ? (
              <div className="p-4 bg-[#FBFBFA] rounded-2xl border border-[#E3E1DA] space-y-3">
                {isImage ? (
                  <div className="space-y-2">
                    <img
                      src={comprovanteUrl}
                      alt="Comprovante"
                      className="max-h-96 w-auto max-w-full rounded-xl object-contain border border-[#E3E1DA] mx-auto bg-white"
                    />
                    <div className="text-center pt-1">
                      <a
                        href={comprovanteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0E7C6B] hover:underline"
                      >
                        Abrir imagem em tamanho real <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-[#E3E1DA]">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#18211F]">
                          Documento / Comprovante PDF
                        </p>
                        <p className="text-[11px] text-[#5F6B68]">Clique para abrir</p>
                      </div>
                    </div>

                    <a
                      href={comprovanteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0E7C6B] text-white text-xs font-bold rounded-lg hover:bg-[#0A6255]"
                    >
                      Abrir PDF <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 bg-[#FBFBFA] rounded-2xl border border-dashed border-[#E3E1DA] text-center">
                <p className="text-xs text-[#5F6B68]">
                  Nenhum comprovante anexado a esta transação.
                </p>
              </div>
            )}
          </div>

          {/* Meta footer */}
          <div className="pt-4 border-t border-[#E3E1DA] flex items-center justify-between text-[11px] text-[#5F6B68]">
            <span>ID: {transacao.id}</span>
            <span>Registrado em {formatarData(transacao.criado_em)}</span>
          </div>
        </div>
      </Card>

      {/* Modal Edit */}
      <ModalTransacao
        open={modalOpen}
        onOpenChange={setModalOpen}
        transacaoParaEditar={transacao}
        onSave={handleSaveTransaction}
        onSuccess={carregarTransacao}
      />

      {/* Dialog Delete */}
      <DialogExcluir
        open={dialogExcluirOpen}
        onOpenChange={setDialogExcluirOpen}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
