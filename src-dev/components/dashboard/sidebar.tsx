'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import {
  Layers,
  FileSpreadsheet,
  Settings,
  History,
  BarChart3,
  Users,
  LogOut,
  type LucideIcon,
  LayoutDashboard,
  Target,
  Handshake,
  FileCheck,
  Send,
  Building,
  FilePlus,
} from 'lucide-react';
import { Role } from '@prisma/client';
import { useAppMode } from '@/contexts/app-mode-context';

type NavItemProps = {
  href: string;
  label: string;
  icon: LucideIcon;
  requiredRole?: Role[];
};

// Menus para o modo "Ateste"
const attestNavItems: NavItemProps[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/notas', label: 'Visão Geral', icon: FileSpreadsheet },
  { href: '/dashboard/Analistas', label: 'Analistas', icon: Users },
  { href: '/dashboard/timeline', label: 'Linha do Tempo', icon: History },
  { href: '/dashboard/metas', label: 'Metas', icon: Target },
  { href: '/dashboard/reports', label: 'Relatórios', icon: BarChart3 },
  { href: '/dashboard/settings', label: 'Configurações', icon: Settings, requiredRole: [Role.OWNER, Role.MANAGER] },
];

// Menus para o novo modo "Solicitação"
const requestNavItems: NavItemProps[] = [
    { href: '/dashboard/solicitacoes', label: 'Painel', icon: LayoutDashboard },
    { href: '/dashboard/solicitacoes/nova-solicitacao', label: 'Nova Solicitação', icon: FilePlus },
    { href: '/dashboard/solicitacoes/minhas-solicitacoes', label: 'Minhas Solicitações', icon: Send },
    { href: '/dashboard/solicitacoes/fornecedores', label: 'Fornecedores', icon: Building, requiredRole: [Role.OWNER, Role.MANAGER] },
    { href: '/dashboard/solicitacoes/analistas', label: 'Analistas', icon: Users, requiredRole: [Role.OWNER, Role.MANAGER] },
    { href: '/dashboard/solicitacoes/configuracoes', label: 'Configurações', icon: Settings, requiredRole: [Role.OWNER, Role.MANAGER] },
];


/**
 * Subcomponente para renderizar cada item da navegação.
 */
function NavItem({ href, label, icon: Icon, isActive }: NavItemProps & { isActive: boolean }) {
  const { mode } = useAppMode();
  
  const activeClasses = mode === 'attest' 
    ? 'bg-green-500/10 text-green-300 font-semibold shadow-inner'
    : 'bg-primary/10 text-primary-foreground font-semibold shadow-inner bg-slate-200 text-slate-900';
    
  const iconActiveClasses = mode === 'attest' ? 'text-green-400' : 'text-primary';
  const textClasses = mode === 'attest' ? 'text-slate-300' : 'text-slate-600';
  const hoverClasses = mode === 'attest' ? 'hover:bg-slate-800/60 hover:text-white' : 'hover:bg-slate-200/80 hover:text-slate-900';


  return (
    <Link
      href={href}
      className={cn(
        'flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 group',
        textClasses,
        hoverClasses,
        isActive && activeClasses
      )}
    >
      <Icon className={cn('w-5 h-5 text-slate-400 group-hover:text-primary transition-colors', isActive && iconActiveClasses)} />
      <span>{label}</span>
    </Link>
  );
}

/**
 * Componente do botão de alternância de modo discreto e interativo.
 */
function ModeToggleButton() {
  const { mode, toggleMode } = useAppMode();
  const router = useRouter();
  
  const isRequestMode = mode === 'request';

  const handleToggle = () => {
    toggleMode();
    const targetPath = mode === 'attest' ? '/dashboard/solicitacoes' : '/dashboard';
    router.push(targetPath);
  }
  
  const bgClass = isRequestMode ? 'bg-slate-200' : 'bg-slate-800/30';
  const borderClass = isRequestMode ? 'border-slate-300' : 'border-slate-700/30';
  const hoverBgClass = isRequestMode ? 'hover:bg-slate-300/60' : 'hover:bg-slate-800/60';
  const hoverBorderClass = isRequestMode ? 'hover:border-slate-400/50' : 'hover:border-slate-600/50';

  return (
    <div className="px-4 py-2">
      <button
        onClick={handleToggle}
        className={cn(
          'relative w-full h-10 rounded-lg overflow-hidden group transition-all duration-300 border',
          bgClass,
          borderClass,
          hoverBgClass,
          hoverBorderClass,
          'hover:shadow-sm'
        )}
      >
        {/* Indicador deslizante */}
        <div 
          className={cn(
            'absolute top-0.5 bottom-0.5 w-[calc(50%-4px)] rounded-md transition-all duration-500 ease-out transform',
            'bg-gradient-to-r shadow-sm',
            isRequestMode 
              ? 'translate-x-1 from-primary to-green-400' 
              : 'translate-x-[calc(100%+2px)] from-emerald-500/80 to-green-500/80'
          )}
        />
        
        {/* Conteúdo do botão */}
        <div className="relative flex items-center justify-around h-full px-2">
          {/* Lado esquerdo - Solicitações */}
          <div className={cn(
            'flex items-center space-x-1.5 transition-all duration-300 z-10',
            isRequestMode ? 'text-white' : 'text-slate-500 hover:text-slate-400'
          )}>
            <Send className='w-4 h-4'/>
            <span className='text-xs font-medium'>
              Solicitar
            </span>
          </div>

          {/* Lado direito - Atestos */}
          <div className={cn(
            'flex items-center space-x-1.5 transition-all duration-300 z-10',
            !isRequestMode ? 'text-white' : 'text-slate-500 hover:text-slate-400'
          )}>
             <FileCheck className='w-4 h-4'/>
            <span className='text-xs font-medium'>
              Atestar
            </span>
          </div>
        </div>
      </button>
    </div>
  );
}

/**
 * Componente principal da Sidebar.
 */
export function Sidebar() {
  const { data: session } = useSession();
  const { mode } = useAppMode();
  const pathname = usePathname();
  const userRole = session?.user?.role;

  const navItems = mode === 'request' ? requestNavItems : attestNavItems;

  const accessibleNavItems = navItems.filter(item => {
    if (!item.requiredRole) {
      return true; // Item is public for all authenticated users
    }
    if (userRole) {
      return item.requiredRole.includes(userRole);
    }
    return false;
  });
  
  const sidebarClasses = mode === 'attest'
    ? 'bg-slate-900/90 backdrop-blur-lg border-r border-slate-800/50 text-white'
    : 'bg-white/95 backdrop-blur-lg border-r border-slate-200 text-slate-800';
    
  const headerClasses = mode === 'attest'
    ? 'border-slate-800/50'
    : 'border-slate-200';
    
  const userSectionClasses = mode === 'attest'
    ? 'border-slate-800/50'
    : 'border-slate-200';
    
  const logoutButtonClasses = mode === 'attest'
    ? 'text-slate-300 hover:bg-red-900/50 hover:text-white'
    : 'text-slate-600 hover:bg-red-100 hover:text-red-700';

  return (
    <aside className={cn("w-64 h-full flex-shrink-0 flex flex-col transition-colors duration-300", sidebarClasses)}>
      {/* Cabeçalho com Logo */}
      <div className={cn("h-20 flex items-center px-6 border-b", headerClasses)}>
        <div className="flex items-center space-x-3">
          <div className={cn(
            "bg-gradient-to-br w-10 h-10 rounded-xl flex items-center justify-center border shadow-lg transition-all duration-500",
            mode === 'attest' 
              ? 'from-emerald-500 to-green-600 border-emerald-500/50'
              : 'from-primary to-green-400 border-green-300/50'
            )}>
            <Layers className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold">{mode === 'attest' ? 'Notas Fadex' : 'Solicitações'}</h1>
        </div>
      </div>
      
      {/* Botão de Alternância de Modo Elegante */}
      <ModeToggleButton />

      {/* Navegação Principal */}
      <nav className="flex-1 px-4 py-2 space-y-2">
        {accessibleNavItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && item.href !== '/dashboard/solicitacoes' && pathname.startsWith(item.href));
          return <NavItem key={item.href} {...item} isActive={isActive} />
        })}
      </nav>

      {/* Seção de Perfil do Usuário e Logout */}
      <div className={cn("mt-auto p-4 border-t", userSectionClasses)}>
        {session?.user && (
          <div className="flex flex-col space-y-4">
            <div className="flex items-center space-x-3">
              <img
                src={session.user.image ?? `https://avatar.vercel.sh/${session.user.email}.png`}
                alt="Avatar do usuário"
                className="w-10 h-10 rounded-full border-2 border-border"
              />
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-semibold truncate">{session.user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className={cn("w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg transition-colors duration-200", logoutButtonClasses)}
            >
              <LogOut className="w-5 h-5" />
              <span>Sair</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
