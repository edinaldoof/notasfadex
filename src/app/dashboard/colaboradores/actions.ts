
'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import type { FiscalNote } from '@/lib/types';
import { InvoiceStatus } from '@prisma/client';

/**
 * Fetches all notes that are either PENDING or ATTESTED for the collaborators view.
 * This is a global view for all users.
 */
export async function getCollaboratorNotes(): Promise<FiscalNote[]> {
  const session = await auth();

  // Although this is a global view, we still require the user to be authenticated.
  if (!session?.user?.id) {
    console.error('getCollaboratorNotes: User not authenticated');
    return [];
  }

  try {
    const notes = await prisma.fiscalNote.findMany({
      where: {
        // Fetch notes with status PENDENTE or ATESTADA from all users.
        status: {
          in: [InvoiceStatus.PENDENTE, InvoiceStatus.ATESTADA],
        },
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
    console.error('Failed to fetch collaborator notes from database:', error);
    return [];
  }
}
