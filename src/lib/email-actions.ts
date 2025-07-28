
'use server';

import { getDriveService } from './google-drive';
import { sendEmail } from './email';
import type { AttestationEmailPayload, CoordinatorConfirmationEmailPayload, EmailTemplateParts, RejectionEmailPayload } from './types';
import prisma from './prisma';
import { generateAttestationToken } from './token-utils';
import type { EmailTemplate } from '@prisma/client';

// =================================================================
// Funções Auxiliares de Template
// =================================================================

function getDefaultTemplate(type: EmailTemplate['type']): Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'> {
    switch (type) {
        case 'ATTESTATION_REQUEST':
            return {
                type: 'ATTESTATION_REQUEST',
                subject: 'Ação Necessária: Ateste de Nota Fiscal - Projeto: [ContaProjeto] - Nota Fiscal: [NumeroNota]',
                body: `<div style="font-family: Arial, sans-serif; line-height: 1.6;">
    <h2>Solicitação de Ateste de Nota Fiscal</h2>
    <p>Olá, [NomeCoordenador],</p>
    <p>A nota fiscal referente a "[DescricaoNota]", submetida por <strong>[NomeSolicitante]</strong>, requer sua atenção para ateste.</p>
    <p>Por favor, revise os detalhes e aprove através do sistema.</p>
    <a href="[LinkAteste]" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Acessar Nota</a>
</div>`,
            };
        case 'ATTESTATION_REMINDER':
            return {
                type: 'ATTESTATION_REMINDER',
                subject: 'Lembrete: Nota Fiscal Pendente de Ateste - [DescricaoNota]',
                body: `<div style="font-family: Arial, sans-serif; line-height: 1.6;">
    <h2>Lembrete de Pendência</h2>
    <p>Olá, [NomeCoordenador],</p>
    <p>Esta é um lembrete de que a nota fiscal "[DescricaoNota]" ainda está pendente de seu ateste. O prazo para aprovação é de <strong>[DiasRestantes] dias</strong>.</p>
    <a href="[LinkAteste]" style="background-color: #ffc107; color: black; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Revisar Pendência</a>
</div>`,
            };
        case 'ATTESTATION_CONFIRMATION':
            return {
                type: 'ATTESTATION_CONFIRMATION',
                subject: 'Nota Fiscal Atestada com Sucesso - Projeto: [ContaProjeto] - Nota Fiscal: [NumeroNota]',
                body: `<div style="font-family: Arial, sans-serif; line-height: 1.6;">
    <h2>Confirmação de Ateste</h2>
    <p>Olá, [NomeSolicitante],</p>
    <p>A nota fiscal "[DescricaoNota]" foi atestada com sucesso por <strong>[NomeAtestador]</strong> em [DataAtesto].</p>
    <p><strong>Observação:</strong> [ObservacaoAtesto]</p>
</div>`,
            };
        case 'NOTE_EXPIRED':
            return {
                type: 'NOTE_EXPIRED',
                subject: 'Alerta: Prazo de Ateste Expirado - [DescricaoNota]',
                body: `<div style="font-family: Arial, sans-serif; line-height: 1.6;">
    <h2 style="color: #dc3545;">Prazo de Ateste Expirado</h2>
    <p>A nota fiscal "[DescricaoNota]", enviada por [NomeSolicitante] e designada a [NomeCoordenador], expirou em <strong>[DataExpiracao]</strong> sem ateste.</p>
    <p>Uma ação manual pode ser necessária.</p>
</div>`,
            };
        case 'ATTESTATION_CONFIRMATION_COORDINATOR':
            return {
                type: 'ATTESTATION_CONFIRMATION_COORDINATOR',
                subject: 'Confirmação: Você atestou a nota fiscal para o projeto [ContaProjeto] - Nota: [NumeroNota]',
                body: `<div style="font-family: Arial, sans-serif; line-height: 1.6;">
    <h2>Confirmação de Ateste Realizado</h2>
    <p>Olá, [NomeCoordenador],</p>
    <p>Este e-mail confirma que você atestou a nota fiscal referente a "<strong>[DescricaoNota]</strong>" em <strong>[DataAtesto]</strong>.</p>
    <p>Uma cópia do documento de ateste está anexa a este e-mail para seus registros.</p>
    <p><strong>Observação deixada:</strong> [ObservacaoAtesto]</p>
    <p>Obrigado pela sua colaboração.</p>
</div>`,
            };
        case 'NOTE_REJECTED':
            return {
                type: 'NOTE_REJECTED',
                subject: 'Ação Necessária: Nota Fiscal Rejeitada - Projeto: [ContaProjeto] - Nota: [NumeroNota]',
                body: `<div style="font-family: Arial, sans-serif; line-height: 1.6;">
    <h2 style="color: #dc3545;">Nota Fiscal Rejeitada</h2>
    <p>Olá, [NomeSolicitante],</p>
    <p>A nota fiscal referente a "<strong>[DescricaoNota]</strong>" foi rejeitada por <strong>[NomeCoordenador]</strong> em <strong>[DataRejeicao]</strong>.</p>
    <p><strong>Motivo da Rejeição:</strong></p>
    <blockquote style="border-left: 4px solid #ccc; padding-left: 1rem; margin-left: 1rem; font-style: italic;">[MotivoRejeicao]</blockquote>
    <p>Por favor, revise a nota fiscal e as informações fornecidas para tomar as ações necessárias.</p>
</div>`,
            };
    }
}


/**
 * Fetches an email template from the database. If it doesn't exist,
 * it creates one using the default content and returns it.
 * @param type The type of the email template to get or create.
 * @returns The found or newly created email template.
 */
export async function getOrCreateEmailTemplate(type: EmailTemplate['type']): Promise<EmailTemplate> {
  const existingTemplate = await prisma.emailTemplate.findUnique({
    where: { type },
  });

  if (existingTemplate) {
    return existingTemplate;
  }

  console.log(`Template '${type}' not found. Creating with default content.`);
  const defaultTemplateData = getDefaultTemplate(type);
  const newTemplate = await prisma.emailTemplate.create({
    data: defaultTemplateData,
  });
  
  return newTemplate;
}


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

// =================================================================
// Funções de Envio de E-mail
// =================================================================


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

        const template = await getOrCreateEmailTemplate('ATTESTATION_REQUEST');
        
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
        throw error; // Re-throw to be caught by the calling action
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

        const template = await getOrCreateEmailTemplate('ATTESTATION_CONFIRMATION_COORDINATOR');
        
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
        const template = await getOrCreateEmailTemplate('NOTE_REJECTED');

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
