
'use server';

import prisma from '@/lib/prisma';
import type { FiscalNote } from '@/lib/types';
import { auth } from '@/auth';


export async function getNotesForTimeline(): Promise<FiscalNote[]> {
  const session = await auth();

  if (!session?.user?.id) {
    console.error('getNotesForTimeline: User not authenticated');
    return [];
  }

  try {
    const notes = await prisma.fiscalNote.findMany({
      include: {
        history: {
          orderBy: {
            date: 'desc',
          },
          include: {
            author: {
              select: {
                name: true,
                image: true,
              }
            }
          }
        },
        user: true, // Inclui o usuário criador da nota
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
    // @ts-ignore
    return notes;
  } catch (error) {
    console.error('Failed to fetch timeline notes from database:', error);
    return [];
  }
}
