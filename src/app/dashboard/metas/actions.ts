
'use server';

import prisma from '../../../lib/prisma';
import { auth } from '../../../auth';
import { startOfMonth, endOfMonth, subMonths, differenceInDays } from 'date-fns';
import { NoteStatus } from '@prisma/client';

export interface GoalsData {
  currentMonthSpending: number;
  lastMonthSpending: number;
  avgAttestationTimeInDays: number;
  notesProcessedThisMonth: number;
  spendingTrend: number;
  expiredNotesThisMonth: number;
}

export async function getGoalsData(): Promise<GoalsData> {
  const session = await auth();
  if (!session?.creator?.id) {
    throw new Error('Usuário não autenticado.');
  }

  const now = new Date();
  const startOfCurrentMonth = startOfMonth(now);
  const endOfCurrentMonth = endOfMonth(now);
  
  const startOfLastMonth = startOfMonth(subMonths(now, 1));
  const endOfLastMonth = endOfMonth(subMonths(now, 1));

  try {
    // 1. Gastos do mês atual
    const currentMonthNotes = await prisma.fiscalNote.findMany({
      where: {
        status: NoteStatus.ATESTADA,
        attestedAt: {
          gte: startOfCurrentMonth,
          lte: endOfCurrentMonth,
        },
      },
      select: { amount: true },
    });
    const currentMonthSpending = currentMonthNotes.reduce((sum, note) => sum + (note.totalValue || 0), 0);

    // 2. Gastos do mês anterior
    const lastMonthNotes = await prisma.fiscalNote.findMany({
      where: {
        status: NoteStatus.ATESTADA,
        attestedAt: {
          gte: startOfLastMonth,
          lte: endOfLastMonth,
        },
      },
      select: { amount: true },
    });
    const lastMonthSpending = lastMonthNotes.reduce((sum, note) => sum + (note.totalValue || 0), 0);

    // 3. Tempo médio de ateste (baseado nas notas atestadas no mês atual)
    const attestedNotesForTiming = await prisma.fiscalNote.findMany({
        where: {
            status: NoteStatus.ATESTADA,
            attestedAt: {
                gte: startOfCurrentMonth,
                lte: endOfCurrentMonth,
            },
        },
        select: { createdAt: true, attestedAt: true },
    });

    let totalDays = 0;
    if (attestedNotesForTiming.length > 0) {
        totalDays = attestedNotesForTiming.reduce((sum, note) => {
            // ✅ Garantia para evitar erro em 'differenceInDays' se alguma data for nula
            if (note.attestedAt && note.createdAt) {
                return sum + differenceInDays(note.attestedAt, note.createdAt);
            }
            return sum;
        }, 0);
    }
    const avgAttestationTimeInDays = attestedNotesForTiming.length > 0 ? totalDays / attestedNotesForTiming.length : 0;
    
    // 4. Notas processadas (criadas) este mês
    const notesProcessedThisMonth = await prisma.fiscalNote.count({
        where: {
            createdAt: {
                gte: startOfCurrentMonth,
                lte: endOfCurrentMonth,
            },
        },
    });
    
    // 5. Tendência de gastos
    let spendingTrend = 0;
    if (lastMonthSpending > 0) {
        spendingTrend = ((currentMonthSpending - lastMonthSpending) / lastMonthSpending) * 100;
    } else if (currentMonthSpending > 0) {
        spendingTrend = 100;
    }

    // 6. Notas que expiraram este mês
    const expiredNotesThisMonth = await prisma.fiscalNote.count({
      where: {
        status: NoteStatus.EXPIRADA,
        updatedAt: { 
          gte: startOfCurrentMonth,
          lte: endOfCurrentMonth,
        }
      }
    });

    return {
      currentMonthSpending,
      lastMonthSpending,
      avgAttestationTimeInDays,
      notesProcessedThisMonth,
      spendingTrend,
      expiredNotesThisMonth,
    };

  } catch (error) {
    console.error('Failed to fetch goals data:', error);
    throw new Error('Não foi possível buscar os dados para as metas.');
  }
}
