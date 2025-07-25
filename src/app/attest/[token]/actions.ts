
'use server';

import { z } from 'zod';
import prisma from '@/lib/prisma';
import { uploadFileToDrive } from '@/lib/google-drive';
import { Readable } from 'stream';
import { revalidatePath } from 'next/cache';
import { verifyAttestationToken } from '@/lib/token-utils';
import { sendAttestationConfirmationToCoordinator } from '@/lib/email-actions';

const attestNoteSchema = z.object({
  coordinatorName: z.string().min(3, 'O nome do coordenador é obrigatório.'),
  observation: z.string().optional(),
  token: z.string().min(1, 'Token de autenticação ausente.'),
});

export async function attestNotePublic(formData: FormData) {
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

    const validated = attestNoteSchema.safeParse(rawData);
    if (!validated.success) {
        console.error("Validation error:", validated.error.flatten().fieldErrors);
        return { success: false, message: 'Dados inválidos para o atesto.' };
    }

    const { token, coordinatorName, observation } = validated.data;
    
    let note; // Define note here to be accessible in the finally block if needed

    try {
        const decodedToken = verifyAttestationToken(token);
        if (!decodedToken) {
            return { success: false, message: 'Token inválido ou expirado.' };
        }
        const { noteId } = decodedToken;

        note = await prisma.fiscalNote.findUnique({ where: { id: noteId } });
        if (!note) {
            return { success: false, message: 'Nota fiscal não encontrada.' };
        }
        if (note.status !== 'PENDENTE') {
            return { success: false, message: 'Esta nota não está mais pendente de ateste.' };
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
        
        let historyDetails = `Nota atestada por ${coordinatorName} (via link público).`;
        if (observation) {
            historyDetails += ` Observação: "${observation}"`;
        }
        historyDetails += ` Documento de atesto '${attestedFile.name}' foi salvo.`;

        await prisma.fiscalNote.update({
            where: { id: noteId },
            data: {
                status: 'ATESTADA',
                attestedAt: attestationDate,
                attestedById: null, 
                attestedBy: coordinatorName,
                observation: observation,
                attestedDriveFileId: attestedDriveFileId,
                attestedFileUrl: attestedFileUrl,
                history: {
                    create: {
                        type: 'ATTESTED',
                        user: `Sistema (Ateste Público)`,
                        details: historyDetails,
                    }
                }
            },
        });
        
        // Revalidate paths that might display this note's status
        revalidatePath('/dashboard/notas');
        revalidatePath('/dashboard/colaboradores');
        revalidatePath('/dashboard/timeline');

        // Send confirmation email to the coordinator
        await sendAttestationConfirmationToCoordinator({
            noteId: note.id,
            coordinatorName: coordinatorName,
            coordinatorEmail: note.coordinatorEmail,
            noteDescription: note.description,
            attestedFileId: attestedDriveFileId,
            attestedFileName: attestedFile.name,
            attestationDate: attestationDate,
            attestationObservation: observation
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
