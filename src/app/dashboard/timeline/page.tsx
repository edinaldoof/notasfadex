
'use client';

import { useState, useEffect } from 'react';
import { FiscalNote, HistoryType } from '@/lib/types';
import { FileText, Stamp, PlusCircle, Undo2, Edit, User, History, Clock, Calendar, Search, AlertTriangle, XCircle, FileSpreadsheet, Trash2, Undo } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { getNotesForTimeline } from './data';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const getEventTypeConfig = (type: HistoryType) => {
    switch(type) {
        case 'CREATED':
            return { icon: PlusCircle, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30', title: 'Nota Criada', description: 'Nova nota fiscal foi registrada no sistema' };
        case 'ATTESTED':
            return { icon: Stamp, color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30', title: 'Nota Atestada', description: 'Nota fiscal foi verificada e aprovada' };
        case 'REVERTED':
            return { icon: Undo2, color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30', title: 'Atesto Desfeito', description: 'Aprovação foi revertida' };
        case 'EDITED':
            return { icon: Edit, color: 'text-purple-400', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/30', title: 'Nota Editada', description: 'Informações da nota foram atualizadas' };
        case 'EXPIRED':
             return { icon: AlertTriangle, color: 'text-rose-400', bgColor: 'bg-rose-500/10', borderColor: 'border-rose-500/30', title: 'Nota Expirada', description: 'Prazo para atesto da nota expirou' };
        case 'REJECTED':
             return { icon: XCircle, color: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30', title: 'Nota Rejeitada', description: 'Nota foi rejeitada pelo coordenador' };
        case 'DELETED':
             return { icon: Trash2, color: 'text-slate-400', bgColor: 'bg-slate-500/10', borderColor: 'border-slate-500/30', title: 'Movida para Lixeira', description: 'A nota foi movida para a lixeira' };
        case 'RESTORED':
             return { icon: Undo, color: 'text-lime-400', bgColor: 'bg-lime-500/10', borderColor: 'border-lime-500/30', title: 'Nota Restaurada', description: 'A nota foi restaurada da lixeira' };
        default:
            return { icon: FileText, color: 'text-slate-400', bgColor: 'bg-slate-500/10', borderColor: 'border-slate-500/30', title: 'Evento', description: 'Atividade registrada' };
    }
}

const formatTimelineDateTime = (date: Date) => {
    const now = new Date();
    const eventDate = new Date(date);
    const diffInHours = Math.floor((now.getTime() - eventDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
        if (diffInHours < 1) return 'Agora mesmo';
        return `${diffInHours}h atrás`;
    } else if (diffInHours < 168) {
        const days = Math.floor(diffInHours / 24);
        return `${days}d atrás`;
    }
    
    return eventDate.toLocaleString('pt-BR', { 
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

const getStatusBadge = (note: FiscalNote) => {
    const lastEvent = note.history?.[0];
    if (!lastEvent) return null;
    
    const config = getEventTypeConfig(lastEvent.type);
    return (
        <Badge variant="outline" className={`${config.color} ${config.borderColor} ${config.bgColor} border`}>
            {config.title}
        </Badge>
    );
}

const getInitials = (name: string | null) => {
  if (!name) return '??';
  return name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();
};


export default function TimelinePage() {
  const [notes, setNotes] = useState<FiscalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredNotes, setFilteredNotes] = useState<FiscalNote[]>([]);

  useEffect(() => {
    const fetchNotes = async () => {
        setLoading(true);
        try {
            const fetchedNotes = await getNotesForTimeline();
            setNotes(fetchedNotes);
            setFilteredNotes(fetchedNotes);
        } catch (error) {
            console.error("Failed to fetch timeline notes:", error);
        } finally {
            setLoading(false);
        }
    };
    fetchNotes();
  }, []);

  useEffect(() => {
    const filtered = notes.filter(note => 
        note.numeroNota?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.projectTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.requester?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.projectAccountNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredNotes(filtered);
  }, [searchTerm, notes]);

  const totalEvents = notes.reduce((acc, note) => acc + (note.history?.length || 0), 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur opacity-20"></div>
              <div className="relative bg-gradient-to-r from-blue-500 to-purple-600 p-3 rounded-2xl">
                <History className="w-8 h-8 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                Linha do Tempo
              </h1>
              <p className="text-slate-400 mt-1">
                Acompanhe todas as atividades do sistema em tempo real
              </p>
            </div>
          </div>
          
          <div className="hidden lg:flex gap-4">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{notes.length}</p>
                  <p className="text-xs text-slate-400">Notas</p>
                </div>
              </div>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{totalEvents}</p>
                  <p className="text-xs text-slate-400">Eventos</p>
                </div>
              </div>
            </div>
          </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
        <Input
          placeholder="Buscar por nº, título, descrição ou solicitante..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-secondary/80 border-border"
        />
      </div>

      <div className="w-full">
        <Accordion type="multiple" className="w-full space-y-6">
            {loading ? (
                 Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="group bg-background/80 backdrop-blur-sm rounded-2xl p-8 border border-border">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <Skeleton className="h-6 w-2/3 mb-3" />
                            <Skeleton className="h-4 w-1/3 mb-2" />
                            <Skeleton className="h-4 w-1/4" />
                          </div>
                          <Skeleton className="h-6 w-20" />
                        </div>
                    </div>
                 ))
            ) : filteredNotes.length > 0 ? (
                filteredNotes.map(note => (
                    <AccordionItem 
                      key={note.id} 
                      value={note.id} 
                      className="group bg-background/80 backdrop-blur-sm rounded-2xl border border-border/80 hover:border-border transition-all duration-300 hover:bg-accent/40 data-[state=closed]:p-0 data-[state=open]:pb-8 overflow-hidden"
                    >
                        <AccordionTrigger className="w-full text-left hover:no-underline data-[state=closed]:p-8 data-[state=open]:p-8 data-[state=open]:pb-6 group-hover:bg-accent/40 transition-colors">
                          <div className='flex items-start justify-between w-full'>
                            <div className='flex flex-col items-start flex-1'>
                                <div className="flex items-center gap-3 mb-2">
                                  <h2 className="text-xl font-bold text-white group-hover:text-primary transition-colors">
                                      {note.projectTitle || `Nota ${note.numeroNota || 'S/N'}`}
                                  </h2>
                                  {getStatusBadge(note)}
                                </div>
                                
                                <div className="flex flex-col gap-2 text-sm">
                                  {note.projectAccountNumber && (
                                    <div className="flex items-center gap-2 text-slate-400">
                                      <Calendar className="w-4 h-4" />
                                      <span>Conta: {note.projectAccountNumber}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 text-slate-400">
                                    <User className="w-4 h-4" />
                                    <span>Solicitado por: {note.requester}</span>
                                  </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2 text-xs text-slate-500 ml-4">
                              <Clock className="w-3 h-3" />
                              <span>{note.history?.[0] ? formatTimelineDateTime(new Date(note.history[0].date)) : 'Sem atividade'}</span>
                            </div>
                          </div>
                        </AccordionTrigger>
                        
                        <AccordionContent className="px-8">
                            {note.history && note.history.length > 0 ? (
                                <div className="relative">
                                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/50 via-primary/30 to-transparent"></div>
                                  
                                  <div className="space-y-6">
                                      {note.history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((event, index) => {
                                          const config = getEventTypeConfig(event.type);
                                          const Icon = config.icon;
                                          const isFirst = index === 0;
                                          
                                          const eventUserName = event.author?.name || event.userName || "Sistema";
                                          const eventUserImage = event.author?.image;

                                          return (
                                              <div key={event.id} className="relative flex items-start group/event">
                                                  <div className={`relative flex items-center justify-center w-12 h-12 rounded-2xl ${config.bgColor} ${config.borderColor} border-2 backdrop-blur-sm transition-all group-hover/event:scale-110 ${isFirst ? 'shadow-lg shadow-primary/20' : ''}`}>
                                                      <Icon className={`w-5 h-5 ${config.color}`} />
                                                      {isFirst && (
                                                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/20 to-primary/20 animate-pulse"></div>
                                                      )}
                                                  </div>
                                                  
                                                  <div className="ml-6 flex-1 min-w-0">
                                                      <div className={`p-6 rounded-2xl ${config.bgColor} border ${config.borderColor} backdrop-blur-sm transition-all`}>
                                                          <div className="flex items-start justify-between mb-3">
                                                              <div>
                                                                  <h3 className="font-bold text-white mb-1">{config.title}</h3>
                                                                  <p className="text-xs text-slate-400">{config.description}</p>
                                                              </div>
                                                              <div className="text-right">
                                                                  <p className="text-xs text-slate-400 mb-1">
                                                                      {formatTimelineDateTime(new Date(event.date))}
                                                                  </p>
                                                                  {isFirst && (
                                                                    <Badge variant="secondary" className="text-xs bg-primary/20 text-primary-foreground/80 border-primary/30">
                                                                      Recente
                                                                    </Badge>
                                                                  )}
                                                              </div>
                                                          </div>
                                                          
                                                          {event.details && (
                                                            <p className="text-slate-300 mb-4 leading-relaxed">
                                                                {event.details}
                                                            </p>
                                                          )}
                                                          
                                                          <div className="flex items-center gap-2 pt-3 border-t border-slate-700/50">
                                                              <Avatar className="w-7 h-7">
                                                                <AvatarImage src={eventUserImage ?? undefined} />
                                                                <AvatarFallback className="text-xs bg-slate-700 text-slate-300">
                                                                    {getInitials(eventUserName)}
                                                                </AvatarFallback>
                                                              </Avatar>
                                                              <span className="text-sm text-slate-300 font-medium">{eventUserName}</span>
                                                          </div>
                                                      </div>
                                                  </div>
                                              </div>
                                          )
                                      })}
                                  </div>
                                </div>
                            ) : (
                                <div className="text-center py-12 bg-accent/30 rounded-2xl border border-border">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent/50 flex items-center justify-center">
                                      <History className="w-8 h-8 text-slate-500" />
                                    </div>
                                    <p className="text-slate-400 mb-2 font-medium">Nenhum evento registrado</p>
                                    <p className="text-slate-500 text-sm max-w-md mx-auto">
                                        Esta nota ainda não possui histórico de atividades. Os eventos aparecerão aqui conforme forem sendo realizados.
                                    </p>
                                </div>
                            )}
                        </AccordionContent>
                    </AccordionItem>
                ))
            ) : (
                <div className="text-center py-20 bg-background/80 backdrop-blur-sm rounded-2xl border border-border">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-accent/50 to-accent/80 flex items-center justify-center">
                    <FileSpreadsheet className="w-10 h-10 text-slate-500" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    {searchTerm ? 'Nenhum resultado encontrado' : 'Nenhum histórico encontrado'}
                  </h3>
                  <p className="text-slate-400 mb-4 max-w-md mx-auto">
                    {searchTerm 
                      ? `Não encontramos nenhuma nota que corresponda a "${searchTerm}". Tente ajustar sua busca.`
                      : 'À medida que as notas forem criadas e atualizadas, seus eventos aparecerão aqui.'
                    }
                  </p>
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm('')}
                      className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
                    >
                      Limpar busca
                    </button>
                  )}
                </div>
            )}
        </Accordion>
      </div>
    </div>
  );
}
