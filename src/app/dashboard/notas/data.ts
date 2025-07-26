
'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import type { FiscalNote } from '@/lib/types';
import { Role } from '@prisma/client';

export async function getNotes(): Promise<FiscalNote[]> {
  const session = await auth();

  if (!session?.user?.id) {
    console.error('getNotes: User not authenticated');
    return [];
  }

  // If the user is a manager or owner, show all notes.
  // Otherwise, only show the user's own notes.
  const isManagerOrOwner = session.user.role === Role.OWNER || session.user.role === Role.MANAGER;
  const whereClause = isManagerOrOwner ? {} : { userId: session.user.id };

  try {
    const notes = await prisma.fiscalNote.findMany({
      where: whereClause,
      include: {
        history: {
            orderBy: {
                date: 'desc'
            }
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return notes;
  } catch (error) {
    console.error('Failed to fetch notes from database:', error);
    return [];
  }
}
