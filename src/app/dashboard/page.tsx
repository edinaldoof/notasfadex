'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  FileSpreadsheet, 
  Clock, 
  BarChart3,
  Plus
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/stat-card';
import { AddNoteDialog } from '@/app/dashboard/add-note-dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import { Skeleton } from '@/components/ui/skeleton';
import { getDashboardSummary } from './actions';
import { CheckBadge } from '@/components/icons/check-badge';

// Adicionar interface para o summary
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

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary>({ totalNotes: 0, attestedNotes: 0, pendingNotes: 0, totalAmount: 0 });
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const { data: session, status } = useSession();
  const [greeting, setGreeting] = useState('');
  // Adicionar um estado para erros
  const [error, setError] = useState<string | null>(null);

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
        // Optionally set error state to show a message to the user
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

  return (
    <>
      {status === 'loading' ? (
         <Skeleton className="h-9 w-80 mb-8" />
      ) : (
         <h1 className="text-3xl font-bold mb-8">
          {greeting}, {session?.user?.name ? getDisplayName() : ''}!
        </h1>
      )}
     
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Link href="/dashboard/notas?status=all">
          <StatCard
            title="Total de Notas"
            value={summary.totalNotes}
            icon={<FileSpreadsheet className="w-6 h-6 text-primary" />}
            loading={loading || status !== 'authenticated'}
          />
        </Link>
        <Link href="/dashboard/notas?status=atestada">
          <StatCard
            title="Notas Atestadas"
            value={summary.attestedNotes}
            icon={<CheckBadge className="w-6 h-6 text-green-400" />}
            loading={loading || status !== 'authenticated'}
          />
        </Link>
        <Link href="/dashboard/notas?status=pendente">
          <StatCard
            title="Pendentes"
            value={summary.pendingNotes}
            icon={<Clock className="w-6 h-6 text-amber-400" />}
            loading={loading || status !== 'authenticated'}
          />
        </Link>
        <StatCard
          title="Valor Total"
          value={`R$ ${summary.totalAmount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`}
          icon={<BarChart3 className="w-6 h-6 text-fuchsia-400" />}
          loading={loading || status !== 'authenticated'}
        />
      </div>

       <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-border">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold">Visão Geral</h2>
              <p className="text-slate-400 mt-1">
                Bem-vindo ao painel de controle da Notas Fadex.
              </p>
            </div>
            <Button
              onClick={() => setShowAddModal(true)}
              aria-label="Adicionar nova nota"
              role="button"
              className={cn(
                'mt-4 sm:mt-0 px-6 py-2 font-semibold transition-all duration-300 flex items-center space-x-2 whitespace-nowrap',
                 'bg-gradient-to-r from-emerald-500 to-green-600 text-white',
                 'hover:shadow-lg hover:shadow-emerald-500/20 hover:scale-[1.02]'
              )}
            >
              <Plus className="w-5 h-5" />
              <span>Nova Nota</span>
            </Button>
          </div>
          <p className="text-slate-400">
             Use o menu à esquerda para navegar pelas seções ou adicione uma nova nota fiscal diretamente daqui.
          </p>
       </div>
       <AddNoteDialog open={showAddModal} onOpenChange={setShowAddModal} onNoteAdded={handleNoteAdded} />
    </>
  )
}
