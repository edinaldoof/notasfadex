
'use server';

import { subDays } from 'date-fns';
import { Role, SqlServerSettings } from '@prisma/client';
import { DateRange } from 'react-day-picker';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { getProjectAccountsFromSqlServer, getProjectDetailsByAccount } from '@/lib/sql-server';
import { z } from 'zod';
import type { ProjectDetails } from '@/lib/types';

export async function getDashboardSummary(dateRange?: DateRange) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        totalNotes: 0,
        attestedNotes: 0,
        pendingNotes: 0,
        totalAmount: 0,
        resolutionRate: 0,
      };
    }

    const isManagerOrOwner =
      session.user.role === Role.OWNER || session.user.role === Role.MANAGER;

    const userWhereClause = isManagerOrOwner
      ? { isDeleted: false }
      : { userId: session.user.id, isDeleted: false };

    const dateFilter = dateRange?.from && {
      createdAt: {
        gte: dateRange.from,
        lte: dateRange.to || new Date(),
      },
    };

    const dateRangedWhereClause = { ...userWhereClause, ...dateFilter };

    const thirtyDaysAgo = subDays(new Date(), 30);
    const thirtyDayWhereClause = {
      ...userWhereClause,
      createdAt: { gte: thirtyDaysAgo },
    };

    const [
      totalNotes,
      attestedNotes,
      pendingNotes,
      totalAmountResult,
      resolvedRecent,
      rejectedRecent,
    ] = await prisma.$transaction([
      prisma.note.count({ where: dateRangedWhereClause }),
      prisma.note.count({
        where: { ...dateRangedWhereClause, status: 'ATESTADA' },
      }),
      prisma.note.count({
        where: { ...dateRangedWhereClause, status: 'PENDENTE' },
      }),
      prisma.note.aggregate({
        _sum: { totalValue: true },
        where: dateRangedWhereClause,
      }),
      prisma.note.count({
        where: {
          ...thirtyDayWhereClause,
          status: 'ATESTADA',
        },
      }),
      prisma.note.count({
        where: {
          ...thirtyDayWhereClause,
          status: 'REJEITADA',
        },
      }),
    ]);

    const totalAmount = totalAmountResult._sum.totalValue || 0;
    const totalTerminalRecent = resolvedRecent + rejectedRecent;
    const resolutionRate =
      totalTerminalRecent > 0
        ? Math.round((resolvedRecent / totalTerminalRecent) * 100)
        : 0;

    return {
      totalNotes,
      attestedNotes,
      pendingNotes,
      totalAmount,
      resolutionRate,
    };
  } catch (error) {
    console.error('Failed to fetch dashboard summary:', error);
    return {
      totalNotes: 0,
      attestedNotes: 0,
      pendingNotes: 0,
      totalAmount: 0,
      resolutionRate: 0,
    };
  }
}

export async function getRecentActivities(dateRange?: DateRange) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return [];
    }

    const isManagerOrOwner =
      session.user.role === Role.OWNER || session.user.role === Role.MANAGER;
    const userWhereClause = isManagerOrOwner
      ? {}
      : { note: { userId: session.user.id } };

    const dateFilter = dateRange?.from && {
      date: {
        gte: dateRange.from,
        lte: dateRange.to || new Date(),
      },
    };

    const whereClause = { ...userWhereClause, ...dateFilter };

    const historyEvents = await prisma.noteHistory.findMany({
      where: whereClause,
      take: 5,
      orderBy: {
        date: 'desc',
      },
      include: {
        author: {
          select: {
            name: true,
            image: true,
          },
        },
        note: {
          select: {
            userId: true,
            projectAccountNumber: true,
            noteNumber: true,
          },
        },
      },
    });

    return historyEvents;
  } catch (error) {
    console.error('Failed to fetch recent activities:', error);
    return [];
  }
}

export async function getProjectAccounts() {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error('Usuário não autenticado.');
    }
    
    const sqlSettings = await prisma.sqlServerSettings.findFirst();
    if (sqlSettings) {
        try {
            return await getProjectAccountsFromSqlServer(sqlSettings as SqlServerSettings);
        } catch (error) {
            console.error("Falha ao buscar contas do SQL Server, retornando contas locais.", error);
        }
    }
    
    const notes = await prisma.note.findMany({
        where: { isDeleted: false },
        distinct: ['projectAccountNumber'],
        select: {
            projectAccountNumber: true,
        },
        orderBy: {
            projectAccountNumber: 'asc',
        },
    });

    return notes.map(note => ({
        label: note.projectAccountNumber,
        value: note.projectAccountNumber,
    }));
}


export async function getProjectDetails(accountNumber: string): Promise<ProjectDetails | null> {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error('Usuário não autenticado.');
    }

    const sqlSettings = await prisma.sqlServerSettings.findFirst();
    if (!sqlSettings) {
        return null;
    }

    try {
        const details = await getProjectDetailsByAccount(sqlSettings, accountNumber);
        return details;
    } catch (error) {
        console.error(`Falha ao buscar detalhes para a conta ${accountNumber}:`, error);
        return null;
    }
}
