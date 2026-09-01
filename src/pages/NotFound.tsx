import { useLocation, Link } from 'react-router-dom'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { FileQuestion, ArrowLeft } from 'lucide-react'

const NotFound = () => {
  const location = useLocation()

  useEffect(() => {
    console.warn('Rota não encontrada:', location.pathname)
  }, [location.pathname])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F4F0] p-4">
      <div className="max-w-md w-full text-center space-y-4 bg-white p-8 rounded-3xl border border-[#E3E1DA] shadow-lg">
        <div className="h-16 w-16 bg-[#E2F3EF] rounded-2xl flex items-center justify-center mx-auto text-[#0E7C6B]">
          <FileQuestion className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-extrabold text-[#18211F]">Página não encontrada</h1>
        <p className="text-sm text-[#5F6B68]">
          A página que você está procurando não existe ou foi movida.
        </p>
        <div className="pt-2">
          <Button
            asChild
            className="bg-[#0E7C6B] hover:bg-[#0A6255] text-white rounded-xl text-xs font-semibold"
          >
            <Link to="/" className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" /> Voltar ao Início
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default NotFound
