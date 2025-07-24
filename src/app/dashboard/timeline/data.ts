'use server';

import prisma from '@/lib/prisma';
import type { FiscalNote } from '@/lib/types';
import { auth } from '@/auth';


export async function getNotesForTimeline(): Promise<FiscalNote[]> {
  const session = await auth();

  if (!session?.user?.id) {
    // Even if public, require login to see the timeline
    console.error('getNotesForTimeline: User not authenticated');
    return [];
  }

  try {
    const notes = await prisma.fiscalNote.findMany({
      // No 'where' clause for userId, fetches all notes
      include: {
        history: {
          orderBy: {
            date: 'desc',
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
    return notes;
  } catch (error) {
    console.error('Failed to fetch timeline notes from database:', error);
    return [];
  }
}
