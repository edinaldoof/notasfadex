'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import type { FiscalNote } from '@/lib/types';

export async function getNotesForUser(): Promise<FiscalNote[]> {
  const session = await auth();

  if (!session?.user?.id) {
    console.error('getNotesForUser: User not authenticated');
    return [];
  }

  try {
    const notes = await prisma.fiscalNote.findMany({
      where: {
        // This could be adjusted based on roles in the future.
        // For now, users can only see notes they created.
        userId: session.user.id, 
      },
      include: {
        history: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return notes;
  } catch (error) {
    console.error('Failed to fetch notes from database:', error);
    // In a real app, you might want to throw the error or handle it differently
    return [];
  }
}
