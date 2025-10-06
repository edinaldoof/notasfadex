
import prisma from '../../../lib/prisma';
import { NoteStatus, HistoryType } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const now = new Date();

        // 1. Find all notes that are pending and their deadline has passed
        const expiredNotes = await prisma.note.findMany({
            where: {
                status: NoteStatus.PENDENTE,
                attestationDeadline: {
                    lt: now, // Less than now -> deadline has passed
                },
            },
        });
        
        if (expiredNotes.length === 0) {
            return NextResponse.json({ success: true, message: 'Nenhuma nota expirada encontrada.' });
        }

        const expiredNoteIds = expiredNotes.map(note => note.id);

        // 2. Update their status to EXPIRED
        const updateResult = await prisma.note.updateMany({
            where: {
                id: {
                    in: expiredNoteIds,
                },
            },
            data: {
                status: NoteStatus.EXPIRADA,
            },
        });

        // 3. (Optional but recommended) Create a history event for each expiration
        const historyEvents = expiredNotes.map(note => ({
            noteId: note.id,
            type: HistoryType.EXPIRED,
            details: `A nota expirou em ${now.toLocaleDateString('pt-BR')} pois não foi atestada até o prazo final.`,
            userName: 'Sistema (Cron Job)',
            authorId: null,
        }));
        
        await prisma.noteHistory.createMany({
            data: historyEvents
        });
        
        console.log(`[CRON] ${updateResult.count} notas foram marcadas como expiradas.`);

        return NextResponse.json({ success: true, updatedCount: updateResult.count });

    } catch (error) {
        console.error('[CRON] Erro ao verificar notas expiradas:', error);
        return new NextResponse('Erro interno do servidor', { status: 500 });
    }
}
