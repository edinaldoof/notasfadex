'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';

export interface UserWithNoteCount extends User {
    noteCount: number;
    recentNotesCount: number; // Notas dos últimos 30 dias
    lastNoteDate: Date | null;
}

export interface CollaboratorStats {
    totalUsers: number;
    activeUsers: number; // Users with notes
    totalNotes: number;
    averageNotesPerUser: number;
    roleDistribution: {
        OWNER: number;
        MANAGER: number;
        USER: number;
    };
}

export async function getCollaborators(): Promise<UserWithNoteCount[]> {
    const session = await auth();

    if (!session?.user?.id) {
        console.error('getCollaborators: Acesso não autorizado. Usuário não logado.');
        return [];
    }
    
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

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
                notes: {
                    select: {
                        createdAt: true,
                    },
                    orderBy: {
                        createdAt: 'desc'
                    },
                    take: 1
                }
            },
        });

        return usersWithNotes.map(user => {
            const recentNotes = user.notes.filter(note => 
                new Date(note.createdAt) > thirtyDaysAgo
            );
            
            return {
                ...user,
                noteCount: user._count.notes,
                recentNotesCount: recentNotes.length,
                lastNoteDate: user.notes.length > 0 ? user.notes[0].createdAt : null,
                notes: undefined, // Remove notes from response to keep it clean
            };
        });
    } catch (error) {
        console.error('Falha ao buscar colaboradores:', error);
        return [];
    }
}

export async function getCollaboratorStats(): Promise<CollaboratorStats> {
    const session = await auth();

    if (!session?.user?.id) {
        throw new Error('Acesso não autorizado');
    }

    try {
        const users = await prisma.user.findMany({
            include: {
                _count: {
                    select: {
                        notes: true,
                    },
                },
            },
        });

        const totalUsers = users.length;
        const activeUsers = users.filter(user => user._count.notes > 0).length;
        const totalNotes = users.reduce((sum, user) => sum + user._count.notes, 0);
        const averageNotesPerUser = totalUsers > 0 ? totalNotes / totalUsers : 0;

        const roleDistribution = users.reduce((acc, user) => {
            acc[user.role as keyof typeof acc] = (acc[user.role as keyof typeof acc] || 0) + 1;
            return acc;
        }, { OWNER: 0, MANAGER: 0, USER: 0 });

        return {
            totalUsers,
            activeUsers,
            totalNotes,
            averageNotesPerUser: Math.round(averageNotesPerUser * 10) / 10,
            roleDistribution,
        };
    } catch (error) {
        console.error('Falha ao buscar estatísticas:', error);
        throw new Error('Não foi possível buscar as estatísticas dos colaboradores.');
    }
}

/**
 * Fetches all notes for a specific user.
 * Only accessible by OWNER or MANAGER.
 */
export async function getNotesByUserId(userId: string) {
    const session = await auth();
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
                },
                user: {
                    select: {
                        name: true,
                        email: true,
                        image: true,
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

/**
 * Export collaborators data to CSV
 * Only accessible by OWNER or MANAGER.
 */
export async function exportCollaboratorsData() {
    const session = await auth();
    const userRole = session?.user?.role;

    if (userRole !== Role.OWNER && userRole !== Role.MANAGER) {
        throw new Error('Acesso não autorizado para exportar dados.');
    }

    try {
        const collaborators = await getCollaborators();
        
        // Convert to CSV format
        const csvHeaders = [
            'Nome',
            'Email',
            'Função',
            'Total de Notas',
            'Notas Recentes (30 dias)',
            'Última Nota',
            'Data de Criação'
        ].join(',');

        const csvData = collaborators.map(user => [
            `"${user.name || ''}"`,
            `"${user.email || ''}"`,
            `"${user.role}"`,
            user.noteCount,
            user.recentNotesCount,
            user.lastNoteDate ? new Date(user.lastNoteDate).toLocaleDateString('pt-BR') : 'Nunca',
            new Date(user.createdAt).toLocaleDateString('pt-BR')
        ].join(',')).join('\n');

        return `${csvHeaders}\n${csvData}`;
    } catch (error) {
        console.error('Falha ao exportar dados:', error);
        throw new Error('Não foi possível exportar os dados dos colaboradores.');
    }
}

/**
 * Get user activity summary
 * Only accessible by OWNER or MANAGER.
 */
export async function getUserActivitySummary(userId: string) {
    const session = await auth();
    const userRole = session?.user?.role;

    if (userRole !== Role.OWNER && userRole !== Role.MANAGER) {
        throw new Error('Acesso não autorizado.');
    }

    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const [
            totalNotes,
            notesLast30Days,
            notesLast90Days,
            firstNote,
            lastNote
        ] = await Promise.all([
            prisma.fiscalNote.count({
                where: { userId }
            }),
            prisma.fiscalNote.count({
                where: { 
                    userId,
                    createdAt: { gte: thirtyDaysAgo }
                }
            }),
            prisma.fiscalNote.count({
                where: { 
                    userId,
                    createdAt: { gte: ninetyDaysAgo }
                }
            }),
            prisma.fiscalNote.findFirst({
                where: { userId },
                orderBy: { createdAt: 'asc' },
                select: { createdAt: true }
            }),
            prisma.fiscalNote.findFirst({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                select: { createdAt: true }
            })
        ]);

        // Calculate monthly average (if user has been active for more than 30 days)
        const daysSinceFirstNote = firstNote 
            ? Math.max(1, Math.floor((Date.now() - new Date(firstNote.createdAt).getTime()) / (1000 * 60 * 60 * 24)))
            : 0;
        
        const monthlyAverage = daysSinceFirstNote > 30 
            ? Math.round((totalNotes / daysSinceFirstNote) * 30 * 10) / 10
            : 0;

        return {
            totalNotes,
            notesLast30Days,
            notesLast90Days,
            monthlyAverage,
            firstNoteDate: firstNote?.createdAt,
            lastNoteDate: lastNote?.createdAt,
            daysSinceFirstNote,
            isActive: notesLast30Days > 0
        };
    } catch (error) {
        console.error('Falha ao buscar resumo de atividade:', error);
        throw new Error('Não foi possível buscar o resumo de atividade do usuário.');
    }
}