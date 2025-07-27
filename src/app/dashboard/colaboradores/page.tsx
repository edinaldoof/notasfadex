
'use client';

import { useState, useEffect, useTransition, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { 
    Users, 
    FileSpreadsheet, 
    Loader2, 
    User as UserIcon, 
    Shield, 
    ChevronRight,
    Search,
    Filter,
    SortAsc,
    SortDesc,
    Calendar,
    TrendingUp,
    Eye,
    Download,
    Info,
    MoreVertical
} from 'lucide-react';
import { getCollaborators, getNotesByUserId, type UserWithNoteCount, exportCollaboratorsData } from './actions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { FiscalNote } from '@/lib/types';
import { NoteDetailsSheet } from '@/components/dashboard/note-details-sheet';
import { CollaboratorDetailsSheet } from './collaborator-details-sheet';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type SortOption = 'name' | 'notes' | 'role';
type SortOrder = 'asc' | 'desc';
type RoleFilter = 'all' | 'OWNER' | 'MANAGER' | 'USER';

function CollaboratorSkeleton() {
    return (
        <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="bg-slate-900/50 border-border">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Skeleton className="h-14 w-14 rounded-full" />
                                <div className="space-y-2">
                                    <Skeleton className="h-5 w-32" />
                                    <Skeleton className="h-4 w-48" />
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-6 w-20 rounded-md" />
                                <Skeleton className="h-6 w-16 rounded-md" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

function NotesLoadingSkeleton() {
    return (
        <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="bg-slate-800/50 border-border">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-2 flex-1">
                                <Skeleton className="h-5 w-3/4" />
                                <Skeleton className="h-4 w-1/2" />
                            </div>
                            <Skeleton className="h-9 w-24" />
                        </div>
                    </CardContent>
                </Card>
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

const getRoleLabel = (role: string) => {
    switch (role) {
        case 'OWNER': return 'Proprietário';
        case 'MANAGER': return 'Gerente';
        case 'USER': return 'Usuário';
        default: return role;
    }
};

export default function CollaboratorsPage() {
    const { data: session } = useSession();
    const { toast } = useToast();
    const [collaborators, setCollaborators] = useState<UserWithNoteCount[]>([]);
    const [selectedCollaborator, setSelectedCollaborator] = useState<UserWithNoteCount | null>(null);
    const [collaboratorDetailsOpen, setCollaboratorDetailsOpen] = useState(false);
    const [notes, setNotes] = useState<FiscalNote[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isNotesLoading, startNotesTransition] = useTransition();
    const [isExporting, startExportingTransition] = useTransition();
    
    // Filtros e ordenação
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
    const [sortBy, setSortBy] = useState<SortOption>('name');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

    const fetchCollaborators = async () => {
        setIsLoading(true);
        try {
            const data = await getCollaborators();
            setCollaborators(data);
        } catch (error) {
            console.error('Erro ao carregar colaboradores:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCollaborators();
    }, []);

    const handleSelectCollaborator = (collaborator: UserWithNoteCount) => {
        setSelectedCollaborator(collaborator);
        startNotesTransition(async () => {
            try {
                const userNotes = await getNotesByUserId(collaborator.id);
                setNotes(userNotes);
            } catch (error) {
                console.error('Erro ao carregar notas:', error);
                setNotes([]);
            }
        });
    };

    const handleShowCollaboratorDetails = (collaborator: UserWithNoteCount, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedCollaborator(collaborator);
        setCollaboratorDetailsOpen(true);
    };

    const handleExportData = () => {
        startExportingTransition(async () => {
            try {
                toast({
                    title: 'Exportando Dados',
                    description: 'A geração do seu arquivo XLSX foi iniciada. Aguarde...',
                });

                const result = await exportCollaboratorsData();
                if (result.success && result.fileData) {
                    const byteCharacters = atob(result.fileData);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = `Relatorio_Colaboradores_Notas_${new Date().toISOString().split('T')[0]}.xlsx`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);

                    toast({
                        title: 'Exportação Concluída',
                        description: 'O arquivo foi baixado com sucesso.',
                    });
                } else {
                    throw new Error(result.message || 'Falha ao gerar o arquivo.');
                }
            } catch (error) {
                console.error('Erro ao exportar:', error);
                toast({
                    title: 'Erro na Exportação',
                    description: error instanceof Error ? error.message : 'Não foi possível exportar os dados.',
                    variant: 'destructive',
                });
            }
        });
    };

    // Filtros e ordenação aplicados
    const filteredAndSortedCollaborators = useMemo(() => {
        let filtered = collaborators.filter(user => {
            const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                user.email?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesRole = roleFilter === 'all' || user.role === roleFilter;
            return matchesSearch && matchesRole;
        });

        return filtered.sort((a, b) => {
            let aValue: string | number;
            let bValue: string | number;

            switch (sortBy) {
                case 'name':
                    aValue = a.name?.toLowerCase() || '';
                    bValue = b.name?.toLowerCase() || '';
                    break;
                case 'notes':
                    aValue = a.noteCount;
                    bValue = b.noteCount;
                    break;
                case 'role':
                    const roleOrder = { OWNER: 0, MANAGER: 1, USER: 2 };
                    aValue = roleOrder[a.role as keyof typeof roleOrder] || 3;
                    bValue = roleOrder[b.role as keyof typeof roleOrder] || 3;
                    break;
                default:
                    return 0;
            }

            if (sortOrder === 'asc') {
                return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
            } else {
                return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
            }
        });
    }, [collaborators, searchTerm, roleFilter, sortBy, sortOrder]);

    const toggleSort = (option: SortOption) => {
        if (sortBy === option) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(option);
            setSortOrder('asc');
        }
    };

    const getInitials = (name: string | null) => {
        if (!name) return '??';
        return name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();
    };

    // Estatísticas
    const stats = useMemo(() => {
        const totalNotes = collaborators.reduce((sum, user) => sum + user.noteCount, 0);
        const activeUsers = collaborators.filter(user => user.noteCount > 0).length;
        const totalUsers = collaborators.length;
        
        return {
            totalUsers,
            activeUsers,
            totalNotes,
            avgNotesPerUser: totalUsers > 0 ? Math.round(totalNotes / totalUsers * 10) / 10 : 0
        };
    }, [collaborators]);

    return (
        <TooltipProvider>
            <div className="space-y-8">
                {/* Header com estatísticas */}
                <div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <Users className="w-8 h-8 text-primary" />
                            Colaboradores
                        </h1>
                        <div className="flex items-center gap-2 mt-4 sm:mt-0">
                            <Button variant="outline" size="sm" onClick={handleExportData} disabled={isExporting}>
                                {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                                {isExporting ? 'Exportando...' : 'Exportar (XLSX)'}
                            </Button>
                        </div>
                    </div>

                    {/* Estatísticas */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-blue-400">Total de Usuários</p>
                                        <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
                                    </div>
                                    <Users className="w-8 h-8 text-blue-400" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-green-400">Usuários Ativos</p>
                                        <p className="text-2xl font-bold text-white">{stats.activeUsers}</p>
                                    </div>
                                    <TrendingUp className="w-8 h-8 text-green-400" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-purple-400">Total de Notas</p>
                                        <p className="text-2xl font-bold text-white">{stats.totalNotes}</p>
                                    </div>
                                    <FileSpreadsheet className="w-8 h-8 text-purple-400" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-orange-500/20">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-orange-400">Média por Usuário</p>
                                        <p className="text-2xl font-bold text-white">{stats.avgNotesPerUser}</p>
                                    </div>
                                    <Calendar className="w-8 h-8 text-orange-400" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
                    {/* Coluna da lista de colaboradores */}
                    <div className="xl:col-span-2 space-y-6">
                        {/* Filtros */}
                        <Card className="bg-slate-900/50 border-border">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Filter className="w-5 h-5" />
                                    Filtros e Ordenação
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Busca */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        placeholder="Buscar por nome ou email..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10 bg-slate-800/50 border-slate-700"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {/* Filtro por função */}
                                    <Select value={roleFilter} onValueChange={(value: RoleFilter) => setRoleFilter(value)}>
                                        <SelectTrigger className="bg-slate-800/50 border-slate-700">
                                            <SelectValue placeholder="Filtrar por função" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todas as funções</SelectItem>
                                            <SelectItem value="OWNER">Proprietário</SelectItem>
                                            <SelectItem value="MANAGER">Gerente</SelectItem>
                                            <SelectItem value="USER">Usuário</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    {/* Ordenação */}
                                    <div className="flex gap-1">
                                        <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                                            <SelectTrigger className="bg-slate-800/50 border-slate-700">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="name">Nome</SelectItem>
                                                <SelectItem value="notes">Notas</SelectItem>
                                                <SelectItem value="role">Função</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                            className="px-3 bg-slate-800/50 border-slate-700"
                                        >
                                            {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                                        </Button>
                                    </div>
                                </div>

                                {/* Contador de resultados */}
                                <div className="text-sm text-slate-400 flex items-center justify-between">
                                    <span>
                                        {filteredAndSortedCollaborators.length} de {collaborators.length} colaboradores
                                    </span>
                                    {(searchTerm || roleFilter !== 'all') && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setSearchTerm('');
                                                setRoleFilter('all');
                                            }}
                                            className="text-xs"
                                        >
                                            Limpar filtros
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Lista de colaboradores */}
                        <div className="space-y-3">
                            {isLoading ? (
                                <CollaboratorSkeleton />
                            ) : filteredAndSortedCollaborators.length === 0 ? (
                                <Card className="bg-slate-900/50 border-border">
                                    <CardContent className="p-8 text-center">
                                        <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                                        <h3 className="text-lg font-semibold text-white mb-2">
                                            Nenhum colaborador encontrado
                                        </h3>
                                        <p className="text-slate-400 text-sm">
                                            Tente ajustar os filtros de busca
                                        </p>
                                    </CardContent>
                                </Card>
                            ) : (
                                filteredAndSortedCollaborators.map(user => (
                                    <Card 
                                        key={user.id}
                                        className={`cursor-pointer transition-all duration-200 ${
                                            selectedCollaborator?.id === user.id 
                                                ? 'bg-primary/10 border-primary/50 ring-2 ring-primary/30' 
                                                : 'bg-slate-900/50 border-border hover:bg-slate-800/50 hover:border-slate-600'
                                        }`}
                                        onClick={() => handleSelectCollaborator(user)}
                                    >
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <Avatar className="h-14 w-14 ring-2 ring-slate-700">
                                                        <AvatarImage src={user.image ?? undefined} />
                                                        <AvatarFallback className="bg-gradient-to-br from-slate-600 to-slate-700 text-white font-semibold">
                                                            {getInitials(user.name)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-white truncate">{user.name}</p>
                                                        <p className="text-sm text-slate-400 truncate">{user.email}</p>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <Badge variant={getRoleVariant(user.role)} className="text-xs">
                                                                {user.role === 'USER' && <UserIcon className="w-3 h-3 mr-1" />}
                                                                {user.role !== 'USER' && <Shield className="w-3 h-3 mr-1" />}
                                                                {getRoleLabel(user.role)}
                                                            </Badge>
                                                            <div className="flex items-center gap-1 text-xs text-slate-500">
                                                                <FileSpreadsheet className="w-3 h-3" />
                                                                <span>{user.noteCount}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <ChevronRight className={`w-5 h-5 text-slate-500 transition-all ${
                                                    selectedCollaborator?.id === user.id 
                                                        ? 'transform scale-125 text-primary rotate-90' 
                                                        : ''
                                                }`} />
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Coluna das notas do colaborador selecionado */}
                    <div className="xl:col-span-3">
                        <Card className="bg-slate-900/50 backdrop-blur-sm border-border min-h-[70vh]">
                            {!selectedCollaborator ? (
                                <CardContent className="p-8">
                                    <div className="flex flex-col items-center justify-center h-full text-center min-h-[400px]">
                                        <div className="bg-gradient-to-br from-slate-700 to-slate-800 p-6 rounded-full mb-6">
                                            <Users className="w-16 h-16 text-slate-400" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-white mb-2">Selecione um Colaborador</h3>
                                        <p className="text-slate-400 max-w-md leading-relaxed">
                                            Clique em um colaborador na lista ao lado para visualizar todas as notas fiscais 
                                            submetidas por ele e acompanhar seu histórico de atividades.
                                        </p>
                                    </div>
                                </CardContent>
                            ) : (
                                <>
                                    <CardHeader className="p-4 sm:p-6 pb-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <Avatar className="h-12 w-12">
                                                    <AvatarImage src={selectedCollaborator.image ?? undefined} />
                                                    <AvatarFallback>{getInitials(selectedCollaborator.name)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <CardTitle className="text-lg sm:text-xl">
                                                        Notas de {selectedCollaborator.name}
                                                    </CardTitle>
                                                    <p className="text-sm text-slate-400">
                                                        {selectedCollaborator.email}
                                                    </p>
                                                </div>
                                            </div>
                                            <Badge variant={getRoleVariant(selectedCollaborator.role)}>
                                                {selectedCollaborator.role === 'USER' && <UserIcon className="w-3 h-3 mr-1" />}
                                                {selectedCollaborator.role !== 'USER' && <Shield className="w-3 h-3 mr-1" />}
                                                {getRoleLabel(selectedCollaborator.role)}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    
                                    <Separator />
                                    
                                    <CardContent className="p-4 sm:p-6">
                                        {isNotesLoading ? (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-center py-8">
                                                    <div className="text-center">
                                                        <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
                                                        <p className="text-slate-400">
                                                            Carregando notas de {selectedCollaborator.name?.split(' ')[0]}...
                                                        </p>
                                                    </div>
                                                </div>
                                                <NotesLoadingSkeleton />
                                            </div>
                                        ) : notes.length > 0 ? (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="text-lg font-semibold text-white">
                                                        {notes.length} {notes.length === 1 ? 'nota encontrada' : 'notas encontradas'}
                                                    </h3>
                                                </div>
                                                <div className="space-y-3">
                                                    {notes.map(note => (
                                                        <NoteItem key={note.id} note={note} />
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center text-center py-12">
                                                <div className="bg-gradient-to-br from-slate-700 to-slate-800 p-6 rounded-full mb-6">
                                                    <FileSpreadsheet className="w-16 h-16 text-slate-400" />
                                                </div>
                                                <h3 className="text-xl font-bold text-white mb-2">Nenhuma Nota Encontrada</h3>
                                                <p className="text-slate-400 max-w-sm">
                                                    {selectedCollaborator.name?.split(' ')[0]} ainda não submeteu nenhuma nota fiscal.
                                                </p>
                                            </div>
                                        )}
                                    </CardContent>
                                </>
                            )}
                        </Card>
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
}

function NoteItem({ note }: { note: FiscalNote }) {
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    
    return (
        <>
            <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800 transition-all duration-200 hover:border-slate-600">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <p className="font-semibold text-white truncate">
                                    Nota: {note.numeroNota || 'S/N'}
                                </p>
                                {note.projectAccountNumber && (
                                    <Badge variant="outline" className="text-xs">
                                        {note.projectAccountNumber}
                                    </Badge>
                                )}
                            </div>
                            <p className="text-sm text-slate-400 line-clamp-2">
                                {note.description || 'Sem descrição'}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(note.createdAt).toLocaleDateString('pt-BR')}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button asChild variant="ghost" size="icon" className="text-slate-400 hover:text-primary">
                                        <a href={note.originalFileUrl} download>
                                            <Download className="w-4 h-4" />
                                        </a>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Baixar Nota Original</p>
                                </TooltipContent>
                            </Tooltip>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setIsDetailsOpen(true)}
                                className="bg-slate-700/50 border-slate-600 hover:bg-slate-700"
                            >
                                <Eye className="w-4 h-4 mr-0 sm:mr-2" />
                                <span className="hidden sm:inline">Ver Detalhes</span>
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <NoteDetailsSheet note={note} open={isDetailsOpen} onOpenChange={setIsDetailsOpen} />
        </>
    );
}
