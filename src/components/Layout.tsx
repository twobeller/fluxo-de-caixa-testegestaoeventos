import { useState, ReactNode } from 'react'
import { NavLink, useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/use-mobile'
import {
  LayoutDashboard,
  Receipt,
  LogOut,
  Plus,
  Menu,
  X,
  Wallet,
  Coins,
  Ticket,
  CalendarCheck2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { ModalTransacao } from './ModalTransacao'
import { ModalVendaDireta } from './ModalVendaDireta'
import { criarTransacao, atualizarTransacao } from '@/services/transacoes'
import { NovaTransacaoPayload } from '@/types/fluxo-caixa'

interface AppLayoutProps {
  children?: ReactNode
}

export default function Layout({ children }: AppLayoutProps) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [modalNovaTransacaoOpen, setModalNovaTransacaoOpen] = useState(false)
  const [modalVendaDiretaOpen, setModalVendaDiretaOpen] = useState(false)

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const handleSaveTransaction = async (payload: NovaTransacaoPayload, id?: string) => {
    if (!user) throw new Error('Usuário não autenticado')
    if (id) {
      await atualizarTransacao(id, payload)
    } else {
      await criarTransacao(payload, user.id)
    }
  }

  const handleSuccess = () => {
    // Custom event to trigger re-fetch across active views
    window.dispatchEvent(new CustomEvent('fluxo-caixa-updated'))
  }

  const navItems = [
    {
      to: '/',
      label: 'Visão Geral',
      icon: LayoutDashboard,
    },
    {
      to: '/transactions',
      label: 'Transações',
      icon: Receipt,
    },
    {
      to: '/planejamento',
      label: 'Planejamento',
      icon: CalendarCheck2,
    },
  ]

  const userInitial = user?.email?.charAt(0).toUpperCase() || 'E'

  const isLoginPage = location.pathname === '/login'

  if (isLoginPage) {
    return <main className="min-h-screen bg-[#F5F4F0]">{children}</main>
  }

  return (
    <div className="flex min-h-screen bg-[#F5F4F0] text-[#18211F]">
      {/* DESKTOP & TABLET SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 lg:w-64 shrink-0 bg-[#10201E] text-[#9FB5B0] border-r border-[#1D3431] fixed top-0 bottom-0 left-0 z-30">
        {/* Brand Area */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-[#1D3431]">
          <div className="h-10 w-10 rounded-xl bg-[#0E7C6B] flex items-center justify-center text-white shadow-md">
            <Coins className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-white text-base tracking-tight leading-tight">
              Fluxo de Caixa
            </h1>
            <p className="text-[11px] text-[#9FB5B0] font-medium tracking-wide">
              Controle Financeiro
            </p>
          </div>
        </div>

        {/* Global Action Button */}
        <div className="px-4 pt-5 pb-2 space-y-2">
          <Button
            onClick={() => setModalVendaDiretaOpen(true)}
            className="w-full bg-[#1A3F39] hover:bg-[#23534B] text-[#10B981] hover:text-[#34D399] border border-[#0E7C6B]/40 rounded-xl py-4 font-semibold text-xs shadow transition-all flex items-center justify-center gap-2"
          >
            <Ticket className="h-4 w-4" />
            Venda de Ingressos
          </Button>
          <Button
            onClick={() => setModalNovaTransacaoOpen(true)}
            className="w-full bg-[#0E7C6B] hover:bg-[#0A6255] text-white rounded-xl py-5 font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nova Transação
          </Button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive =
              item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl font-semibold text-sm transition-all ${
                  isActive
                    ? 'bg-[#1D3431] text-white shadow-sm border-l-4 border-[#0E7C6B]'
                    : 'text-[#9FB5B0] hover:text-white hover:bg-[#1D3431]/50'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-[#10B981]' : 'text-[#9FB5B0]'}`} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        {/* User Profile & Logout */}
        <div className="p-4 border-t border-[#1D3431] bg-[#0C1817]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="h-9 w-9 rounded-full bg-[#0E7C6B] flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-inner">
                {userInitial}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-white truncate">Equipe</p>
                <p className="text-[11px] text-[#9FB5B0] truncate" title={user?.email || ''}>
                  {user?.email || 'tecnocok@gmail.com'}
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              title="Sair"
              className="text-[#9FB5B0] hover:text-rose-400 hover:bg-[#1D3431] rounded-xl h-8 w-8"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* MOBILE TOP HEADER & DRAWER */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#10201E] border-b border-[#1D3431] z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-[#0E7C6B] flex items-center justify-center text-white">
            <Coins className="h-4 w-4" />
          </div>
          <span className="font-bold text-white text-sm">Fluxo de Caixa</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setModalNovaTransacaoOpen(true)}
            className="bg-[#0E7C6B] hover:bg-[#0A6255] text-white rounded-lg text-xs font-semibold h-8 px-2.5 flex items-center gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Nova
          </Button>

          <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-[#1D3431] h-8 w-8 rounded-lg"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="bg-[#10201E] text-[#9FB5B0] border-r border-[#1D3431] w-72 p-0 flex flex-col justify-between"
            >
              <div>
                <div className="p-5 border-b border-[#1D3431] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-[#0E7C6B] flex items-center justify-center text-white">
                      <Wallet className="h-4 w-4" />
                    </div>
                    <div>
                      <SheetTitle className="text-white text-sm font-bold">
                        Fluxo de Caixa
                      </SheetTitle>
                      <SheetDescription className="text-[#9FB5B0] text-[11px]">
                        Equipe Financeira
                      </SheetDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setMobileDrawerOpen(false)}
                    className="text-[#9FB5B0] hover:text-white h-7 w-7"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="p-4 space-y-2">
                  {navItems.map((item) => {
                    const Icon = item.icon
                    const isActive =
                      item.to === '/'
                        ? location.pathname === '/'
                        : location.pathname.startsWith(item.to)

                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setMobileDrawerOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm ${
                          isActive
                            ? 'bg-[#1D3431] text-white border-l-4 border-[#0E7C6B]'
                            : 'text-[#9FB5B0] hover:text-white'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </NavLink>
                    )
                  })}
                </div>
              </div>

              <div className="p-4 border-t border-[#1D3431] bg-[#0C1817]">
                <div className="flex items-center justify-between">
                  <div className="truncate text-xs">
                    <p className="text-white font-semibold">{user?.email}</p>
                    <p className="text-[#9FB5B0] text-[11px]">Conectado</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="text-rose-400 hover:bg-[#1D3431] text-xs font-semibold"
                  >
                    Sair
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 md:ml-64 flex flex-col min-h-screen pt-16 md:pt-0 pb-20 md:pb-8">
        <div className="max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 animate-fade-up">
          {children || <Outlet />}
        </div>
      </main>

      {/* MOBILE BOTTOM NAVIGATION (≤640px) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#10201E] border-t border-[#1D3431] z-40 flex items-center justify-around px-2">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors ${
              isActive ? 'text-[#10B981]' : 'text-[#9FB5B0]'
            }`
          }
        >
          <LayoutDashboard className="h-4 w-4" />
          <span>Visão Geral</span>
        </NavLink>

        <NavLink
          to="/planejamento"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors ${
              isActive ? 'text-[#10B981]' : 'text-[#9FB5B0]'
            }`
          }
        >
          <CalendarCheck2 className="h-4 w-4" />
          <span>Planejamento</span>
        </NavLink>

        {/* Center elevated circular plus button */}
        <button
          onClick={() => setModalNovaTransacaoOpen(true)}
          title="Nova Transação"
          className="-mt-5 h-11 w-11 rounded-full bg-[#0E7C6B] text-white flex items-center justify-center shadow-lg border-2 border-[#10201E] hover:scale-105 active:scale-95 transition-transform shrink-0"
        >
          <Plus className="h-5 w-5" />
        </button>

        <NavLink
          to="/transactions"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors ${
              isActive ? 'text-[#10B981]' : 'text-[#9FB5B0]'
            }`
          }
        >
          <Receipt className="h-4 w-4" />
          <span>Transações</span>
        </NavLink>
      </div>

      {/* GLOBAL MODAIS */}
      <ModalVendaDireta
        open={modalVendaDiretaOpen}
        onOpenChange={setModalVendaDiretaOpen}
        onSuccess={handleSuccess}
      />

      <ModalTransacao
        open={modalNovaTransacaoOpen}
        onOpenChange={setModalNovaTransacaoOpen}
        onSave={handleSaveTransaction}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
