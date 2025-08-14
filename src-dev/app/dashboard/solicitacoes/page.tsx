
'use client';

import { useAppMode } from '@/contexts/app-mode-context';
import { useEffect, useState } from 'react';
import { 
    Handshake, 
    FilePlus,
    Send,
    CheckCircle,
    Clock,
    Activity,
    Lightbulb,
    ChevronRight,
    AlertTriangle,
    Calendar as CalendarIcon,
    Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';

// Mock Data - Substituirá por chamadas de API reais no futuro
const mockStats = {
    enviadas: 124,
    confirmadas: 98,
    aguardandoNota: 26,
};

const mockRecentActivities = [
    { id: 1, user: 'Marina', action: 'enviou a OF #1752 para', target: 'Tecnologia & Inovação Ltda.', time: '2 horas atrás' },
    { id: 2, user: 'Sistema', action: 'marcou a OF #1749 como', target: 'ATRASADA', time: '8 horas atrás' },
    { id: 3, user: 'Fornecedor XYZ', action: 'confirmou o recebimento da OF #1751', target: '', time: 'ontem' },
    { id: 4, user: 'Roberto', action: 'cancelou a OF #1748', target: '', time: '2 dias atrás' },
];

const mockInsights = [
    { id: 1, text: 'A OF #1750 para Soluções em Logística vence em 3 dias.', level: 'warning' },
    { id: 2, text: 'Fornecedor "Consultoria Estratégica" tem 3 OFs com confirmação pendente.', level: 'info' },
];

const getInitials = (name: string | null) => {
    if (!name) return '??';
    return name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();
};

const GREETING_TIMES = {
  MORNING: 12,
  AFTERNOON: 18
} as const;

function StatCard({ title, value, icon, loading }: { title: string; value: number; icon: React.ReactNode; loading: boolean }) {
    if (loading) return <Skeleton className="h-28 w-full" />;

    return (
        <Card className="shadow-sm hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className="text-4xl font-bold">{value}</div>
            </CardContent>
        </Card>
    );
}

function RecentActivityItem({ activity }: { activity: typeof mockRecentActivities[0] }) {
    return (
        <div className="flex items-center gap-4 py-3 px-2 rounded-lg hover:bg-slate-100 transition-colors">
            <Avatar className="h-9 w-9">
                {/* <AvatarImage src="/avatars/01.png" alt="Avatar" /> */}
                <AvatarFallback>{getInitials(activity.user)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 text-sm">
                <span className="font-semibold text-foreground">{activity.user}</span>
                <span className="text-muted-foreground"> {activity.action} </span>
                {activity.target && <span className="font-semibold text-primary">{activity.target}</span>}
            </div>
            <div className="text-xs text-muted-foreground">{activity.time}</div>
        </div>
    )
}

function InsightItem({ insight }: { insight: typeof mockInsights[0] }) {
    return (
        <div className="flex items-start gap-3 p-3 bg-slate-100/50 rounded-lg border border-slate-200">
            <div className="pt-0.5">
            {insight.level === 'warning' 
                ? <AlertTriangle className="w-4 h-4 text-amber-500" /> 
                : <Lightbulb className="w-4 h-4 text-blue-500" />
            }
            </div>
            <p className="flex-1 text-sm text-muted-foreground">{insight.text}</p>
            <ChevronRight className="w-4 h-4 text-muted-foreground/50 self-center"/>
        </div>
    )
}


export default function SolicitacoesPage() {
  const { setMode } = useAppMode();
  const [loading, setLoading] = useState(true);
  const { data: session, status } = useSession();
  const [greeting, setGreeting] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    setMode('request');
    const timer = setTimeout(() => setLoading(false), 750); // Simula carregamento
    
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

    return () => clearTimeout(timer);
  }, [setMode]);

  const getDisplayName = () => {
    if (!session?.user?.name) return '';
    const nameParts = session.user.name.split(' ');
    if (nameParts.length > 1 && nameParts[0].toUpperCase() === 'FADEX') return nameParts[1];
    return nameParts[0];
  };
  
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-2xl blur opacity-20"></div>
            <div className="relative bg-gradient-to-r from-blue-500 to-cyan-600 p-3 rounded-2xl">
              <Handshake className="w-8 h-8 text-white" />
            </div>
          </div>
          <div>
            {status === 'loading' ? (
                <Skeleton className="h-10 w-80 mb-2" />
            ) : (
                <h1 className="text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
                    {greeting}, {getDisplayName()}!
                    <motion.div
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 0.5, delay: 0.5 }}
                    >
                        <Sparkles className="w-8 h-8 text-yellow-400" />
                    </motion.div>
                </h1>
            )}
            <p className="text-muted-foreground capitalize flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              {currentDate}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4 sm:mt-0">
          <Link href="/dashboard/solicitacoes/nova-solicitacao">
            <Button variant="default" size="lg">
              <FilePlus className="w-5 h-5 mr-2" />
              Nova Solicitação
            </Button>
          </Link>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard title="OFs Enviadas" value={mockStats.enviadas} icon={<Send className="h-5 w-5 text-muted-foreground" />} loading={loading} />
        <StatCard title="Confirmadas pelo Fornecedor" value={mockStats.confirmadas} icon={<CheckCircle className="h-5 w-5 text-muted-foreground" />} loading={loading} />
        <StatCard title="Aguardando Nota Fiscal" value={mockStats.aguardandoNota} icon={<Clock className="h-5 w-5 text-muted-foreground" />} loading={loading} />
      </div>

      {/* Atividades Recentes e Insights */}
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
            <Card className="h-full shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="w-5 h-5"/>
                        Atividades Recentes
                    </CardTitle>
                </CardHeader>
                <CardContent>
                     {loading ? (
                        <div className="space-y-4">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {mockRecentActivities.map(activity => (
                                <RecentActivityItem key={activity.id} activity={activity} />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-1">
             <Card className="h-full shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Lightbulb className="w-5 h-5"/>
                        Insights & Alertas
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-4">
                            <Skeleton className="h-14 w-full" />
                            <Skeleton className="h-14 w-full" />
                        </div>
                    ) : (
                       <div className="space-y-4">
                            {mockInsights.map(insight => (
                                <InsightItem key={insight.id} insight={insight} />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
