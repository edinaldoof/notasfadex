
'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, isSameDay, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { NoteForCalendar } from '../actions.js';
import { Calendar as CalendarIcon, DollarSign, User } from 'lucide-react';
import { Badge } from '../../../../components/ui/badge';
import { cn } from '../../../lib/utils';
import { ScrollArea } from '../../../../components/ui/scroll-area';

const TimelineView = ({ notes }: { notes: NoteForCalendar[] }) => {
  const sortedNotes = useMemo(() => {
    return [...notes].sort(
      (a, b) =>
        new Date(a.attestationDeadline!).getTime() -
        new Date(b.attestationDeadline!).getTime()
    );
  }, [notes]);

  const groupedByDate = useMemo(() => {
    return sortedNotes.reduce(
      (acc, note) => {
        const date = format(new Date(note.attestationDeadline!), 'yyyy-MM-dd');
        if (!acc[date]) acc[date] = [];
        acc[date].push(note);
        return acc;
      },
      {} as Record<string, NoteForCalendar[]>
    );
  }, [sortedNotes]);

  return (
    <ScrollArea className="h-[600px] pr-4">
      <div className="relative">
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-transparent" />
        {Object.entries(groupedByDate).map(([date, dayNotes], index) => {
          const dateObj = new Date(`${date}T12:00:00`); // Avoid timezone issues
          const isToday = isSameDay(dateObj, new Date());
          const isPastDate = isPast(dateObj) && !isToday;

          return (
            <motion.div
              key={date}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative mb-8"
            >
              <div className="flex items-center gap-4 mb-4">
                <div
                  className={cn(
                    'relative z-10 w-16 h-16 rounded-full flex flex-col items-center justify-center border-2 shadow-lg',
                    isToday
                      ? 'bg-primary/80 border-primary'
                      : isPastDate
                      ? 'bg-red-900/50 border-red-500/50'
                      : 'bg-slate-800 border-slate-700'
                  )}
                >
                  <p className="text-2xl font-bold text-white">
                    {format(dateObj, 'dd')}
                  </p>
                  <p className="text-xs text-white/80 -mt-1">
                    {format(dateObj, 'MMM', { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <p
                    className={cn(
                      'text-lg font-semibold',
                      isToday
                        ? 'text-primary'
                        : isPastDate
                        ? 'text-red-400'
                        : 'text-white'
                    )}
                  >
                    {format(dateObj, 'EEEE', { locale: ptBR })}
                  </p>
                  <p className="text-sm text-slate-400">
                    {dayNotes.length} nota(s)
                  </p>
                </div>
              </div>
              <div className="ml-24 space-y-3">
                {dayNotes.map((note) => (
                  <motion.div
                    key={note.id}
                    whileHover={{ x: 4 }}
                    className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:border-slate-600"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-white">
                        {note.projectTitle || 'Sem título'}
                      </h4>
                      <Badge
                        variant={
                          note.status === 'ATESTADA' ? 'default' : 'destructive'
                        }
                        className={
                          note.status === 'ATESTADA'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }
                      >
                        {note.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {note.requester}
                      </span>
                      {note.totalValue && (
                        <span className="text-green-400 font-medium flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {note.totalValue.toLocaleString('pt-BR')}
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
    </ScrollArea>
  );
};

export default TimelineView;
