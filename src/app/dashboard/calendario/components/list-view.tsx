
'use client';

import { NoteCard } from './note-card';
import { NoteForCalendar } from '../actions';

const ListView = ({
  notes,
  onNoteAction
}: {
  notes: NoteForCalendar[];
  onNoteAction: (action: string, noteId: string) => void;
}) => {
  if (!notes.length) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-400">Nenhuma nota encontrada para os filtros selecionados.</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {notes.map((note) => (
        <NoteCard key={note.id} note={note} onAction={onNoteAction} view="grid" />
      ))}
    </div>
  );
};

export default ListView;
