

'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { InvoiceStatus, InvoiceType } from '@prisma/client';
import { uploadFileToDrive } from '@/lib/google-drive';
import { Readable } from 'stream';
import { addDays } from 'date-fns';
import { sendAttestationRequestEmail } from '@/lib/email-actions';
import { performExtraction, ExtractNoteDataInput, ExtractNoteDataOutput } from '@/ai/flows/extract-note-data-flow';

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
  // file is handled separately from FormData
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

    // Manual file validation from FormData
    const file = formData.get('file') as File;
    if (!file || file.size === 0) {
        return { success: false, message: 'O arquivo é obrigatório e não pode estar vazio.' };
    }
     if (file.size > 10000000) {
        return { success: false, message: 'O tamanho máximo do arquivo é 10MB.' };
    }
    if (!['application/pdf', 'text/xml', 'image/jpeg', 'image/png'].includes(file.type)) {
        return { success: false, message: 'São aceitos apenas arquivos .pdf, .xml, .jpg e .png.' };
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

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileStream = Readable.from(fileBuffer);
    
    const driveFile = await uploadFileToDrive(`[NOTA] ${file.name}`, file.type, fileStream, projectAccountNumber);

    if (!driveFile || !driveFile.id) {
      throw new Error("Falha ao fazer upload do arquivo para o Google Drive.");
    }

    const submissionDate = new Date();
    // TODO: Make this configurable in settings
    const attestationDeadline = addDays(submissionDate, 30); 

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
        amount: valorTotal ? parseFloat(valorTotal.replace(',', '.')) : null,
        userId: userId,
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
            details: `Nota fiscal criada por ${userName} e atribuída a ${coordinatorName} para atesto. Arquivo '${file.name}' salvo na pasta da conta ${projectAccountNumber} no Drive.`,
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
    
    const note = await prisma.fiscalNote.findUnique({ where: { id: noteId } });
    if (!note) {
        return { success: false, message: 'Nota fiscal não encontrada.' };
    }
    
    let attestedDriveFileId: string | null = null;
    let attestedFileUrl: string | null = null;
    let historyDetails = `Nota atestada por ${userName}.`;

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
                    author: {
                      connect: { id: userId }
                    }
                }
            }
        },
    });
    
    revalidatePath('/dashboard/notas');
    revalidatePath('/dashboard/analistas');
    revalidatePath('/dashboard/timeline');

    return { success: true, message: 'Nota atestada com sucesso!' };
  } catch (error) {
    console.error("Erro ao atestar nota:", error);
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
    console.error("Erro ao reverter atesto:", error);
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
    console.error("Error checking for existing note:", error);
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
