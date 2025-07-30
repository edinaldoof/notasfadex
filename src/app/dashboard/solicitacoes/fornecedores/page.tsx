
'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
    Building, 
    Search,
    Filter,
    SortAsc,
    SortDesc,
    ChevronRight,
    FileSpreadsheet,
    CircleDollarSign,
    Loader2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppMode } from '@/contexts/app-mode-context';

type Supplier = {
    id: string;
    name: string;
    cnpj: string;
    noteCount: number;
    totalValue: number;
};

// Mock data para a prévia
const mockSuppliers: Supplier[] = [
    { id: '1', name: 'Tecnologia & Inovação Ltda.', cnpj: '12.345.678/0001-99', noteCount: 15, totalValue: 125000.50 },
    { id: '2', name: 'Soluções em Logística S.A.', cnpj: '98.765.432/0001-11', noteCount: 8, totalValue: 89000.00 },
    { id: '3', name: 'Consultoria Estratégica Associados', cnpj: '45.123.789/0001-33', noteCount: 22, totalValue: 210450.75 },
    { id: '4', name: 'Materiais de Escritório Express', cnpj: '33.444.555/0001-77', noteCount: 31, totalValue: 45200.00 },
    { id: '5', name: 'Serviços de Limpeza Eficaz', cnpj: '11.222.333/0001-55', noteCount: 12, totalValue: 72300.00 },
];

const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const maskCnpj = (cnpj: string) => {
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function SupplierSkeleton() {
    return (
        <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="bg-card shadow-sm hover:shadow-md transition-shadow duration-300">
                    <CardContent className="p-4 flex items-center justify-between">
                         <div className="flex items-center gap-4">
                            <Skeleton className="h-12 w-12 rounded-lg bg-slate-200" />
                            <div className="space-y-2">
                                <Skeleton className="h-5 w-48 bg-slate-200" />
                                <Skeleton className="h-4 w-32 bg-slate-200" />
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="space-y-2 text-right">
                               <Skeleton className="h-4 w-20 bg-slate-200" />
                               <Skeleton className="h-4 w-16 bg-slate-200" />
                            </div>
                            <div className="space-y-2 text-right">
                                <Skeleton className="h-4 w-24 bg-slate-200" />
                                <Skeleton className="h-4 w-20 bg-slate-200" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

export default function FornecedoresPage() {
    const { setMode } = useAppMode();
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    useEffect(() => {
        setMode('request');
        // Simula o carregamento dos dados
        const timer = setTimeout(() => {
            setSuppliers(mockSuppliers);
            setLoading(false);
        }, 1000);
        return () => clearTimeout(timer);
    }, [setMode]);

    const filteredAndSortedSuppliers = useMemo(() => {
        let filtered = suppliers.filter(supplier =>
            supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            supplier.cnpj.includes(searchTerm)
        );

        return filtered.sort((a, b) => {
            const nameA = a.name.toLowerCase();
            const nameB = b.name.toLowerCase();
            if (sortOrder === 'asc') {
                return nameA.localeCompare(nameB);
            } else {
                return nameB.localeCompare(nameA);
            }
        });
    }, [suppliers, searchTerm, sortOrder]);


    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-2xl blur opacity-20"></div>
                        <div className="relative bg-gradient-to-r from-green-400 to-emerald-500 p-3 rounded-2xl">
                            <Building className="w-8 h-8 text-white" />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-4xl font-bold text-foreground">
                            Fornecedores
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Gerencie e visualize informações dos fornecedores cadastrados.
                        </p>
                    </div>
                </div>
            </div>

            {/* Filtros */}
            <Card className="bg-card p-4 shadow-sm">
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <div className="relative flex-grow w-full sm:w-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por Nome ou CNPJ..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-slate-100 border-slate-200 focus:bg-white"
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button
                            variant="outline"
                            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                            className="w-full sm:w-auto"
                        >
                            {sortOrder === 'asc' ? <SortAsc className="w-4 h-4 mr-2" /> : <SortDesc className="w-4 h-4 mr-2" />}
                            Ordenar por Nome ({sortOrder === 'asc' ? 'A-Z' : 'Z-A'})
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Lista de Fornecedores */}
            <div className="space-y-4">
                {loading ? (
                    <SupplierSkeleton />
                ) : filteredAndSortedSuppliers.length > 0 ? (
                    filteredAndSortedSuppliers.map(supplier => (
                        <Card key={supplier.id} className="bg-card shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300 group">
                            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 items-center gap-4">
                                
                                {/* Informações do Fornecedor */}
                                <div className="md:col-span-1 flex items-center gap-4">
                                    <div className="p-3 bg-slate-100 rounded-lg border border-slate-200">
                                        <Building className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-foreground truncate">{supplier.name}</p>
                                        <p className="text-sm text-muted-foreground">{maskCnpj(supplier.cnpj)}</p>
                                    </div>
                                </div>
                                
                                {/* Estatísticas */}
                                <div className="md:col-span-1 grid grid-cols-2 gap-4 text-sm">
                                    <div className="flex items-center gap-2">
                                        <FileSpreadsheet className="w-4 h-4 text-muted-foreground"/>
                                        <div>
                                            <p className="text-muted-foreground text-xs">Notas</p>
                                            <p className="font-semibold">{supplier.noteCount}</p>
                                        </div>
                                    </div>
                                     <div className="flex items-center gap-2">
                                        <CircleDollarSign className="w-4 h-4 text-muted-foreground"/>
                                         <div>
                                            <p className="text-muted-foreground text-xs">Valor Total</p>
                                            <p className="font-semibold">{formatCurrency(supplier.totalValue)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Ações */}
                                <div className="md:col-span-1 flex justify-end">
                                     <Button variant="outline" size="sm" className="bg-transparent hover:bg-slate-100">
                                        Ver Detalhes
                                        <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <Card className="bg-card shadow-sm">
                         <CardContent className="p-8 text-center text-muted-foreground">
                            <Building className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                            <h3 className="text-lg font-semibold text-foreground mb-1">Nenhum fornecedor encontrado</h3>
                            <p>Tente ajustar sua busca ou cadastre um novo fornecedor.</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
