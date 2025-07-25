
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import {
  Layers,
  Home,
  FileSpreadsheet,
  Settings,
  History,
  BarChart3,
  Users,
  LogOut,
  type LucideIcon,
  LayoutDashboard,
} from 'lucide-react';
import { Role } from '@prisma/client';

type NavItemProps = {
  href: string;
  label: string;
  icon: LucideIcon;
  requiredRole?: Role[];
};

const navItems: NavItemProps[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/notas', label: 'Visão Geral', icon: FileSpreadsheet },
  { href: '/dashboard/colaboradores', label: 'Colaboradores', icon: Users },
  { href: '/dashboard/timeline', label: 'Linha do Tempo', icon: History },
  { href: '/dashboard/reports', label: 'Relatórios', icon: BarChart3 },
  { href: '/dashboard/settings', label: 'Configurações', icon: Settings, requiredRole: [Role.OWNER, Role.MANAGER] },
];

/**
 * Subcomponente para renderizar cada item da navegação.
 */
function NavItem({ href, label, icon: Icon }: NavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center space-x-3 px-4 py-3 rounded-lg text-slate-300 transition-colors duration-200 group',
        'hover:bg-slate-800/60 hover:text-white',
        isActive && 'bg-green-500/10 text-green-300 font-semibold shadow-inner'
      )}
    >
      <Icon className={cn('w-5 h-5 text-slate-400 group-hover:text-white transition-colors', isActive && 'text-green-400')} />
      <span>{label}</span>
    </Link>
  );
}

/**
 * Componente principal da Sidebar.
 */
export function Sidebar() {
  const { data: session } = useSession();
  const userRole = session?.user?.role;

  const accessibleNavItems = navItems.filter(item => {
    if (!item.requiredRole) {
      return true; // Item is public for all authenticated users
    }
    if (userRole) {
      return item.requiredRole.includes(userRole);
    }
    return false;
  });

  return (
    <aside className="hidden lg:flex w-64 flex-shrink-0 bg-slate-900/90 backdrop-blur-lg border-r border-slate-800/50 flex-col">
      {/* Cabeçalho com Logo */}
      <div className="h-20 flex items-center px-6 border-b border-slate-800/50">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-br from-emerald-500 to-green-600 w-10 h-10 rounded-xl flex items-center justify-center border border-emerald-500/50 shadow-lg">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">Notas Fadex</h1>
        </div>
      </div>

      {/* Navegação Principal */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {accessibleNavItems.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </nav>

      {/* Seção de Perfil do Usuário e Logout */}
      <div className="mt-auto p-4 border-t border-slate-800/50">
        {session?.user && (
          <div className="flex flex-col space-y-4">
            <div className="flex items-center space-x-3">
              <img
                src={session.user.image ?? `https://avatar.vercel.sh/${session.user.email}.png`}
                alt="Avatar do usuário"
                className="w-10 h-10 rounded-full border-2 border-slate-700"
              />
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-semibold text-white truncate">{session.user.name}</p>
                <p className="text-xs text-slate-400 truncate">{session.user.email}</p>
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg text-slate-300 transition-colors duration-200 hover:bg-red-900/50 hover:text-white"
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
