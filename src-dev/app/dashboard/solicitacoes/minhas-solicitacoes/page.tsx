
'use client';

import { useState, useEffect } from 'react';
import { 
    Send,
    FilePlus,
    Loader2,
    Search,
    Filter,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAppMode } from '@/contexts/app-mode-context';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

// Mock Data - Substituir com dados reais da API
const mockSolicitacoes = [
    { id: 'OF-001', fornecedor: 'Tecnologia & Inovação Ltda.', dataEnvio: '2024-07-28', prazoNF: '2024-08-12', valor: 1500.75, status: 'AGUARDANDO_NOTA' },
    { id: 'OF-002', fornecedor: 'Soluções em Logística S.A.', dataEnvio: '2024-07-25', prazoNF: '2024-08-09', valor: 850.00, status: 'AGUARDANDO_CONFIRMACAO' },
    { id: 'OF-003', fornecedor: 'Consultoria Estratégica', dataEnvio: '2024-06-15', prazoNF: '2024-06-30', valor: 2500.00, status: 'ATRASADO' },
    { id: 'OF-004', fornecedor: 'Materiais de Escritório Express', dataEnvio: '2024-07-29', prazoNF: '2024-08-13', valor: 350.50, status: 'NF_RECEBIDA' },
    { id: 'OF-005', fornecedor: 'Tecnologia & Inovação Ltda.', dataEnvio: '2024-05-20', prazoNF: '2024-06-04', valor: 1200.00, status: 'CONCLUIDO' },
    { id: 'OF-006', fornecedor: 'Soluções em Logística S.A.', dataEnvio: '2024-07-01', prazoNF: '2024-07-16', valor: 950.00, status: 'CANCELADO' },
];

const statusConfig = {
    AGUARDANDO_CONFIRMACAO: { label: 'Aguardando Confirmação', icon: Clock, color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    AGUARDANDO_NOTA: { label: 'Aguardando Nota Fiscal', icon: Clock, color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    NF_RECEBIDA: { label: 'NF Recebida', icon: CheckCircle, color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
    ATRASADO: { label: 'Atrasado', icon: AlertCircle, color: 'bg-red-500/10 text-red-400 border-red-500/20' },
    CONCLUIDO: { label: 'Concluído', icon: CheckCircle, color: 'bg-green-500/10 text-green-400 border-green-500/20' },
    CANCELADO: { label: 'Cancelado', icon: XCircle, color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
    RASCUNHO: { label: 'Rascunho', icon: MoreHorizontal, color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
};

const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('pt-BR');

function StatCardSkeleton() {
    return <Skeleton className="h-24 w-full" />;
}

function TableSkeleton() {
    return (
        <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-100 rounded-lg">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-8 w-24 rounded-full" />
                </div>
            ))}
        </div>
    );
}

export default function MinhasSolicitacoesPage() {
    const { setMode } = useAppMode();
    const [loading, setLoading] = useState(true);
    const [solicitacoes, setSolicitacoes] = useState(mockSolicitacoes);

    useEffect(() => {
        setMode('request');
        const timer = setTimeout(() => setLoading(false), 1000);
        return () => clearTimeout(timer);
    }, [setMode]);

    const stats = {
        total: solicitacoes.length,
        aguardandoConfirmacao: solicitacoes.filter(s => s.status === 'AGUARDANDO_CONFIRMACAO').length,
        aguardandoNF: solicitacoes.filter(s => s.status === 'AGUARDANDO_NOTA').length,
        atrasadas: solicitacoes.filter(s => s.status === 'ATRASADO').length,
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-br from-primary to-green-400 p-3 rounded-xl">
                        <Send className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-bold text-foreground">Minhas Solicitações</h1>
                        <p className="text-muted-foreground mt-1">
                            Acompanhe suas Ordens de Fornecimento enviadas.
                        </p>
                    </div>
                </div>
                <Button size="lg" className="mt-4 sm:mt-0" disabled>
                    <FilePlus className="w-5 h-5 mr-2" />
                    Nova Solicitação
                </Button>
            </div>

            {/* Cards de Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {loading ? (
                    <>
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                    </>
                ) : (
                    <>
                        <Card><CardHeader><CardTitle>Total</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{stats.total}</p></CardContent></Card>
                        <Card><CardHeader><CardTitle>Aguardando Confirmação</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{stats.aguardandoConfirmacao}</p></CardContent></Card>
                        <Card><CardHeader><CardTitle>Aguardando Nota Fiscal</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{stats.aguardandoNF}</p></CardContent></Card>
                        <Card><CardHeader><CardTitle>Atrasadas</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{stats.atrasadas}</p></CardContent></Card>
                    </>
                )}
            </div>

            {/* Filtros e Tabela */}
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row gap-4 justify-between">
                        <div className="relative flex-grow">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input placeholder="Buscar por nº da OF ou fornecedor..." className="pl-10" />
                        </div>
                        <div className="flex gap-4">
                            <Button variant="outline" className="w-full sm:w-auto">
                                <Filter className="w-4 h-4 mr-2" />
                                Filtrar por Status
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? <TableSkeleton /> : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nº OF</TableHead>
                                    <TableHead>Fornecedor</TableHead>
                                    <TableHead>Data de Envio</TableHead>
                                    <TableHead>Prazo NF</TableHead>
                                    <TableHead>Valor</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {solicitacoes.map((s) => {
                                    const config = statusConfig[s.status as keyof typeof statusConfig] || statusConfig.RASCUNHO;
                                    const Icon = config.icon;
                                    return (
                                    <TableRow key={s.id}>
                                        <TableCell className="font-medium">{s.id}</TableCell>
                                        <TableCell>{s.fornecedor}</TableCell>
                                        <TableCell>{formatDate(s.dataEnvio)}</TableCell>
                                        <TableCell>{formatDate(s.prazoNF)}</TableCell>
                                        <TableCell>{formatCurrency(s.valor)}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={config.color}>
                                                <Icon className="w-3 h-3 mr-1.5" />
                                                {config.label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuItem>Ver Detalhes</DropdownMenuItem>
                                                    <DropdownMenuItem>Reenviar E-mail</DropdownMenuItem>
                                                    <DropdownMenuItem className="text-red-500">Cancelar</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )})}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

