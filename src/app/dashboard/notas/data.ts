
'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import type { FiscalNote } from '@/lib/types';
import { Role } from '@prisma/client';
import { DateRange } from 'react-day-picker';

type GetNotesParams = {
  page?: number;
  limit?: number;
  query?: string;
  status?: string;
  dateRange?: DateRange;
  showDeleted?: boolean;
};

export async function getNotes({
  page = 1,
  limit = 10,
  query,
  status,
  dateRange,
  showDeleted = false,
}: GetNotesParams): Promise<{ notes: FiscalNote[]; total: number }> {
  const session = await auth();

  if (!session?.user?.id) {
    console.error('getNotes: User not authenticated');
    return { notes: [], total: 0 };
  }

  const isManagerOrOwner = session.user.role === Role.OWNER || session.user.role === Role.MANAGER;
  
  const where: any = {
    deleted: showDeleted,
  };

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
    const dateField = showDeleted ? 'deletedAt' : 'issueDate';
    where[dateField] = {
        ...where[dateField],
        gte: dateRange.from
    };
  }
  if (dateRange?.to) {
    const dateField = showDeleted ? 'deletedAt' : 'issueDate';
    where[dateField] = {
        ...where[dateField],
        lte: dateRange.to
    };
  }

  const skip = (page - 1) * limit;
  const orderBy = showDeleted ? { deletedAt: 'desc' } : { createdAt: 'desc' };

  try {
    const [notes, total] = await prisma.$transaction([
      prisma.fiscalNote.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: true, 
          history: {
            orderBy: {
              date: 'desc',
            },
             include: {
                author: true
            }
          },
        },
        orderBy,
      }),
      prisma.fiscalNote.count({ where }),
    ]);

    return { notes: notes as FiscalNote[], total };
  } catch (error) {
    console.error('Failed to fetch notes from database:', error);
    return { notes: [], total: 0 };
  }
}
