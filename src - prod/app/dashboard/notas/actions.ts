
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { InvoiceStatus, InvoiceType, Role, PermissionType } from '@prisma/client';
import { uploadFileToDrive } from '@/lib/google-drive';
import { Readable } from 'stream';
import { addDays, differenceInDays } from 'date-fns';
import { sendAttestationRequestEmail, sendAttestationReminderEmail } from '@/lib/email-actions';
import { performExtraction, ExtractNoteDataInput, ExtractNoteDataOutput } from '@/ai/flows/extract-note-data-flow';
import { hasPermission } from '@/lib/auth-utils';
import { Prisma } from '@prisma/client';

// Regex robusto para validação de e-mail
const emailRegex = /^(?![_.-])(?!.*[_.-]{2})[a-zA-Z0-9_.-]+(?<![_.-])@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,63}$/;
const emailListRegex = /^$|^([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(, *([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}))*$/;

// Schema for parsing FormData on the server.
const addNoteSchema = z.object({
  invoiceType: z.nativeEnum(InvoiceType),
  hasWithholdingTax: z.preprocess((val) => val === 'on' || val === 'true' || val === true, z.boolean()),
  projectTitle: z.string().min(1, 'O título do projeto é obrigatório.'),
  coordinatorName: z.string().min(1, 'O nome do coordenador é obrigatório.'),
  coordinatorEmail: z.string().regex(emailRegex, { message: 'Formato de e-mail inválido.' }),
  projectAccountNumber: z.string().min(1, 'A conta do projeto é obrigatória.'),
  ccEmails: z.string().regex(emailListRegex, { message: 'Forneça uma lista de e-mails válidos, separados por vírgula.' }).optional(),
  descricaoServicos: z.string().min(1, 'A descrição é obrigatória.'),
  prestadorCnpj: z.string().optional(),
  tomadorRazaoSocial: z.string().optional(),
  tomadorCnpj: z.string().optional(),
  numeroNota: z.string().optional(),
  dataEmissao: z.string().optional(),
  valorTotal: z.string().optional(),
  prestadorRazaoSocial: z.string().optional(),
  forceCreate: z.preprocess((val) => val === 'true', z.boolean()).optional(),
});


export async function addNote(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.email || !session.user.name) {
      return { success: false, message: 'Usuário não autenticado ou informações do usuário ausentes. Acesso negado.' };
    }
    
    const { id: userId, name: userName } = session.user;

    const file = formData.get('file') as File;
    const reportFile = formData.get('reportFile') as File | null;

    if (!file || file.size === 0) {
        return { success: false, message: 'O arquivo da nota fiscal é obrigatório.' };
    }
     if (file.size > 10000000) {
        return { success: false, message: 'O tamanho máximo do arquivo da nota é 10MB.' };
    }
    if (!['application/pdf', 'text/xml', 'image/jpeg', 'image/png'].includes(file.type)) {
        return { success: false, message: 'Formato de arquivo inválido para nota. São aceitos apenas .pdf, .xml, .jpg e .png.' };
    }

    const rawFormData = Object.fromEntries(formData.entries());
    const validatedFields = addNoteSchema.safeParse(rawFormData);
    
    if (!validatedFields.success) {
      console.error(validatedFields.error.flatten().fieldErrors);
      return {
        success: false,
        message: 'Erro de validação. Verifique os campos.',
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const { 
      descricaoServicos, 
      valorTotal, 
      invoiceType,
      hasWithholdingTax,
      projectTitle,
      coordinatorEmail,
      coordinatorName,
      projectAccountNumber,
      ccEmails,
      forceCreate,
      ...rest 
    } = validatedFields.data;

    // Check for duplicates if not forced
    if (!forceCreate && rest.numeroNota && projectAccountNumber) {
        const existing = await prisma.fiscalNote.findFirst({
            where: {
                numeroNota: rest.numeroNota,
                projectAccountNumber: projectAccountNumber,
            },
        });
        if (existing) {
            return {
                success: false,
                message: 'Já existe uma nota fiscal com o mesmo número para esta conta de projeto.',
            };
        }
    }
    
    // Upload Nota Fiscal
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileStream = Readable.from(fileBuffer);
    const driveFile = await uploadFileToDrive(`[NOTA] ${file.name}`, file.type, fileStream, projectAccountNumber);
    if (!driveFile || !driveFile.id) {
      throw new Error("Falha ao fazer upload da nota fiscal para o Google Drive.");
    }

    let reportDriveFileId: string | null = null;
    let reportFileName: string | null = null;
    let reportFileUrl: string | null = null;

    // Upload Relatório Opcional
    if (reportFile && reportFile.size > 0) {
        const reportBuffer = Buffer.from(await reportFile.arrayBuffer());
        const reportStream = Readable.from(reportBuffer);
        const reportDriveFileName = `[RELATORIO] ${reportFile.name}`;
        const reportDriveFile = await uploadFileToDrive(reportDriveFileName, reportFile.type, reportStream, projectAccountNumber);
        if (!reportDriveFile || !reportDriveFile.id) {
            console.warn("Falha ao fazer upload do relatório, mas a nota será criada mesmo assim.");
        } else {
            reportDriveFileId = reportDriveFile.id;
            reportFileName = reportDriveFileName;
            reportFileUrl = `/api/download/${reportDriveFile.id}`;
        }
    }

    // CORREÇÃO: Lógica robusta para tratar o valor monetário
    let amountDecimal: Prisma.Decimal | null = null;
    if (valorTotal) {
      // Remove caracteres não numéricos, exceto a última vírgula ou ponto
      const cleanedValue = valorTotal.replace(/\.(?=[^.]*\.)/g, '').replace(',', '.');
      const numericValue = parseFloat(cleanedValue);
      if (!isNaN(numericValue)) {
        amountDecimal = new Prisma.Decimal(numericValue);
      }
    }

    const submissionDate = new Date();
    const settings = await prisma.settings.findFirst();
    const deadlineDays = settings?.attestationDeadlineInDays ?? 30;
    const attestationDeadline = addDays(submissionDate, deadlineDays); 

    const newNote = await prisma.fiscalNote.create({
      data: {
        description: descricaoServicos,
        requester: userName,
        issueDate: submissionDate,
        status: InvoiceStatus.PENDENTE,
        fileType: file.type,
        fileName: file.name,
        originalFileUrl: `/api/download/${driveFile.id}`,
        driveFileId: driveFile.id,
        reportDriveFileId,
        reportFileName,
        reportFileUrl,
        amount: amountDecimal,
        creatorId: userId,
        invoiceType: invoiceType,
        projectTitle: projectTitle,
        projectAccountNumber: projectAccountNumber,
        hasWithholdingTax: hasWithholdingTax,
        coordinatorEmail: coordinatorEmail,
        coordinatorName: coordinatorName,
        attestationDeadline: attestationDeadline,
        ...rest,
        history: {
          create: {
            type: 'CREATED',
            details: `Nota fiscal criada por ${userName} e atribuída a ${coordinatorName} para atesto. Arquivo '${file.name}' salvo.`,
            author: {
              connect: { id: userId },
            },
          }
        }
      }
    });

    await sendAttestationRequestEmail({
      noteId: newNote.id,
      coordinatorName: newNote.coordinatorName,
      coordinatorEmail: newNote.coordinatorEmail,
      requesterName: newNote.requester,
      requesterEmail: session.user.email,
      ccEmails: ccEmails,
      noteDescription: newNote.description,
      driveFileId: newNote.driveFileId,
      fileName: newNote.fileName,
      fileType: newNote.fileType,
      numeroNota: newNote.numeroNota,
      projectTitle: newNote.projectTitle,
      projectAccountNumber: newNote.projectAccountNumber,
    });

    revalidatePath('/dashboard/notas');
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/timeline');

    return { success: true, message: 'Nota adicionada com sucesso e e-mail enviado ao coordenador!' };
  } catch (error) {
    console.error("Erro ao adicionar nota:", error);
    let message = "Ocorreu um erro no servidor ao fazer upload do arquivo ou salvar a nota. Tente novamente.";
    if (error instanceof Error) {
        message = error.message;
    }
    return {
        success: false,
        message: message,
    };
  }
}

// Schema to attest a note, handling optional file upload
const attestNoteSchema = z.object({
  noteId: z.string().cuid('ID de nota inválido'),
  observation: z.string().max(1000, "Observação muito longa").optional(),
});

export async function attestNote(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.name) {
        return { success: false, message: 'Acesso negado.' };
    }
    
    const { id: userId, name: userName } = session.user;

    const rawData = Object.fromEntries(formData.entries());
    const validated = attestNoteSchema.safeParse(rawData);

    if (!validated.success) {
        return { success: false, message: 'Dados inválidos para o atesto.' };
    }

    const { noteId, observation } = validated.data;
    const attestedFile = formData.get('attestedFile') as File | null;
    const reportFile = formData.get('reportFile') as File | null;
    
    const note = await prisma.fiscalNote.findUnique({ where: { id: noteId } });
    if (!note) {
        return { success: false, message: 'Nota fiscal não encontrada.' };
    }
    
    let historyDetails = `Nota atestada por ${userName}.`;

    const dataToUpdate: any = {
      status: 'ATESTADA',
      attestedAt: new Date(),
      attestedById: userId,
      attestedBy: userName,
      observation: observation,
    };

    if (attestedFile && attestedFile.size > 0) {
        const fileBuffer = Buffer.from(await attestedFile.arrayBuffer());
        const fileStream = Readable.from(fileBuffer);

        const driveFile = await uploadFileToDrive(
            `[ATESTADO] ${attestedFile.name}`,
            attestedFile.type,
            fileStream,
            note.projectAccountNumber
        );
        
        if (!driveFile || !driveFile.id) {
            throw new Error("Falha ao fazer upload do arquivo de atesto.");
        }
        
        dataToUpdate.attestedDriveFileId = driveFile.id;
        dataToUpdate.attestedFileUrl = `/api/download/${driveFile.id}`;
        historyDetails += ` Documento de atesto '${attestedFile.name}' foi salvo.`;
    }

    // Lógica para salvar o relatório opcional, garantindo que vá para a pasta correta
    if (reportFile && reportFile.size > 0) {
      const reportBuffer = Buffer.from(await reportFile.arrayBuffer());
      const reportStream = Readable.from(reportBuffer);
      const reportDriveFileName = `[RELATORIO] ${reportFile.name}`;

      const reportDriveFile = await uploadFileToDrive(
        reportDriveFileName,
        reportFile.type,
        reportStream,
        note.projectAccountNumber // Usando a conta do projeto da nota
      );
      
      if(!reportDriveFile || !reportDriveFile.id) {
        console.warn("Falha ao fazer upload do relatório anexo, mas o atesto prosseguirá.");
      } else {
        dataToUpdate.reportDriveFileId = reportDriveFile.id;
        dataToUpdate.reportFileName = reportDriveFileName;
        dataToUpdate.reportFileUrl = `/api/download/${reportDriveFile.id}`;
        historyDetails += ` Relatório de execução '${reportDriveFileName}' foi anexado.`;
      }
    }

    if (observation) {
        historyDetails += ` Observação: "${observation}"`;
    }

    dataToUpdate.history = {
        create: {
            type: 'ATTESTED',
            details: historyDetails,
            author: {
                connect: { id: userId },
            },
        }
    };

    await prisma.fiscalNote.update({
        where: { id: noteId },
        data: dataToUpdate,
    });
    
    revalidatePath('/dashboard/notas');
    revalidatePath('/dashboard/analistas');
    revalidatePath('/dashboard/timeline');

    return { success: true, message: 'Nota atestada com sucesso!' };
  } catch (error) {
    console.error("Erro ao atestar nota:", error instanceof Error ? error.message : "Unknown error");
    const message = error instanceof Error ? error.message : "Ocorreu um erro no servidor.";
    return { success: false, message };
  }
}

export async function revertAttestation(noteId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.name) {
        return { success: false, message: 'Acesso negado.' };
    }

    const { id: userId } = session.user;
    
    await prisma.fiscalNote.update({
        where: { id: noteId },
        data: {
            status: 'PENDENTE',
            attestedAt: null,
            attestedById: null,
            observation: null,
            attestedDriveFileId: null,
            attestedFileUrl: null,
            attestedBy: null,
            history: {
                create: {
                    type: 'REVERTED',
                    details: 'O atesto da nota foi desfeito.',
                    author: {
                      connect: { id: userId }
                    }
                }
            }
        }
    });
    
    revalidatePath('/dashboard/notas');
    revalidatePath('/dashboard/analistas');
    revalidatePath('/dashboard/timeline');

    return { success: true, message: 'Atesto desfeito com sucesso.' };
  } catch (error) {
    console.error("Erro ao reverter atesto:", error instanceof Error ? error.message : "Unknown error");
    return { success: false, message: 'Erro no servidor ao reverter o atesto.' };
  }
}

const checkExistingNoteSchema = z.object({
  numeroNota: z.string(),
  projectAccountNumber: z.string(),
});

export async function checkExistingNote(input: { numeroNota: string; projectAccountNumber: string }): Promise<boolean> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
        console.error("Unauthorized attempt to check for existing notes.");
        return false;
    }
    
    const validatedInput = checkExistingNoteSchema.parse(input);
    const existing = await prisma.fiscalNote.findFirst({
        where: {
            numeroNota: validatedInput.numeroNota,
            projectAccountNumber: validatedInput.projectAccountNumber,
        },
    });
    return !!existing;
  } catch (error) {
    console.error("Error checking for existing note:", error instanceof Error ? error.message : "Unknown error");
    return false;
  }
}

// Server Action to wrap the extraction logic
export async function extractNoteData(input: ExtractNoteDataInput): Promise<ExtractNoteDataOutput> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error('Acesso não autorizado.');
    }
    return performExtraction(input);
  } catch (error) {
      console.error("Error in extractNoteData server action:", error);
      // Re-throw the original error to be caught by the client
      throw error;
  }
}

export async function notifyAllPendingCoordinators(): Promise<{ success: boolean; message: string; notifiedCount?: number; }> {
    const session = await auth();
    if (session?.user?.role !== Role.OWNER && session?.user?.role !== Role.MANAGER) {
        return { success: false, message: "Acesso negado. Apenas administradores podem executar esta ação." };
    }

    try {
        const pendingNotes = await prisma.fiscalNote.findMany({
            where: {
                status: InvoiceStatus.PENDENTE,
                attestationDeadline: {
                    gte: new Date(), // Apenas notas não expiradas
                },
            },
            include: {
                creator: { // CORREÇÃO: Usa a relação nomeada 'creator'
                    select: {
                        email: true,
                    },
                },
            },
        });

        if (pendingNotes.length === 0) {
            return { success: true, message: "Nenhuma nota pendente para notificar.", notifiedCount: 0 };
        }

        const emailPromises = pendingNotes.map(note => {
            if (!note.creator.email) {
                console.warn(`Nota ${note.id} não tem um solicitante com e-mail para ser copiado.`);
                return Promise.resolve(); // Pula esta nota
            }
            // Calcula os dias restantes com base na data de expiração da nota
            const daysRemaining = note.attestationDeadline ? differenceInDays(note.attestationDeadline, new Date()) : 0;
            return sendAttestationReminderEmail({
                noteId: note.id,
                coordinatorEmail: note.coordinatorEmail,
                coordinatorName: note.coordinatorName,
                requesterEmail: note.creator.email,
                noteDescription: note.description,
                projectTitle: note.projectTitle,
                numeroNota: note.numeroNota,
                daysRemaining: Math.max(0, daysRemaining),
            });
        });

        await Promise.all(emailPromises);
        
        return { success: true, message: `${pendingNotes.length} lembretes de atesto foram enviados com sucesso.`, notifiedCount: pendingNotes.length };

    } catch (error) {
        console.error("Erro ao notificar coordenadores:", error instanceof Error ? error.message : "Unknown error");
        return { success: false, message: "Ocorreu um erro no servidor ao tentar enviar as notificações." };
    }
}

export async function deleteNote(noteId: string, permanent: boolean = false): Promise<{ success: boolean; message: string; }> {
    try {
        const canManageTrash = await hasPermission(PermissionType.CAN_MANAGE_TRASH);
        
        if (permanent && !canManageTrash) {
             return { success: false, message: "Acesso negado. Você não tem permissão para excluir notas permanentemente." };
        }
        
        const note = await prisma.fiscalNote.findUnique({
            where: { id: noteId },
            select: { status: true, deleted: true }
        });

        if (!note) {
            return { success: false, message: "Nota não encontrada." };
        }

        if (permanent) {
            if (!note.deleted && !canManageTrash) {
                 return { success: false, message: "Apenas notas na lixeira podem ser excluídas permanentemente por não-administradores." };
            }
            // TODO: Adicionar lógica para excluir arquivos do Google Drive
            await prisma.fiscalNote.delete({ where: { id: noteId } });
            revalidatePath('/dashboard/lixeira');
            return { success: true, message: "Nota excluída permanentemente." };
        } else {
            // Soft delete
            const canSoftDelete = await hasPermission(PermissionType.CAN_DELETE_PENDING_NOTE);
             if (!canSoftDelete) {
                 return { success: false, message: "Acesso negado. Você não tem permissão para mover notas para a lixeira." };
             }
             if (note.status !== InvoiceStatus.PENDENTE && note.status !== InvoiceStatus.REJEITADA) {
                return { success: false, message: `Não é possível mover uma nota com status "${note.status}" para a lixeira.` };
            }
            await prisma.fiscalNote.update({
                where: { id: noteId },
                data: { 
                    deleted: true,
                    deletedAt: new Date(),
                    history: {
                        create: {
                            type: 'DELETED',
                            details: `Nota movida para a lixeira.`,
                            authorId: auth()?.user?.id ?? '' // Ajustar conforme sua lógica de sessão
                        }
                    }
                }
            });
            revalidatePath('/dashboard/notas');
            return { success: true, message: "Nota movida para a lixeira." };
        }

    } catch (error) {
        console.error("Erro ao excluir/mover nota:", error);
        return { success: false, message: "Ocorreu um erro no servidor." };
    }
}


export async function restoreNote(noteId: string): Promise<{ success: boolean, message: string }> {
    const canManageTrash = await hasPermission(PermissionType.CAN_MANAGE_TRASH);
    if (!canManageTrash) {
        return { success: false, message: "Acesso negado. Você não tem permissão para restaurar notas." };
    }

    try {
        await prisma.fiscalNote.update({
            where: { id: noteId },
            data: {
                deleted: false,
                deletedAt: null,
                history: {
                    create: {
                        type: 'RESTORED',
                        details: 'Nota restaurada da lixeira.',
                        authorId: auth()?.user?.id ?? '' // Ajustar
                    }
                }
            }
        });
        revalidatePath('/dashboard/lixeira');
        revalidatePath('/dashboard/notas');
        return { success: true, message: "Nota restaurada com sucesso." };
    } catch (error) {
        console.error("Erro ao restaurar nota:", error);
        return { success: false, message: "Erro no servidor ao restaurar nota." };
    }
}
