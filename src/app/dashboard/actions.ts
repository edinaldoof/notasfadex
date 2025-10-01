
'use server';

import { subDays } from 'date-fns';
import { Role, SqlServerSettings } from '@prisma/client';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { getProjectAccountsFromSqlServer } from '@/lib/sql-server';
import { z } from 'zod';

export async function getDashboardSummary() {
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

    const isManagerOrOwner = session.user.role === Role.OWNER || session.user.role === Role.MANAGER;
    const whereClause = isManagerOrOwner ? { deleted: false } : { userId: session.user.id, deleted: false };

    const notes = await prisma.fiscalNote.findMany({
      where: whereClause,
      select: {
        status: true,
        amount: true,
      },
    });

    const totalNotes = notes.length;
    const attestedNotes = notes.filter((note) => note.status === 'ATESTADA').length;
    const pendingNotes = notes.filter((note) => note.status === 'PENDENTE').length;
    const totalAmount = notes.reduce((sum, note) => sum + (note.amount || 0), 0);

    const thirtyDaysAgo = subDays(new Date(), 30);
    const recentNotes = await prisma.fiscalNote.findMany({
        where: {
            ...whereClause,
            createdAt: {
                gte: thirtyDaysAgo,
            },
        },
        select: {
            status: true,
        },
    });

    const totalRecent = recentNotes.length;
    const resolvedRecent = recentNotes.filter(
        note => note.status === 'ATESTADA' || note.status === 'REJEITADA'
    ).length;

    const resolutionRate = totalRecent > 0 ? Math.round((resolvedRecent / totalRecent) * 100) : 0;
    
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

export async function getRecentActivities() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return [];
        }
        
        const isManagerOrOwner = session.user.role === Role.OWNER || session.user.role === Role.MANAGER;

        const historyEvents = await prisma.noteHistoryEvent.findMany({
            take: 3,
            orderBy: {
                date: 'desc'
            },
            include: {
                author: {
                    select: {
                        name: true,
                        image: true,
                    }
                },
                note: {
                    select: {
                        userId: true, 
                        projectAccountNumber: true,
                        numeroNota: true,
                    }
                }
            }
        });

        const filteredEvents = isManagerOrOwner
            ? historyEvents
            : historyEvents.filter(event => event.note.userId === session.user.id);
            
        return filteredEvents;
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
    
    // Fallback para contas existentes no Prisma se o SQL Server falhar ou não estiver configurado
    const notes = await prisma.fiscalNote.findMany({
        where: { deleted: false },
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
