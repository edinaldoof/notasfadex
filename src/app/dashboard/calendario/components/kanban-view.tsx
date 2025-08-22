
'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { isPast, isSameDay, differenceInDays } from 'date-fns';
import { NoteForCalendar } from '../actions';
import { NoteCard } from './note-card';

type KanbanColumn = {
  id: string;
  title: string;
  notes: NoteForCalendar[];
};

const KanbanView = ({
  notes,
}: {
  notes: NoteForCalendar[];
}) => {
  const columns: KanbanColumn[] = useMemo(() => {
    const overdue: NoteForCalendar[] = [];
    const today: NoteForCalendar[] = [];
    const thisWeek: NoteForCalendar[] = [];
    const thisMonth: NoteForCalendar[] = [];
    const later: NoteForCalendar[] = [];

    const now = new Date();
    notes
      .filter((n) => n.status === 'PENDENTE' && n.attestationDeadline)
      .forEach((note) => {
        const deadline = new Date(note.attestationDeadline!);
        if (isPast(deadline) && !isSameDay(deadline, now)) {
          overdue.push(note);
        } else if (isSameDay(deadline, now)) {
          today.push(note);
        } else if (differenceInDays(deadline, now) <= 7) {
          thisWeek.push(note);
        } else if (differenceInDays(deadline, now) <= 30) {
          thisMonth.push(note);
        } else {
          later.push(note);
        }
      });

    return [
      { id: 'overdue', title: 'Atrasadas', notes: overdue },
      { id: 'today', title: 'Vence Hoje', notes: today },
      { id: 'thisWeek', title: 'Esta Semana', notes: thisWeek },
      { id: 'thisMonth', title: 'Este Mês', notes: thisMonth },
      { id: 'later', title: 'Próximos', notes: later },
    ];
  }, [notes]);

  return (
    <div className="flex gap-6 overflow-x-auto p-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800/50">
      {columns.map((column) => (
        <div key={column.id} className="w-80 flex-shrink-0">
          <div className="bg-slate-800/50 rounded-xl p-4 h-full">
            <h3 className="font-bold text-white mb-4 px-2 flex justify-between items-center">
              {column.title}
              <span className="text-sm font-normal text-slate-400 bg-slate-700/50 rounded-full px-2 py-0.5">
                {column.notes.length}
              </span>
            </h3>
            <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-20rem)] pr-2">
              {column.notes.map((note, index) => (
                <motion.div
                  key={note.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: index * 0.05 } }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <NoteCard note={note} view="list" />
                </motion.div>
              ))}
              {column.notes.length === 0 && (
                <div className="text-center py-8 text-sm text-slate-500">
                  Nenhuma nota nesta categoria.
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default KanbanView;
