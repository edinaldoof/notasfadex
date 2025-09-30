
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  DollarSign,
  Eye,
  User,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NoteForCalendar } from '../actions';
import { differenceInDays, format, isPast, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { NoteDetailsSheet } from '@/components/dashboard/note-details-sheet';

const DeadlineBadge = ({
  deadline,
  size = 'default',
}: {
  deadline: Date;
  size?: 'small' | 'default';
}) => {
  const now = new Date();
  const daysLeft = differenceInDays(deadline, now);

  const sizeClasses = {
    small: 'text-xs px-2 py-0.5',
    default: 'text-sm px-2.5 py-1',
  };

  if (isPast(deadline) && !isSameDay(deadline, now)) {
    return (
      <Badge
        className={cn(
          'bg-red-500/20 text-red-400 border-red-500/30',
          sizeClasses[size]
        )}
      >
        <XCircle className="w-3 h-3 mr-1" />
        Vencida há {Math.abs(daysLeft)} dia(s)
      </Badge>
    );
  }
  if (daysLeft < 1) {
    return (
      <Badge
        className={cn(
          'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse',
          sizeClasses[size]
        )}
      >
        <CalendarClock className="w-3 h-3 mr-1" />
        Vence hoje
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className={cn('border-slate-600 text-slate-300', sizeClasses[size])}
    >
      <CalendarClock className="w-3 h-3 mr-1" />
      {daysLeft} dia(s)
    </Badge>
  );
};

export const NoteCard = ({
  note,
  onAction,
  view = 'grid'
}: {
  note: NoteForCalendar;
  onAction: (action: string, noteId: string) => void;
  view?: 'grid' | 'list';
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const targetDate = note.attestationDeadline || note.createdAt;

  return (
    <>
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="group relative"
    >
      <div
        className={cn(
          'relative p-5 rounded-2xl transition-all duration-300 border',
          note.status === 'ATESTADA'
            ? 'bg-green-950/20 border-green-500/30'
            : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800'
        )}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 pr-8">
            <h3
              className="font-semibold text-white line-clamp-1"
              title={note.projectTitle || ''}
            >
              {note.projectTitle || 'Projeto não informado'}
            </h3>
            <p className="text-xs text-slate-400">
              Nota: {note.numeroNota || 'N/A'}
            </p>
          </div>
           <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDetailsOpen(true)}
              className="opacity-50 group-hover:opacity-100 transition-opacity h-8 w-8"
            >
              <Eye className="w-4 h-4" />
            </Button>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-2 overflow-hidden mt-3"
            >
              <p className="text-sm text-slate-300">{note.description}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between mt-4 text-sm">
          <div className="flex items-center gap-2 text-slate-400">
            <User className="w-4 h-4" />
            <span>{note.requester}</span>
          </div>
          {note.amount && (
            <div className="flex items-center gap-2 text-green-400 font-semibold">
              <DollarSign className="w-4 h-4" />
              <span>
                {note.amount.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-700/50">
          {note.status === 'PENDENTE' && note.attestationDeadline ? (
            <DeadlineBadge deadline={new Date(note.attestationDeadline)} size="small" />
          ) : (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Atestada em{' '}
              {format(new Date(note.attestedAt!), 'dd/MM/yy', {
                locale: ptBR,
              })}
            </Badge>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-slate-400"
          >
            <ChevronDown
              className={cn(
                'w-4 h-4 transition-transform',
                isExpanded && 'rotate-180'
              )}
            />
          </Button>
        </div>
      </div>
    </motion.div>
    
     <NoteDetailsSheet 
        // @ts-ignore
        note={note} 
        open={isDetailsOpen} 
        onOpenChange={setIsDetailsOpen} 
    />
    </>
  );
};
