
'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';

export interface UserWithNoteCount extends User {
    noteCount: number;
}

export async function getCollaborators(): Promise<UserWithNoteCount[]> {
    const session = await auth();

    if (!session?.user?.id) {
        console.error('getCollaborators: Acesso não autorizado. Usuário não logado.');
        return [];
    }
    
    try {
        const usersWithNotes = await prisma.user.findMany({
            orderBy: {
                name: 'asc'
            },
            include: {
                _count: {
                    select: {
                        notes: true,
                    },
                },
            },
        });

        return usersWithNotes.map(user => ({
            ...user,
            noteCount: user._count.notes,
        }));
    } catch (error) {
        console.error('Falha ao buscar colaboradores:', error);
        return [];
    }
}

/**
 * Fetches all notes for a specific user.
 * Only accessible by OWNER or MANAGER.
 */
export async function getNotesByUserId(userId: string) {
    const session = await auth();
    // This permission check remains, as viewing other's notes is still a priviledged action.
    const userRole = session?.user?.role;

    if (userRole !== Role.OWNER && userRole !== Role.MANAGER) {
        throw new Error('Acesso não autorizado para visualizar notas de outros usuários.');
    }
    
    try {
        const notes = await prisma.fiscalNote.findMany({
            where: {
                userId: userId,
            },
            orderBy: {
                createdAt: 'desc',
            },
            include: {
                history: {
                    orderBy: {
                        date: 'desc'
                    }
                }
            }
        });
        return notes;
    } catch (error) {
        console.error(`Falha ao buscar notas para o usuário ${userId}:`, error);
        throw new Error('Não foi possível buscar as notas do colaborador.');
    }
}
