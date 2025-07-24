
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

// Schema for parsing FormData on the server.
const emailListRegex = /^$|^([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(, *([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}))*$/;

const addNoteSchema = z.object({
  invoiceType: z.nativeEnum(InvoiceType),
  hasWithholdingTax: z.preprocess((val) => val === 'on' || val === 'true' || val === true, z.boolean()),
  coordinatorName: z.string().min(1, 'O nome do coordenador é obrigatório.'),
  coordinatorEmail: z.string().email('O e-mail do coordenador é inválido.'),
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
});


export async function addNote(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email || !session.user.name) {
    return { success: false, message: 'Usuário não autenticado ou informações do usuário ausentes. Acesso negado.' };
  }
  
  const requesterName = session.user.name;
  const requesterEmail = session.user.email;

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
    // TODO: Make this configurable in settings
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
            user: requesterName,
            details: `Nota fiscal criada por ${requesterName} e atribuída a ${coordinatorName} para atesto. Arquivo '${file.name}' salvo na pasta da conta ${projectAccountNumber} no Drive.`
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
      fileType: newNote.fileType
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
  noteId: z.string(),
  observation: z.string().optional(),
});

export async function attestNote(formData: FormData) {
    const session = await auth();
    if (!session?.user?.id || !session.user.name) {
        return { success: false, message: 'Acesso negado.' };
    }

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
        let historyDetails = `Nota atestada por ${session.user.name}.`;

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
                attestedById: session.user.id,
                attestedBy: session.user.name,
                observation: observation,
                attestedDriveFileId: attestedDriveFileId,
                attestedFileUrl: attestedFileUrl,
                history: {
                    create: {
                        type: 'ATTESTED',
                        user: session.user.name,
                        details: historyDetails,
                    }
                }
            },
        });
        
        revalidatePath('/dashboard/notas');
        revalidatePath('/dashboard/colaboradores');
        revalidatePath('/dashboard/timeline');

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
                        user: session.user.name,
                        details: 'O atesto da nota foi desfeito.'
                    }
                }
            }
        });
        
        revalidatePath('/dashboard/notas');
        revalidatePath('/dashboard/colaboradores');
        revalidatePath('/dashboard/timeline');

        return { success: true, message: 'Atesto desfeito com sucesso.' };
    } catch (error) {
        console.error("Erro ao reverter atesto:", error);
        return { success: false, message: 'Erro no servidor ao reverter o atesto.' };
    }
}
