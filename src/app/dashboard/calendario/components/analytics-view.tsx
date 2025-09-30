'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { NoteForCalendar } from '../actions.js';
import { InvoiceStatus } from '@/lib/types';
import { differenceInDays, isPast, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    value
  );

const STATUS_CONFIG: Record<
  InvoiceStatus,
  { label: string; color: string }
> = {
  ATESTADA: { label: 'Atestada', color: '#10b981' },
  PENDENTE: { label: 'Pendente', color: '#f59e0b' },
  EXPIRADA: { label: 'Expirada', color: '#ef4444' },
  REJEITADA: { label: 'Rejeitada', color: '#ef4444' },
};

const AnalyticsView = ({ notes }: { notes: NoteForCalendar[] }) => {
  const analyticsData = useMemo(() => {
    if (!notes.length)
      return {
        statusDistribution: [],
        totalValue: 0,
        averageValue: 0,
        deadlineDistribution: [],
        topProjects: [],
      };

    const statusCounts = notes.reduce(
      (acc, note) => {
        const status = note.status;
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      {} as Record<InvoiceStatus, number>
    );

    const statusDistribution = Object.entries(statusCounts).map(
      ([status, count]) => ({
        name: STATUS_CONFIG[status as InvoiceStatus]?.label || status,
        value: count,
        fill: STATUS_CONFIG[status as InvoiceStatus]?.color || '#8884d8',
      })
    );

    const totalValue = notes.reduce((sum, note) => sum + (note.amount || 0), 0);
    const averageValue = notes.length > 0 ? totalValue / notes.length : 0;

    const now = new Date();
    const deadlines = { overdue: 0, today: 0, week: 0, month: 0, later: 0 };
    notes
      .filter((n) => n.status === 'PENDENTE' && n.attestationDeadline)
      .forEach((note) => {
        const deadline = new Date(note.attestationDeadline!);
        if (isPast(deadline) && !isSameDay(deadline, now)) {
          deadlines.overdue++;
        } else if (isSameDay(deadline, now)) {
          deadlines.today++;
        } else if (differenceInDays(deadline, now) <= 7) {
          deadlines.week++;
        } else if (differenceInDays(deadline, now) <= 30) {
          deadlines.month++;
        } else {
          deadlines.later++;
        }
      });
    const deadlineDistribution = [
      { name: 'Vencidas', count: deadlines.overdue },
      { name: 'Hoje', count: deadlines.today },
      { name: '7 dias', count: deadlines.week },
      { name: '30 dias', count: deadlines.month },
      { name: 'Futuras', count: deadlines.later },
    ];

    const projectSpending = notes.reduce(
      (acc, note) => {
        const project = note.projectTitle || 'Não especificado';
        acc[project] = (acc[project] || 0) + (note.amount || 0);
        return acc;
      },
      {} as Record<string, number>
    );
    const topProjects = Object.entries(projectSpending)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));

    return {
      statusDistribution,
      totalValue,
      averageValue,
      deadlineDistribution,
      topProjects,
    };
  }, [notes]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Valor Total (Período)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-400">
              {formatCurrency(analyticsData.totalValue)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Valor Médio por Nota</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {formatCurrency(analyticsData.averageValue)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total de Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{notes.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analyticsData.statusDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {analyticsData.statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => `${value} notas`}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background-rgb) / 0.8)',
                    borderColor: 'hsl(var(--border))',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Vencimentos (Notas Pendentes)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.deadlineDistribution}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border) / 0.5)"
                />
                <XAxis
                  dataKey="name"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  formatter={(value) => `${value} notas`}
                  cursor={{ fill: 'hsl(var(--primary) / 0.1)' }}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background-rgb) / 0.8)',
                    borderColor: 'hsl(var(--border))',
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsView;
