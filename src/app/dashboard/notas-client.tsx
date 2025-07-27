
'use client';

import { useState, useEffect, useTransition, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
  User,
  XCircle,
  MoreHorizontal,
  BarChart,
  CircleDollarSign,
  Calculator,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { NoteDetailsSheet } from '@/components/dashboard/note-details-sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { getNotes, getNotesCount } from './notas/data';
import { attestNote, revertAttestation } from './notas/actions';
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
import { useSession } from 'next-auth/react';
import { Card, CardContent } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Pie, PieChart, Cell } from 'recharts';

const formatDate = (date: Date | string) => {
  return new Date(date).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};

const formatDateTime = (date: Date | string) => {
    return new Date(date).toLocaleString('pt-BR', { timeZone: 'UTC' });
};

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const validStatuses = ['all', 'atestada', 'pendente', 'expirada', 'rejeitada'];

const getStatusConfig = (status: InvoiceStatus) => {
  switch (status) {
    case 'ATESTADA':
      return {
        color: 'bg-green-500/10 text-green-400 border-green-500/20',
        chartColor: 'hsl(var(--success))',
        icon: <CheckBadge className="w-4 h-4" />,
        text: 'Atestada'
      };
    case 'PENDENTE':
      return {
        color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        chartColor: 'hsl(var(--warning))',
        icon: <Clock className="w-4 h-4" />,
        text: 'Pendente'
      };
    case 'EXPIRADA':
      return {
        color: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
        chartColor: 'hsl(var(--destructive))',
        icon: <AlertTriangle className="w-4 h-4" />,
        text: 'Expirada'
      };
    case 'REJEITADA':
      return {
        color: 'bg-red-500/10 text-red-400 border-red-500/20',
        chartColor: 'hsl(var(--destructive))',
        icon: <XCircle className="w-4 h-4" />,
        text: 'Rejeitada'
      };
    default:
      return {
        color: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
        chartColor: 'hsl(var(--muted-foreground))',
        icon: <FileSpreadsheet className="w-4 h-4" />,
        text: status
      };
  }
};


export default function NotasClientPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  
  const initialStatus = searchParams.get('status');
  const page = Number(searchParams.get('page')) || 1;
  const limit = Number(searchParams.get('limit')) || 10;
  
  const [notes, setNotes] = useState<FiscalNote[]>([]);
  const [totalNotes, setTotalNotes] = useState(0);
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
      const { notes: fetchedNotes, total: totalFetched } = await getNotes({ page, limit, query: searchTerm, status: statusFilter, dateRange: date }); 
      setNotes(fetchedNotes);
      setTotalNotes(totalFetched);
    } catch (error) {
      console.error("Failed to fetch notes:", error);
      toast({ title: 'Erro', description: 'Não foi possível buscar as notas.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, searchTerm, statusFilter, date]);

  const getDynamicStatus = (note: FiscalNote): InvoiceStatus => {
    if (note.status === 'PENDENTE') {
      if (note.attestationDeadline && isPast(new Date(note.attestationDeadline))) {
        return 'EXPIRADA';
      }
    }
    return note.status;
  };

  const filteredNotes = notes; // Data is now filtered on the server
  
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

  const handlePageChange = (newPage: number) => {
    router.push(`/dashboard/notas?page=${newPage}&limit=${limit}`);
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col sm:flex-row justify-between items-start mb-8">
        <h1 className="text-3xl font-bold">Visão Geral das Notas</h1>
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
                <option value="ATESTADA">Atestadas</option>
                <option value="PENDENTE">Pendentes</option>
                <option value="EXPIRADA">Expiradas</option>
                <option value="REJEITADA">Rejeitadas</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-background/80 backdrop-blur-sm rounded-xl border border-border/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50">
              <tr className="whitespace-nowrap">
                <th className="text-left p-4 font-semibold text-slate-300">Nota Fiscal</th>
                <th className="text-left p-4 font-semibold text-slate-300">Solicitante / Coordenador</th>
                <th className="text-left p-4 font-semibold text-slate-300">Data Envio</th>
                <th className="text-left p-4 font-semibold text-slate-300">Status</th>
                <th className="text-left p-4 font-semibold text-slate-300">Valor</th>
                <th className="text-left p-4 font-semibold text-slate-300">Atesto</th>
                <th className="text-center p-4 font-semibold text-slate-300">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="p-4"><div className='flex items-center gap-3'><Skeleton className="h-10 w-10 rounded-lg" /><div className='space-y-2'><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-32" /></div></div></td>
                    <td className="p-4"><div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-20" /></div></td>
                    <td className="p-4"><Skeleton className="h-5 w-20" /></td>
                    <td className="p-4"><Skeleton className="h-7 w-28 rounded-full" /></td>
                    <td className="p-4"><Skeleton className="h-5 w-24" /></td>
                    <td className="p-4"><Skeleton className="h-8 w-40" /></td>
                    <td className="p-4 text-center"><Skeleton className="h-8 w-8 rounded-md mx-auto" /></td>
                  </tr>
                ))
              ) : filteredNotes.length > 0 ? (
                filteredNotes.map((note) => {
                  const dynamicStatus = getDynamicStatus(note);
                  const statusConfig = getStatusConfig(dynamicStatus);
                  const canManage = session?.user?.role === 'OWNER' || session?.user?.role === 'MANAGER';
                  const canAttest = canManage || note.coordinatorEmail === session?.user?.email;
                  const isOwner = note.userId === session?.user?.id;
                  const canEdit = isOwner && dynamicStatus === 'REJEITADA';

                  return (
                    <tr 
                      key={note.id} 
                      className="border-t border-border hover:bg-accent/40 transition-colors"
                    >
                      <td className="p-4 align-top">
                        <div className="flex items-center space-x-3 max-w-sm">
                           <div className="bg-gradient-to-br from-slate-800 to-slate-700 p-2 rounded-lg border border-slate-600 flex-shrink-0">
                             <FileSpreadsheet className="w-5 h-5 text-emerald-300" />
                           </div>
                           <div className="min-w-0">
                              <p className="font-medium text-white truncate" title={`${note.projectAccountNumber} - ${note.numeroNota || 'S/N'}`}>
                                {note.projectAccountNumber} - {note.numeroNota || 'S/N'}
                              </p>
                              <p className="text-sm text-slate-400 truncate" title={note.description}>{note.description}</p>
                           </div>
                        </div>
                      </td>
                       <td className="p-4 align-top">
                        <div className="flex items-center space-x-2">
                          <div className="min-w-0">
                            <div className="text-slate-300 truncate" title={note.requester}>{note.requester}</div>
                            <div className="text-xs text-slate-500 truncate" title={note.coordinatorName}>Coord: {note.coordinatorName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 align-top">
                        <div className="flex items-center space-x-2 whitespace-nowrap">
                          <span className="text-slate-300">
                            {formatDate(note.issueDate)}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 align-top">
                        <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border ${statusConfig.color} whitespace-nowrap`}>
                          {statusConfig.icon}
                          <span className="text-sm font-medium">{statusConfig.text}</span>
                        </div>
                      </td>
                      <td className="p-4 align-top">
                        <span className="text-slate-300 font-medium whitespace-nowrap">
                          {note.amount ? `R$ ${note.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : '-'}
                        </span>
                      </td>
                      <td className="p-4 align-top">
                        {dynamicStatus === 'ATESTADA' && note.attestedBy && note.attestedAt ? (
                          <div className="flex items-center space-x-2">
                             <div className="flex flex-col text-xs min-w-0">
                                <span className="font-semibold text-green-400 truncate">{note.attestedBy}</span>
                                <span className="text-slate-400 whitespace-nowrap">{formatDateTime(note.attestedAt)}</span>
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
                          </div>
                        ) : dynamicStatus === 'PENDENTE' ? (
                          <Button
                            onClick={() => handleOpenAttestModal(note)}
                            variant="outline"
                            size="sm"
                            className="flex items-center space-x-2 text-amber-300 hover:text-amber-100 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 whitespace-nowrap"
                            disabled={isPending || !canAttest}
                          >
                            <Stamp className="w-4 h-4" />
                            <span>Atestar</span>
                          </Button>
                        ) : (
                          <span className="text-slate-500 text-xs">N/A</span>
                        )}
                      </td>
                      <td className="p-4 align-top text-center">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-primary data-[state=open]:bg-primary/10 data-[state=open]:text-primary">
                                    <MoreHorizontal className="w-5 h-5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleOpenDetails(note)}>
                                    <Eye className="mr-2 h-4 w-4" /> Ver Detalhes
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <a href={note.originalFileUrl} target="_blank" rel="noopener noreferrer">
                                        <Download className="mr-2 h-4 w-4" /> Baixar Original
                                    </a>
                                </DropdownMenuItem>
                                {dynamicStatus === 'ATESTADA' && canManage && (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                <Undo2 className="mr-2 h-4 w-4" /> Desfazer Atesto
                                            </DropdownMenuItem>
                                        </AlertDialogTrigger>
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
                                )}
                                <DropdownMenuItem disabled={!canEdit}>
                                    <Edit className="mr-2 h-4 w-4" /> Editar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" disabled>
                                    <Trash2 className="mr-2 h-4 w-4" /> Excluir
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8}>
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
        <div className="flex items-center justify-between p-4">
          <div className="text-sm text-muted-foreground">
            {totalNotes} notas no total.
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
            >
              Anterior
            </Button>
            <span className="text-sm">
              Página {page} de {Math.ceil(totalNotes / limit)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= Math.ceil(totalNotes / limit)}
            >
              Próximo
            </Button>
          </div>
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
