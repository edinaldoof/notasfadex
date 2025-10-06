
'use server';

import prisma from '../../../lib/prisma';
import type { Note } from '../../../lib/types';
import { auth } from '../../../auth';


export async function getNotesForTimeline(): Promise<Note[]> {
  const session = await auth();

  if (!session?.creator?.id) {
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
        user: true, // CORREÇÃO: Usar 'user' em vez de 'creator'
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
