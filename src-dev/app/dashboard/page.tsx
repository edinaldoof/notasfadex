
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
  FileText,
  Stamp,
  PlusCircle,
  Undo2,
  Edit,
  AlertTriangle,
  XCircle,
  Handshake,
  Calculator,
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/stat-card';
import { AddNoteDialog } from '@/app/dashboard/add-note-dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import { Skeleton } from '@/components/ui/skeleton';
import { getDashboardSummary, getRecentActivities } from './actions';
import { CheckBadge } from '@/components/icons/check-badge';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { HistoryType } from '@prisma/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAppMode } from '@/contexts/app-mode-context';
import { pageTransitions, itemVariants, containerVariants, transitionPresets } from '@/lib/transition-utils';

// Interface para o summary
interface DashboardSummary {
  totalNotes: number;
  attestedNotes: number;
  pendingNotes: number;
  totalAmount: number;
  resolutionRate: number;
}

// Tipagem para as atividades recentes
type RecentActivityEvent = Awaited<ReturnType<typeof getRecentActivities>>[0];

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
              trend >= 0 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
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


const QuickAction = ({ 
  icon, 
  title, 
  description, 
  href,
  onClick,
  color,
  delay = 0 
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href?: string;
  onClick?: () => void;
  color: string;
  delay?: number;
}) => {
  const content = (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
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
    </motion.div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  
  return <button onClick={onClick} className="w-full text-left">{content}</button>;
};

const getEventTypeConfig = (type: HistoryType) => {
    switch(type) {
        case 'CREATED': return { icon: <PlusCircle className="w-4 h-4 text-emerald-400" />, text: 'criou a nota' };
        case 'ATTESTED': return { icon: <Stamp className="w-4 h-4 text-blue-400" />, text: 'atestou a nota' };
        case 'REVERTED': return { icon: <Undo2 className="w-4 h-4 text-amber-400" />, text: 'desfez o atesto da nota' };
        case 'EDITED': return { icon: <Edit className="w-4 h-4 text-purple-400" />, text: 'editou a nota' };
        case 'EXPIRED': return { icon: <AlertTriangle className="w-4 h-4 text-rose-400" />, text: 'expirou para a nota' };
        case 'REJECTED': return { icon: <XCircle className="w-4 h-4 text-red-400" />, text: 'rejeitou a nota' };
        default: return { icon: <FileText className="w-4 h-4 text-slate-400" />, text: 'realizou um evento na nota' };
    }
}

const getInitials = (name: string | null) => {
    if (!name) return '??';
    return name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();
};

const RecentActivity = ({ activities, loading, delay = 0 }: { activities: RecentActivityEvent[], loading: boolean, delay?: number }) => (
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
      <Link href="/dashboard/timeline" className="text-sm text-primary hover:text-primary/80 transition-colors">
        Ver todas
      </Link>
    </div>
    
    <div className="space-y-3">
        {loading ? (
             Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/4" />
                    </div>
                </div>
             ))
        ) : activities.length > 0 ? (
            activities.map((activity, i) => {
                const eventConfig = getEventTypeConfig(activity.type);
                const userName = activity.author?.name || activity.userName || 'Sistema';
                const userImage = activity.author?.image;
                const noteReference = `Nota ${activity.note.numeroNota || 'S/N'} - CC: ${activity.note.projectAccountNumber}`;

                return (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: delay + (i * 0.1) }}
                      className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
                    >
                      <Avatar className="h-8 w-8 mt-1 border-2 border-slate-700">
                        <AvatarImage src={userImage ?? undefined} />
                        <AvatarFallback className="text-xs bg-slate-600">
                          {getInitials(userName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm text-white">
                          <span className="font-semibold">{userName}</span> {eventConfig.text} <span className="font-semibold text-primary/80">"{noteReference}"</span>.
                        </p>
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                            {eventConfig.icon}
                            {formatDistanceToNow(new Date(activity.date), { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>
                    </motion.div>
                )
            })
        ) : (
            <div className="text-center py-8 text-slate-500">
                <p>Nenhuma atividade recente.</p>
            </div>
        )}
    </div>
  </motion.div>
);

function AttestModeDashboard({ summary, activities, loadingSummary, loadingActivities, onAddNote }) {
  const { data: session, status } = useSession();
  const [greeting, setGreeting] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    const getGreeting = () => {
      const currentHour = new Date().getHours();
      if (currentHour < GREETING_TIMES.MORNING) return 'Bom dia';
      if (currentHour < GREETING_TIMES.AFTERNOON) return 'Boa tarde';
      return 'Boa noite';
    };
    setGreeting(getGreeting());
    
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    setCurrentDate(today.toLocaleDateString('pt-BR', options));
  }, []);

  const getDisplayName = () => {
    if (!session?.user?.name) return '';
    const nameParts = session.user.name.split(' ');
    if (nameParts.length > 1 && nameParts[0].toUpperCase() === 'FADEX') return nameParts[1];
    return nameParts[0];
  };

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
              onClick={onAddNote}
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
          loading={loadingSummary || status !== 'authenticated'}
          color="bg-blue-500"
          href="/dashboard/notas?status=all"
          delay={0.1}
        />
        <EnhancedStatCard
          title="Notas Atestadas"
          value={summary.attestedNotes}
          icon={<CheckBadge className="w-6 h-6 text-green-400" />}
          loading={loadingSummary || status !== 'authenticated'}
          trend={attestedPercentage}
          color="bg-green-500"
          href="/dashboard/notas?status=atestada"
          delay={0.2}
        />
        <EnhancedStatCard
          title="Pendentes"
          value={summary.pendingNotes}
          icon={<Clock className="w-6 h-6 text-amber-400" />}
          loading={loadingSummary || status !== 'authenticated'}
          color="bg-amber-500"
          href="/dashboard/notas?status=pendente"
          delay={0.3}
        />
        <EnhancedStatCard
          title="Taxa de Resolução (30d)"
          value={`${summary.resolutionRate}%`}
          icon={<Calculator className="w-6 h-6 text-purple-400" />}
          loading={loadingSummary || status !== 'authenticated'}
          color="bg-purple-500"
          delay={0.4}
        />
      </div>

      {/* Seção de Ações Rápidas e Atividades */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
            <QuickAction icon={<FileText className="w-5 h-5" />} title="Adicionar Nota" description="Cadastre uma nova nota fiscal" onClick={onAddNote} color="text-blue-400" delay={0.6} />
            <QuickAction icon={<BarChart3 className="w-5 h-5" />} title="Ver Relatórios" description="Análise detalhada das notas" href="/dashboard/reports" color="text-purple-400" delay={0.7} />
            <QuickAction icon={<Target className="w-5 h-5" />} title="Metas do Mês" description="Acompanhe seus objetivos" href="/dashboard/metas" color="text-green-400" delay={0.8} />
            <QuickAction icon={<Activity className="w-5 h-5" />} title="Histórico" description="Veja todas as atividades" href="/dashboard/timeline" color="text-orange-400" delay={0.9} />
          </div>
        </div>
        <RecentActivity activities={activities} loading={loadingActivities} delay={1} />
      </div>

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
                R$ {(summary.totalAmount > 0 && summary.totalNotes > 0 ? summary.totalAmount / 12 : 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
              </p>
            </div>
            
            <div className="p-4 bg-slate-800/50 rounded-xl backdrop-blur-sm">
              <p className="text-sm text-slate-400 mb-1">Taxa de Resolução (30d)</p>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span className="text-xl font-bold text-white">{summary.resolutionRate}%</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function RequestModeDashboard() {
  return (
    <motion.div variants={containerVariants} className="space-y-8 animate-in fade-in-50 duration-500">
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-2xl blur opacity-20"></div>
            <div className="relative bg-gradient-to-r from-blue-500 to-cyan-600 p-3 rounded-2xl">
              <Handshake className="w-8 h-8 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-bold text-foreground">
              Visão Geral (Solicitações)
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie e acompanhe todos os pedidos de nota fiscal.
            </p>
          </div>
        </div>
      </motion.div>
      
      <motion.div variants={itemVariants} className="text-center py-16 bg-card/50 backdrop-blur-sm rounded-2xl border border-border mt-8 hover-lift">
        <Handshake className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-bold text-foreground mb-2">Módulo em Construção</h3>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          A tabela com todas as solicitações aparecerá aqui. Em breve, você poderá criar, filtrar e gerenciar todos os seus pedidos.
        </p>
      </motion.div>
    </motion.div>
  );
}


// Componente Principal do Dashboard
function PageContent() {
  const { mode } = useAppMode();
  const [summary, setSummary] = useState<DashboardSummary>({ 
    totalNotes: 0, 
    attestedNotes: 0, 
    pendingNotes: 0, 
    totalAmount: 0,
    resolutionRate: 0,
  });
  const [activities, setActivities] = useState<RecentActivityEvent[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const { status } = useSession();

  const fetchData = async () => {
    setLoadingSummary(true);
    setLoadingActivities(true);
    try {
      const [summaryData, activitiesData] = await Promise.all([
        getDashboardSummary(),
        getRecentActivities()
      ]);
      setSummary(summaryData);
      setActivities(activitiesData);
    } catch(error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoadingSummary(false);
      setLoadingActivities(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData();
    }
  }, [status]);
  
  const handleNoteAdded = () => {
    fetchData();
  };

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          variants={pageTransitions.slidePerspective}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={transitionPresets.smooth}
          style={{ perspective: 1200 }}
          className="gpu-accelerated"
        >
          {mode === 'attest' ? (
            <AttestModeDashboard 
              summary={summary}
              activities={activities}
              loadingSummary={loadingSummary}
              loadingActivities={loadingActivities}
              onAddNote={() => setShowAddModal(true)}
            />
          ) : (
            <RequestModeDashboard />
          )}
        </motion.div>
      </AnimatePresence>
      <AddNoteDialog 
        open={showAddModal} 
        onOpenChange={setShowAddModal} 
        onNoteAdded={handleNoteAdded} 
      />
    </>
  );
}

export default function DashboardPage() {
  return <PageContent />;
}
