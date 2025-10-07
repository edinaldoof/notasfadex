
'use client';

import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell, Legend } from 'recharts';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { addDays, format, subYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart3, Calendar as CalendarIcon, Download, SlidersHorizontal, Loader2, Users, FileText, CircleDollarSign as DollarIcon, Activity, Percent, Clock, Briefcase } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { CheckBadge } from '@/components/icons/check-badge';
import { CircleDollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getReportData, ReportData, ReportType } from './actions';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NoteStatus, InvoiceType } from '@/lib/types';

const reportTypes: { value: ReportType; label: string; description: string; disabled?: boolean }[] = [
    { value: 'totals_by_period', label: 'Totais por Período', description: 'Visão geral de valores e quantidade de notas atestadas.' },
    { value: 'performance_by_collaborator', label: 'Desempenho por Analista', description: 'Análise de submissões por usuário.' },
    { value: 'status_distribution', label: 'Distribuição por Status', description: 'Proporção de notas em cada status.' },
    { value: 'spending_by_project', label: 'Gastos por Conta de Projeto', description: 'Visualize os gastos totais por conta.' },
    { value: 'type_analysis', label: 'Análise por Tipo de Nota', description: 'Compare gastos entre produtos e serviços.' },
];

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const getInitials = (name: string | null) => {
  if (!name) return '??';
  return name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();
};

const STATUS_CONFIG: Record<NoteStatus, { label: string; color: string; }> = {
    ATESTADA: { label: 'Atestada', color: 'hsl(var(--success))' },
    PENDENTE: { label: 'Pendente', color: 'hsl(var(--warning))' },
    EXPIRADA: { label: 'Expirada', color: 'hsl(var(--destructive))' },
    REJEITADA: { label: 'Rejeitada', color: 'hsl(var(--destructive))' },
};

const TYPE_CONFIG: Record<InvoiceType, { label: string; color: string }> = {
    PRODUTO: { label: 'Produto', color: 'hsl(var(--primary))' },
    SERVICO: { label: 'Serviço', color: 'hsl(var(--info))' },
};

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('totals_by_period');
  const [date, setDate] = useState<DateRange | undefined>({
    from: subYears(new Date(), 1),
    to: new Date(),
  });
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerateReport = async () => {
    if (!date || !date.from) {
      toast({
        title: 'Período inválido',
        description: 'Por favor, selecione uma data de início para o relatório.',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    setReportData(null);
    try {
      const data = await getReportData({ reportType, from: date.from, to: date.to });
      setReportData(data);
    } catch (error) {
      console.error("Failed to generate report:", error);
      const errorMessage = error instanceof Error ? error.message : "Não foi possível gerar os dados.";
      toast({
        title: 'Erro ao Gerar Relatório',
        description: errorMessage,
        variant: 'destructive',
      });
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const renderReportContent = () => {
    if (loading) {
        return (
          <div className="space-y-8 mt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
            </div>
            <Skeleton className="h-80 w-full rounded-xl" />
          </div>
        );
    }

    if (!reportData) {
        return (
            <div className="text-center py-16 bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-border mt-8">
                <BarChart3 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-300 font-medium mb-2">Nenhum relatório gerado</p>
                <p className="text-slate-500 text-sm max-w-sm mx-auto">
                    Selecione o tipo de relatório, ajuste os filtros e clique em "Gerar Relatório" para começar sua análise.
                </p>
            </div>
        );
    }
    
    const formattedStartDate = format(reportData.startDate, 'dd/MM/yyyy');
    const formattedEndDate = format(reportData.endDate, 'dd/MM/yyyy');

    switch(reportData.reportType) {
        case 'totals_by_period':
            return (
                <div className="space-y-8 mt-8 animate-in fade-in-50 duration-500">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold">Resultados: Totais por Período</h2>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader className='flex-row items-center justify-between pb-2'>
                                <CardTitle className="text-sm font-medium">Total de Notas Atestadas</CardTitle>
                                <CheckBadge className="w-5 h-5 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{reportData.totalAtested ?? 0}</div>
                                <p className="text-xs text-muted-foreground">de {formattedStartDate} a {formattedEndDate}</p>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader className='flex-row items-center justify-between pb-2'>
                                <CardTitle className="text-sm font-medium">Valor Total Atestado</CardTitle>
                                <DollarIcon className="w-5 h-5 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{formatCurrency(reportData.totalValueAtested ?? 0)}</div>
                                 <p className="text-xs text-muted-foreground">no período selecionado</p>
                            </CardContent>
                        </Card>
                     </div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Valores Atestados por Mês</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={reportData.monthlyData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.2)" />
                                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${Number(value)/1000}k`} />
                                    <Tooltip
                                        cursor={{ fill: 'hsl(var(--primary) / 0.1)' }}
                                        contentStyle={{ backgroundColor: 'hsl(var(--background) / 0.9)', borderColor: 'hsl(var(--border))' }}
                                        formatter={(value: number) => [formatCurrency(value), "Total"]}
                                    />
                                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
            );
        case 'performance_by_collaborator':
            return (
                 <div className="space-y-8 mt-8 animate-in fade-in-50 duration-500">
                    <h2 className="text-2xl font-bold">Resultados: Desempenho por Analista</h2>
                    <Card>
                        <CardHeader>
                            <CardTitle className='flex items-center gap-2'><Users className='w-5 h-5'/> Ranking de Submissões</CardTitle>
                        </CardHeader>
                        <CardContent>
                           <Table>
                               <TableHeader>
                                   <TableRow>
                                       <TableHead>Analista</TableHead>
                                       <TableHead className="text-right">Qtd. Notas</TableHead>
                                       <TableHead className="text-right">Valor Total</TableHead>
                                   </TableRow>
                               </TableHeader>
                               <TableBody>
                                   {reportData.performanceData?.map(user => (
                                       <TableRow key={user.id}>
                                           <TableCell>
                                               <div className="flex items-center gap-3">
                                                    <Avatar className="h-9 w-9">
                                                        <AvatarImage src={user.image ?? undefined} />
                                                        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-medium text-white">{user.name}</p>
                                                        <p className="text-xs text-slate-400">{user.email}</p>
                                                    </div>
                                                </div>
                                           </TableCell>
                                           <TableCell className="text-right font-mono">{user.noteCount}</TableCell>
                                           <TableCell className="text-right font-medium">{formatCurrency(user.totalValue)}</TableCell>
                                       </TableRow>
                                   ))}
                               </TableBody>
                           </Table>
                           {reportData.performanceData?.length === 0 && (
                               <div className='text-center py-8 text-slate-500'>
                                   Nenhuma nota submetida no período selecionado.
                               </div>
                           )}
                        </CardContent>
                    </Card>
                </div>
            )
        case 'status_distribution':
            const statusChartData = reportData.statusDistribution?.map(item => ({...item, name: STATUS_CONFIG[item.status]?.label, fill: STATUS_CONFIG[item.status]?.color })) ?? [];
            const attestationTimeDays = reportData.averageAttestationTime ? (reportData.averageAttestationTime / 24).toFixed(1) : null;
            return (
                 <div className="space-y-8 mt-8 animate-in fade-in-50 duration-500">
                    <h2 className="text-2xl font-bold">Resultados: Distribuição por Status</h2>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader className='pb-2'>
                                <CardTitle className='text-lg flex items-center gap-2'><Activity className='w-5 h-5'/> Panorama Geral</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={250}>
                                    <PieChart>
                                        <Pie data={statusChartData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                             {statusChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                        </Pie>
                                        <Tooltip formatter={(value, name) => [`${value} notas`, name]} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className='pb-2'>
                                <CardTitle className='text-lg flex items-center gap-2'><Clock className='w-5 h-5'/> Eficiência</CardTitle>
                            </CardHeader>
                             <CardContent className='space-y-4'>
                                <div className='p-4 bg-slate-800/50 rounded-lg'>
                                    <p className="text-sm text-muted-foreground">Tempo Médio de Atesto</p>
                                    <div className="text-3xl font-bold">
                                        {attestationTimeDays ? `${attestationTimeDays} dias` : 'N/A'}
                                    </div>
                                    <p className="text-xs text-muted-foreground">Desde a criação até o atesto.</p>
                                </div>
                                <div className='p-4 bg-slate-800/50 rounded-lg'>
                                    <p className="text-sm text-muted-foreground">Total de Notas no Período</p>
                                     <div className="text-3xl font-bold">
                                        {reportData.statusDistribution?.reduce((acc, s) => acc + s.count, 0)}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                     </div>
                </div>
            )
        case 'spending_by_project':
            return (
                 <div className="space-y-8 mt-8 animate-in fade-in-50 duration-500">
                    <h2 className="text-2xl font-bold">Resultados: Gastos por Conta de Projeto</h2>
                    <Card>
                         <CardHeader>
                            <CardTitle className='flex items-center gap-2'><DollarIcon className='w-5 h-5'/> Ranking de Gastos</CardTitle>
                        </CardHeader>
                         <CardContent>
                           <Table>
                               <TableHeader>
                                   <TableRow>
                                       <TableHead>Conta do Projeto</TableHead>
                                       <TableHead className="text-right">Qtd. Notas</TableHead>
                                       <TableHead className="text-right">Valor Total Gasto</TableHead>
                                   </TableRow>
                               </TableHeader>
                               <TableBody>
                                   {reportData.projectSpending?.map(item => (
                                       <TableRow key={item.project}>
                                           <TableCell className="font-medium">{item.project}</TableCell>
                                           <TableCell className="text-right font-mono">{item.noteCount}</TableCell>
                                           <TableCell className="text-right font-medium">{formatCurrency(item.totalValue)}</TableCell>
                                       </TableRow>
                                   ))}
                               </TableBody>
                           </Table>
                           {reportData.projectSpending?.length === 0 && (
                               <div className='text-center py-8 text-slate-500'>
                                   Nenhuma nota atestada encontrada para este período.
                               </div>
                           )}
                        </CardContent>
                    </Card>
                </div>
            )
        case 'type_analysis':
            const typeChartData = reportData.typeAnalysis?.map(item => ({...item, name: TYPE_CONFIG[item.type]?.label, fill: TYPE_CONFIG[item.type]?.color })) ?? [];
             return (
                 <div className="space-y-8 mt-8 animate-in fade-in-50 duration-500">
                    <h2 className="text-2xl font-bold">Resultados: Análise por Tipo de Nota</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Valor por Tipo</CardTitle>
                            </CardHeader>
                             <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={typeChartData} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.2)" />
                                        <XAxis type="number" hide />
                                        <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false}/>
                                        <Tooltip cursor={{ fill: 'hsl(var(--primary) / 0.1)' }} contentStyle={{ backgroundColor: 'hsl(var(--background) / 0.9)', borderColor: 'hsl(var(--border))' }} formatter={(value:number) => [formatCurrency(value), 'Total']} />
                                        <Bar dataKey="totalValue" radius={[0, 4, 4, 0]}>
                                            {typeChartData.map(entry => <Cell key={entry.type} fill={entry.fill} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader>
                                <CardTitle>Quantidade por Tipo</CardTitle>
                            </CardHeader>
                             <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={typeChartData} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.2)" />
                                        <XAxis type="number" hide />
                                        <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false}/>
                                        <Tooltip cursor={{ fill: 'hsl(var(--primary) / 0.1)' }} contentStyle={{ backgroundColor: 'hsl(var(--background) / 0.9)', borderColor: 'hsl(var(--border))' }} formatter={(value:number) => [value, 'Notas']} />
                                        <Bar dataKey="noteCount" radius={[0, 4, 4, 0]}>
                                            {typeChartData.map(entry => <Cell key={entry.type} fill={entry.fill} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>
                </div>
             )
        default:
             return <p className="mt-8 text-center text-slate-500">Selecione um tipo de relatório para começar.</p>;
    }
  };

  return (
    <div className='space-y-8'>
      <div className="flex items-center gap-4">
          <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl blur opacity-20"></div>
              <div className="relative bg-gradient-to-r from-cyan-500 to-blue-600 p-3 rounded-2xl">
                  <BarChart3 className="w-8 h-8 text-white" />
              </div>
          </div>
          <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                  Relatórios
              </h1>
              <p className="text-slate-400 mt-1">
                  Extraia insights e analise os dados das notas fiscais.
              </p>
          </div>
      </div>

      <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-border space-y-6">
        <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-slate-400"/>
            <h2 className="text-xl font-semibold">Filtros do Relatório</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Tipo de Relatório</label>
                <Select value={reportType} onValueChange={(v: ReportType) => setReportType(v)}>
                    <SelectTrigger className="w-full bg-slate-800/80 border-border">
                        <SelectValue placeholder="Selecione um tipo de relatório" />
                    </SelectTrigger>
                    <SelectContent>
                        {reportTypes.map(rt => (
                            <SelectItem key={rt.value} value={rt.value} disabled={rt.disabled}>
                                <div className='flex flex-col'>
                                    <span>{rt.label} {rt.disabled && '(em breve)'}</span>
                                    <span className='text-xs text-muted-foreground'>{rt.description}</span>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Período</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date"
                      variant={'outline'}
                      className={cn(
                        "w-full justify-start text-left font-normal bg-slate-800/80 border-border hover:bg-slate-800 hover:text-white",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date?.from ? (
                        date.to ? (
                          <>
                            {format(date.from, "d LLL, y", { locale: ptBR })} -{' '}
                            {format(date.to, "d LLL, y", { locale: ptBR })}
                          </>
                        ) : (
                          format(date.from, "d LLL, y", { locale: ptBR })
                        )
                      ) : (
                        <span>Selecione um período</span>
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
            </div>
            
            <div className='flex items-end'>
                 <Button onClick={handleGenerateReport} disabled={loading} className='w-full'>
                    {loading ? <Loader2 className='w-4 h-4 mr-2 animate-spin' /> : <BarChart3 className='w-4 h-4 mr-2' />}
                    {loading ? 'Gerando...' : 'Gerar Relatório'}
                </Button>
            </div>
        </div>
      </div>

      {renderReportContent()}
    </div>
  );
}
