
'use client';

import { useState, useEffect, useTransition } from 'react';
import { useSession } from 'next-auth/react';
import { Users, FileSpreadsheet, Loader2, User as UserIcon, Shield, ChevronRight } from 'lucide-react';
import { getCollaborators, getNotesByUserId, type UserWithNoteCount } from './actions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FiscalNote } from '@/lib/types';
import { NoteDetailsSheet } from '@/components/dashboard/note-details-sheet';
import { Button } from '@/components/ui/button';

function CollaboratorSkeleton() {
    return (
        <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-border">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-4 w-48" />
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-6 w-20 rounded-md" />
                        <Skeleton className="h-6 w-24 rounded-md" />
                    </div>
                </div>
            ))}
        </div>
    );
}

const getRoleVariant = (role: string) => {
  switch (role) {
    case 'OWNER': return 'destructive';
    case 'MANAGER': return 'secondary';
    default: return 'outline';
  }
};


export default function CollaboratorsPage() {
    const { data: session } = useSession();
    const [collaborators, setCollaborators] = useState<UserWithNoteCount[]>([]);
    const [selectedCollaborator, setSelectedCollaborator] = useState<UserWithNoteCount | null>(null);
    const [notes, setNotes] = useState<FiscalNote[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isNotesLoading, startNotesTransition] = useTransition();

    const fetchCollaborators = async () => {
        setIsLoading(true);
        const data = await getCollaborators();
        setCollaborators(data);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchCollaborators();
    }, []);

    const handleSelectCollaborator = (collaborator: UserWithNoteCount) => {
        setSelectedCollaborator(collaborator);
        startNotesTransition(async () => {
            const userNotes = await getNotesByUserId(collaborator.id);
            setNotes(userNotes);
        });
    };
    
    const getInitials = (name: string | null) => {
        if (!name) return '??';
        return name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();
    };

    return (
        <div>
            <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
                <Users className="w-8 h-8" />
                Colaboradores
            </h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Coluna da lista de colaboradores */}
                <div className="lg:col-span-1 space-y-4">
                    {isLoading ? (
                        <CollaboratorSkeleton />
                    ) : (
                        collaborators.map(user => (
                            <button 
                                key={user.id}
                                onClick={() => handleSelectCollaborator(user)}
                                className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${selectedCollaborator?.id === user.id ? 'bg-primary/10 border-primary/50 ring-2 ring-primary/30' : 'bg-slate-900/50 border-border hover:bg-slate-800/50 hover:border-slate-700'}`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-12 w-12">
                                            <AvatarImage src={user.image ?? undefined} />
                                            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold text-white">{user.name}</p>
                                            <p className="text-sm text-slate-400">{user.email}</p>
                                        </div>
                                    </div>
                                    <ChevronRight className={`w-5 h-5 text-slate-500 transition-transform ${selectedCollaborator?.id === user.id ? 'transform scale-125 text-primary' : ''}`} />
                                </div>
                                <div className="flex items-center justify-between mt-4 pl-16">
                                     <Badge variant={getRoleVariant(user.role)}>
                                        {user.role === 'USER' && <UserIcon className="w-3 h-3 mr-1.5" />}
                                        {user.role !== 'USER' && <Shield className="w-3 h-3 mr-1.5" />}
                                        {user.role.charAt(0) + user.role.slice(1).toLowerCase()}
                                    </Badge>
                                    <div className="flex items-center gap-2 text-sm text-slate-400">
                                        <FileSpreadsheet className="w-4 h-4" />
                                        <span>{user.noteCount} {user.noteCount === 1 ? 'nota' : 'notas'}</span>
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                </div>

                {/* Coluna das notas do colaborador selecionado */}
                <div className="lg:col-span-2">
                    <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-border p-6 min-h-[60vh]">
                        {!selectedCollaborator ? (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <Users className="w-16 h-16 text-slate-600 mb-4" />
                                <h3 className="text-xl font-bold text-white">Selecione um Colaborador</h3>
                                <p className="text-slate-400 mt-2 max-w-sm">Clique em um colaborador à esquerda para visualizar todas as notas fiscais submetidas por ele.</p>
                            </div>
                        ) : isNotesLoading ? (
                             <div className="flex flex-col items-center justify-center h-full">
                                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                                <p className="text-slate-400 mt-4">Carregando notas de {selectedCollaborator.name?.split(' ')[0]}...</p>
                            </div>
                        ) : notes.length > 0 ? (
                            <div>
                                <h2 className="text-2xl font-bold mb-6">Notas de {selectedCollaborator.name}</h2>
                                <div className="space-y-3">
                                    {notes.map(note => (
                                        <NoteItem key={note.id} note={note} />
                                    ))}
                                </div>
                            </div>
                        ) : (
                             <div className="flex flex-col items-center justify-center h-full text-center">
                                <FileSpreadsheet className="w-16 h-16 text-slate-600 mb-4" />
                                <h3 className="text-xl font-bold text-white">Nenhuma Nota Encontrada</h3>
                                <p className="text-slate-400 mt-2">{selectedCollaborator.name} ainda não submeteu nenhuma nota fiscal.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function NoteItem({ note }: { note: FiscalNote }) {
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    
    return (
        <>
            <div className="bg-slate-800/50 p-4 rounded-lg flex items-center justify-between hover:bg-slate-800 transition-colors">
                <div>
                    <p className="font-semibold text-white">{`Nota: ${note.numeroNota || 'S/N'} - (${note.projectAccountNumber})`}</p>
                    <p className="text-sm text-slate-400">{note.description}</p>
                </div>
                 <Button variant="outline" size="sm" onClick={() => setIsDetailsOpen(true)}>
                    Ver Detalhes
                </Button>
            </div>
            <NoteDetailsSheet note={note} open={isDetailsOpen} onOpenChange={setIsDetailsOpen} />
        </>
    );
}
