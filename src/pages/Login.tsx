import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-mobile'
import {
  Coins,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function Login() {
  const { signIn, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('tecnocok@gmail.com')
  const [password, setPassword] = useState('Skip@Pass')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // If already logged in, redirect to home or previous page
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/'

  if (user) {
    navigate(from, { replace: true })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!email || !password) {
      setErrorMessage('Informe seu e-mail e senha.')
      return
    }

    setLoading(true)

    try {
      const { error } = await signIn(email.trim(), password)

      if (error) {
        console.error('Erro de login:', error)
        setErrorMessage('E-mail ou senha incorretos.')
      } else {
        navigate(from, { replace: true })
      }
    } catch (err) {
      console.error('Falha de login:', err)
      setErrorMessage('E-mail ou senha incorretos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F4F0] flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Background soft ambient accents */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#0E7C6B]/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-[#10B981]/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 bg-white rounded-3xl shadow-xl border border-[#E3E1DA] overflow-hidden relative z-10">
        {/* BRAND PANEL (DESKTOP) */}
        <div className="hidden md:flex md:col-span-5 bg-[#10201E] p-8 lg:p-10 flex-col justify-between text-white relative">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-[#0E7C6B] flex items-center justify-center text-white shadow-lg">
                <Coins className="h-6 w-6" />
              </div>
              <div>
                <h1 className="font-extrabold text-xl tracking-tight text-white">Fluxo de Caixa</h1>
                <p className="text-xs text-[#9FB5B0]">Gestão Financeira da Equipe</p>
              </div>
            </div>

            <div className="space-y-3 pt-6">
              <h2 className="text-2xl font-extrabold tracking-tight text-white leading-snug">
                Fluxo de Caixa da equipe
              </h2>
              <p className="text-sm text-[#9FB5B0] leading-relaxed">
                Acesso restrito — entre com suas credenciais da equipe para registrar entradas,
                saídas e comprovantes.
              </p>
            </div>

            <div className="pt-4 space-y-3">
              <div className="flex items-center gap-3 text-xs text-[#9FB5B0] bg-[#1D3431] p-3 rounded-xl border border-white/5">
                <ShieldCheck className="h-4 w-4 text-[#10B981] shrink-0" />
                <span>Autenticação segura via Supabase Auth</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-[#9FB5B0] bg-[#1D3431] p-3 rounded-xl border border-white/5">
                <TrendingUp className="h-4 w-4 text-[#10B981] shrink-0" />
                <span>Cálculo em tempo real do Saldo Acumulado</span>
              </div>
            </div>
          </div>

          <div className="pt-8 text-[11px] text-[#9FB5B0]/70 border-t border-[#1D3431]">
            Ambiente Restrito & Seguro &bull; Equipe
          </div>
        </div>

        {/* LOGIN FORM CARD */}
        <div className="col-span-1 md:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto space-y-6">
            {/* Mobile Brand Header */}
            <div className="md:hidden flex items-center gap-3 pb-2">
              <div className="h-10 w-10 rounded-xl bg-[#0E7C6B] flex items-center justify-center text-white shadow-md">
                <Coins className="h-5 w-5" />
              </div>
              <div>
                <h1 className="font-extrabold text-lg text-[#18211F]">Fluxo de Caixa</h1>
                <p className="text-xs text-[#5F6B68]">Acesso restrito à equipe</p>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-extrabold text-[#18211F] tracking-tight">Entrar</h3>
              <p className="text-sm text-[#5F6B68] mt-1">
                Acesso restrito à equipe. Digite seu e-mail e senha para continuar.
              </p>
            </div>

            {/* Error banner */}
            {errorMessage && (
              <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-bold text-[#18211F]">
                  E-mail
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5F6B68]" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="nome@empresa.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 bg-[#FBFBFA] border-[#E3E1DA] focus:border-[#0E7C6B] focus:ring-[#0E7C6B]/30 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-bold text-[#18211F]">
                    Senha
                  </Label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5F6B68]" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Sua senha de acesso"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-11 bg-[#FBFBFA] border-[#E3E1DA] focus:border-[#0E7C6B] focus:ring-[#0E7C6B]/30 rounded-xl text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#5F6B68] hover:text-[#18211F]"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-[#0E7C6B] hover:bg-[#0A6255] text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Autenticando...
                    </>
                  ) : (
                    'Entrar'
                  )}
                </Button>
              </div>
            </form>

            <div className="pt-4 border-t border-[#E3E1DA] text-center">
              <p className="text-xs text-[#5F6B68]">
                Acesso restrito. Se você não tem credenciais, fale com o administrador da equipe.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
