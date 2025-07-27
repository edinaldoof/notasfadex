
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { InvoiceStatus, InvoiceType, Role } from '@prisma/client';
import { uploadFileToDrive } from '@/lib/google-drive';
import { Readable } from 'stream';
import { addDays } from 'date-fns';
import { sendAttestationRequestEmail } from '@/lib/email-actions';

// Regex robusto para validação de e-mail (deve ser o mesmo do frontend)
const emailRegex = /^(?![_.-])(?!.*[_.-]{2})[a-zA-Z0-9_.-]+(?<![_.-])@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,63}$/;
const emailListRegex = /^$|^([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(, *([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}))*$/;

// Schema para adicionar nota, sem a validação do tipo 'File' que só existe no navegador.
const addNoteSchema = z.object({
  invoiceType: z.nativeEnum(InvoiceType),
  hasWithholdingTax: z.preprocess((val) => val === 'on' || val === 'true' || val === true, z.boolean()),
  coordinatorName: z.string().min(1, 'O nome do coordenador é obrigatório.'),
  coordinatorEmail: z.string().regex(emailRegex, { message: 'Formato de e-mail inválido.' }),
  projectAccountNumber: z.string().min(1, 'A conta do projeto é obrigatória.'),
  ccEmails: z.string().regex(emailListRegex, { message: 'Forneça uma lista de e-mails válidos, separados por vírgula.' }).optional(),
  // O campo 'file' é removido do schema e tratado manualmente a partir do FormData.
  descricaoServicos: z.string().min(1, 'A descrição é obrigatória.'),
  prestadorCnpj: z.string().optional(),
  tomadorRazaoSocial: z.string().optional(),
  tomadorCnpj: z.string().optional(),
  numeroNota: z.string().optional(),
  dataEmissao: z.string().optional(),
  valorTotal: z.string().optional(),
  prestadorRazaoSocial: z.string().optional(),
});


export async function addNote(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email || !session.user.name) {
    return { success: false, message: 'Usuário não autenticado ou informações do usuário ausentes. Acesso negado.' };
  }
  
  const requesterName = session.user.name;
  const requesterEmail = session.user.email;
  const requesterId = session.user.id;

  // Validação manual do arquivo no servidor
  const file = formData.get('file') as File;
  if (!file || file.size === 0) {
      return { success: false, message: 'O arquivo é obrigatório e não pode estar vazio.' };
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
    coordinatorEmail,
    coordinatorName,
    projectAccountNumber,
    ccEmails,
    ...rest 
  } = validatedFields.data;

  try {
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileStream = Readable.from(fileBuffer);
    
    const driveFile = await uploadFileToDrive(`[NOTA] ${file.name}`, file.type, fileStream, projectAccountNumber);

    if (!driveFile || !driveFile.id) {
      throw new Error("Falha ao fazer upload do arquivo para o Google Drive.");
    }

    const submissionDate = new Date();
    const attestationDeadline = addDays(submissionDate, 30); 

    const newNote = await prisma.fiscalNote.create({
      data: {
        description: descricaoServicos,
        requester: requesterName,
        issueDate: submissionDate,
        status: InvoiceStatus.PENDENTE,
        fileType: file.type,
        fileName: file.name,
        originalFileUrl: `/api/download/${driveFile.id}`,
        driveFileId: driveFile.id,
        amount: valorTotal ? parseFloat(valorTotal.replace(',', '.')) : null,
        userId: session.user.id,
        invoiceType: invoiceType,
        projectAccountNumber: projectAccountNumber,
        hasWithholdingTax: hasWithholdingTax,
        coordinatorEmail: coordinatorEmail,
        coordinatorName: coordinatorName,
        attestationDeadline: attestationDeadline,
        ...rest,
        history: {
          create: {
            type: 'CREATED',
            details: `Nota fiscal criada e atribuída a ${coordinatorName} para atesto.`,
            userId: requesterId,
            userName: requesterName,
          }
        }
      }
    });

    await sendAttestationRequestEmail({
      noteId: newNote.id,
      coordinatorName: newNote.coordinatorName,
      coordinatorEmail: newNote.coordinatorEmail,
      requesterName: newNote.requester,
      requesterEmail: requesterEmail,
      ccEmails: ccEmails,
      noteDescription: newNote.description,
      driveFileId: newNote.driveFileId,
      fileName: newNote.fileName,
      fileType: newNote.fileType,
      numeroNota: newNote.numeroNota,
      projectAccountNumber: newNote.projectAccountNumber
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

// Schema para atestar nota, também sem a validação do tipo 'File'.
const attestNoteSchema = z.object({
  noteId: z.string(),
  observation: z.string().optional(),
  // O campo 'attestedFile' foi removido e será tratado manualmente.
});

export async function attestNote(formData: FormData) {
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
    
    try {
        const note = await prisma.fiscalNote.findUnique({ where: { id: noteId } });
        if (!note) {
            return { success: false, message: 'Nota fiscal não encontrada.' };
        }
        
        let attestedDriveFileId: string | null = null;
        let attestedFileUrl: string | null = null;
        let historyDetails = `Nota atestada.`;

        if (attestedFile && attestedFile.size > 0) {
            const fileBuffer = Buffer.from(await attestedFile.arrayBuffer());
            const fileStream = Readable.from(fileBuffer);

            // CORREÇÃO: Chamada da função de upload para o Drive.
            const driveFile = await uploadFileToDrive(
                `[ATESTADO] ${attestedFile.name}`,
                attestedFile.type,
                fileStream,
                note.projectAccountNumber
            );
            
            if (!driveFile || !driveFile.id) {
                throw new Error("Falha ao fazer upload do arquivo de atesto.");
            }
            
            attestedDriveFileId = driveFile.id;
            attestedFileUrl = `/api/download/${driveFile.id}`;
            historyDetails += ` Documento de atesto '${attestedFile.name}' foi salvo.`;
        }

        if (observation) {
            historyDetails += ` Observação: "${observation}"`;
        }

        await prisma.fiscalNote.update({
            where: { id: noteId },
            data: {
                status: 'ATESTADA',
                attestedAt: new Date(),
                attestedById: userId,
                attestedBy: userName,
                observation: observation,
                attestedDriveFileId: attestedDriveFileId,
                attestedFileUrl: attestedFileUrl,
                history: {
                    create: {
                        type: 'ATTESTED',
                        details: historyDetails,
                        userId: userId,
                        userName: userName,
                    }
                }
            },
        });
        
        revalidatePath('/dashboard/notas');
        revalidatePath('/dashboard/colaboradores');
        revalidatePath('/dashboard/timeline');
        revalidatePath('/dashboard');


        return { success: true, message: 'Nota atestada com sucesso!' };

    } catch (error) {
        console.error("Erro ao atestar nota:", error);
        const message = error instanceof Error ? error.message : "Ocorreu um erro no servidor.";
        return { success: false, message };
    }
}

export async function revertAttestation(noteId: string) {
    const session = await auth();
    if (!session?.user?.id || !session.user.name) {
        return { success: false, message: 'Acesso negado.' };
    }
     const { id: userId, name: userName } = session.user;
    
    try {
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
                        userId: userId,
                        userName: userName,
                    }
                }
            }
        });
        
        revalidatePath('/dashboard/notas');
        revalidatePath('/dashboard/colaboradores');
        revalidatePath('/dashboard/timeline');
        revalidatePath('/dashboard');


        return { success: true, message: 'Atesto desfeito com sucesso.' };
    } catch (error) {
        console.error("Erro ao reverter atesto:", error);
        return { success: false, message: 'Erro no servidor ao reverter o atesto.' };
    }
}

export async function getExistingAccountNumbers(): Promise<string[]> {
    const session = await auth();
    if (!session?.user?.id) {
        return [];
    }

    try {
        const notes = await prisma.fiscalNote.findMany({
            where: {},
            distinct: ['projectAccountNumber'],
            select: {
                projectAccountNumber: true,
            },
            orderBy: {
                projectAccountNumber: 'asc',
            },
        });

        return notes.map(note => note.projectAccountNumber);
    } catch (error) {
        console.error("Failed to fetch existing account numbers:", error);
        return [];
    }
}

export async function getDashboardSummary() {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      totalNotes: 0,
      attestedNotes: 0,
      pendingNotes: 0,
      totalAmount: 0,
    };
  }

  try {
    const isManagerOrOwner = session.user.role === Role.OWNER || session.user.role === Role.MANAGER;
    const whereClause = isManagerOrOwner ? {} : { userId: session.user.id };

    const notes = await prisma.fiscalNote.findMany({
      where: whereClause,
      select: {
        status: true,
        amount: true,
      },
    });

    const totalNotes = notes.length;
    const attestedNotes = notes.filter((note) => note.status === 'ATESTADA').length;
    const pendingNotes = notes.filter((note) => note.status === 'PENDENTE').length;
    const totalAmount = notes.reduce((sum, note) => sum + (note.amount || 0), 0);
    
    return {
      totalNotes,
      attestedNotes,
      pendingNotes,
      totalAmount,
    };
  } catch (error) {
    console.error('Failed to fetch dashboard summary:', error);
    return {
      totalNotes: 0,
      attestedNotes: 0,
      pendingNotes: 0,
      totalAmount: 0,
    };
  }
}

export async function getRecentActivities() {
    const session = await auth();
    if (!session?.user?.id) {
        return [];
    }
    
    const isManagerOrOwner = session.user.role === Role.OWNER || session.user.role === Role.MANAGER;

    try {
        const historyEvents = await prisma.noteHistoryEvent.findMany({
            take: 3,
            orderBy: {
                date: 'desc'
            },
            include: {
                author: {
                    select: {
                        name: true,
                        image: true,
                    }
                },
                note: {
                    select: {
                        userId: true, 
                        projectAccountNumber: true,
                        numeroNota: true,
                    }
                }
            }
        });

        // Se o usuário não for manager, filtre os eventos para mostrar apenas aqueles das suas próprias notas.
        const filteredEvents = isManagerOrOwner
            ? historyEvents
            : historyEvents.filter(event => event.note.userId === session.user.id);
            
        return filteredEvents;

    } catch (error) {
        console.error('Failed to fetch recent activities:', error);
        return [];
    }
}


export async function checkExistingNote(input: { numeroNota: string; projectAccountNumber: string }): Promise<boolean> {
    const session = await auth();
    if (!session?.user?.id) {
        console.error("Unauthorized attempt to check for existing notes.");
        return false;
    }
    
    const checkExistingNoteSchema = z.object({
      numeroNota: z.string(),
      projectAccountNumber: z.string(),
    });

    try {
        const validatedInput = checkExistingNoteSchema.parse(input);
        const existing = await prisma.fiscalNote.findFirst({
            where: {
                numeroNota: validatedInput.numeroNota,
                projectAccountNumber: validatedInput.projectAccountNumber,
            },
        });
        return !!existing;
    } catch (error) {
        console.error("Error checking for existing note:", error);
        return false;
    }
}
