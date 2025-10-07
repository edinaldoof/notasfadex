
'use server';

import prisma from '@/lib/prisma';
import type { Note } from '@/lib/types';
import { auth } from '@/auth';


export async function getNotesForTimeline(): Promise<Note[]> {
  const session = await auth();

  if (!session?.user?.id) {
    console.error('getNotesForTimeline: User not authenticated');
    return [];
  }

  try {
    const notes = await prisma.note.findMany({
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
        user: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
    return notes as Note[];
  } catch (error) {
    console.error('Failed to fetch timeline notes from database:', error);
    return [];
  }
}
