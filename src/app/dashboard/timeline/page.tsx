
'use client';

import { useState, useEffect } from 'react';
import { FiscalNote, HistoryType } from '@/lib/types';
import { FileText, Stamp, PlusCircle, Undo2, Edit, User, History } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { getNotesForTimeline } from './data';
import { Skeleton } from '@/components/ui/skeleton';


const getEventTypeConfig = (type: HistoryType) => {
    switch(type) {
        case 'CREATED':
            return { icon: PlusCircle, color: 'text-blue-400', title: 'Nota Criada' };
        case 'ATTESTED':
            return { icon: Stamp, color: 'text-green-400', title: 'Nota Atestada' };
        case 'REVERTED':
            return { icon: Undo2, color: 'text-amber-400', title: 'Atesto Desfeito' };
        case 'EDITED':
            return { icon: Edit, color: 'text-purple-400', title: 'Nota Editada' };
        default:
            return { icon: FileText, color: 'text-gray-400', title: 'Evento' };
    }
}

const formatTimelineDateTime = (date: Date) => {
    return new Date(date).toLocaleString('pt-BR', { timeZone: 'UTC' });
}


export default function TimelinePage() {
  const [notes, setNotes] = useState<FiscalNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotes = async () => {
        setLoading(true);
        try {
            const fetchedNotes = await getNotesForTimeline();
            setNotes(fetchedNotes);
        } catch (error) {
            console.error("Failed to fetch timeline notes:", error);
        } finally {
            setLoading(false);
        }
    };
    fetchNotes();
  }, []);
  

  return (
    <div>
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
          <History className="w-8 h-8" />
          Linha do Tempo
        </h1>

        <Accordion type="multiple" className="w-full space-y-4">
            {loading ? (
                 Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-border">
                        <Skeleton className="h-8 w-2/3" />
                        <Skeleton className="h-4 w-1/3 mt-2" />
                    </div>
                 ))
            ) : notes.length > 0 ? (
                notes.map(note => (
                    <AccordionItem key={note.id} value={note.id} className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-border data-[state=closed]:p-0 data-[state=open]:p-6 transition-all">
                        <AccordionTrigger className="w-full text-left hover:no-underline data-[state=closed]:p-6 data-[state=open]:pb-6">
                        <div className='flex flex-col items-start'>
                            <h2 className="text-lg font-bold text-white mb-1">{note.description}</h2>
                            <p className="text-sm text-slate-400">Solicitado por: {note.requester}</p>
                        </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            {note.history && note.history.length > 0 ? (
                                <div className="space-y-8 pl-4 border-l-2 border-border ml-3">
                                    {note.history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((event, index) => {
                                        const config = getEventTypeConfig(event.type);
                                        const Icon = config.icon;
                                        return (
                                            <div key={index} className="relative flex items-start">
                                                <div className={`absolute -left-[23px] mt-1.5 flex items-center justify-center w-8 h-8 rounded-full bg-slate-900 border-2 ${config.color.replace('text-', 'border-')}`}>
                                                    <Icon className={`w-4 h-4 ${config.color}`} />
                                                </div>
                                                <div className="ml-8 w-full">
                                                    <p className="font-bold text-white">{config.title}</p>
                                                    <p className="text-xs text-slate-400 mt-1">
                                                        {formatTimelineDateTime(new Date(event.date))}
                                                    </p>
                                                    <p className="text-sm text-slate-300 mt-2">
                                                        {event.details}
                                                    </p>
                                                    <div className="flex items-center space-x-2 text-xs text-slate-500 mt-2">
                                                        <User className="w-3 h-3"/>
                                                        <span>{event.user}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-8 bg-slate-900/50 rounded-xl border border-border">
                                    <p className="text-slate-400">Nenhum evento registrado para esta nota.</p>
                                </div>
                            )}
                        </AccordionContent>
                    </AccordionItem>
                ))
            ) : (
                <div className="text-center py-16 bg-slate-900/50 backdrop-blur-sm rounded-xl border border-border">
                  <History className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 mb-2">Nenhum histórico encontrado</p>
                  <p className="text-slate-500 text-sm">
                    À medida que as notas forem criadas e atualizadas, seus eventos aparecerão aqui.
                  </p>
                </div>
            )}
        </Accordion>
    </div>
  );
}
