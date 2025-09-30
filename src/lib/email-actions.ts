
'use server';

import { getDriveService } from './google-drive';
import { sendEmail } from './email';
import type { AttestationEmailPayload, CoordinatorConfirmationEmailPayload, EmailTemplateParts, RejectionEmailPayload, ReminderEmailPayload } from './types';
import prisma from './prisma';
import { generateAttestationToken } from './token-utils';
import type { EmailTemplate, TemplateType } from './types';

function getCcList(baseEmail: string, ccEmails?: string | null): string {
    const emailSet = new Set<string>();
    emailSet.add(baseEmail); // Adiciona o e-mail principal (solicitante ou coordenador)
    
    if (ccEmails) {
        ccEmails.split(',').forEach(email => {
            const trimmedEmail = email.trim();
            if (trimmedEmail) {
                emailSet.add(trimmedEmail);
            }
        });
    }
    
    return Array.from(emailSet).join(',');
}


// =================================================================
// Funções Auxiliares de Template
// =================================================================

function getDefaultTemplate(type: TemplateType): Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'> {
    const footerWithLinkFallback = `<div style="margin-top: 30px; padding: 25px; background: linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%); border-radius: 12px; border: 1px solid #dee2e6;">
            <div style="text-align: center; margin-bottom: 20px;">
                <div style="display: inline-block; background: #fff; padding: 8px 16px; border-radius: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <span style="font-size: 20px; vertical-align: middle;">🔗</span>
                    <span style="font-size: 14px; color: #495057; font-weight: 600; margin-left: 8px; vertical-align: middle;">Link Alternativo</span>
                </div>
            </div>
            <p style="font-size: 14px; color: #6c757d; text-align: center; margin: 0 0 15px 0; line-height: 1.5;">
                <strong>Problemas com o botão acima?</strong> Sem problemas! 
                <br>Siga estes passos simples:
            </p>
            <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="display: flex; align-items: center; margin-bottom: 12px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; margin-right: 10px; flex-shrink: 0;">1</div>
                    <p style="margin: 0; font-size: 13px; color: #495057;">
                        <strong>Copie o link abaixo</strong> (selecione todo o texto em azul)
                    </p>
                </div>
                <div style="background: #f0f9ff; border: 2px dashed #3b82f6; padding: 12px; border-radius: 6px; margin: 10px 0; position: relative;">
                    <div style="position: absolute; top: -10px; right: 10px; background: white; padding: 2px 8px; border-radius: 4px; border: 1px solid #3b82f6;">
                        <span style="font-size: 11px; color: #3b82f6; font-weight: 600;">📋 COPIAR</span>
                    </div>
                    <p style="font-size: 13px; color: #1e40af; word-break: break-all; margin: 0; font-family: 'Courier New', monospace; line-height: 1.4; user-select: all; cursor: text;">
                        [LinkAteste]
                    </p>
                </div>
                <div style="display: flex; align-items: center; margin-top: 12px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; margin-right: 10px; flex-shrink: 0;">2</div>
                    <p style="margin: 0; font-size: 13px; color: #495057;">
                        <strong>Abra uma nova aba</strong> no seu navegador
                    </p>
                </div>
                <div style="display: flex; align-items: center; margin-top: 12px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; margin-right: 10px; flex-shrink: 0;">3</div>
                    <p style="margin: 0; font-size: 13px; color: #495057;">
                        <strong>Cole o link</strong> na barra de endereços e pressione Enter
                    </p>
                </div>
            </div>
            <div style="text-align: center; margin-top: 15px; padding-top: 15px; border-top: 1px solid #dee2e6;">
                <p style="font-size: 12px; color: #868e96; margin: 0;">
                    💡 <strong>Dica:</strong> Use <span style="background: #e9ecef; padding: 2px 6px; border-radius: 3px; font-family: monospace; font-size: 11px;">Ctrl+C</span> para copiar e 
                    <span style="background: #e9ecef; padding: 2px 6px; border-radius: 3px; font-family: monospace; font-size: 11px;">Ctrl+V</span> para colar (ou <span style="background: #e9ecef; padding: 2px 6px; border-radius: 3px; font-family: monospace; font-size: 11px;">Cmd</span> no Mac)
                </p>
            </div>
        </div>
    `;

    switch (type) {
        case 'ATTESTATION_REQUEST':
            return {
                type: 'ATTESTATION_REQUEST',
                subject: '🔔 Atesto Requerido | Projeto: [TituloProjeto] | NF: [NumeroNota]',
                body: `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">📋 Solicitação de Atesto</h1>
        <p style="color: #e8f4fd; margin: 10px 0 0 0; font-size: 14px;">Ação necessária para aprovação de nota fiscal</p>
    </div>
    
    <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <p style="font-size: 16px; color: #2c3e50; margin-bottom: 20px;">
            Olá, <strong style="color: #667eea;">[NomeCoordenador]</strong> 👋
        </p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
            <h3 style="color: #2c3e50; margin: 0 0 15px 0; font-size: 18px;">📄 Detalhes da Nota Fiscal</h3>
            <table style="width: 100%; border-collapse: collapse;">
                 <tr>
                    <td style="padding: 8px 0; color: #666; font-weight: 500;">Título do Projeto:</td>
                    <td style="padding: 8px 0; color: #2c3e50; font-weight: 600;">[TituloProjeto]</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #666; font-weight: 500;">Solicitante:</td>
                    <td style="padding: 8px 0; color: #2c3e50; font-weight: 600;">[NomeSolicitante]</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #666; font-weight: 500;">Conta do Projeto:</td>
                    <td style="padding: 8px 0; color: #2c3e50; font-weight: 600;">[ContaProjeto]</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #666; font-weight: 500;">Número NF:</td>
                    <td style="padding: 8px 0; color: #2c3e50; font-weight: 600;">[NumeroNota]</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #666; font-weight: 500; vertical-align: top;">Descrição:</td>
                    <td style="padding: 8px 0; color: #2c3e50; font-weight: 600; line-height: 1.4;">[DescricaoNota]</td>
                </tr>
            </table>
        </div>
        
        <p style="color: #555; font-size: 15px; line-height: 1.6; margin: 20px 0;">
            Por favor, revise o documento e proceda com o Atesto através do sistema. Sua análise é fundamental para o andamento do processo.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="[LinkAteste]" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); transition: all 0.3s ease;">
                🔍 Revisar e Atestar Nota Fiscal
            </a>
        </div>
        
        ${footerWithLinkFallback}
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 13px; color: #666;">
            <p style="margin: 0;">📧 Este é um e-mail automático do sistema de gestão de notas fiscais.</p>
        </div>
    </div>
</div>`,
            };

        case 'ATTESTATION_REMINDER':
            return {
                type: 'ATTESTATION_REMINDER',
                subject: '⏰ Lembrete Urgente | Atesto Pendente | Projeto: [TituloProjeto] | NF: [NumeroNota]',
                body: `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
    <div style="background: linear-gradient(135deg, #ff9500 0%, #ff5722 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">⏰ Lembrete de Pendência</h1>
        <p style="color: #ffe8d6; margin: 10px 0 0 0; font-size: 14px;">Ação necessária com urgência</p>
    </div>
    
    <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <p style="font-size: 16px; color: #2c3e50; margin-bottom: 20px;">
            Olá, <strong style="color: #ff9500;">[NomeCoordenador]</strong> 👋
        </p>
        
        <div style="background: #fff3e0; padding: 20px; border-radius: 8px; border-left: 4px solid #ff9500; margin: 20px 0;">
            <h3 style="color: #e65100; margin: 0 0 15px 0; font-size: 18px; display: flex; align-items: center;">
                ⚠️ Nota Fiscal Pendente de Atesto
            </h3>
            <p style="color: #bf360c; font-size: 15px; margin: 0; line-height: 1.5;">
                A nota fiscal "<strong>[DescricaoNota]</strong>" para o projeto "<strong>[TituloProjeto]</strong>" ainda aguarda seu Atesto.
            </p>
        </div>
        
        <div style="background: #ffebee; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <p style="color: #c62828; font-size: 18px; font-weight: 600; margin: 0;">
                ⏳ Prazo restante: <span style="color: #d32f2f;">[DiasRestantes] dias</span>
            </p>
        </div>
        
        <p style="color: #555; font-size: 15px; line-height: 1.6; margin: 20px 0;">
            Para evitar atrasos no processo, solicitamos que realize o Atesto o mais breve possível.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="[LinkAteste]" style="background: linear-gradient(135deg, #ff9500 0%, #ff5722 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(255, 149, 0, 0.4); transition: all 0.3s ease;">
                🚀 Atestar Agora
            </a>
        </div>
        
        ${footerWithLinkFallback}

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 13px; color: #666;">
            <p style="margin: 0;">📧 Este é um lembrete automático do sistema de gestão de notas fiscais.</p>
        </div>
    </div>
</div>`,
            };
        
        case 'ATTESTATION_CONFIRMATION':
            return {
                type: 'ATTESTATION_CONFIRMATION',
                subject: '✅ Nota Fiscal Aprovada | Projeto: [TituloProjeto] | NF: [NumeroNota]',
                body: `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
    <div style="background: linear-gradient(135deg, #4caf50 0%, #2e7d32 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">✅ Atesto Confirmado</h1>
        <p style="color: #c8e6c9; margin: 10px 0 0 0; font-size: 14px;">Sua nota fiscal foi aprovada com sucesso</p>
    </div>
    
    <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <p style="font-size: 16px; color: #2c3e50; margin-bottom: 20px;">
            Olá, <strong style="color: #4caf50;">[NomeSolicitante]</strong> 👋
        </p>
        
        <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; border-left: 4px solid #4caf50; margin: 20px 0;">
            <h3 style="color: #2e7d32; margin: 0 0 15px 0; font-size: 18px;">🎉 Aprovação Concluída</h3>
            <p style="color: #388e3c; font-size: 15px; margin: 0 0 15px 0; line-height: 1.5;">
                A nota fiscal "<strong>[DescricaoNota]</strong>" para o projeto "<strong>[TituloProjeto]</strong>" foi atestada com sucesso!
            </p>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                <tr>
                    <td style="padding: 8px 0; color: #666; font-weight: 500;">Atestado por:</td>
                    <td style="padding: 8px 0; color: #2e7d32; font-weight: 600;">[NomeAtestador]</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #666; font-weight: 500;">Data do Atesto:</td>
                    <td style="padding: 8px 0; color: #2e7d32; font-weight: 600;">[DataAtesto]</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #666; font-weight: 500; vertical-align: top;">Observação:</td>
                    <td style="padding: 8px 0; color: #2e7d32; font-weight: 600; line-height: 1.4;">[ObservacaoAtesto]</td>
                </tr>
            </table>
        </div>
        
        <div style="background: #f3e5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #7b1fa2; font-size: 14px; margin: 0; text-align: center;">
                📋 O processo de aprovação foi concluído. A nota pode seguir para as próximas etapas.
            </p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 13px; color: #666;">
            <p style="margin: 0;">✉️ Confirmação automática do sistema de gestão de notas fiscais.</p>
        </div>
    </div>
</div>`,
            };

        case 'NOTE_EXPIRED':
            return {
                type: 'NOTE_EXPIRED',
                subject: '🚨 URGENTE | Prazo de Atesto Expirado | Projeto: [TituloProjeto] | NF: [NumeroNota]',
                body: `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
    <div style="background: linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">🚨 Prazo Expirado</h1>
        <p style="color: #ffcdd2; margin: 10px 0 0 0; font-size: 14px;">Intervenção manual necessária</p>
    </div>
    
    <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="background: #ffebee; padding: 20px; border-radius: 8px; border-left: 4px solid #d32f2f; margin: 20px 0;">
            <h3 style="color: #c62828; margin: 0 0 15px 0; font-size: 18px;">⚠️ Atesto Não Realizado</h3>
            <p style="color: #d32f2f; font-size: 15px; margin: 0 0 15px 0; line-height: 1.5;">
                 A nota fiscal "<strong>[DescricaoNota]</strong>" para o projeto "<strong>[TituloProjeto]</strong>" expirou sem Atesto.
            </p>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                <tr>
                    <td style="padding: 8px 0; color: #666; font-weight: 500;">Solicitante:</td>
                    <td style="padding: 8px 0; color: #c62828; font-weight: 600;">[NomeSolicitante]</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #666; font-weight: 500;">Responsável:</td>
                    <td style="padding: 8px 0; color: #c62828; font-weight: 600;">[NomeCoordenador]</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #666; font-weight: 500;">Data de expiração:</td>
                    <td style="padding: 8px 0; color: #c62828; font-weight: 600;">[DataExpiracao]</td>
                </tr>
            </table>
        </div>
        
        <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #e65100; font-size: 14px; margin: 0; text-align: center; font-weight: 500;">
                📧 Uma ação manual pode ser necessária para resolver esta pendência.
            </p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 13px; color: #666;">
            <p style="margin: 0;">🤖 Alerta automático do sistema de gestão de notas fiscais.</p>
        </div>
    </div>
</div>`,
            };

        case 'ATTESTATION_CONFIRMATION_COORDINATOR':
            return {
                type: 'ATTESTATION_CONFIRMATION_COORDINATOR',
                subject: '📋 Confirmação de Atesto Realizado | Projeto: [TituloProjeto] | NF: [NumeroNota]',
                body: `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
    <div style="background: linear-gradient(135deg, #1976d2 0%, #0d47a1 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">📋 Atesto Confirmado</h1>
        <p style="color: #bbdefb; margin: 10px 0 0 0; font-size: 14px;">Registro da sua aprovação</p>
    </div>
    
    <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <p style="font-size: 16px; color: #2c3e50; margin-bottom: 20px;">
            Olá, <strong style="color: #1976d2;">[NomeCoordenador]</strong> 👋
        </p>
        
        <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; border-left: 4px solid #1976d2; margin: 20px 0;">
            <h3 style="color: #0d47a1; margin: 0 0 15px 0; font-size: 18px;">✅ Confirmação de Atesto</h3>
            <p style="color: #1565c0; font-size: 15px; margin: 0 0 15px 0; line-height: 1.5;">
                Este e-mail confirma que você atestou com sucesso a nota fiscal referente a "<strong>[DescricaoNota]</strong>".
            </p>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                 <tr>
                    <td style="padding: 8px 0; color: #666; font-weight: 500;">Título do Projeto:</td>
                    <td style="padding: 8px 0; color: #0d47a1; font-weight: 600;">[TituloProjeto]</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #666; font-weight: 500;">Data do Atesto:</td>
                    <td style="padding: 8px 0; color: #0d47a1; font-weight: 600;">[DataAtesto]</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #666; font-weight: 500;">Conta do Projeto:</td>
                    <td style="padding: 8px 0; color: #0d47a1; font-weight: 600;">[ContaProjeto]</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #666; font-weight: 500;">Número NF:</td>
                    <td style="padding: 8px 0; color: #0d47a1; font-weight: 600;">[NumeroNota]</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #666; font-weight: 500; vertical-align: top;">Observação:</td>
                    <td style="padding: 8px 0; color: #0d47a1; font-weight: 600; line-height: 1.4;">[ObservacaoAtesto]</td>
                </tr>
            </table>
        </div>
        
        <div style="background: #f3e5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #7b1fa2; font-size: 14px; margin: 0; text-align: center;">
                📎 Uma cópia do documento de atesto está anexa para seus registros.
            </p>
        </div>
        
        <p style="color: #555; font-size: 15px; line-height: 1.6; margin: 20px 0; text-align: center;">
            Obrigado pela sua colaboração no processo de aprovação! 🙏
        </p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 13px; color: #666;">
            <p style="margin: 0;">📧 Confirmação automática do sistema de gestão de notas fiscais.</p>
        </div>
    </div>
</div>`,
            };

        case 'NOTE_REJECTED':
            return {
                type: 'NOTE_REJECTED',
                subject: '❌ Nota Fiscal Rejeitada | Projeto: [TituloProjeto] | NF: [NumeroNota]',
                body: `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
    <div style="background: linear-gradient(135deg, #e53935 0%, #c62828 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">❌ Nota Fiscal Rejeitada</h1>
        <p style="color: #ffcdd2; margin: 10px 0 0 0; font-size: 14px;">Ação necessária para revisão</p>
    </div>
    
    <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <p style="font-size: 16px; color: #2c3e50; margin-bottom: 20px;">
            Olá, <strong style="color: #e53935;">[NomeSolicitante]</strong> 👋
        </p>
        
        <div style="background: #ffebee; padding: 20px; border-radius: 8px; border-left: 4px solid #e53935; margin: 20px 0;">
            <h3 style="color: #c62828; margin: 0 0 15px 0; font-size: 18px;">🚫 Nota Fiscal Não Aprovada</h3>
            <p style="color: #d32f2f; font-size: 15px; margin: 0 0 15px 0; line-height: 1.5;">
                 Infelizmente, a nota fiscal referente a "<strong>[DescricaoNota]</strong>" para o projeto "<strong>[TituloProjeto]</strong>" foi rejeitada.
            </p>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                <tr>
                    <td style="padding: 8px 0; color: #666; font-weight: 500;">Rejeitada por:</td>
                    <td style="padding: 8px 0; color: #c62828; font-weight: 600;">[NomeCoordenador]</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #666; font-weight: 500;">Data da rejeição:</td>
                    <td style="padding: 8px 0; color: #c62828; font-weight: 600;">[DataRejeicao]</td>
                </tr>
            </table>
        </div>
        
        <div style="background: #fff3e0; padding: 20px; border-radius: 8px; border-left: 4px solid #ff9800; margin: 20px 0;">
            <h4 style="color: #f57c00; margin: 0 0 10px 0; font-size: 16px;">📝 Motivo da Rejeição:</h4>
            <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #ffcc02;">
                <p style="color: #e65100; font-size: 14px; margin: 0; line-height: 1.5; font-style: italic;">
                    "[MotivoRejeicao]"
                </p>
            </div>
        </div>
        
        <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #2e7d32; font-size: 14px; margin: 0; text-align: center; font-weight: 500;">
                💡 Por favor, revise as informações e corrija os pontos mencionados antes de reenviar.
            </p>
        </div>
        
        <p style="color: #555; font-size: 15px; line-height: 1.6; margin: 20px 0;">
            Para dar continuidade ao processo, você pode corrigir os problemas identificados e reenviar a nota fiscal ou entrar em contato para esclarecimentos adicionais.
        </p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 13px; color: #666;">
            <p style="margin: 0;">📧 Notificação automática do sistema de gestão de notas fiscais.</p>
        </div>
    </div>
</div>`,
            };
        default:
             // Fallback for any other type
            return {
                type: type,
                subject: 'Notificação do Sistema de Notas',
                body: `<p>Este é um e-mail sobre a nota [NumeroNota].</p>`
            }
    }
}


export async function getOrCreateEmailTemplate(type: TemplateType): Promise<EmailTemplate> {
  const existingTemplate = await prisma.emailTemplate.findUnique({
    where: { type },
  });

  if (existingTemplate) {
    return existingTemplate;
  }

  console.log(`Template '${type}' not found. Creating with default content.`);
  const defaultTemplateData = getDefaultTemplate(type);
  const newTemplate = await prisma.emailTemplate.create({
    data: {
        ...defaultTemplateData,
        type: type,
    }
  });
  
  return newTemplate as EmailTemplate;
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
        const template = await getOrCreateEmailTemplate('ATTESTATION_REQUEST');
        
        const publicAttestationLink = generateAttestationToken(payload.noteId);
        
        const replacements = {
            'NomeCoordenador': payload.coordinatorName,
            'NomeSolicitante': payload.requesterName,
            'LinkAteste': publicAttestationLink,
            'DescricaoNota': payload.noteDescription,
            'NumeroNota': payload.numeroNota,
            'TituloProjeto': payload.projectTitle,
            'ContaProjeto': payload.projectAccountNumber,
        };

        const { subject: emailSubject, body: emailBody } = processTemplate(template, replacements);
        const ccString = getCcList(payload.requesterEmail, payload.ccEmails);

        await sendEmail({
            to: payload.coordinatorEmail,
            cc: ccString,
            subject: emailSubject,
            body: emailBody,
        });
        
        console.log(`E-mail de atesto (sem anexo) enviado com sucesso para ${payload.coordinatorEmail} (CC: ${ccString}) para a nota ${payload.noteId}`);

    } catch (error) {
        console.error(`Falha ao enviar e-mail de atesto para a nota ${payload.noteId}:`, error);
        throw error;
    }
};

export const sendAttestationReminderEmail = async (payload: ReminderEmailPayload) => {
    try {
        const template = await getOrCreateEmailTemplate('ATTESTATION_REMINDER');
        
        const publicAttestationLink = generateAttestationToken(payload.noteId);
        
        const replacements = {
            'NomeCoordenador': payload.coordinatorName,
            'LinkAteste': publicAttestationLink,
            'DescricaoNota': payload.noteDescription,
            'NumeroNota': payload.numeroNota,
            'TituloProjeto': payload.projectTitle,
            'DiasRestantes': String(payload.daysRemaining),
        };

        const { subject: emailSubject, body: emailBody } = processTemplate(template, replacements);
        const ccString = getCcList(payload.requesterEmail, payload.ccEmails);

        await sendEmail({
            to: payload.coordinatorEmail,
            cc: ccString,
            subject: emailSubject,
            body: emailBody,
        });
        
        console.log(`E-mail de lembrete de atesto enviado com sucesso para ${payload.coordinatorEmail} para a nota ${payload.noteId}`);

    } catch (error) {
        console.error(`Falha ao enviar e-mail de lembrete para a nota ${payload.noteId}:`, error);
    }
};


export const sendAttestationConfirmationToCoordinator = async (payload: CoordinatorConfirmationEmailPayload) => {
     try {
        const template = await getOrCreateEmailTemplate('ATTESTATION_CONFIRMATION_COORDINATOR');
        
        const replacements = {
            'NomeCoordenador': payload.coordinatorName,
            'DescricaoNota': payload.noteDescription,
            'DataAtesto': payload.attestationDate.toLocaleString('pt-BR'),
            'ObservacaoAtesto': payload.attestationObservation || 'Nenhuma',
            'NumeroNota': payload.numeroNota,
            'TituloProjeto': payload.projectTitle,
            'ContaProjeto': payload.projectAccountNumber,
        };

        const { subject: emailSubject, body: emailBody } = processTemplate(template, replacements);

        const emailOptions: any = {
            to: payload.coordinatorEmail,
            cc: getCcList(payload.requesterEmail, payload.ccEmails),
            subject: emailSubject,
            body: emailBody,
        };

        // Anexar o arquivo se ele existir
        if (payload.attestedFileId) {
            const drive = getDriveService();
            const driveResponse = await drive.files.get(
                { fileId: payload.attestedFileId, alt: 'media' },
                { responseType: 'arraybuffer' }
            );
            
            if (!driveResponse.data) {
                console.warn(`Não foi possível buscar o anexo ${payload.attestedFileId} do Drive. O e-mail será enviado sem ele.`);
            } else {
                 emailOptions.attachment = {
                    filename: payload.attestedFileName,
                    contentType: 'application/pdf',
                    content: Buffer.from(driveResponse.data as ArrayBuffer).toString('base64'),
                };
            }
        }
        
        await sendEmail(emailOptions);
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
            'TituloProjeto': payload.projectTitle,
            'ContaProjeto': payload.projectAccountNumber,
        };
        
        const { subject: emailSubject, body: emailBody } = processTemplate(template, replacements);
        
        await sendEmail({
            to: payload.requesterEmail,
            cc: getCcList(payload.coordinatorName, payload.ccEmails),
            subject: emailSubject,
            body: emailBody,
        });
        
        console.log(`E-mail de notificação de rejeição enviado com sucesso para ${payload.requesterEmail} para a nota ${payload.noteId}`);

    } catch (error) {
        console.error(`Falha ao enviar e-mail de notificação de rejeição para a nota ${payload.noteId}:`, error);
    }
}
