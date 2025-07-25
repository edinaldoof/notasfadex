
'use server';

import { getDriveService } from './google-drive';
import { sendEmail } from './email';
import type { AttestationEmailPayload, CoordinatorConfirmationEmailPayload } from './types';
import prisma from './prisma';
import { generateAttestationToken } from './token-utils';


const createAttestationRequestBody = (template: string, coordinatorName: string, requesterName: string, secureLink: string, description: string): string => {
    return template
        .replace(/\[NomeCoordenador\]/g, coordinatorName)
        .replace(/\[NomeSolicitante\]/g, requesterName)
        .replace(/\[LinkAteste\]/g, secureLink)
        .replace(/\[DescricaoNota\]/g, description);
};

const createCoordinatorConfirmationBody = (template: string, coordinatorName: string, description: string, attestationDate: Date, observation?: string | null): string => {
    return template
        .replace(/\[NomeCoordenador\]/g, coordinatorName)
        .replace(/\[DescricaoNota\]/g, description)
        .replace(/\[DataAtesto\]/g, attestationDate.toLocaleString('pt-BR'))
        .replace(/\[ObservacaoAtesto\]/g, observation || 'Nenhuma');
}


export const sendAttestationRequestEmail = async (payload: AttestationEmailPayload) => {
    try {
        const drive = getDriveService();
        
        const driveResponse = await drive.files.get(
            { fileId: payload.driveFileId, alt: 'media' },
            { responseType: 'arraybuffer' }
        );
        
        if (!driveResponse.data) {
            throw new Error(`Não foi possível buscar o arquivo ${payload.driveFileId} do Google Drive.`);
        }

        const template = await prisma.emailTemplate.findUnique({
            where: { type: 'ATTESTATION_REQUEST' },
        });

        if (!template) {
            throw new Error('Template de e-mail para solicitação de atesto não encontrado.');
        }

        // The public attestation link is now generated here
        const publicAttestationLink = generateAttestationToken(payload.noteId);
        
        const emailBody = createAttestationRequestBody(template.body, payload.coordinatorName, payload.requesterName, publicAttestationLink, payload.noteDescription);
        const emailSubject = template.subject.replace(/\[DescricaoNota\]/g, payload.noteDescription);

        const ccList = new Set<string>();
        ccList.add(payload.requesterEmail);
        
        if (payload.ccEmails) {
            payload.ccEmails.split(',').forEach(email => {
                const trimmedEmail = email.trim();
                if (trimmedEmail) {
                    ccList.add(trimmedEmail);
                }
            });
        }
        
        const ccString = Array.from(ccList).join(',');

        await sendEmail({
            to: payload.coordinatorEmail,
            cc: ccString,
            subject: emailSubject,
            body: emailBody,
            attachment: {
                filename: payload.fileName,
                contentType: payload.fileType,
                // @ts-ignore
                content: Buffer.from(driveResponse.data).toString('base64'),
            },
        });
        
        console.log(`E-mail de atesto enviado com sucesso para ${payload.coordinatorEmail} (CC: ${ccString}) para a nota ${payload.noteId}`);

    } catch (error) {
        console.error(`Falha ao enviar e-mail de atesto para a nota ${payload.noteId}:`, error);
    }
};

export const sendAttestationConfirmationToCoordinator = async (payload: CoordinatorConfirmationEmailPayload) => {
     try {
        const drive = getDriveService();
        
        const driveResponse = await drive.files.get(
            { fileId: payload.attestedFileId, alt: 'media' },
            { responseType: 'arraybuffer' }
        );
        
        if (!driveResponse.data) {
            throw new Error(`Não foi possível buscar o arquivo de atesto ${payload.attestedFileId} do Google Drive.`);
        }

        const template = await prisma.emailTemplate.findUnique({
            where: { type: 'ATTESTATION_CONFIRMATION_COORDINATOR' },
        });

        if (!template) {
            throw new Error('Template de e-mail para confirmação do coordenador não encontrado.');
        }
        
        const emailBody = createCoordinatorConfirmationBody(template.body, payload.coordinatorName, payload.noteDescription, payload.attestationDate, payload.attestationObservation);
        const emailSubject = template.subject.replace(/\[DescricaoNota\]/g, payload.noteDescription);

        await sendEmail({
            to: payload.coordinatorEmail,
            subject: emailSubject,
            body: emailBody,
            attachment: {
                filename: payload.attestedFileName,
                contentType: 'application/pdf',
                // @ts-ignore
                content: Buffer.from(driveResponse.data).toString('base64'),
            },
        });
        
        console.log(`E-mail de confirmação de atesto enviado com sucesso para ${payload.coordinatorEmail} para a nota ${payload.noteId}`);

    } catch (error) {
        console.error(`Falha ao enviar e-mail de confirmação para o coordenador da nota ${payload.noteId}:`, error);
    }
}
