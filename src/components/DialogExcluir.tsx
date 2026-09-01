import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Loader2 } from 'lucide-react'

interface DialogExcluirProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
  titulo?: string
  descricao?: string
}

export function DialogExcluir({
  open,
  onOpenChange,
  onConfirm,
  titulo = 'Excluir transação?',
  descricao = 'Esta ação não pode ser desfeita. A transação e o comprovante anexado serão removidos permanentemente.',
}: DialogExcluirProps) {
  const [loading, setLoading] = useState(false)

  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-white rounded-2xl p-6 shadow-xl border border-[#E3E1DA] max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-bold text-[#18211F]">{titulo}</AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-[#5F6B68]">
            {descricao}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0 mt-4">
          <AlertDialogCancel
            disabled={loading}
            className="rounded-xl border-[#E3E1DA] text-[#5F6B68] hover:bg-[#F0EEE8]"
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            onClick={handleConfirm}
            className="rounded-xl bg-[#F43F5E] hover:bg-rose-600 text-white font-semibold flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Excluindo...
              </>
            ) : (
              'Excluir'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
