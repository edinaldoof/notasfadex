
'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import type { FiscalNote } from '@/lib/types';
import { Role } from '@prisma/client';
import { DateRange } from 'react-day-picker';
import { startOfDay, endOfDay } from 'date-fns';

type GetNotesParams = {
  page?: number;
  limit?: number;
  query?: string;
  status?: string;
  dateRange?: DateRange;
};

export async function getNotes({
  page = 1,
  limit = 10,
  query,
  status,
  dateRange,
}: GetNotesParams): Promise<{ notes: FiscalNote[]; total: number }> {
  const session = await auth();

  if (!session?.user?.id) {
    console.error('getNotes: User not authenticated');
    return { notes: [], total: 0 };
  }

  const isManagerOrOwner = session.user.role === Role.OWNER || session.user.role === Role.MANAGER;
  
  const where: any = {};
  if (!isManagerOrOwner) {
    where.userId = session.user.id;
  }

  if (query) {
    where.OR = [
      { description: { contains: query, mode: 'insensitive' } },
      { requester: { contains: query, mode: 'insensitive' } },
      { projectAccountNumber: { contains: query, mode: 'insensitive' } },
      { numeroNota: { contains: query, mode: 'insensitive' } },
      { prestadorCnpj: { contains: query, mode: 'insensitive' } },
      { coordinatorName: { contains: query, mode: 'insensitive' } },
    ];
  }
  
  if (status && status !== 'all') {
    where.status = status.toUpperCase();
  }
  
  if (dateRange?.from) {
    where.issueDate = {
        ...where.issueDate,
        gte: startOfDay(dateRange.from)
    };
  }
  if (dateRange?.to) {
    where.issueDate = {
        ...where.issueDate,
        lte: endOfDay(dateRange.to)
    };
  }

  const skip = (page - 1) * limit;

  try {
    const [notes, total] = await prisma.$transaction([
      prisma.fiscalNote.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              name: true,
              email: true,
              image: true,
            }
          },
          history: {
            orderBy: {
              date: 'desc',
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.fiscalNote.count({ where }),
    ]);

    return { notes, total };
  } catch (error) {
    console.error('Failed to fetch notes from database:', error);
    return { notes: [], total: 0 };
  }
}


export async function getNotesCount() {
    const session = await auth();
    if (!session?.user?.id) return 0;

    const isManagerOrOwner = session.user.role === Role.OWNER || session.user.role === Role.MANAGER;
    const whereClause = isManagerOrOwner ? {} : { userId: session.user.id };

    try {
        return await prisma.fiscalNote.count({ where: whereClause });
    } catch (error) {
        console.error('Failed to get notes count:', error);
        return 0;
    }
}
