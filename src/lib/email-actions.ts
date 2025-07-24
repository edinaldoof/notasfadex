
'use server';

import { getDriveService } from './google-drive';
import { sendEmail } from './email';
import type { AttestationEmailPayload } from './types';
import * as jwt from 'jsonwebtoken';
import prisma from './prisma';

const generateSecureLink = (noteId: string): string => {
    if (!process.env.AUTH_SECRET) {
        throw new Error('A variável de ambiente AUTH_SECRET não está definida.');
    }
    // Token com validade de 30 dias, por exemplo
    const token = jwt.sign({ noteId }, process.env.AUTH_SECRET, { expiresIn: '30d' });
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:7000';
    return `${baseUrl}/attest/${token}`;
};

const createEmailBody = (template: string, coordinatorName: string, requesterName: string, secureLink: string, description: string): string => {
    return template
        .replace(/\[NomeCoordenador\]/g, coordinatorName)
        .replace(/\[NomeSolicitante\]/g, requesterName)
        .replace(/\[LinkAteste\]/g, secureLink)
        .replace(/\[DescricaoNota\]/g, description);
};


export const sendAttestationRequestEmail = async (payload: AttestationEmailPayload) => {
    try {
        const drive = getDriveService();
        
        // 1. Fetch file from Google Drive
        const driveResponse = await drive.files.get(
            { fileId: payload.driveFileId, alt: 'media' },
            { responseType: 'arraybuffer' }
        );
        
        if (!driveResponse.data) {
            throw new Error(`Não foi possível buscar o arquivo ${payload.driveFileId} do Google Drive.`);
        }

        // 2. Fetch email template from DB
        const template = await prisma.emailTemplate.findUnique({
            where: { type: 'ATTESTATION_REQUEST' },
        });

        if (!template) {
            throw new Error('Template de e-mail para solicitação de atesto não encontrado.');
        }

        // 3. Generate secure link
        const secureLink = generateSecureLink(payload.noteId);
        
        // 4. Create email body
        const emailBody = createEmailBody(template.body, payload.coordinatorName, payload.requesterName, secureLink, payload.noteDescription);
        const emailSubject = template.subject.replace(/\[DescricaoNota\]/g, payload.noteDescription);

        // 5. Prepare CC list
        const ccList = new Set<string>();
        ccList.add(payload.requesterEmail); // Add requester automatically
        
        if (payload.ccEmails) {
            payload.ccEmails.split(',').forEach(email => {
                const trimmedEmail = email.trim();
                if (trimmedEmail) {
                    ccList.add(trimmedEmail);
                }
            });
        }
        
        const ccString = Array.from(ccList).join(',');

        // 6. Send email with attachment and CC
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
        // Não relançar o erro para não quebrar a transação principal de adição de nota,
        // mas registrar o erro para monitoramento.
    }
};
