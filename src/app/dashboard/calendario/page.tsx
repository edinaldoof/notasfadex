
'use client';

import { useState, useCallback, useEffect, useTransition } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Calendar as CalendarIcon,
  CheckCircle2,
  FileText,
  LayoutGrid,
  List,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Timer,
  XCircle,
  CalendarClock,
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { format, addDays, isPast, isSameDay } from 'date-fns';
import { motion } from 'framer-motion';
import { ptBR } from 'date-fns/locale';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '../../../../components/ui/dialog';
import { Calendar } from '../../../../components/ui/calendar';
import { Label } from '../../../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/tabs';
import { Skeleton } from '../../../../components/ui/skeleton';
import { useToast } from '../../../../hooks/use-toast';
import {
  getNotesForCalendar,
  getCalendarStats,
  markNoteAsAttested,
  postponeDeadline,
  NoteForCalendar,
  CalendarStats,
} from './actions';
import { cn } from '../../../lib/utils';

// Importando os novos componentes
import CalendarView from './components/calendar-view';
import ListView from './components/list-view';
import KanbanView from './components/kanban-view';
import TimelineView from './components/timeline-view';
import AnalyticsView from './components/analytics-view';

type ViewMode = 'calendar' | 'list' | 'kanban' | 'timeline' | 'analytics';

const useCalendarData = () => {
  const [notes, setNotes] = useState<NoteForCalendar[]>([]);
  const [stats, setStats] = useState<CalendarStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [notesData, statsData] = await Promise.all([
        getNotesForCalendar(),
        getCalendarStats(),
      ]);
      setNotes(notesData);
      setStats(statsData);
    } catch (error) {
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível buscar as notas do calendário.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { notes, stats, loading, fetchData };
};

const PageSkeleton = () => (
  <div className="space-y-8">
    <Skeleton className="h-16 w-1/2" />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-32 w-full" />
      ))}
    </div>
    <Skeleton className="h-12 w-full max-w-2xl" />
    <Skeleton className="h-[500px] w-full" />
  </div>
);

export default function CalendarioPage() {
  const { notes, stats, loading, fetchData } = useCalendarData();
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [isTransitioning, startTransition] = useTransition();
  const { toast } = useToast();
  
  const [isPostponeDialogOpen, setIsPostponeDialogOpen] = useState(false);
  const [postponeNoteId, setPostponeNoteId] = useState<string | null>(null);
  const [newDeadline, setNewDeadline] = useState<Date | undefined>();

  const handleNoteAction = useCallback(async (action: string, noteId: string) => {
    startTransition(async () => {
      try {
        if (action === 'attest') {
          await markNoteAsAttested(noteId);
          toast({ title: 'Sucesso', description: 'Nota atestada com sucesso.' });
        } else if (action === 'postpone') {
          setPostponeNoteId(noteId);
          const currentNote = notes.find(n => n.id === noteId);
          setNewDeadline(addDays(currentNote?.attestationDeadline || new Date(), 7));
          setIsPostponeDialogOpen(true);
          return; // Don't refetch yet
        }
        fetchData();
      } catch (error) {
        toast({ title: 'Erro', description: `Falha ao executar ação: ${action}`, variant: 'destructive'});
      }
    });
  }, [fetchData, notes, toast]);

  const handlePostponeConfirm = async () => {
    if (postponeNoteId && newDeadline) {
      startTransition(async () => {
        try {
          await postponeDeadline(postponeNoteId, newDeadline);
          toast({ title: 'Sucesso', description: 'Prazo adiado com sucesso.' });
          setIsPostponeDialogOpen(false);
          fetchData();
        } catch (error) {
          toast({ title: 'Erro', description: 'Falha ao adiar o prazo.', variant: 'destructive'});
        }
      });
    }
  };

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
            <h1 className="text-4xl font-bold">Calendário de Vencimentos</h1>
            <Button onClick={() => fetchData()} variant="outline" size="sm" disabled={isTransitioning}>
                <RefreshCw className={cn("w-4 h-4 mr-2", isTransitioning && "animate-spin")} />
                Atualizar
            </Button>
        </div>
      </motion.div>
      
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-5 bg-slate-800/50 border border-slate-700 p-1 h-auto">
          <TabsTrigger value="calendar"><CalendarIcon className="w-4 h-4 mr-2" />Calendário</TabsTrigger>
          <TabsTrigger value="list"><List className="w-4 h-4 mr-2" />Lista</TabsTrigger>
          <TabsTrigger value="kanban"><LayoutGrid className="w-4 h-4 mr-2" />Kanban</TabsTrigger>
          <TabsTrigger value="timeline"><Timer className="w-4 h-4 mr-2" />Timeline</TabsTrigger>
          <TabsTrigger value="analytics"><BarChart3 className="w-4 h-4 mr-2" />Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="calendar">
          <CalendarView notes={notes} onNoteAction={handleNoteAction} />
        </TabsContent>
        <TabsContent value="list">
          <ListView notes={notes} onNoteAction={handleNoteAction} />
        </TabsContent>
        <TabsContent value="kanban">
          <KanbanView notes={notes} onNoteAction={handleNoteAction} />
        </TabsContent>
        <TabsContent value="timeline">
          <TimelineView notes={notes} />
        </TabsContent>
        <TabsContent value="analytics">
          <AnalyticsView notes={notes} />
        </TabsContent>
      </Tabs>

       <Dialog open={isPostponeDialogOpen} onOpenChange={setIsPostponeDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700">
            <DialogHeader>
                <DialogTitle>Adiar Prazo de Vencimento</DialogTitle>
                <DialogDescription>Selecione a nova data para a nota.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Calendar
                    mode="single"
                    selected={newDeadline}
                    onSelect={setNewDeadline}
                    disabled={(date) => isPast(date) && !isSameDay(date, new Date())}
                    className="rounded-md border border-slate-700"
                    locale={ptBR}
                />
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsPostponeDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handlePostponeConfirm} disabled={!newDeadline || isTransitioning}>
                    {isTransitioning && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Confirmar Nova Data
                </Button>
            </DialogFooter>
        </DialogContent>
       </Dialog>
    </div>
  );
}
