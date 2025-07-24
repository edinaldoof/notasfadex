
'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { InvoiceStatus } from '@/lib/types';
import { z } from 'zod';
import { startOfMonth, endOfMonth, eachMonthOfInterval, format } from 'date-fns';

const reportInputSchema = z.object({
  from: z.date(),
  to: z.date().optional(),
});

type ReportInput = z.infer<typeof reportInputSchema>;

export async function getReportData(input: ReportInput) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Usuário não autenticado.');
  }

  const { from, to } = reportInputSchema.parse(input);
  const startDate = from;
  const endDate = to || new Date(); // Default to now if 'to' is not provided

  try {
    const attestedNotes = await prisma.fiscalNote.findMany({
      where: {
        userId: session.user.id,
        status: InvoiceStatus.ATESTADA,
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
    const totalValueAtested = attestedNotes.reduce((sum, note) => sum + (note.amount || 0), 0);

    // Group by month
    const monthlyDataMap = new Map<string, number>();
    const monthsInterval = eachMonthOfInterval({ start: startDate, end: endDate });

    // Initialize all months in the interval with 0
    monthsInterval.forEach(month => {
        const monthKey = format(month, 'yyyy-MM');
        monthlyDataMap.set(monthKey, 0);
    });

    attestedNotes.forEach(note => {
      if (note.attestedAt) {
        const monthKey = format(note.attestedAt, 'yyyy-MM');
        const currentTotal = monthlyDataMap.get(monthKey) || 0;
        monthlyDataMap.set(monthKey, currentTotal + (note.amount || 0));
      }
    });
    
    const monthlyData = Array.from(monthlyDataMap.entries())
      .map(([month, total]) => ({
        month: format(new Date(month + '-02'), 'MMM/yy'), // Use a specific day to avoid timezone issues
        total,
      }))
      .sort((a, b) => new Date(a.month.split('/')[1], getMonthIndex(a.month.split('/')[0])).getTime() - new Date(b.month.split('/')[1], getMonthIndex(b.month.split('/')[0])).getTime());

    return {
      totalAtested,
      totalValueAtested,
      monthlyData,
    };
  } catch (error) {
    console.error('Failed to fetch report data:', error);
    throw new Error('Não foi possível gerar o relatório.');
  }
}

// Helper function to get month index from abbreviation
const getMonthIndex = (monthAbbr: string) => {
    return ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].indexOf(monthAbbr);
}
