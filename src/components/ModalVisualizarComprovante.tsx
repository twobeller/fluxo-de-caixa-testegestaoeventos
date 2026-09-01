import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { obterUrlComprovante } from '@/services/transacoes'
import { FileText, ExternalLink, Download, Loader2, Paperclip, AlertCircle } from 'lucide-react'

interface ModalVisualizarComprovanteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  comprovantePathOrUrl: string | null
  tituloTransacao?: string
}

export function ModalVisualizarComprovante({
  open,
  onOpenChange,
  comprovantePathOrUrl,
  tituloTransacao,
}: ModalVisualizarComprovanteProps) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && comprovantePathOrUrl) {
      setLoading(true)
      setError(null)
      obterUrlComprovante(comprovantePathOrUrl)
        .then((resolvedUrl) => {
          if (resolvedUrl) {
            setUrl(resolvedUrl)
          } else {
            setError('Não foi possível obter a URL do comprovante.')
          }
        })
        .catch((err) => {
          console.error('Erro ao resolver URL do comprovante:', err)
          setError('Erro ao carregar o arquivo do comprovante.')
        })
        .finally(() => {
          setLoading(false)
        })
    } else {
      setUrl(null)
      setError(null)
    }
  }, [open, comprovantePathOrUrl])

  const isPdf =
    Boolean(comprovantePathOrUrl && comprovantePathOrUrl.toLowerCase().includes('.pdf')) ||
    Boolean(url && url.toLowerCase().includes('.pdf'))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px] max-h-[90vh] flex flex-col bg-white rounded-2xl p-6 shadow-2xl border border-[#E3E1DA]">
        <DialogHeader className="space-y-1 pb-2 border-b border-[#E3E1DA]">
          <div className="flex items-center gap-2 text-[#0E7C6B]">
            <Paperclip className="h-4 w-4 shrink-0" />
            <DialogTitle className="text-lg font-bold text-[#18211F]">
              Comprovante Anexado
            </DialogTitle>
          </div>
          {tituloTransacao && (
            <DialogDescription className="text-xs text-[#5F6B68] truncate font-medium">
              Referente a: <span className="font-semibold text-[#18211F]">{tituloTransacao}</span>
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-3 flex flex-col items-center justify-center min-h-[260px]">
          {loading ? (
            <div className="flex flex-col items-center gap-2 py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#0E7C6B]" />
              <p className="text-xs font-semibold text-[#5F6B68]">Carregando comprovante...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-2 text-center py-8">
              <AlertCircle className="h-8 w-8 text-rose-500" />
              <p className="text-sm font-semibold text-rose-700">{error}</p>
            </div>
          ) : !url ? (
            <div className="text-center py-8 text-xs text-[#5F6B68]">
              Nenhum comprovante disponível.
            </div>
          ) : isPdf ? (
            <div className="w-full flex flex-col items-center justify-center p-6 bg-[#FBFBFA] rounded-2xl border border-[#E3E1DA] text-center space-y-4">
              <div className="h-16 w-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-inner">
                <FileText className="h-8 w-8" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#18211F]">Documento PDF</h4>
                <p className="text-xs text-[#5F6B68] mt-1 max-w-sm">
                  O comprovante é um documento em formato PDF. Você pode visualizá-lo em uma nova
                  aba ou fazer o download.
                </p>
              </div>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0E7C6B] hover:bg-[#0A6255] text-white text-xs font-bold shadow transition-all"
              >
                <ExternalLink className="h-4 w-4" />
                Abrir PDF em nova aba
              </a>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center space-y-3">
              <div className="w-full max-h-[60vh] flex items-center justify-center overflow-hidden rounded-xl border border-[#E3E1DA] bg-[#FBFBFA] p-2">
                <img
                  src={url}
                  alt={tituloTransacao || 'Comprovante'}
                  className="max-h-[55vh] w-auto max-w-full object-contain rounded-lg shadow-sm"
                />
              </div>
            </div>
          )}
        </div>

        {url && (
          <div className="pt-3 border-t border-[#E3E1DA] flex items-center justify-between gap-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0E7C6B] hover:text-[#0A6255] hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Abrir em tela cheia / nova aba
            </a>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="rounded-xl border-[#E3E1DA] text-xs font-semibold text-[#5F6B68] hover:bg-[#F0EEE8]"
            >
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
