
'use server';

import prisma from '../../../lib/prisma';
import { auth } from '../../../auth';
import { NoteStatus, InvoiceType } from '../../../lib/types';
import { z } from 'zod';
import { startOfMonth, endOfMonth, eachMonthOfInterval, format, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Define os tipos de relatório que podemos gerar
export type ReportType = 
    | 'totals_by_period' 
    | 'performance_by_collaborator' 
    | 'status_distribution'
    | 'spending_by_project'
    | 'type_analysis';

const reportInputSchema = z.object({
  reportType: z.enum(['totals_by_period', 'performance_by_collaborator', 'status_distribution', 'spending_by_project', 'type_analysis']),
  from: z.date(),
  to: z.date().optional(),
});

type ReportInput = z.infer<typeof reportInputSchema>;

// Tipagem unificada para a saída, permitindo diferentes formatos de dados
export interface ReportData {
  reportType: ReportType;
  startDate: Date;
  endDate: Date;
  // Para totals_by_period
  totalAtested?: number;
  totalValueAtested?: number;
  monthlyData?: { month: string; total: number }[];
  // Para performance_by_collaborator
  performanceData?: {
      id: string;
      name: string | null;
      email: string | null;
      image: string | null;
      noteCount: number;
      totalValue: number;
  }[];
  // Para status_distribution
  statusDistribution?: { status: NoteStatus; count: number }[];
  averageAttestationTime?: number | null;
  // Para spending_by_project
  projectSpending?: { project: string; totalValue: number; noteCount: number }[];
  // Para type_analysis
  typeAnalysis?: { type: InvoiceType; totalValue: number; noteCount: number }[];
  [key: string]: any; 
}


export async function getReportData(input: ReportInput): Promise<ReportData> {
  const session = await auth();
  if (!session?.creator?.id) {
    throw new Error('Usuário não autenticado.');
  }

  const { reportType, from, to } = reportInputSchema.parse(input);
  const startDate = from;
  const endDate = to || new Date();

  try {
    switch(reportType) {
        case 'totals_by_period':
            return getTotalsByPeriod(startDate, endDate);
        case 'performance_by_collaborator':
            return getPerformanceByCollaborator(startDate, endDate);
        case 'status_distribution':
            return getStatusDistribution(startDate, endDate);
        case 'spending_by_project':
            return getSpendingByProject(startDate, endDate);
        case 'type_analysis':
            return getTypeAnalysis(startDate, endDate);
        default:
            throw new Error('Tipo de relatório não suportado.');
    }

  } catch (error) {
    console.error('Failed to fetch report data:', error);
    throw new Error('Não foi possível gerar o relatório.');
  }
}

async function getTotalsByPeriod(startDate: Date, endDate: Date): Promise<ReportData> {
    const attestedNotes = await prisma.fiscalNote.findMany({
      where: {
        status: NoteStatus.ATESTADA,
        attestedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        amount: true,
        attestedAt: true,
      },
    });

    const totalAtested = attestedNotes.length;
    const totalValueAtested = attestedNotes.reduce((sum, note) => sum + (note.totalValue || 0), 0);

    const monthlyDataMap = new Map<string, number>();
    const monthsInterval = eachMonthOfInterval({ start: startDate, end: endDate });

    monthsInterval.forEach(month => {
        const monthKey = format(month, 'yyyy-MM');
        monthlyDataMap.set(monthKey, 0);
    });

    attestedNotes.forEach(note => {
      if (note.attestedAt) {
        const monthKey = format(note.attestedAt, 'yyyy-MM');
        const currentTotal = monthlyDataMap.get(monthKey) || 0;
        monthlyDataMap.set(monthKey, currentTotal + (note.totalValue || 0));
      }
    });
    
    const monthlyData = Array.from(monthlyDataMap.entries())
      .map(([month, total]) => ({
        month: format(new Date(month + '-02T12:00:00Z'), 'MMM/yy', { locale: ptBR }),
        total,
      }))
      .sort((a, b) => {
        const [aMonth, aYear] = a.month.split('/');
        const [bMonth, bYear] = b.month.split('/');
        return (new Date(parseInt('20' + bYear), getMonthIndex(bMonth))).getTime() - (new Date(parseInt('20' + aYear), getMonthIndex(aMonth))).getTime()
      }).reverse();


    return {
      reportType: 'totals_by_period',
      startDate,
      endDate,
      totalAtested,
      totalValueAtested,
      monthlyData,
    };
}

async function getPerformanceByCollaborator(startDate: Date, endDate: Date): Promise<ReportData> {
    const users = await prisma.creator.findMany({
        include: {
            notes: {
                where: {
                    createdAt: {
                        gte: startDate,
                        lte: endDate,
                    },
                },
                select: {
                    amount: true,
                },
            },
        },
    });

    const performanceData = users.map(user => {
        const noteCount = user.notes.length;
        const totalValue = user.notes.reduce((sum, note) => sum + (note.totalValue || 0), 0);
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            noteCount,
            totalValue,
        };
    })
    .filter(user => user.noteCount > 0) // Only include users with notes in the period
    .sort((a, b) => b.totalValue - a.totalValue); // Sort by total value descending

    return {
        reportType: 'performance_by_collaborator',
        startDate,
        endDate,
        performanceData,
    };
}


async function getStatusDistribution(startDate: Date, endDate: Date): Promise<ReportData> {
    const notes = await prisma.fiscalNote.findMany({
        where: {
            createdAt: { gte: startDate, lte: endDate },
        },
        select: { status: true, createdAt: true, attestedAt: true }
    });

    const statusCounts = notes.reduce((acc, note) => {
        const status = note.status as NoteStatus;
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {} as Record<NoteStatus, number>);

    const statusDistribution = Object.entries(statusCounts).map(([status, count]) => ({
        status: status as NoteStatus,
        count
    }));
    
    // Calculate average attestation time in hours
    const attestedNotes = notes.filter(n => n.status === 'ATESTADA' && n.attestedAt);
    let totalAttestationHours = 0;
    if (attestedNotes.length > 0) {
        totalAttestationHours = attestedNotes.reduce((sum, note) => {
            return sum + differenceInHours(new Date(note.attestedAt!), new Date(note.createdAt));
        }, 0);
    }
    const averageAttestationTime = attestedNotes.length > 0 ? totalAttestationHours / attestedNotes.length : null;

    return {
        reportType: 'status_distribution',
        startDate,
        endDate,
        statusDistribution,
        averageAttestationTime,
    }
}

async function getSpendingByProject(startDate: Date, endDate: Date): Promise<ReportData> {
    const spending = await prisma.fiscalNote.groupBy({
        by: ['projectAccountNumber'],
        where: {
            status: 'ATESTADA',
            attestedAt: { gte: startDate, lte: endDate }
        },
        _sum: {
            amount: true,
        },
        _count: {
            id: true,
        },
        orderBy: {
            _sum: {
                amount: 'desc'
            }
        },
    });

    return {
        reportType: 'spending_by_project',
        startDate,
        endDate,
        projectSpending: spending.map(p => ({
            project: p.projectAccountNumber,
            totalValue: p._sum.amount || 0,
            noteCount: p._count.id,
        })),
    };
}

async function getTypeAnalysis(startDate: Date, endDate: Date): Promise<ReportData> {
    const analysis = await prisma.fiscalNote.groupBy({
        by: ['invoiceType'],
        where: {
            createdAt: { gte: startDate, lte: endDate }
        },
        _sum: {
            amount: true,
        },
        _count: {
            id: true,
        },
    });

    return {
        reportType: 'type_analysis',
        startDate,
        endDate,
        typeAnalysis: analysis.map(item => ({
            type: item.invoiceType,
            totalValue: item._sum.amount || 0,
            noteCount: item._count.id,
        })),
    }
}


const getMonthIndex = (monthAbbr: string) => {
    const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    return months.indexOf(monthAbbr.toLowerCase().replace('.', ''));
}
