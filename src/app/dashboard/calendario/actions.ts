
'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { NoteStatus } from '@prisma/client';

export type NoteForCalendar = {
    id: string;
    description: string | null;
    attestationDeadline: Date | null;
    status: NoteStatus;
    requester: string;
    projectTitle: string | null;
    totalValue?: number | null;
    noteNumber?: string | null;
    providerName?: string | null;
    createdAt?: Date;
    attestedAt?: Date | null; // Adicionado para diferenciar as datas no calendário
};

export type CalendarStats = {
    total: number;
    overdue: number;
    dueToday: number;
    dueThisWeek: number;
    dueThisMonth: number;
    byStatus: Record<string, number>;
};

export type NotesGrouped = {
    overdue: NoteForCalendar[];
    today: NoteForCalendar[];
    thisWeek: NoteForCalendar[];
    thisMonth: NoteForCalendar[];
    later: NoteForCalendar[];
};

export async function getNotesForCalendar(): Promise<NoteForCalendar[]> {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error('Usuário não autenticado.');
    }

    try {
        const notes = await prisma.note.findMany({
            where: {
                status: {
                    in: [NoteStatus.PENDENTE, NoteStatus.ATESTADA]
                },
                OR: [
                    { attestationDeadline: { not: null } },
                    { attestedAt: { not: null } }
                ]
            },
            select: {
                id: true,
                description: true,
                attestationDeadline: true,
                status: true,
                requester: true,
                projectTitle: true,
                totalValue: true,
                noteNumber: true,
                providerName: true,
                createdAt: true,
                attestedAt: true,
            },
            orderBy: {
                attestationDeadline: 'asc',
            }
        });
        // @ts-ignore
        return notes;

    } catch (error) {
        console.error('Falha ao buscar notas para o calendário:', error);
        throw new Error('Não foi possível buscar os dados do calendário.');
    }
}


export async function getCalendarStats(): Promise<CalendarStats> {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error('Usuário não autenticado.');
    }

    try {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const endOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const notes = await prisma.note.findMany({
            where: {
                status: NoteStatus.PENDENTE,
                attestationDeadline: {
                    not: null,
                }
            },
            select: {
                attestationDeadline: true,
                status: true,
            }
        });

        const stats: CalendarStats = {
            total: notes.length,
            overdue: 0,
            dueToday: 0,
            dueThisWeek: 0,
            dueThisMonth: 0,
            byStatus: {}
        };

        notes.forEach(note => {
            const deadline = note.attestationDeadline!;
            
            if (deadline < startOfDay) {
                stats.overdue++;
            } else if (deadline >= startOfDay && deadline < endOfDay) {
                stats.dueToday++;
            } else if (deadline < endOfWeek) {
                stats.dueThisWeek++;
            } else if (deadline <= endOfMonth) {
                stats.dueThisMonth++;
            }

            stats.byStatus[note.status] = (stats.byStatus[note.status] || 0) + 1;
        });

        return stats;

    } catch (error) {
        console.error('Falha ao buscar estatísticas:', error);
        throw new Error('Não foi possível buscar as estatísticas.');
    }
}

export async function getGroupedNotes(): Promise<NotesGrouped> {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error('Usuário não autenticado.');
    }

    try {
        const notes = await getNotesForCalendar();
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const endOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const grouped: NotesGrouped = {
            overdue: [],
            today: [],
            thisWeek: [],
            thisMonth: [],
            later: []
        };

        notes.forEach(note => {
            const deadline = note.attestationDeadline!;
            if (note.status !== 'PENDENTE') return; // Apenas agrupa pendentes
            
            if (deadline < startOfDay) {
                grouped.overdue.push(note);
            } else if (deadline >= startOfDay && deadline < endOfDay) {
                grouped.today.push(note);
            } else if (deadline < endOfWeek) {
                grouped.thisWeek.push(note);
            } else if (deadline <= endOfMonth) {
                grouped.thisMonth.push(note);
            } else {
                grouped.later.push(note);
            }
        });

        return grouped;

    } catch (error) {
        console.error('Falha ao buscar notas agrupadas:', error);
        throw new Error('Não foi possível buscar as notas agrupadas.');
    }
}

export async function markNoteAsAttested(noteId: string): Promise<void> {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error('Usuário não autenticado.');
    }

    try {
        await prisma.note.update({
            where: { id: noteId },
            data: { 
                status: NoteStatus.ATESTADA,
                attestedAt: new Date(),
                attestedById: session.user.id
            }
        });
    } catch (error) {
        console.error('Falha ao atestar nota:', error);
        throw new Error('Não foi possível atestar a nota.');
    }
}

export async function postponeDeadline(noteId: string, newDeadline: Date): Promise<void> {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error('Usuário não autenticado.');
    }

    try {
        await prisma.note.update({
            where: { id: noteId },
            data: { 
                attestationDeadline: newDeadline,
                updatedAt: new Date()
            }
        });
    } catch (error) {
        console.error('Falha ao adiar prazo:', error);
        throw new Error('Não foi possível adiar o prazo.');
    }
}
