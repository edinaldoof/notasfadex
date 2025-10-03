
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
  Bell,
  Building,
  RotateCcw,
} from 'lucide-react';
import { FiscalNote, InvoiceStatus, PermissionType } from '@/lib/types';
import { AddNoteDialog } from '@/app/dashboard/add-note-dialog';
import { CheckBadge } from '@/components/icons/check-badge';
import { isPast, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { AttestNoteDialog } from '@/components/dashboard/attest-note-dialog';
import { EditNoteDialog } from '@/app/dashboard/notas/edit-note-dialog';
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
import { Button, buttonVariants } from '@/components/ui/button';
import { NoteDetailsSheet } from '@/components/dashboard/note-details-sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { getNotes } from './data';
import { revertAttestation, attestNote, notifyAllPendingCoordinators, deleteNote } from './actions';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Role } from '@prisma/client';
import { hasPermission } from '@/lib/auth-utils';

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
              <th className="text-left p-4 font-semibold text-slate-300">Prestador</th>
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

function NotasClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const page = Number(searchParams.get('page')) || 1;
  const limit = Number(searchParams.get('limit')) || 10;
  
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [date, setDate] = useState<DateRange | undefined>(() => {
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    if (from && to) return { from: new Date(from), to: new Date(to) };
    return undefined;
  });

  const [notes, setNotes] = useState<FiscalNote[]>([]);
  const [totalNotes, setTotalNotes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isTransitioning, startTransition] = useTransition();
  const [isNotifying, startNotifyingTransition] = useTransition();
  const { toast } = useToast();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAttestModal, setShowAttestModal] = useState(false);
  const [selectedNote, setSelectedNote] = useState<FiscalNote | null>(null);
  const [selectedNoteForDetails, setSelectedNoteForDetails] = useState<FiscalNote | null>(null);
  const [showDetailsSheet, setShowDetailsSheet] = useState(false);
  const [canDeleteNotes, setCanDeleteNotes] = useState(false);

  useEffect(() => {
    if (session) {
      hasPermission(PermissionType.CAN_DELETE_PENDING_NOTE).then(setCanDeleteNotes);
    }
  }, [session]);

  const fetchNotes = React.useCallback(async () => {
    setLoading(true);
    try {
      const { notes: fetchedNotes, total: totalFetched } = await getNotes({ 
        page, 
        limit, 
        query: searchParams.get('q') || undefined, 
        status: searchParams.get('status') || undefined, 
        dateRange: {
            from: searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined,
            to: searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined,
        }
      }); 
      setNotes(fetchedNotes);
      setTotalNotes(totalFetched);
    } catch (error) {
      console.error("Failed to fetch notes:", error);
      toast({ title: 'Erro', description: 'Não foi possível buscar as notas.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchParams, toast]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const getDynamicStatus = (note: FiscalNote): InvoiceStatus => {
    if (note.status === 'PENDENTE' && note.attestationDeadline && isPast(new Date(note.attestationDeadline))) {
      return 'EXPIRADA';
    }
    return note.status;
  };

  const handleOpenAttestModal = (note: FiscalNote) => {
    setSelectedNote(note);
    setShowAttestModal(true);
  };
  
  const handleOpenEditModal = (note: FiscalNote) => {
    setSelectedNote(note);
    setShowEditModal(true);
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

  const handleDeleteNote = (noteId: string) => {
    startTransition(async () => {
        const result = await deleteNote(noteId);
        if (result.success) {
            toast({ title: "Sucesso!", description: result.message });
            fetchNotes(); 
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
    });
  };

  const handleNotifyAll = () => {
    startNotifyingTransition(async () => {
      toast({ title: 'Enviando Notificações...', description: 'Aguarde enquanto processamos os e-mails.' });
      const result = await notifyAllPendingCoordinators();
      if (result.success) {
        toast({ title: 'Sucesso!', description: result.message });
      } else {
        toast({ title: 'Erro', description: result.message, variant: 'destructive' });
      }
    });
  }
  
  const createQueryString = (params: Record<string, string | number | undefined>) => {
    const newParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        newParams.set(key, String(value));
      }
    }
    return newParams.toString();
  }

  const handleApplyFilters = () => {
    const query = createQueryString({
        q: searchTerm,
        status: statusFilter === 'all' ? undefined : statusFilter,
        from: date?.from?.toISOString(),
        to: date?.to?.toISOString(),
        page: 1,
        limit,
    });
    router.push(`/dashboard/notas?${query}`);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDate(undefined);
    router.push('/dashboard/notas');
  }

  const handlePageChange = (newPage: number) => {
     const query = createQueryString({
        q: searchParams.get('q') || undefined,
        status: searchParams.get('status') || undefined,
        from: searchParams.get('from') || undefined,
        to: searchParams.get('to') || undefined,
        page: newPage,
        limit,
    });
    router.push(`/dashboard/notas?${query}`);
  };

  if (loading) {
    return (
      <>
        <FilterControls
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          date={date}
          onDateChange={setDate}
          onAddNote={() => setShowAddModal(true)}
          onNotifyAll={handleNotifyAll}
          isNotifying={isNotifying}
          canNotify={session?.user?.role === Role.OWNER || session?.user?.role === Role.MANAGER}
          onApplyFilters={handleApplyFilters}
          onClearFilters={handleClearFilters}
        />
        <TableSkeleton />
        <AddNoteDialog open={showAddModal} onOpenChange={setShowAddModal} onNoteAdded={fetchNotes} />
      </>
    );
  }
  
  return (
    <TooltipProvider>
      <FilterControls
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        date={date}
        onDateChange={setDate}
        onAddNote={() => setShowAddModal(true)}
        onNotifyAll={handleNotifyAll}
        isNotifying={isNotifying}
        canNotify={session?.user?.role === Role.OWNER || session?.user?.role === Role.MANAGER}
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
      />
      <div className="bg-background/80 backdrop-blur-sm rounded-xl border border-border/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50">
              <tr className="whitespace-nowrap">
                <th className="text-left p-4 font-semibold text-slate-300">Nota Fiscal</th>
                <th className="text-left p-4 font-semibold text-slate-300">Prestador</th>
                <th className="text-left p-4 font-semibold text-slate-300">Data Envio</th>
                <th className="text-left p-4 font-semibold text-slate-300">Status</th>
                <th className="text-left p-4 font-semibold text-slate-300">Valor</th>
                <th className="text-left p-4 font-semibold text-slate-300">Atesto</th>
                <th className="text-center p-4 font-semibold text-slate-300">Ações</th>
              </tr>
            </thead>
            <tbody>
              {notes.length > 0 ? (
                notes.map((note) => {
                  const dynamicStatus = getDynamicStatus(note);
                  const statusConfig = getStatusConfig(dynamicStatus);
                  const canManage = session?.user?.role === 'OWNER' || session?.user?.role === 'MANAGER';
                  const canAttest = canManage || note.coordinatorEmail === session?.user?.email;
                  const isOwner = note.user?.id === session?.user?.id;
                  const canEdit = isOwner || canManage;
                  const isDeletable = (dynamicStatus === 'PENDENTE' || dynamicStatus === 'REJEITADA') && canDeleteNotes;

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
                            <div className="text-slate-300 truncate" title={note.prestadorRazaoSocial}>{note.prestadorRazaoSocial || 'Não informado'}</div>
                            <div className="text-xs text-slate-500 truncate" title={note.prestadorCnpj}>CNPJ: {note.prestadorCnpj || 'N/A'}</div>
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
                            disabled={isTransitioning || !canAttest}
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
                                {note.originalFileUrl && (
                                  <DropdownMenuItem asChild>
                                    <a href={note.originalFileUrl} target="_blank" rel="noopener noreferrer">
                                        <Download className="mr-2 h-4 w-4" /> Baixar Original
                                    </a>
                                  </DropdownMenuItem>
                                )}
                                {note.attestedFileUrl && (
                                  <DropdownMenuItem asChild>
                                    <a href={note.attestedFileUrl} target="_blank" rel="noopener noreferrer">
                                      <Download className="mr-2 h-4 w-4" /> Baixar Atestado
                                    </a>
                                  </DropdownMenuItem>
                                )}
                                {note.reportFileUrl && (
                                    <DropdownMenuItem asChild>
                                        <a href={note.reportFileUrl} target="_blank" rel="noopener noreferrer">
                                            <Download className="mr-2 h-4 w-4" /> Baixar Relatório
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
                                <DropdownMenuItem onClick={() => handleOpenEditModal(note)} disabled={!canEdit}>
                                    <Edit className="mr-2 h-4 w-4" /> Editar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {isDeletable && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem 
                                      className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                      onSelect={(e) => e.preventDefault()}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" /> Excluir
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Esta ação irá mover a nota fiscal para a lixeira. Você poderá restaurá-la ou excluí-la permanentemente mais tarde.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteNote(note.id)}
                                        className={buttonVariants({ variant: "destructive" })}
                                      >
                                        Sim, Mover para Lixeira
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                                )}
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
      {selectedNote && (
        <AttestNoteDialog
          open={showAttestModal}
          onOpenChange={setShowAttestModal}
          note={selectedNote}
          onConfirm={handleAttestNote}
          isPending={isTransitioning}
        />
      )}
       {selectedNote && (
        <EditNoteDialog
          open={showEditModal}
          onOpenChange={setShowEditModal}
          note={selectedNote}
          onNoteEdited={fetchNotes}
        />
      )}
      <NoteDetailsSheet
        note={selectedNoteForDetails}
        open={showDetailsSheet}
        onOpenChange={setShowDetailsSheet}
      />
      <AddNoteDialog open={showAddModal} onOpenChange={setShowAddModal} onNoteAdded={fetchNotes} />
    </TooltipProvider>
  )
}

function FilterControls({ 
  searchTerm, onSearchTermChange, 
  statusFilter, onStatusFilterChange, 
  date, onDateChange, 
  onAddNote, 
  onNotifyAll, isNotifying, canNotify,
  onApplyFilters, onClearFilters
}: {
    searchTerm: string;
    onSearchTermChange: (value: string) => void;
    statusFilter: string;
    onStatusFilterChange: (value: string) => void;
    date?: DateRange;
    onDateChange: (date?: DateRange) => void;
    onAddNote: () => void;
    onNotifyAll: () => void;
    isNotifying: boolean;
    canNotify: boolean;
    onApplyFilters: () => void;
    onClearFilters: () => void;
}) {
    return (
        <>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl blur opacity-20"></div>
                        <div className="relative bg-gradient-to-r from-emerald-500 to-green-600 p-3 rounded-2xl">
                            <FileSpreadsheet className="w-8 h-8 text-white" />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                            Visão Geral
                        </h1>
                        <p className="text-slate-400 mt-1">
                            Visualize, filtre e gerencie todas as notas fiscais do sistema.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    {canNotify && (
                        <Button
                            onClick={onNotifyAll}
                            variant="outline"
                            className="flex-1 sm:flex-none"
                            disabled={isNotifying}
                        >
                            {isNotifying ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Bell className="w-4 h-4 mr-2" />}
                            {isNotifying ? "Notificando..." : "Notificar Pendentes"}
                        </Button>
                    )}
                    <Button
                        onClick={onAddNote}
                        className={cn(
                            'flex-1 sm:flex-none px-6 py-2.5 font-semibold transition-all duration-300 flex items-center space-x-2 whitespace-nowrap',
                            'bg-primary text-primary-foreground',
                            'hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20'
                        )}
                        >
                        <Plus className="w-5 h-5" />
                        <span>Nova Nota</span>
                    </Button>
                </div>
            </div>
            
            <div className="bg-background/80 backdrop-blur-sm rounded-xl p-4 border border-border/80 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="lg:col-span-2">
                    <Label htmlFor="search-input">Busca Rápida</Label>
                    <div className="relative mt-2">
                        <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <Input
                            id="search-input"
                            type="text"
                            placeholder="Buscar por descrição, nº da nota, conta..."
                            value={searchTerm}
                            onChange={(e) => onSearchTermChange(e.target.value)}
                            className="w-full bg-secondary/80 border-border rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-slate-400 focus:border-primary/50 focus:outline-none transition-colors"
                        />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="date-range-picker">Período</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="date-range-picker"
                          variant={'outline'}
                          className={cn(
                              'w-full justify-start text-left font-normal bg-secondary/80 border-border hover:bg-secondary hover:text-white mt-2',
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
                          onSelect={onDateChange}
                          numberOfMonths={2}
                          locale={ptBR}
                          />
                      </PopoverContent>
                    </Popover>
                  </div>
                   <div>
                    <Label htmlFor="status-filter">Status</Label>
                    <div className="relative mt-2">
                        <Filter className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <select
                            id="status-filter"
                            value={statusFilter}
                            onChange={(e) => onStatusFilterChange(e.target.value)}
                            className="w-full bg-secondary/80 border-border rounded-lg pl-10 pr-8 py-2.5 text-white focus:border-primary/50 focus:outline-none appearance-none cursor-pointer"
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
               <div className="flex justify-end gap-2 mt-4">
                    <Button variant="ghost" onClick={onClearFilters} className="text-slate-400 hover:text-white">
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Limpar Filtros
                    </Button>
                    <Button onClick={onApplyFilters}>
                        <Filter className="w-4 h-4 mr-2" />
                        Aplicar Filtros
                    </Button>
                </div>
            </div>
        </>
    )
}

export default function NotasPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <NotasClient />
    </Suspense>
  )
}
