
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

  // This page now only shows the user's own notes.
  // The collaborators page will show all notes for managers.
  const whereClause = { 
    userId: session.user.id 
  };

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
