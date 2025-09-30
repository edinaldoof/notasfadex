'use client';

import { useState, useMemo, useEffect } from 'react';
import { format, isSameDay, isToday, isPast, isFuture, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isWeekend } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NoteForCalendar } from '../actions';
import { NoteCard } from './note-card';
import { 
  CalendarDays, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  FileText,
  ChevronLeft,
  ChevronRight,
  CalendarCheck,
  CalendarClock,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Activity,
  Calendar as CalendarIcon,
  Star,
  Zap,
  Bell,
  ArrowRight,
  Eye,
  Target,
  Award,
  Flame,
  CircleDot,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Componente de Quick Stats - Simplificado
const QuickStats = ({ notes }: { notes: NoteForCalendar[] }) => {
  const today = new Date();
  const todayNotes = notes.filter(note => {
    const targetDate = note.status === 'ATESTADA' ? note.attestedAt : note.attestationDeadline;
    return targetDate && isSameDay(new Date(targetDate), today);
  });

  const urgentNotes = notes.filter(note => {
    const targetDate = note.attestationDeadline;
    return targetDate && note.status !== 'ATESTADA' && isPast(new Date(targetDate));
  });

  return (
    <div className="flex items-center gap-6 p-4 bg-slate-900/50 rounded-xl border border-slate-700/50">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-500/10 rounded-lg">
          <CalendarIcon className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <p className="text-xs text-slate-400">Hoje</p>
          <p className="text-lg font-semibold text-white">{todayNotes.length}</p>
        </div>
      </div>
      
      <Separator orientation="vertical" className="h-8 bg-slate-700/50" />
      
      <div className="flex items-center gap-3">
        <div className="p-2 bg-red-500/10 rounded-lg">
          <Flame className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <p className="text-xs text-slate-400">Urgentes</p>
          <p className="text-lg font-semibold text-red-400">{urgentNotes.length}</p>
        </div>
      </div>
    </div>
  );
};

const CalendarView = ({
  notes,
  onNoteAction,
}: {
  notes: NoteForCalendar[];
  onNoteAction: (action: string, noteId: string) => void;
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  // Estatísticas do mês atual com comparação
  const monthStats = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({ start, end });
    
    const prevStart = startOfMonth(subMonths(currentMonth, 1));
    const prevEnd = endOfMonth(subMonths(currentMonth, 1));
    const prevDaysInMonth = eachDayOfInterval({ start: prevStart, end: prevEnd });
    
    let pendingCount = 0;
    let attestedCount = 0;
    let overdueCount = 0;
    let prevAttestedCount = 0;
    
    daysInMonth.forEach(day => {
      notes.forEach(note => {
        const targetDate = note.status === 'ATESTADA' 
          ? note.attestedAt 
          : note.attestationDeadline;
        
        if (targetDate && isSameDay(new Date(targetDate), day)) {
          if (note.status === 'ATESTADA') {
            attestedCount++;
          } else if (isPast(new Date(targetDate)) && !isToday(new Date(targetDate))) {
            overdueCount++;
          } else {
            pendingCount++;
          }
        }
      });
    });
    
    prevDaysInMonth.forEach(day => {
      notes.forEach(note => {
        if (note.status === 'ATESTADA' && note.attestedAt && isSameDay(new Date(note.attestedAt), day)) {
          prevAttestedCount++;
        }
      });
    });
    
    const trend = attestedCount - prevAttestedCount;
    
    return { pendingCount, attestedCount, overdueCount, trend };
  }, [notes, currentMonth]);

  // Organizar notas por dia
  const notesByDay = useMemo(() => {
    const map = new Map<string, NoteForCalendar[]>();
    
    notes.forEach(note => {
      const targetDate = note.status === 'ATESTADA' 
        ? note.attestedAt 
        : note.attestationDeadline;
      
      if (targetDate) {
        const key = format(new Date(targetDate), 'yyyy-MM-dd');
        if (!map.has(key)) {
          map.set(key, []);
        }
        map.get(key)?.push(note);
      }
    });
    
    return map;
  }, [notes]);

  // Modificadores para o calendário
  const modifiers = useMemo(() => {
    const pendingDays: Date[] = [];
    const attestedDays: Date[] = [];
    const overdueDays: Date[] = [];
    const multipleDays: Date[] = [];

    notesByDay.forEach((dayNotes, dateKey) => {
      const date = new Date(dateKey);
      
      if (dayNotes.length > 1) {
        multipleDays.push(date);
      }
      
      const hasOverdue = dayNotes.some(note => 
        note.status !== 'ATESTADA' && isPast(date) && !isToday(date)
      );
      const hasPending = dayNotes.some(note => 
        note.status !== 'ATESTADA' && !isPast(date)
      );
      const hasAttested = dayNotes.some(note => 
        note.status === 'ATESTADA'
      );
      
      if (hasOverdue) {
        overdueDays.push(date);
      } else if (hasPending) {
        pendingDays.push(date);
      } else if (hasAttested) {
        attestedDays.push(date);
      }
    });

    return {
      pending: pendingDays,
      attested: attestedDays,
      overdue: overdueDays,
      multiple: multipleDays,
    };
  }, [notesByDay]);

  // Notas do dia selecionado
  const selectedDateNotes = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, 'yyyy-MM-dd');
    return notesByDay.get(key) || [];
  }, [notesByDay, selectedDate]);

  // Componente de dia limpo e profissional
  const DayContent = ({ date }: { date: Date }) => {
    const key = format(date, 'yyyy-MM-dd');
    const dayNotes = notesByDay.get(key) || [];
    const hasOverdue = dayNotes.some(note => 
      note.status !== 'ATESTADA' && isPast(date) && !isToday(date)
    );
    const hasPending = dayNotes.some(note => 
      note.status !== 'ATESTADA' && !isPast(date)
    );
    const hasAttested = dayNotes.some(note => 
      note.status === 'ATESTADA'
    );
    const isSelected = selectedDate && isSameDay(date, selectedDate);
    
    return (
      <div className="relative w-full h-full flex flex-col items-center justify-center">
        {/* Day Number */}
        <span className={cn(
          "text-base font-medium",
          isToday(date) && "text-blue-400 font-semibold",
          hasOverdue && !isToday(date) && "text-red-400",
          hasPending && !hasOverdue && !isToday(date) && "text-amber-400",
          hasAttested && !hasOverdue && !hasPending && !isToday(date) && "text-emerald-400",
          !hasOverdue && !hasPending && !hasAttested && !isToday(date) && "text-slate-300",
          isWeekend(date) && !hasOverdue && !hasPending && !hasAttested && "text-slate-500"
        )}>
          {format(date, 'd')}
        </span>
        
        {/* Event Indicators - Simplified */}
        {dayNotes.length > 0 && (
          <div className="absolute bottom-1 flex gap-1">
            {dayNotes.length <= 3 ? (
              dayNotes.map((_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "w-1 h-1 rounded-full",
                    hasOverdue ? "bg-red-400" :
                    hasPending ? "bg-amber-400" : 
                    "bg-emerald-400"
                  )}
                />
              ))
            ) : (
              <div className={cn(
                "text-[10px] font-medium px-1 rounded",
                hasOverdue ? "text-red-400 bg-red-400/10" :
                hasPending ? "text-amber-400 bg-amber-400/10" : 
                "text-emerald-400 bg-emerald-400/10"
              )}>
                {dayNotes.length}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header com Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <QuickStats notes={notes} />
      </motion.div>

      {/* Estatísticas do Mês - Design Profissional */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card Pendentes */}
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Clock className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Pendentes</p>
                  <p className="text-2xl font-semibold text-white">
                    {monthStats.pendingCount}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card Atestadas */}
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Atestadas</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-semibold text-white">
                      {monthStats.attestedCount}
                    </p>
                    {monthStats.trend !== 0 && (
                      <span className={cn(
                        "text-xs font-medium",
                        monthStats.trend > 0 ? "text-emerald-400" : "text-red-400"
                      )}>
                        {monthStats.trend > 0 ? "+" : ""}{monthStats.trend}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card Vencidas */}
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Vencidas</p>
                  <p className="text-2xl font-semibold text-white">
                    {monthStats.overdueCount}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card Taxa de Conclusão */}
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Target className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Taxa</p>
                  <p className="text-2xl font-semibold text-white">
                    {monthStats.attestedCount + monthStats.pendingCount + monthStats.overdueCount > 0
                      ? Math.round((monthStats.attestedCount / (monthStats.attestedCount + monthStats.pendingCount + monthStats.overdueCount)) * 100)
                      : 0}%
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Calendário Principal - Design Profissional */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="xl:col-span-2"
        >
          <Card className="bg-slate-900/50 backdrop-blur-sm border-slate-700/50 shadow-xl">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CalendarDays className="w-6 h-6 text-blue-400" />
                  <div>
                    <CardTitle className="text-2xl font-semibold text-white">
                      {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                    </CardTitle>
                    <p className="text-sm text-slate-400 mt-0.5">
                      {format(new Date(), "'Hoje é' EEEE, dd 'de' MMMM", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    className="hover:bg-slate-700/50 rounded-lg h-9 w-9"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentMonth(new Date())}
                    className="hover:bg-slate-700/50 rounded-lg h-9 w-9"
                  >
                    <CircleDot className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="hover:bg-slate-700/50 rounded-lg h-9 w-9"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-6 pt-2">
              {/* Legenda Simples */}
              <div className="flex items-center gap-6 mb-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-amber-400 rounded-full" />
                  <span className="text-slate-400">Pendente</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                  <span className="text-slate-400">Atestada</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-400 rounded-full" />
                  <span className="text-slate-400">Vencida</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full ring-1 ring-blue-400/30 ring-offset-1 ring-offset-slate-900" />
                  <span className="text-slate-400">Hoje</span>
                </div>
              </div>

              {/* Calendário */}
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                className="w-full"
                locale={ptBR}
                modifiers={modifiers}
                modifiersClassNames={{
                  pending: 'pending-day',
                  attested: 'attested-day',
                  overdue: 'overdue-day',
                  today: 'today-highlight',
                }}
                classNames={{
                  months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                  month: "space-y-4 w-full",
                  caption: "flex justify-center pt-1 relative items-center",
                  caption_label: "text-lg font-medium hidden",
                  nav: "space-x-1 flex items-center hidden",
                  table: "w-full border-collapse",
                  head_row: "flex",
                  head_cell: cn(
                    "text-slate-500 rounded-md w-14 font-normal text-xs flex-1 text-center uppercase"
                  ),
                  row: "flex w-full mt-1",
                  cell: cn(
                    "relative h-14 w-14 flex-1 text-center text-sm p-0",
                    "hover:bg-slate-800/50 rounded-lg transition-colors",
                    "focus-within:relative focus-within:z-20"
                  ),
                  day: cn(
                    "h-14 w-14 p-0 font-normal rounded-lg",
                    "hover:bg-slate-800/50 transition-colors"
                  ),
                  day_selected: "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30",
                  day_today: "bg-blue-500/10 text-blue-400 font-semibold border border-blue-500/20",
                  day_outside: "text-slate-600 opacity-50",
                  day_disabled: "text-slate-600 opacity-50",
                }}
                components={{
                  DayContent: DayContent as any,
                }}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Painel de Eventos - Design Profissional */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="xl:col-span-1"
        >
          <Card className="bg-slate-900/50 backdrop-blur-sm border-slate-700/50 shadow-xl h-full">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-purple-400" />
                  <div>
                    <CardTitle className="text-lg font-semibold text-white">
                      {selectedDate
                        ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR })
                        : 'Selecione um dia'}
                    </CardTitle>
                    {selectedDate && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        {format(selectedDate, 'EEEE', { locale: ptBR })}
                      </p>
                    )}
                  </div>
                </div>
                {selectedDateNotes.length > 0 && (
                  <Badge variant="secondary" className="bg-slate-800/50 text-slate-300">
                    {selectedDateNotes.length}
                  </Badge>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="pb-6">
              <ScrollArea className="h-[480px] pr-2">
                <AnimatePresence mode="wait">
                  {selectedDateNotes.length > 0 ? (
                    <motion.div
                      key="notes"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-3"
                    >
                      {selectedDateNotes.map((note, index) => (
                        <motion.div
                          key={note.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{
                            opacity: 1,
                            y: 0,
                            transition: { delay: index * 0.05 }
                          }}
                        >
                          <NoteCard note={note} onAction={onNoteAction} />
                        </motion.div>
                      ))}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center justify-center h-full"
                    >
                      <div className="p-4 bg-slate-800/30 rounded-lg mb-4">
                        <CalendarCheck className="w-12 h-12 text-slate-600" />
                      </div>
                      <p className="text-sm text-slate-400 text-center">
                        Nenhum evento agendado
                      </p>
                      <p className="text-xs text-slate-500 text-center mt-2">
                        Selecione outro dia no calendário
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default CalendarView;