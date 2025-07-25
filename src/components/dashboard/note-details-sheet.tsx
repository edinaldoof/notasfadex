
'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { FiscalNote, NoteHistoryEvent, HistoryType } from '@/lib/types';
import { FileText, Stamp, PlusCircle, Undo2, Edit, User, Calendar, Tag, BadgeInfo, Hash, CircleDollarSign } from 'lucide-react';
import { Separator } from '../ui/separator';

interface NoteDetailsSheetProps {
  note: FiscalNote | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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
    return date.toLocaleString('pt-BR', { timeZone: 'UTC' });
}

const DetailItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value?: string | number | null }) => {
  if (!value) return null;
  return (
    <div className="flex items-start">
      <Icon className="w-4 h-4 text-slate-400 mt-1 mr-3 flex-shrink-0" />
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-medium text-white">{value}</p>
      </div>
    </div>
  );
};


export function NoteDetailsSheet({ note, open, onOpenChange }: NoteDetailsSheetProps) {
  if (!note) return null;

  const sortedHistory = note.history ? [...note.history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-md sm:max-w-lg bg-slate-950/95 backdrop-blur-sm border-slate-800 text-white overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-2xl font-bold flex items-center gap-3">
             <FileText className="w-8 h-8 text-primary" />
             Detalhes da Nota Fiscal
          </SheetTitle>
          <SheetDescription className="text-slate-400">
            {note.description}
          </SheetDescription>
        </SheetHeader>
        
        <div className='space-y-6'>
            <div>
                <h3 className='text-lg font-semibold mb-4 text-slate-300'>Informações Gerais</h3>
                <div className='grid grid-cols-2 gap-x-4 gap-y-6 bg-slate-900/50 p-4 rounded-xl border border-border'>
                    <DetailItem icon={User} label="Analista" value={note.requester} />
                    <DetailItem icon={Calendar} label="Data de Envio" value={new Date(note.issueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} />
                    <DetailItem icon={BadgeInfo} label="Status" value={note.status} />
                    <DetailItem icon={Tag} label="Categoria" value={note.category} />
                    <DetailItem icon={Hash} label="ID da Nota" value={note.id} />
                    <DetailItem icon={CircleDollarSign} label="Valor" value={note.amount?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
                </div>
            </div>

            <Separator className="bg-border" />
            
            <div>
                <h3 className='text-lg font-semibold mb-4 text-slate-300'>Linha do Tempo da Nota</h3>
                {sortedHistory.length > 0 ? (
                    <div className="space-y-8 pl-4 border-l-2 border-border ml-3">
                         {sortedHistory.map((event, index) => {
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
                                            {formatTimelineDateTime(event.date)}
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
            </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
