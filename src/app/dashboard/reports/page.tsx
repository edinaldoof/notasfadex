'use client';

import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart3, Calendar as CalendarIcon, Download } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { StatCard } from '@/components/dashboard/stat-card';
import { CheckBadge } from '@/components/icons/check-badge';
import { CircleDollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getReportData } from './actions';
import { Skeleton } from '@/components/ui/skeleton';

interface ReportData {
  totalAtested: number;
  totalValueAtested: number;
  monthlyData: { month: string; total: number }[];
}

export default function ReportsPage() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerateReport = async () => {
    if (!date || !date.from) {
      // Maybe show a toast message
      return;
    }
    setLoading(true);
    try {
      const data = await getReportData({ from: date.from, to: date.to });
      setReportData(data);
    } catch (error) {
      console.error("Failed to generate report:", error);
      setReportData(null);
      // Handle error display
    } finally {
      setLoading(false);
    }
  };


  return (
    <div>
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
        <BarChart3 className="w-8 h-8" />
        Relatórios
      </h1>

      {/* Filters */}
      <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-4 border border-border mb-8">
        <div className="flex flex-col md:flex-row gap-4 items-center">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={'outline'}
                  className={cn(
                    "w-full md:w-[300px] justify-start text-left font-normal bg-slate-800/80 border-border hover:bg-slate-800 hover:text-white",
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

            <Button onClick={handleGenerateReport} disabled={loading}>
              {loading ? 'Gerando...' : 'Gerar Relatório'}
            </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <Skeleton className='h-10 w-64' />
            <Skeleton className='h-10 w-32' />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatCard title="Total de Notas Atestadas" value={0} icon={<CheckBadge className="w-6 h-6 text-green-400" />} loading />
            <StatCard title="Valor Total Atestado" value={0} icon={<CircleDollarSign className="w-6 h-6 text-primary" />} loading />
          </div>
          <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-border">
             <Skeleton className='h-[300px] w-full' />
          </div>
        </div>
      ) : reportData ? (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Resultados do Relatório</h2>
                <Button variant="outline" disabled>
                    <Download className="w-4 h-4 mr-2"/>
                    Exportar (PDF)
                </Button>
            </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatCard
                    title="Total de Notas Atestadas"
                    value={reportData.totalAtested}
                    icon={<CheckBadge className="w-6 h-6 text-green-400" />}
                />
                <StatCard
                    title="Valor Total Atestado"
                    value={`R$ ${reportData.totalValueAtested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    icon={<CircleDollarSign className="w-6 h-6 text-primary" />}
                />
             </div>

            <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-border">
                <h3 className="text-lg font-bold mb-4">Totais Mensais</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={reportData.monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" />
                        <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                        <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(value) => `R$${Number(value).toLocaleString('pt-br')}`} />
                        <Tooltip
                            cursor={{ fill: 'hsl(var(--accent) / 0.3)' }}
                            contentStyle={{ 
                                backgroundColor: 'hsl(var(--background))',
                                borderColor: 'hsl(var(--border))'
                            }}
                        />
                        <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-slate-900/50 backdrop-blur-sm rounded-xl border border-border">
          <BarChart3 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 mb-2">Nenhum relatório gerado</p>
          <p className="text-slate-500 text-sm">
            Selecione um período e clique em "Gerar Relatório" para começar.
          </p>
        </div>
      )}
    </div>
  );
}
