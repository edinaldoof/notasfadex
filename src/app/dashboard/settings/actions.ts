
'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { Role, Settings, EmailTemplate } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { sendEmail } from '@/lib/email';
import { z } from 'zod';

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
    const templates = await prisma.emailTemplate.findMany();
    const allTypes: EmailTemplate['type'][] = ['ATTESTATION_REQUEST', 'ATTESTATION_REMINDER', 'ATTESTATION_CONFIRMATION', 'NOTE_EXPIRED'];
    
    // Ensure all template types exist, create with defaults if not
    for (const type of allTypes) {
        if (!templates.some(t => t.type === type)) {
            const newTemplate = await prisma.emailTemplate.create({
                data: getDefaultTemplate(type)
            });
            templates.push(newTemplate);
        }
    }
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
        const processedBody = body
            .replace(/\[NomeCoordenador\]/g, 'José da Silva (Teste)')
            .replace(/\[NomeSolicitante\]/g, 'Maria Souza (Teste)')
            .replace(/\[DescricaoNota\]/g, 'Consultoria em TI (Exemplo)')
            .replace(/\[DiasRestantes\]/g, '15')
            .replace(/\[LinkAteste\]/g, '#')
            .replace(/\[NomeAtestador\]/g, 'Carlos Pereira (Teste)')
            .replace(/\[DataAtesto\]/g, new Date().toLocaleString('pt-BR'))
            .replace(/\[ObservacaoAtesto\]/g, 'Tudo certo, aprovado.')
            .replace(/\[DataExpiracao\]/g, new Date().toLocaleDateString('pt-BR'));

        await sendEmail({
            to: recipientEmail,
            subject: `[TESTE] ${subject}`,
            body: processedBody,
        });
        
        return { success: true, message: `E-mail de teste enviado com sucesso para ${recipientEmail}.` };

    } catch (error) {
        console.error("Failed to send test email:", error);
        const message = error instanceof Error ? error.message : "Ocorreu um erro desconhecido ao enviar o e-mail.";
        return { success: false, message };
    }
}


// --- Helper for Default Templates ---

function getDefaultTemplate(type: EmailTemplate['type']): EmailTemplate {
    switch (type) {
        case 'ATTESTATION_REQUEST':
            return {
                type: 'ATTESTATION_REQUEST',
                subject: 'Ação Necessária: Ateste de Nota Fiscal - [DescricaoNota]',
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
                subject: 'Nota Fiscal Atestada com Sucesso - [DescricaoNota]',
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
    }
}
