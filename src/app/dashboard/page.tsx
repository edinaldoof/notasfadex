'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  FileSpreadsheet, 
  Clock, 
  BarChart3,
  Plus,
  TrendingUp,
  Calendar,
  Activity,
  ArrowUpRight,
  Sparkles,
  ChevronRight,
  Target,
  Zap,
  FileText
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/stat-card';
import { AddNoteDialog } from '@/app/dashboard/add-note-dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import { Skeleton } from '@/components/ui/skeleton';
import { getDashboardSummary } from './actions';
import { CheckBadge } from '@/components/icons/check-badge';
import { motion, AnimatePresence } from 'framer-motion';

// Interface para o summary
interface DashboardSummary {
  totalNotes: number;
  attestedNotes: number;
  pendingNotes: number;
  totalAmount: number;
}

const GREETING_TIMES = {
  MORNING: 12,
  AFTERNOON: 18
} as const;

// Componente de Card de Estatística Melhorado
const EnhancedStatCard = ({ 
  title, 
  value, 
  icon, 
  loading, 
  trend,
  color,
  href,
  delay = 0
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  loading?: boolean;
  trend?: number;
  color: string;
  href?: string;
  delay?: number;
}) => {
  const content = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.02, y: -5 }}
      className={cn(
        "relative p-6 rounded-2xl border transition-all duration-300 cursor-pointer",
        "bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl",
        "border-slate-700/50 hover:border-slate-600/50",
        "shadow-lg hover:shadow-2xl hover:shadow-slate-900/50",
        "group overflow-hidden"
      )}
    >
      {/* Background decoration */}
      <div className={cn(
        "absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-10 group-hover:opacity-20 transition-opacity",
        color
      )} />
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className={cn(
            "p-3 rounded-xl transition-all duration-300",
            "bg-gradient-to-br from-slate-800/50 to-slate-700/50",
            "group-hover:scale-110 group-hover:rotate-3"
          )}>
            {icon}
          </div>
          {trend !== undefined && (
            <div className={cn(
              "flex items-center gap-1 text-sm px-2 py-1 rounded-full",
              trend > 0 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
            )}>
              <TrendingUp className={cn("w-3 h-3", trend < 0 && "rotate-180")} />
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
        </div>
        
        <div className="space-y-1">
          <p className="text-slate-400 text-sm font-medium">{title}</p>
          {loading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <p className="text-3xl font-bold text-white">{value}</p>
          )}
        </div>
        
        {href && (
          <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowUpRight className="w-4 h-4 text-slate-400" />
          </div>
        )}
      </div>
    </motion.div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
};

// Componente de Ação Rápida
const QuickAction = ({ 
  icon, 
  title, 
  description, 
  onClick,
  color,
  delay = 0 
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  color: string;
  delay?: number;
}) => (
  <motion.button
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.5, delay }}
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className={cn(
      "p-4 rounded-xl border border-slate-700/50 hover:border-slate-600/50",
      "bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl",
      "transition-all duration-300 text-left w-full group",
      "hover:shadow-xl hover:shadow-slate-900/50"
    )}
  >
    <div className="flex items-start gap-3">
      <div className={cn(
        "p-2 rounded-lg transition-all duration-300",
        "bg-gradient-to-br from-slate-800/50 to-slate-700/50",
        "group-hover:scale-110",
        color
      )}>
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-white mb-1">{title}</h3>
        <p className="text-sm text-slate-400">{description}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors mt-1" />
    </div>
  </motion.button>
);

// Componente de Atividade Recente (placeholder)
const RecentActivity = ({ delay = 0 }: { delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.5, delay }}
    className={cn(
      "p-6 rounded-2xl border transition-all duration-300",
      "bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl",
      "border-slate-700/50 hover:border-slate-600/50",
      "shadow-lg"
    )}
  >
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
        <Activity className="w-5 h-5 text-primary" />
        Atividade Recente
      </h3>
      <Link href="/dashboard/notas" className="text-sm text-primary hover:text-primary/80 transition-colors">
        Ver todas
      </Link>
    </div>
    
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: delay + (i * 0.1) }}
          className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
        >
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <div className="flex-1">
            <p className="text-sm text-white">Nova nota fiscal adicionada</p>
            <p className="text-xs text-slate-400">Há {i * 2} horas</p>
          </div>
        </motion.div>
      ))}
    </div>
  </motion.div>
);

// Componente Principal do Dashboard
export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary>({ 
    totalNotes: 0, 
    attestedNotes: 0, 
    pendingNotes: 0, 
    totalAmount: 0 
  });
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const { data: session, status } = useSession();
  const [greeting, setGreeting] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    const getGreeting = () => {
      const currentHour = new Date().getHours();
      if (currentHour < GREETING_TIMES.MORNING) {
        return 'Bom dia';
      } else if (currentHour < GREETING_TIMES.AFTERNOON) {
        return 'Boa tarde';
      } else {
        return 'Boa noite';
      }
    };
    setGreeting(getGreeting());
    
    // Formatar data atual
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    setCurrentDate(today.toLocaleDateString('pt-BR', options));
  }, []);
  
  const fetchSummaryData = async () => {
    setLoading(true);
    try {
      const data = await getDashboardSummary();
      setSummary(data);
      setError(null);
    } catch(error) {
      setError('Erro ao carregar dados do dashboard');
      console.error("Failed to fetch summary:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchSummaryData();
    }
  }, [status]);
  
  const handleNoteAdded = () => {
    fetchSummaryData();
  }

  const getDisplayName = () => {
    if (!session?.user?.name) {
      return '';
    }
    const nameParts = session.user.name.split(' ');
    if (nameParts.length > 1 && nameParts[0].toUpperCase() === 'FADEX') {
      return nameParts[1];
    }
    return nameParts[0];
  }

  // Calcular porcentagem de notas atestadas
  const attestedPercentage = summary.totalNotes > 0 
    ? Math.round((summary.attestedNotes / summary.totalNotes) * 100) 
    : 0;

  return (
    <div className="space-y-8">
      {/* Header Melhorado */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            {status === 'loading' ? (
              <Skeleton className="h-10 w-80 mb-2" />
            ) : (
              <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                {greeting}, {session?.user?.name ? getDisplayName() : ''}!
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                >
                  <Sparkles className="w-8 h-8 text-yellow-400" />
                </motion.div>
              </h1>
            )}
            <p className="text-slate-400 capitalize flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {currentDate}
            </p>
          </div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Button
              onClick={() => setShowAddModal(true)}
              className={cn(
                'px-6 py-3 font-semibold transition-all duration-300 flex items-center gap-2',
                'bg-gradient-to-r from-emerald-500 to-green-600 text-white',
                'hover:shadow-lg hover:shadow-emerald-500/25 hover:scale-105',
                'rounded-xl'
              )}
            >
              <Plus className="w-5 h-5" />
              <span>Nova Nota</span>
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <EnhancedStatCard
          title="Total de Notas"
          value={summary.totalNotes}
          icon={<FileSpreadsheet className="w-6 h-6 text-blue-400" />}
          loading={loading || status !== 'authenticated'}
          color="bg-blue-500"
          href="/dashboard/notas?status=all"
          delay={0.1}
        />
        <EnhancedStatCard
          title="Notas Atestadas"
          value={summary.attestedNotes}
          icon={<CheckBadge className="w-6 h-6 text-green-400" />}
          loading={loading || status !== 'authenticated'}
          trend={attestedPercentage}
          color="bg-green-500"
          href="/dashboard/notas?status=atestada"
          delay={0.2}
        />
        <EnhancedStatCard
          title="Pendentes"
          value={summary.pendingNotes}
          icon={<Clock className="w-6 h-6 text-amber-400" />}
          loading={loading || status !== 'authenticated'}
          color="bg-amber-500"
          href="/dashboard/notas?status=pendente"
          delay={0.3}
        />
        <EnhancedStatCard
          title="Valor Total"
          value={`R$ ${summary.totalAmount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`}
          icon={<BarChart3 className="w-6 h-6 text-purple-400" />}
          loading={loading || status !== 'authenticated'}
          color="bg-purple-500"
          delay={0.4}
        />
      </div>

      {/* Seção de Ações Rápidas e Atividades */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ações Rápidas */}
        <div className="lg:col-span-2 space-y-4">
          <motion.h2 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="text-xl font-semibold text-white flex items-center gap-2"
          >
            <Zap className="w-5 h-5 text-yellow-400" />
            Ações Rápidas
          </motion.h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <QuickAction
              icon={<FileText className="w-5 h-5 text-blue-400" />}
              title="Adicionar Nota"
              description="Cadastre uma nova nota fiscal"
              onClick={() => setShowAddModal(true)}
              color="text-blue-400"
              delay={0.6}
            />
            <QuickAction
              icon={<BarChart3 className="w-5 h-5 text-purple-400" />}
              title="Ver Relatórios"
              description="Análise detalhada das notas"
              onClick={() => window.location.href = '/dashboard/reports '}
              color="text-purple-400"
              delay={0.7}
            />
            <QuickAction
              icon={<Target className="w-5 h-5 text-green-400" />}
              title="Metas do Mês"
              description="Acompanhe seus objetivos"
              onClick={() => window.location.href = '/dashboard/metas'}
              color="text-green-400"
              delay={0.8}
            />
            <QuickAction
              icon={<Activity className="w-5 h-5 text-orange-400" />}
              title="Histórico"
              description="Veja todas as atividades"
              onClick={() => window.location.href = '/dashboard/historico'}
              color="text-orange-400"
              delay={0.9}
            />
          </div>
        </div>

        {/* Atividade Recente */}
        <RecentActivity delay={1} />
      </div>

      {/* Card de Visão Geral Melhorado */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 1.1 }}
        className={cn(
          "relative p-8 rounded-2xl border overflow-hidden",
          "bg-gradient-to-br from-slate-900/90 via-slate-800/90 to-emerald-900/20 backdrop-blur-xl",
          "border-slate-700/50",
          "shadow-xl"
        )}
      >
        {/* Decoração de fundo */}
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
        
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                Sistema Notas Fadex
                <CheckBadge className="w-6 h-6 text-emerald-400" />
              </h2>
              <p className="text-slate-400 mt-2 max-w-2xl">
                Gerencie suas notas fiscais de forma inteligente e organizada. 
                Acompanhe o status, valores e mantenha tudo sob controle.
              </p>
            </div>
          </div>
          
          {/* Estatísticas inline */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-4 bg-slate-800/50 rounded-xl backdrop-blur-sm">
              <p className="text-sm text-slate-400 mb-1">Taxa de Conclusão</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${attestedPercentage}%` }}
                    transition={{ duration: 1, delay: 1.3 }}
                    className="h-full bg-gradient-to-r from-emerald-500 to-green-500"
                  />
                </div>
                <span className="text-sm font-semibold text-white">{attestedPercentage}%</span>
              </div>
            </div>
            
            <div className="p-4 bg-slate-800/50 rounded-xl backdrop-blur-sm">
              <p className="text-sm text-slate-400 mb-1">Média Mensal</p>
              <p className="text-xl font-bold text-white">
                R$ {(summary.totalAmount / 12).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
              </p>
            </div>
            
            <div className="p-4 bg-slate-800/50 rounded-xl backdrop-blur-sm">
              <p className="text-sm text-slate-400 mb-1">Produtividade</p>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span className="text-xl font-bold text-white">+23%</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Modal de Adicionar Nota */}
      <AddNoteDialog 
        open={showAddModal} 
        onOpenChange={setShowAddModal} 
        onNoteAdded={handleNoteAdded} 
      />
    </div>
  );
}