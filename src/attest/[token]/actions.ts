
'use server';

import { z } from 'zod';
import prisma from '@/lib/prisma';
import { uploadFileToDrive } from '@/lib/google-drive';
import { Readable } from 'stream';
import { revalidatePath } from 'next/cache';
import { verifyAttestationToken } from '@/lib/token-utils';
import { sendAttestationConfirmationToCoordinator, sendRejectionNotificationEmail } from '@/lib/email-actions';
import type { Note } from '@/lib/types';


// Esta função agora está corretamente em uma Server Action.
export async function getNoteFromToken(token: string): Promise<{
  note?: Note;
  error?: string;
}> {
  try {
    if (!token || typeof token !== 'string') {
      return { error: 'Token não fornecido ou inválido.' };
    }

    const decoded = verifyAttestationToken(token);
    if (!decoded || !decoded.noteId) {
      return { error: 'Token inválido ou expirado.' };
    }

    const note = await prisma.note.findUnique({
      where: { id: decoded.noteId },
      select: {
        id: true,
        requester: true,
        projectAccountNumber: true,
        noteNumber: true,
        amount: true,
        issueDate: true,
        description: true,
        originalFileUrl: true,
        status: true,
        user: {
            select: { email: true, name: true }
        }
      },
    });

    if (!note) {
      return { error: 'Nota fiscal não encontrada.' };
    }

    if (note.status !== 'PENDENTE') {
      return { error: 'Esta nota fiscal não está mais pendente de ateste.' };
    }

    return { note: note as Note };
  } catch (err) {
    console.error('Error verifying token:', err);
    
    if (err instanceof Error) {
      if (err.name === 'TokenExpiredError') {
        return { error: 'Este link de ateste expirou.' };
      }
      if (err.name === 'JsonWebTokenError') {
        return { error: 'Este link de ateste é inválido.' };
      }
    }
    
    return { error: 'Ocorreu um erro ao verificar o link.' };
  }
}


const attestNotePublicSchema = z.object({
  coordinatorName: z.string().min(3, 'O nome do coordenador é obrigatório.'),
  coordinatorEmail: z.string().email('O e-mail do coordenador é inválido.'),
  observation: z.string().max(1000, 'A observação não pode exceder 1000 caracteres.').optional(),
  token: z.string().min(1, 'Token de autenticação ausente.'),
});

export async function attestNotePublic(formData: FormData) {
    try {
        const rawData = Object.fromEntries(formData.entries());
        
        const attestedFile = formData.get('attestedFile') as File | null;
        if (!attestedFile || attestedFile.size === 0) {
            return { success: false, message: 'O arquivo de atesto (PDF) é obrigatório.' };
        }
         if (attestedFile.type !== 'application/pdf') {
            return { success: false, message: 'Apenas arquivos PDF são permitidos.' };
        }
         if (attestedFile.size > 10000000) {
            return { success: false, message: 'O tamanho máximo do arquivo é 10MB.' };
        }

        const validated = attestNotePublicSchema.safeParse(rawData);
        if (!validated.success) {
            console.error("Validation error:", validated.error.flatten().fieldErrors);
            const firstError = Object.values(validated.error.flatten().fieldErrors)[0]?.[0];
            return { success: false, message: firstError || 'Dados inválidos para o atesto.' };
        }

        const { token, coordinatorName, observation, coordinatorEmail } = validated.data;
        
        const decodedToken = verifyAttestationToken(token);
        if (!decodedToken) {
            return { success: false, message: 'Token inválido ou expirado.' };
        }
        const { noteId } = decodedToken;

        const note = await prisma.note.findUnique({
            where: { id: noteId },
            include: { user: { select: { email: true, id: true, name: true } } }
        });

        if (!note) {
            return { success: false, message: 'Nota fiscal não encontrada.' };
        }
        if (note.status !== 'PENDENTE') {
            return { success: false, message: 'Esta nota não está mais pendente de ateste.' };
        }
         if (!note.creator || !note.creator.email || !note.creator.id || !note.creator.name) {
            return { success: false, message: 'Não foi possível encontrar o solicitante original para notificação.' };
        }

        const fileBuffer = Buffer.from(await attestedFile.arrayBuffer());
        const fileStream = Readable.from(fileBuffer);

        const driveFile = await uploadFileToDrive(
            `[ATESTADO] ${attestedFile.name}`,
            attestedFile.type,
            fileStream,
            note.projectAccountNumber
        );
        
        if (!driveFile || !driveFile.id) {
            throw new Error("Falha ao fazer upload do arquivo de atesto para o Google Drive.");
        }
        
        const attestedDriveFileId = driveFile.id;
        const attestedFileUrl = `/api/download/${driveFile.id}`;
        const attestationDate = new Date();
        
        let historyDetails = `Nota atestada por ${coordinatorName} (${coordinatorEmail}) via link público.`;
        if (observation) {
            historyDetails += ` Observação: "${observation}"`;
        }
        historyDetails += ` Documento de atesto '${attestedFile.name}' foi salvo.`;

        await prisma.note.update({
            where: { id: noteId },
            data: {
                status: 'ATESTADA',
                attestedAt: attestationDate,
                attestedById: note.creator.id,
                attestedBy: coordinatorName,
                observation: observation,
                attestedDriveFileId: attestedDriveFileId,
                attestedFileUrl: attestedFileUrl,
                history: {
                    create: {
                        type: 'ATTESTED',
                        details: historyDetails,
                        userId: note.creator.id,
                    }
                }
            },
        });
        
        revalidatePath('/dashboard/notas');
        revalidatePath('/dashboard/analistas');
        revalidatePath('/dashboard/timeline');

        await sendAttestationConfirmationToCoordinator({
            noteId: note.id,
            coordinatorName: coordinatorName,
            coordinatorEmail: coordinatorEmail,
            requesterEmail: note.creator.email,
            noteDescription: note.description,
            attestedFileId: attestedDriveFileId,
            attestedFileName: attestedFile.name,
            attestationDate: attestationDate,
            attestationObservation: observation,
            noteNumber: note.noteNumber,
            projectAccountNumber: note.projectAccountNumber
        });

        return { success: true, message: 'Nota atestada com sucesso!' };

    } catch (error) {
        console.error("Erro ao atestar nota publicamente:", error);
        const message = error instanceof Error ? error.message : "Ocorreu um erro no servidor.";
        if (error instanceof Error && (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError')) {
            return { success: false, message: 'Seu link de ateste é inválido ou expirou. Por favor, solicite um novo.' };
        }
        return { success: false, message };
    }
}

const rejectNoteSchema = z.object({
  rejectionReason: z.string().min(10, 'O motivo da rejeição deve ter pelo menos 10 caracteres.').max(1000, 'Motivo muito longo.'),
  coordinatorName: z.string().min(3, 'O nome do coordenador é obrigatório.'),
  noteId: z.string().cuid('ID da nota inválido.'),
  token: z.string().min(1, 'Token de autenticação ausente.'),
});

export async function rejectNotePublic(formData: FormData) {
    try {
        const rawData = Object.fromEntries(formData.entries());

        const validated = rejectNoteSchema.safeParse(rawData);
        if (!validated.success) {
            console.error("Validation error:", validated.error.flatten().fieldErrors);
            const firstError = Object.values(validated.error.flatten().fieldErrors)[0]?.[0];
            return { success: false, message: firstError || 'Dados inválidos para a rejeição.' };
        }

        const { token, noteId, coordinatorName, rejectionReason } = validated.data;

        const decodedToken = verifyAttestationToken(token);
        if (!decodedToken || decodedToken.noteId !== noteId) {
            return { success: false, message: 'Token inválido ou não corresponde à nota.' };
        }

        const note = await prisma.note.findUnique({
            where: { id: noteId },
            include: { user: { select: { email: true, id: true, name: true } } }
        });

        if (!note) {
            return { success: false, message: 'Nota fiscal não encontrada.' };
        }
        if (note.status !== 'PENDENTE') {
            return { success: false, message: 'Esta nota não pode mais ser rejeitada.' };
        }
        if (!note.creator || !note.creator.email || !note.creator.id || !note.creator.name) {
            return { success: false, message: 'Não foi possível encontrar o solicitante original para notificação.' };
        }

        const rejectionDate = new Date();
        const historyDetails = `Nota rejeitada por ${coordinatorName}. Motivo: "${rejectionReason}"`;

        await prisma.note.update({
            where: { id: noteId },
            data: {
                status: 'REJEITADA',
                observation: rejectionReason,
                history: {
                    create: {
                        type: 'REJECTED',
                        details: historyDetails,
                        userId: note.userId,
                    }
                }
            }
        });

        revalidatePath('/dashboard/notas');
        revalidatePath('/dashboard/analistas');
        revalidatePath('/dashboard/timeline');
        
        await sendRejectionNotificationEmail({
            noteId: note.id,
            coordinatorName: coordinatorName,
            requesterEmail: note.creator.email,
            noteDescription: note.description,
            rejectionReason: rejectionReason,
            rejectionDate: rejectionDate,
            requesterName: note.creator.name,
            noteNumber: note.noteNumber,
            projectAccountNumber: note.projectAccountNumber
        });

        return { success: true, message: 'Nota rejeitada com sucesso!' };

    } catch (error) {
        console.error("Erro ao rejeitar nota publicamente:", error);
        const message = error instanceof Error ? error.message : "Ocorreu um erro no servidor.";
        if (error instanceof Error && (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError')) {
            return { success: false, message: 'Seu link de ação é inválido ou expirou. Por favor, solicite um novo.' };
        }
        return { success: false, message };
    }
}
