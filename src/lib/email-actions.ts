
'use server';

import { getDriveService } from './google-drive';
import { sendEmail } from './email';
import type { AttestationEmailPayload, CoordinatorConfirmationEmailPayload, EmailTemplateParts, RejectionEmailPayload } from './types';
import prisma from './prisma';
import { generateAttestationToken } from './token-utils';


const processTemplate = (template: { subject: string; body: string }, replacements: Record<string, string | null | undefined>): EmailTemplateParts => {
    let processedSubject = template.subject;
    let processedBody = template.body;

    for (const key in replacements) {
        const value = replacements[key] || 'N/A';
        const regex = new RegExp(`\\[${key}\\]`, 'g');
        processedSubject = processedSubject.replace(regex, value);
        processedBody = processedBody.replace(regex, value);
    }

    return { subject: processedSubject, body: processedBody };
};

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

        const publicAttestationLink = generateAttestationToken(payload.noteId);
        
        const replacements = {
            'NomeCoordenador': payload.coordinatorName,
            'NomeSolicitante': payload.requesterName,
            'LinkAteste': publicAttestationLink,
            'DescricaoNota': payload.noteDescription,
            'NumeroNota': payload.numeroNota,
            'ContaProjeto': payload.projectAccountNumber,
        };

        const { subject: emailSubject, body: emailBody } = processTemplate(template, replacements);

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
        
        const replacements = {
            'NomeCoordenador': payload.coordinatorName,
            'DescricaoNota': payload.noteDescription,
            'DataAtesto': payload.attestationDate.toLocaleString('pt-BR'),
            'ObservacaoAtesto': payload.attestationObservation || 'Nenhuma',
            'NumeroNota': payload.numeroNota,
            'ContaProjeto': payload.projectAccountNumber,
        };

        const { subject: emailSubject, body: emailBody } = processTemplate(template, replacements);

        await sendEmail({
            to: payload.coordinatorEmail,
            cc: payload.requesterEmail, // Add the original requester to CC
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

export const sendRejectionNotificationEmail = async (payload: RejectionEmailPayload) => {
    try {
        const template = await prisma.emailTemplate.findUnique({
            where: { type: 'NOTE_REJECTED' },
        });

        if (!template) {
            throw new Error('Template de e-mail para notificação de rejeição não encontrado.');
        }

        const replacements = {
            'NomeSolicitante': payload.requesterName,
            'NomeCoordenador': payload.coordinatorName,
            'DescricaoNota': payload.noteDescription,
            'MotivoRejeicao': payload.rejectionReason,
            'DataRejeicao': payload.rejectionDate.toLocaleString('pt-BR'),
            'NumeroNota': payload.numeroNota,
            'ContaProjeto': payload.projectAccountNumber,
        };
        
        const { subject: emailSubject, body: emailBody } = processTemplate(template, replacements);

        await sendEmail({
            to: payload.requesterEmail,
            subject: emailSubject,
            body: emailBody,
        });
        
        console.log(`E-mail de notificação de rejeição enviado com sucesso para ${payload.requesterEmail} para a nota ${payload.noteId}`);

    } catch (error) {
        console.error(`Falha ao enviar e-mail de notificação de rejeição para a nota ${payload.noteId}:`, error);
    }
}
