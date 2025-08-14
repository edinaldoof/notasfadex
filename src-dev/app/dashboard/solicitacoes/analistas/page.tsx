
'use client';

import { useState, useEffect, useTransition, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { 
    Users, 
    Loader2, 
    User as UserIcon, 
    Shield, 
    ChevronRight,
    Search,
    SortAsc,
    SortDesc,
    FileText
} from 'lucide-react';
import { getRequestCollaborators, getOrdersByUserId, type UserWithOrderCount } from './actions';
import { OrdemDeFornecimento } from '@prisma/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppMode } from '@/contexts/app-mode-context';


function CollaboratorSkeleton() {
    return (
        <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="bg-slate-100 border-slate-200">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Skeleton className="h-14 w-14 rounded-full bg-slate-200" />
                            <div className="space-y-2">
                                <Skeleton className="h-5 w-32 bg-slate-200" />
                                <Skeleton className="h-4 w-48 bg-slate-200" />
                            </div>
                        </div>
                        <Skeleton className="h-6 w-16 rounded-md bg-slate-200" />
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

const getInitials = (name: string | null) => {
    if (!name) return '??';
    return name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();
};

const formatCurrency = (value: number | null) => {
    if (value === null) return 'N/A';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}


export default function AnalistasSolicitacoesPage() {
    const { setMode } = useAppMode();
    const { data: session } = useSession();
    const [collaborators, setCollaborators] = useState<UserWithOrderCount[]>([]);
    const [selectedCollaborator, setSelectedCollaborator] = useState<UserWithOrderCount | null>(null);
    const [orders, setOrders] = useState<OrdemDeFornecimento[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isOrdersLoading, startOrdersTransition] = useTransition();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    
    useEffect(() => {
        setMode('request');
        const fetchCollaborators = async () => {
            setIsLoading(true);
            try {
                const data = await getRequestCollaborators();
                setCollaborators(data);
            } catch (error) {
                console.error('Erro ao carregar Analistas:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchCollaborators();
    }, [setMode]);

    const handleSelectCollaborator = (collaborator: UserWithOrderCount) => {
        setSelectedCollaborator(collaborator);
        startOrdersTransition(async () => {
            try {
                const userOrders = await getOrdersByUserId(collaborator.id);
                setOrders(userOrders);
            } catch (error) {
                console.error('Erro ao carregar ordens:', error);
                setOrders([]);
            }
        });
    };
    
    const filteredAndSortedCollaborators = useMemo(() => {
        let filtered = collaborators.filter(user => 
            user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return filtered.sort((a, b) => {
            const nameA = a.name?.toLowerCase() || '';
            const nameB = b.name?.toLowerCase() || '';
            return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        });
    }, [collaborators, searchTerm, sortOrder]);


    return (
         <div className="space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
                 <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-indigo-500 rounded-2xl blur opacity-20"></div>
                        <div className="relative bg-gradient-to-r from-purple-400 to-indigo-500 p-3 rounded-2xl">
                            <Users className="w-8 h-8 text-white" />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-4xl font-bold text-foreground">
                            Analistas de Solicitações
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Visualize as Ordens de Fornecimento criadas por cada analista.
                        </p>
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
                 {/* Coluna da lista de Analistas */}
                <div className="xl:col-span-2 space-y-4">
                    <Card className="p-4 bg-card">
                         <div className="flex items-center gap-2">
                             <div className="relative flex-grow">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por nome ou email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 bg-slate-100 border-slate-200 focus:bg-white"
                                />
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                            >
                                {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                            </Button>
                         </div>
                    </Card>

                     <div className="space-y-3">
                        {isLoading ? (
                            <CollaboratorSkeleton />
                        ) : (
                            filteredAndSortedCollaborators.map(user => (
                                <Card 
                                    key={user.id}
                                    className={`cursor-pointer transition-all duration-200 bg-card shadow-sm ${
                                        selectedCollaborator?.id === user.id 
                                            ? 'border-primary ring-2 ring-primary/30' 
                                            : 'border-border hover:bg-slate-50'
                                    }`}
                                    onClick={() => handleSelectCollaborator(user)}
                                >
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <Avatar className="h-14 w-14 ring-2 ring-slate-200">
                                                <AvatarImage src={user.image ?? undefined} />
                                                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-foreground truncate">{user.name}</p>
                                                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant="outline" className="text-xs">{getRoleLabel(user.role)}</Badge>
                                                    <Badge variant="secondary" className="text-xs">{user.orderCount} OFs</Badge>
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${
                                            selectedCollaborator?.id === user.id ? 'transform scale-110 text-primary' : ''
                                        }`} />
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </div>

                 {/* Coluna das ordens do Analista selecionado */}
                <div className="xl:col-span-3">
                    <Card className="min-h-[70vh] bg-card">
                         {!selectedCollaborator ? (
                            <CardContent className="p-8 flex flex-col items-center justify-center h-full text-center">
                                <Users className="w-16 h-16 text-slate-300 mb-6" />
                                <h3 className="text-2xl font-bold text-foreground mb-2">Selecione um Analista</h3>
                                <p className="text-muted-foreground max-w-md">
                                    Clique em um analista na lista ao lado para ver suas Ordens de Fornecimento.
                                </p>
                            </CardContent>
                        ) : (
                             <>
                                <CardHeader>
                                    <CardTitle>Ordens de {selectedCollaborator.name}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {isOrdersLoading ? (
                                        <div className="flex justify-center items-center py-12">
                                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                        </div>
                                    ) : orders.length > 0 ? (
                                        <div className="space-y-3">
                                            {orders.map(order => (
                                                <Card key={order.id} className="bg-slate-100/50">
                                                    <CardContent className="p-4 flex items-center justify-between">
                                                        <div>
                                                            <p className="font-semibold">{order.numeroOF}</p>
                                                            <p className="text-sm text-muted-foreground">{order.fornecedor.razaoSocial}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-semibold">{formatCurrency(order.valorTotal)}</p>
                                                            <Badge variant="outline">{order.status}</Badge>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12 text-muted-foreground">
                                            <FileText className="w-12 h-12 mx-auto mb-4" />
                                            <p>Nenhuma Ordem de Fornecimento encontrada para este analista.</p>
                                        </div>
                                    )}
                                </CardContent>
                             </>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
}

