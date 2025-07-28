
'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';
import * as XLSX from 'xlsx';

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
        console.error('Falha ao buscar Analistas:', error);
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
        throw new Error('Não foi possível buscar as estatísticas dos Analistas.');
    }
}

/**
 * Fetches all notes for a specific user.
 * Now accessible by any authenticated user.
 */
export async function getNotesByUserId(userId: string) {
    const session = await auth();

    if (!session?.user?.id) {
        throw new Error('Acesso não autorizado. Você precisa estar logado.');
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
        throw new Error('Não foi possível buscar as notas do Analista.');
    }
}

/**
 * Export collaborators data to XLSX
 * Only accessible by OWNER or MANAGER.
 */
export async function exportCollaboratorsData() {
    const session = await auth();
    const userRole = session?.user?.role;

    if (userRole !== Role.OWNER && userRole !== Role.MANAGER) {
        throw new Error('Acesso não autorizado para exportar dados.');
    }

    try {
        const users = await prisma.user.findMany({
            include: {
                notes: true,
            }
        });

        const dataToExport = [];

        for (const user of users) {
            if (user.notes.length === 0) {
                dataToExport.push({
                    'Nome Analista': user.name,
                    'Email Analista': user.email,
                    'ID da Nota': 'N/A',
                    'Descrição': 'N/A',
                    'Status': 'N/A',
                    'Link Drive': 'N/A',
                    // Adicione outras colunas com 'N/A'
                });
            } else {
                for (const note of user.notes) {
                    dataToExport.push({
                        'Nome Analista': user.name,
                        'Email Analista': user.email,
                        'ID da Nota': note.id,
                        'Descrição': note.description,
                        'Status': note.status,
                        'Valor': note.amount,
                        'Tipo de Nota': note.invoiceType,
                        'Conta do Projeto': note.projectAccountNumber,
                        'Nº da Nota Fiscal': note.numeroNota,
                        'Data de Emissão': note.issueDate,
                        'CNPJ Prestador': note.prestadorCnpj,
                        'Razão Social Prestador': note.prestadorRazaoSocial,
                        'CNPJ Tomador': note.tomadorCnpj,
                        'Razão Social Tomador': note.tomadorRazaoSocial,
                        'Nome Coordenador': note.coordinatorName,
                        'Email Coordenador': note.coordinatorEmail,
                        'Atestado Por': note.attestedBy,
                        'Data Atesto': note.attestedAt,
                        'Link Drive': note.driveFileId ? `${process.env.NEXT_PUBLIC_APP_URL}/api/download/${note.driveFileId}` : 'N/A',
                    });
                }
            }
        }
        
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Analistas e Notas');

        const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
        
        return { success: true, fileData: buffer.toString('base64') };
        
    } catch (error) {
        console.error('Falha ao exportar dados:', error);
        const message = error instanceof Error ? error.message : "Erro desconhecido ao exportar dados.";
        return { success: false, message: message };
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
