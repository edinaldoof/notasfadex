
"use client";

import React, { useState, useEffect, useTransition, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Plus, 
  Search, 
  Filter, 
  FileSpreadsheet, 
  Calendar as CalendarIcon,
  Download,
  Eye,
  Edit,
  Trash2,
  Stamp,
  Undo2,
  Info,
  Loader2,
  MoreHorizontal,
  XCircle,
  Clock,
  AlertTriangle,
  Handshake,
} from 'lucide-react';
import { FiscalNote, InvoiceStatus } from '@/lib/types';
import { AddNoteDialog } from '@/app/dashboard/add-note-dialog';
import { CheckBadge } from '@/components/icons/check-badge';
import { isPast, format } from 'date-fns';
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
import { getNotes } from './data';
import { revertAttestation, attestNote } from './actions';
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
} from "@/components/ui/alert-dialog"
import { useSession } from 'next-auth/react';
import { useAppMode } from '@/contexts/app-mode-context';
import { motion, AnimatePresence } from 'framer-motion';
import { pageTransitions, itemVariants, containerVariants, transitionPresets } from '@/lib/transition-utils';

const formatDate = (date: Date | string) => {
  return new Date(date).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};

const formatDateTime = (date: Date | string) => {
    return new Date(date).toLocaleString('pt-BR', { timeZone: 'UTC' });
};

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
    case 'REJEITADA':
      return {
        color: 'bg-red-500/10 text-red-400 border-red-500/20',
        icon: <XCircle className="w-4 h-4" />,
        text: 'Rejeitada'
      };
    default:
      return {
        color: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
        icon: <FileSpreadsheet className="w-4 h-4" />,
        text: status
      };
  }
};

function TableSkeleton() {
  return (
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
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-t border-border">
                <td className="p-4"><div className='flex items-center gap-3'><Skeleton className="h-10 w-10 rounded-lg" /><div className='space-y-2'><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-32" /></div></div></td>
                <td className="p-4"><div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-20" /></div></td>
                <td className="p-4"><Skeleton className="h-5 w-20" /></td>
                <td className="p-4"><Skeleton className="h-7 w-28 rounded-full" /></td>
                <td className="p-4"><Skeleton className="h-5 w-24" /></td>
                <td className="p-4"><Skeleton className="h-8 w-40" /></td>
                <td className="p-4 text-center"><Skeleton className="h-8 w-8 rounded-md mx-auto" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
       <div className="flex items-center justify-between p-4">
          <Skeleton className="h-5 w-32" />
          <div className="flex items-center space-x-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
    </div>
  );
}

function AttestModeClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const page = Number(searchParams.get('page')) || 1;
  const limit = Number(searchParams.get('limit')) || 10;
  const searchTerm = searchParams.get('q') || '';
  const statusFilter = searchParams.get('status') || 'all';
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  
  const [notes, setNotes] = useState<FiscalNote[]>([]);
  const [totalNotes, setTotalNotes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAttestModal, setShowAttestModal] = useState(false);
  const [selectedNote, setSelectedNote] = useState<FiscalNote | null>(null);
  const [selectedNoteForDetails, setSelectedNoteForDetails] = useState<FiscalNote | null>(null);
  const [showDetailsSheet, setShowDetailsSheet] = useState(false);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const dateRange: DateRange | undefined = (from && to) ? { from: new Date(from), to: new Date(to) } : undefined;
      const { notes: fetchedNotes, total: totalFetched } = await getNotes({ page, limit, query: searchTerm, status: statusFilter, dateRange }); 
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
  }, [page, limit, searchTerm, statusFilter, from, to]);

  const getDynamicStatus = (note: FiscalNote): InvoiceStatus => {
    if (note.status === 'PENDENTE') {
      if (note.attestationDeadline && isPast(new Date(note.attestationDeadline))) {
        return 'EXPIRADA';
      }
    }
    return note.status;
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
        fetchNotes();
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
        fetchNotes();
      } else {
        toast({ title: 'Erro', description: result.message, variant: 'destructive' });
      }
    });
  };

  const createQueryString = (params: Record<string, string | number | undefined>) => {
    const newParams = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(params)) {
      if (value) {
        newParams.set(key, String(value));
      } else {
        newParams.delete(key);
      }
    }
    return newParams.toString();
  }

  const handlePageChange = (newPage: number) => {
    router.push(`/dashboard/notas?${createQueryString({ page: newPage })}`);
  };

  const handleFilterChange = (filters: { q?: string; status?: string; from?: string; to?: string; }) => {
    router.push(`/dashboard/notas?${createQueryString({ ...filters, page: 1 })}`);
  };
  
  const [currentSearchTerm, setCurrentSearchTerm] = useState(searchTerm);
  const [currentStatusFilter, setCurrentStatusFilter] = useState(statusFilter);
  const [currentDate, setCurrentDate] = useState<DateRange | undefined>(() => {
    if (from && to) return { from: new Date(from), to: new Date(to) };
    return undefined;
  });

  useEffect(() => {
    const handler = setTimeout(() => {
        handleFilterChange({
            q: currentSearchTerm,
            status: currentStatusFilter,
            from: currentDate?.from?.toISOString(),
            to: currentDate?.to?.toISOString()
        })
    }, 500);
    return () => clearTimeout(handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSearchTerm, currentStatusFilter, currentDate]);


  return (
    <>
      <FilterControls
        searchTerm={currentSearchTerm}
        setSearchTerm={setCurrentSearchTerm}
        statusFilter={currentStatusFilter}
        setStatusFilter={setCurrentStatusFilter}
        date={currentDate}
        setDate={setCurrentDate}
        onAddNote={() => setShowAddModal(true)}
      />
      
      <div>
        {loading ? (
          <TableSkeleton />
        ) : (
          <TooltipProvider>
            <div className="bg-background/80 backdrop-blur-sm rounded-xl border border-border/80 overflow-hidden">
              <div className="overflow-x-auto">
                <motion.table layout className="w-full text-sm">
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
                  <motion.tbody layout>
                    <AnimatePresence>
                    {notes.length > 0 ? (
                      notes.map((note) => {
                        const dynamicStatus = getDynamicStatus(note);
                        const statusConfig = getStatusConfig(dynamicStatus);
                        const canManage = session?.user?.role === 'OWNER' || session?.user?.role === 'MANAGER';
                        const canAttest = canManage || note.coordinatorEmail === session?.user?.email;
                        const isOwner = note.userId === session?.user?.id;
                        const canEdit = isOwner && dynamicStatus === 'REJEITADA';

                        return (
                          <motion.tr
                            layout
                            key={note.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
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
                                      {note.attestedFileUrl && (
                                        <DropdownMenuItem asChild>
                                          <a href={note.attestedFileUrl} target="_blank" rel="noopener noreferrer">
                                            <Download className="mr-2 h-4 w-4" /> Baixar Atestado
                                          </a>
                                        </DropdownMenuItem>
                                      )}
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
                          </motion.tr>
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
                    </AnimatePresence>
                  </motion.tbody>
                </motion.table>
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
          </TooltipProvider>
        )}
      </div>

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
      <AddNoteDialog open={showAddModal} onOpenChange={setShowAddModal} onNoteAdded={fetchNotes} />
    </>
  );
}

function FilterControls({ searchTerm, setSearchTerm, statusFilter, setStatusFilter, date, setDate, onAddNote }: {
    searchTerm: string;
    setSearchTerm: (value: string) => void;
    statusFilter: string;
    setStatusFilter: (value: string) => void;
    date?: DateRange;
    setDate: (date?: DateRange) => void;
    onAddNote: () => void;
}) {
    return (
        <motion.div variants={containerVariants}>
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl blur opacity-20"></div>
                        <div className="relative bg-gradient-to-r from-emerald-500 to-green-600 p-3 rounded-2xl">
                            <FileSpreadsheet className="w-8 h-8 text-white" />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                            Visão Geral (Atesto)
                        </h1>
                        <p className="text-slate-400 mt-1">
                            Visualize, filtre e gerencie todas as notas fiscais do sistema.
                        </p>
                    </div>
                </div>
                <Button
                onClick={onAddNote}
                className={cn(
                    'w-full sm:w-auto px-6 py-2.5 font-semibold transition-all duration-300 flex items-center space-x-2 whitespace-nowrap glow-on-hover',
                    'bg-primary text-primary-foreground',
                    'hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20'
                )}
                >
                <Plus className="w-5 h-5" />
                <span>Nova Nota</span>
                </Button>
            </motion.div>
            
            <motion.div variants={itemVariants} className="bg-background/80 backdrop-blur-sm rounded-xl p-4 border border-border/80 mb-8 hover-lift">
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
            </motion.div>
        </motion.div>
    )
}

function RequestModeClient() {
  return (
    <motion.div variants={containerVariants} className="space-y-8 animate-in fade-in-50 duration-500">
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-2xl blur opacity-20"></div>
            <div className="relative bg-gradient-to-r from-blue-500 to-cyan-600 p-3 rounded-2xl">
              <Handshake className="w-8 h-8 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-bold text-foreground">
              Visão Geral (Solicitações)
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie e acompanhe todos os pedidos de nota fiscal.
            </p>
          </div>
        </div>
      </motion.div>
      
      <motion.div variants={itemVariants} className="text-center py-16 bg-card/50 backdrop-blur-sm rounded-2xl border border-border mt-8 hover-lift">
        <Handshake className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-bold text-foreground mb-2">Módulo em Construção</h3>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          A tabela com todas as solicitações aparecerá aqui. Em breve, você poderá criar, filtrar e gerenciar todos os seus pedidos.
        </p>
      </motion.div>
    </motion.div>
  );
}

function PageWithSuspense() {
  const { mode } = useAppMode();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={mode}
        variants={pageTransitions.slidePerspective}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={transitionPresets.smooth}
        style={{ perspective: 1200 }}
        className="gpu-accelerated"
      >
        {mode === 'attest' ? <AttestModeClient /> : <RequestModeClient />}
      </motion.div>
    </AnimatePresence>
  );
}

export default function NotasPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <PageWithSuspense />
    </Suspense>
  )
}
