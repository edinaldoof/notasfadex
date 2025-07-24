
'use client';

import { useState, useEffect, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Plus, 
  Search, 
  Filter, 
  FileSpreadsheet, 
  Calendar as CalendarIcon,
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Download,
  Eye,
  Edit,
  Trash2,
  Stamp,
  Undo2,
  Info,
  Loader2,
  Building,
  User,
  Banknote,
  FileText,
} from 'lucide-react';
import { FiscalNote, InvoiceStatus } from '@/lib/types';
import { AddNoteDialog } from '@/app/dashboard/add-note-dialog';
import { CheckBadge } from '@/components/icons/check-badge';
import { isPast, format, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { AttestNoteDialog } from '@/components/dashboard/attest-note-dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from '@/components/ui/calendar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { NoteDetailsSheet } from '@/components/dashboard/note-details-sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { getNotesForUser } from './notas/data';
import { attestNote, revertAttestation } from './notas/actions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"


const formatDate = (date: Date | string) => {
  return new Date(date).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};

const formatDateTime = (date: Date | string) => {
    return new Date(date).toLocaleString('pt-BR', { timeZone: 'UTC' });
};

const validStatuses = ['all', 'atestada', 'pendente', 'expirada'];

export default function NotasClientPage() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status');
  
  const [notes, setNotes] = useState<FiscalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAttestModal, setShowAttestModal] = useState(false);
  const [selectedNote, setSelectedNote] = useState<FiscalNote | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(validStatuses.includes(initialStatus || '') ? initialStatus! : 'all');
  const [date, setDate] = useState<DateRange | undefined>();
  
  const [selectedNoteForDetails, setSelectedNoteForDetails] = useState<FiscalNote | null>(null);
  const [showDetailsSheet, setShowDetailsSheet] = useState(false);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const fetchedNotes = await getNotesForUser(); 
      setNotes(fetchedNotes);
    } catch (error) {
      console.error("Failed to fetch notes:", error);
      toast({ title: 'Erro', description: 'Não foi possível buscar as notas.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const getDynamicStatus = (note: FiscalNote): InvoiceStatus => {
    if (note.status === 'PENDENTE') {
      if (note.attestationDeadline && isPast(new Date(note.attestationDeadline))) {
        return 'EXPIRADA';
      }
    }
    return note.status;
  };
  
  const filteredNotes = notes.filter(note => {
    const dynamicStatus = getDynamicStatus(note);
    const lowerCaseStatus = dynamicStatus.toLowerCase();
    
    const matchesSearch = note.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         note.requester.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         note.projectAccountNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (note.numeroNota || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (note.prestadorCnpj || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         note.coordinatorName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || lowerCaseStatus === statusFilter;
    
    const noteDate = startOfDay(new Date(note.issueDate));
    const matchesDate = !date || (!date.from || noteDate >= startOfDay(date.from)) && (!date.to || noteDate <= startOfDay(date.to));
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const getStatusConfig = (status: InvoiceStatus) => {
    switch (status) {
      case 'ATESTADA':
        return {
          color: 'bg-green-500/10 text-green-400 border-green-500/20',
          icon: <CheckBadge className="w-4 h-4" />,
          text: 'Atestada'
        };
      case 'PENDENTE':
        return {
          color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          icon: <Clock className="w-4 h-4" />,
          text: 'Pendente'
        };
      case 'EXPIRADA':
        return {
          color: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          icon: <AlertTriangle className="w-4 h-4" />,
          text: 'Expirada'
        };
      default:
        return {
          color: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
          icon: <FileSpreadsheet className="w-4 h-4" />,
          text: status
        };
    }
  };
  
  const handleOpenAttestModal = (note: FiscalNote) => {
    setSelectedNote(note);
    setShowAttestModal(true);
  };
  
  const handleOpenDetails = (note: FiscalNote) => {
    setSelectedNoteForDetails(note);
    setShowDetailsSheet(true);
  };
  
  const handleAttestNote = (formData: FormData) => {
    startTransition(async () => {
      const result = await attestNote(formData);
      if (result.success) {
        toast({ title: 'Sucesso!', description: result.message });
        fetchNotes(); // Re-fetch notes to update the list
        setShowAttestModal(false);
      } else {
        toast({ title: 'Erro', description: result.message, variant: 'destructive' });
      }
    });
  };
  
  const handleUndoAttest = (noteId: string) => {
    startTransition(async () => {
      const result = await revertAttestation(noteId);
       if (result.success) {
        toast({ title: 'Sucesso!', description: result.message });
        fetchNotes(); // Re-fetch notes
      } else {
        toast({ title: 'Erro', description: result.message, variant: 'destructive' });
      }
    });
  };

  const handleNoteAdded = () => {
    fetchNotes();
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col sm:flex-row justify-between items-start mb-8">
        <h1 className="text-3xl font-bold">Notas Fiscais</h1>
        <Button
          onClick={() => setShowAddModal(true)}
          className={cn(
             'mt-4 sm:mt-0 px-6 py-2.5 font-semibold transition-all duration-300 flex items-center space-x-2 whitespace-nowrap',
             'bg-primary text-primary-foreground',
             'hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20'
          )}
        >
          <Plus className="w-5 h-5" />
          <span>Nova Nota</span>
        </Button>
      </div>

      <div className="bg-background/80 backdrop-blur-sm rounded-xl p-4 border border-border/80 mb-8">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex-1 flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 w-full max-w-md">
              <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Buscar em todas as colunas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-secondary/80 border-border rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-slate-400 focus:border-primary/50 focus:outline-none transition-colors"
              />
            </div>
            
             <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={'outline'}
                  className={cn(
                    'w-full sm:w-[260px] justify-start text-left font-normal bg-secondary/80 border-border hover:bg-secondary hover:text-white',
                    !date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date?.from ? (
                    date.to ? (
                      <>
                        {format(date.from, 'd LLL, y', { locale: ptBR })} -{' '}
                        {format(date.to, 'd LLL, y', { locale: ptBR })}
                      </>
                    ) : (
                      format(date.from, 'd LLL, y', { locale: ptBR })
                    )
                  ) : (
                    <span>Filtrar por data</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={date?.from}
                  selected={date}
                  onSelect={setDate}
                  numberOfMonths={2}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>

            <div className="relative">
              <Filter className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-auto bg-secondary/80 border-border rounded-lg pl-10 pr-8 py-2.5 text-white focus:border-primary/50 focus:outline-none appearance-none cursor-pointer"
              >
                <option value="all">Todos os Status</option>
                <option value="atestada">Atestadas</option>
                <option value="pendente">Pendentes</option>
                <option value="expirada">Expiradas</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-background/80 backdrop-blur-sm rounded-xl border border-border/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary/50">
              <tr>
                <th className="text-left p-4 font-semibold text-slate-300">Conta do Projeto</th>
                <th className="text-left p-4 font-semibold text-slate-300">Nº da Nota</th>
                <th className="text-left p-4 font-semibold text-slate-300">Solicitante</th>
                <th className="text-left p-4 font-semibold text-slate-300">Coordenador</th>
                <th className="text-left p-4 font-semibold text-slate-300">Data Envio</th>
                <th className="text-left p-4 font-semibold text-slate-300">Status</th>
                <th className="text-left p-4 font-semibold text-slate-300">Valor</th>
                <th className="text-left p-4 font-semibold text-slate-300">Atesto</th>
                <th className="text-left p-4 font-semibold text-slate-300">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="p-4"><Skeleton className="h-8 w-24" /></td>
                    <td className="p-4"><Skeleton className="h-8 w-20" /></td>
                    <td className="p-4"><Skeleton className="h-8 w-32" /></td>
                    <td className="p-4"><Skeleton className="h-8 w-32" /></td>
                    <td className="p-4"><Skeleton className="h-8 w-24" /></td>
                    <td className="p-4"><Skeleton className="h-8 w-28 rounded-full" /></td>
                    <td className="p-4"><Skeleton className="h-8 w-24" /></td>
                    <td className="p-4"><Skeleton className="h-8 w-32" /></td>
                    <td className="p-4"><Skeleton className="h-8 w-32" /></td>
                  </tr>
                ))
              ) : filteredNotes.length > 0 ? (
                filteredNotes.map((note) => {
                  const dynamicStatus = getDynamicStatus(note);
                  const statusConfig = getStatusConfig(dynamicStatus);
                  return (
                    <tr 
                      key={note.id} 
                      className="border-t border-border hover:bg-accent/40 transition-colors"
                    >
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <Banknote className="w-4 h-4 text-slate-400" />
                          <span className="font-medium text-white">{note.projectAccountNumber}</span>
                        </div>
                      </td>
                       <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-300">{note.numeroNota || '-'}</span>
                        </div>
                      </td>
                       <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-300">{note.requester}</span>
                        </div>
                      </td>
                       <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-300">{note.coordinatorName}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <CalendarIcon className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-300">
                            {formatDate(note.issueDate)}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border ${statusConfig.color}`}>
                          {statusConfig.icon}
                          <span className="text-sm font-medium">{statusConfig.text}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-slate-300 font-medium">
                          {note.amount ? `R$ ${note.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : '-'}
                        </span>
                      </td>
                      <td className="p-4">
                        {dynamicStatus === 'ATESTADA' && note.attestedBy && note.attestedAt ? (
                          <div className="flex items-center space-x-2">
                             <div className="flex flex-col text-xs">
                                <span className="font-semibold text-green-400">{note.attestedBy}</span>
                                <span className="text-slate-400">{formatDateTime(note.attestedAt)}</span>
                             </div>
                             {note.observation && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button className="p-1.5 text-slate-400 hover:text-blue-400">
                                      <Info className="w-4 h-4" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent className='max-w-xs bg-slate-950 border-slate-800 text-slate-300'>
                                    <p>{note.observation}</p>
                                  </TooltipContent>
                                </Tooltip>
                             )}
                            <AlertDialog>
                               <Tooltip>
                                <TooltipTrigger asChild>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-amber-400 hover:bg-amber-500/10" disabled={isPending}>
                                            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Undo2 className="w-4 h-4" />}
                                        </Button>
                                    </AlertDialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent><p>Desfazer Atesto</p></TooltipContent>
                               </Tooltip>
                               <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Desfazer Atesto?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                    Esta ação reverterá a nota para "Pendente" e removerá os dados do atesto. O histórico será mantido. Deseja continuar?
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleUndoAttest(note.id)}>Sim, Desfazer</AlertDialogAction>
                                </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        ) : dynamicStatus === 'PENDENTE' ? (
                          <Button
                            onClick={() => handleOpenAttestModal(note)}
                            variant="outline"
                            size="sm"
                            className="flex items-center space-x-2 text-amber-300 hover:text-amber-100 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20"
                            disabled={isPending}
                          >
                            <Stamp className="w-4 h-4" />
                            <span>Atestar</span>
                          </Button>
                        ) : (
                          <span className="text-slate-500 text-xs">N/A</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => handleOpenDetails(note)} className="text-slate-400 hover:text-primary"><Eye className="w-4 h-4" /></Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Visualizar Detalhes</p></TooltipContent>
                          </Tooltip>
                          <Tooltip>
                             <TooltipTrigger asChild><Button asChild variant="ghost" size="icon" className="text-slate-400 hover:text-primary"><a href={note.originalFileUrl} target="_blank" rel="noopener noreferrer"><Download className="w-4 h-4" /></a></Button></TooltipTrigger>
                             <TooltipContent><p>Baixar Original</p></TooltipContent>
                          </Tooltip>
                           <Tooltip>
                              <TooltipTrigger asChild><Button variant="ghost" size="icon" className="text-slate-400 hover:text-primary" disabled><Edit className="w-4 h-4" /></Button></TooltipTrigger>
                              <TooltipContent><p>Editar (Em breve)</p></TooltipContent>
                          </Tooltip>
                          <Tooltip>
                             <TooltipTrigger asChild><Button variant="ghost" size="icon" className="text-slate-400 hover:text-destructive" disabled><Trash2 className="w-4 h-4" /></Button></TooltipTrigger>
                             <TooltipContent><p>Excluir (Em breve)</p></TooltipContent>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9}>
                    <div className="text-center py-12">
                      <FileSpreadsheet className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-400 mb-2">Nenhuma nota encontrada</p>
                      <p className="text-slate-500 text-sm">Tente ajustar os filtros ou adicione uma nova nota</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <AddNoteDialog open={showAddModal} onOpenChange={setShowAddModal} onNoteAdded={handleNoteAdded} />
      {selectedNote && (
        <AttestNoteDialog
          open={showAttestModal}
          onOpenChange={setShowAttestModal}
          note={selectedNote}
          onConfirm={handleAttestNote}
          isPending={isPending}
        />
      )}
      <NoteDetailsSheet
        note={selectedNoteForDetails}
        open={showDetailsSheet}
        onOpenChange={setShowDetailsSheet}
      />
    </TooltipProvider>
  )
}
