

'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { Role, Settings, EmailTemplate, InvoiceStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { sendEmail } from '@/lib/email';
import { z } from 'zod';
import { generateAttestationToken } from '@/lib/token-utils';
import { getOrCreateEmailTemplate, getDefaultTemplate } from '@/lib/email-actions';

/**
 * Fetches all users from the database.
 * Only accessible by OWNER or MANAGER.
 */
export async function getUsers() {
  const session = await auth();
  const userRole = session?.user?.role;

  if (userRole !== 'OWNER' && userRole !== 'MANAGER') {
    throw new Error('Acesso não autorizado para visualizar usuários.');
  }

  try {
    const users = await prisma.user.findMany({
      orderBy: {
        name: 'asc',
      },
    });
    return users;
  } catch (error) {
    console.error("Failed to fetch users:", error);
    throw new Error("Não foi possível buscar os usuários.");
  }
}

/**
 * Updates a user's role.
 * Only accessible by OWNER.
 */
export async function updateUserRole(userId: string, role: 'USER' | 'MANAGER') {
  const session = await auth();
  const userRole = session?.user?.role;
  const currentUserId = session?.user?.id;

  if (userRole !== 'OWNER') {
    throw new Error('Apenas o Dono do sistema pode alterar cargos.');
  }
  
  if (userId === currentUserId) {
    throw new Error('Você não pode alterar seu próprio cargo.');
  }

  try {
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      throw new Error('Usuário não encontrado.');
    }
    if (targetUser.role === 'OWNER') {
        throw new Error('O cargo de Dono não pode ser alterado.');
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    revalidatePath('/dashboard/settings');
    return { success: true, user: updatedUser };

  } catch (error) {
    console.error("Failed to update user role:", error);
    const message = error instanceof Error ? error.message : "Não foi possível atualizar o cargo do usuário.";
    return { success: false, message };
  }
}


export async function getSettings(): Promise<Settings> {
    const settings = await prisma.settings.findFirst();
    if (settings) {
        return settings;
    }
    // Return default settings if none are in the DB
    return {
        id: 'default',
        attestationDeadlineInDays: 30,
        reminderFrequencyInDays: 3,
    };
}

export async function saveSettings(data: Partial<Settings>) {
    const { id, ...rest } = data;
    await prisma.settings.upsert({
        where: { id: 'default' },
        update: rest,
        create: { id: 'default', ...rest },
    });
}

export async function getEmailTemplates(): Promise<EmailTemplate[]> {
    const allTypes: EmailTemplate['type'][] = [
        'ATTESTATION_REQUEST', 
        'ATTESTATION_REMINDER', 
        'ATTESTATION_CONFIRMATION', 
        'NOTE_EXPIRED',
        'ATTESTATION_CONFIRMATION_COORDINATOR',
        'NOTE_REJECTED'
    ];
    
    // Use Promise.all to fetch/create all templates in parallel
    const templates = await Promise.all(
        allTypes.map(type => getOrCreateEmailTemplate(type))
    );
    
    return templates;
}

export async function saveEmailTemplates(templates: Partial<EmailTemplate>[]) {
    const transactions = templates.map(t => prisma.emailTemplate.update({
        where: { type: t.type },
        data: { subject: t.subject, body: t.body },
    }));
    await prisma.$transaction(transactions);
}


/**
 * Sends a test email using the provided template.
 */
export async function sendTestEmail(recipientEmail: string, subject: string, body: string) {
    const session = await auth();
    const userRole = session?.user?.role;

    if (userRole !== 'OWNER' && userRole !== 'MANAGER') {
       return { success: false, message: 'Acesso não autorizado.' };
    }
    
    try {
        let processedBody = body;
        let processedSubject = subject;

        const replacements: Record<string, string> = {
            'NomeCoordenador': 'José da Silva (Teste)',
            'NomeSolicitante': 'Maria Souza (Teste)',
            'DescricaoNota': 'Consultoria em TI (Exemplo)',
            'DiasRestantes': '15',
            'LinkAteste': '#',
            'NomeAtestador': 'Carlos Pereira (Teste)',
            'DataAtesto': new Date().toLocaleString('pt-BR'),
            'ObservacaoAtesto': 'Tudo certo, aprovado.',
            'DataRejeicao': new Date().toLocaleString('pt-BR'),
            'MotivoRejeicao': 'O valor da nota não corresponde ao serviço prestado.',
            'NumeroNota': 'NF-12345',
            'TituloProjeto': 'Desenvolvimento do Novo Portal (Exemplo)',
            'ContaProjeto': 'CP-98765'
        };

        for (const key in replacements) {
            const regex = new RegExp(`\\[${key}\\]`, 'g');
            processedBody = processedBody.replace(regex, replacements[key]);
            processedSubject = processedSubject.replace(regex, replacements[key]);
        }

        await sendEmail({
            to: recipientEmail,
            subject: `[TESTE] ${processedSubject}`,
            body: processedBody,
        });
        
        return { success: true, message: `E-mail de teste enviado com sucesso para ${recipientEmail}.` };

    } catch (error) {
        console.error("Failed to send test email:", error);
        const message = error instanceof Error ? error.message : "Ocorreu um erro desconhecido ao enviar o e-mail.";
        return { success: false, message };
    }
}

export async function getPreviewAttestationLink(): Promise<{ success: boolean; link?: string; message?: string }> {
    const session = await auth();
    const userRole = session?.user?.role;

    if (userRole !== 'OWNER' && userRole !== 'MANAGER') {
        return { success: false, message: 'Acesso não autorizado.' };
    }

    try {
        const latestPendingNote = await prisma.fiscalNote.findFirst({
            where: {
                status: InvoiceStatus.PENDENTE,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        if (!latestPendingNote) {
            return { success: false, message: 'Nenhuma nota pendente encontrada para gerar um link de visualização.' };
        }
        
        const link = generateAttestationToken(latestPendingNote.id);
        return { success: true, link };

    } catch (error) {
        console.error("Erro ao gerar link de visualização de ateste:", error);
        const message = error instanceof Error ? error.message : "Ocorreu um erro no servidor.";
        return { success: false, message };
    }
}
