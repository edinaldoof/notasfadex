
"use client";

import React, { useState, useEffect, useTransition, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Trash2, 
  Search, 
  FileSpreadsheet, 
  Calendar as CalendarIcon,
  Undo2,
  AlertTriangle,
  Loader2,
  MoreHorizontal,
  Eye,
} from 'lucide-react';
import { Note, PermissionType } from '@/lib/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
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
import { getNotes } from '../notas/data';
import { deleteNote, restoreNote } from '../notas/actions';
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
import { hasPermission } from '@/lib/auth-utils';

function TableSkeleton() {
  return (
    <div className="bg-background/80 backdrop-blur-sm rounded-xl border border-border/80 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50">
            <tr className="whitespace-nowrap">
              <th className="text-left p-4 font-semibold text-slate-300">Nota Fiscal</th>
              <th className="text-left p-4 font-semibold text-slate-300">Deletada Em</th>
              <th className="text-center p-4 font-semibold text-slate-300">Ações</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-t border-border">
                <td className="p-4"><div className='flex items-center gap-3'><Skeleton className="h-10 w-10 rounded-lg" /><div className='space-y-2'><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-32" /></div></div></td>
                <td className="p-4"><Skeleton className="h-5 w-24" /></td>
                <td className="p-4 text-center"><Skeleton className="h-8 w-20 rounded-md mx-auto" /></td>
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

function LixeiraClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const page = Number(searchParams.get('page')) || 1;
  const limit = Number(searchParams.get('limit')) || 10;
  const searchTerm = searchParams.get('q') || '';
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  
  const [notes, setNotes] = useState<Note[]>([]);
  const [totalNotes, setTotalNotes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  
  const [selectedNoteForDetails, setSelectedNoteForDetails] = useState<Note | null>(null);
  const [showDetailsSheet, setShowDetailsSheet] = useState(false);
  const [canManageTrash, setCanManageTrash] = useState(false);

  useEffect(() => {
    const checkPermissions = async () => {
      const permission = await hasPermission(PermissionType.CAN_MANAGE_TRASH);
      setCanManageTrash(permission);
    };
    if (session) {
      checkPermissions();
    }
  }, [session]);

  const fetchNotes = React.useCallback(async () => {
    setLoading(true);
    try {
      const dateRange: DateRange | undefined = (from && to) ? { from: new Date(from), to: new Date(to) } : undefined;
      const { notes: fetchedNotes, total: totalFetched } = await getNotes({ page, limit, query: searchTerm, dateRange, showDeleted: true }); 
      setNotes(fetchedNotes);
      setTotalNotes(totalFetched);
    } catch (error) {
      console.error("Failed to fetch deleted notes:", error);
      toast({ title: 'Erro', description: 'Não foi possível buscar as notas da lixeira.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchTerm, from, to, toast]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleRestoreNote = (noteId: string) => {
    startTransition(async () => {
        const result = await restoreNote(noteId);
        if (result.success) {
            toast({ title: "Nota Restaurada", description: result.message });
            fetchNotes(); 
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
    });
  };

  const handleDeletePermanently = (noteId: string) => {
    startTransition(async () => {
        const result = await deleteNote(noteId, true);
        if (result.success) {
            toast({ title: "Nota Excluída", description: result.message });
            fetchNotes(); 
        } else {
            toast({ title: "Erro", description: result.message, variant: "destructive" });
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
    router.push(`/dashboard/lixeira?${createQueryString({ page: newPage })}`);
  };

  const handleFilterChange = (filters: { q?: string; from?: string; to?: string; }) => {
    router.push(`/dashboard/lixeira?${createQueryString({ ...filters, page: 1 })}`);
  };
  
  const [currentSearchTerm, setCurrentSearchTerm] = useState(searchTerm);
  const [currentDate, setCurrentDate] = useState<DateRange | undefined>(() => {
    if (from && to) return { from: new Date(from), to: new Date(to) };
    return undefined;
  });

  useEffect(() => {
    const handler = setTimeout(() => {
        handleFilterChange({
            q: currentSearchTerm,
            from: currentDate?.from?.toISOString(),
            to: currentDate?.to?.toISOString()
        })
    }, 500);
    return () => clearTimeout(handler);
  }, [currentSearchTerm, currentDate]);

  return (
    <TooltipProvider>
      <div className="bg-background/80 backdrop-blur-sm rounded-xl border border-border/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50">
              <tr className="whitespace-nowrap">
                <th className="text-left p-4 font-semibold text-slate-300">Nota Fiscal</th>
                <th className="text-left p-4 font-semibold text-slate-300">Deletada Em</th>
                <th className="text-left p-4 font-semibold text-slate-300">Status Original</th>
                <th className="text-left p-4 font-semibold text-slate-300">Valor</th>
                <th className="text-center p-4 font-semibold text-slate-300">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5}><TableSkeleton /></td></tr>
              ) : notes.length > 0 ? (
                notes.map((note) => (
                    <tr key={note.id} className="border-t border-border hover:bg-accent/40 transition-colors">
                      <td className="p-4 align-top">
                         <div className="flex items-center space-x-3 max-w-sm">
                           <div className="bg-slate-800 p-2 rounded-lg border border-slate-700 flex-shrink-0">
                             <FileSpreadsheet className="w-5 h-5 text-slate-400" />
                           </div>
                           <div className="min-w-0">
                              <p className="font-medium text-white truncate" title={note.description}>{note.description}</p>
                              <p className="text-sm text-slate-400 truncate" title={`${note.projectAccountNumber} - ${note.noteNumber || 'S/N'}`}>
                                {note.projectAccountNumber} - {note.noteNumber || 'S/N'}
                              </p>
                           </div>
                        </div>
                      </td>
                      <td className="p-4 align-top text-slate-300">{note.deletedAt ? format(new Date(note.deletedAt), 'dd/MM/yyyy HH:mm') : 'N/A'}</td>
                      <td className="p-4 align-top text-slate-300">{note.status}</td>
                      <td className="p-4 align-top text-slate-300 font-medium">{note.totalValue ? `R$ ${note.totalValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : '-'}</td>
                      <td className="p-4 align-top text-center">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild disabled={!canManageTrash}>
                                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-primary data-[state=open]:bg-primary/10 data-[state=open]:text-primary" disabled={!canManageTrash}>
                                    <MoreHorizontal className="w-5 h-5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleRestoreNote(note.id)}>
                                    <Undo2 className="mr-2 h-4 w-4" /> Restaurar Nota
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onSelect={(e) => e.preventDefault()}>
                                      <AlertTriangle className="mr-2 h-4 w-4" /> Excluir Permanentemente
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Excluir Permanentemente?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Esta ação não pode ser desfeita. A nota fiscal e todo o seu histórico serão removidos para sempre.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeletePermanently(note.id)}
                                        className={buttonVariants({ variant: "destructive" })}
                                      >
                                        Sim, Excluir Para Sempre
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                            </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>
                    <div className="text-center py-12">
                      <Trash2 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-400 mb-2">A lixeira está vazia</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between p-4">
          <div className="text-sm text-muted-foreground">{totalNotes} notas na lixeira.</div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => handlePageChange(page - 1)} disabled={page <= 1}>Anterior</Button>
            <span className="text-sm">Página {page} de {Math.ceil(totalNotes / limit)}</span>
            <Button variant="outline" size="sm" onClick={() => handlePageChange(page + 1)} disabled={page >= Math.ceil(totalNotes / limit)}>Próximo</Button>
          </div>
        </div>
      </div>
      <NoteDetailsSheet note={selectedNoteForDetails} open={showDetailsSheet} onOpenChange={setShowDetailsSheet} />
    </TooltipProvider>
  )
}

export default function LixeiraPage() {
  return (
     <div className="space-y-8">
        <div className="flex items-center gap-4">
            <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-slate-500 to-slate-600 rounded-2xl blur opacity-20"></div>
                <div className="relative bg-gradient-to-r from-slate-500 to-slate-600 p-3 rounded-2xl">
                    <Trash2 className="w-8 h-8 text-white" />
                </div>
            </div>
            <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                    Lixeira
                </h1>
                <p className="text-slate-400 mt-1">
                    Gerencie notas que foram excluídas. Itens aqui podem ser restaurados ou removidos permanentemente.
                </p>
            </div>
        </div>
        <Suspense fallback={<TableSkeleton />}>
            <LixeiraClient />
        </Suspense>
     </div>
  )
}
