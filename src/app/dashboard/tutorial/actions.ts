
'use server';

import { z } from 'zod';
import prisma from '../../../lib/prisma';
import { auth } from '../../../auth';
import { Role, TutorialType } from '@prisma/client';
import { uploadFileToDrive } from '../../../lib/google-drive';
import { Readable } from 'stream';
import { revalidatePath } from 'next/cache';

const addTutorialSchema = z.object({
  title: z.string().min(1, 'O título é obrigatório.'),
  description: z.string().min(1, 'A descrição é obrigatória.'),
  type: z.nativeEnum(TutorialType),
  url: z.string().optional(),
});

export async function addTutorial(formData: FormData) {
  const session = await auth();
  if (session?.creator?.role !== Role.OWNER) {
    throw new Error('Acesso não autorizado.');
  }

  const rawData = Object.fromEntries(formData.entries());
  const validated = addTutorialSchema.safeParse(rawData);

  if (!validated.success) {
    throw new Error('Dados inválidos: ' + validated.error.message);
  }

  const { title, description, type, url } = validated.data;
  let fileUrl = url || '';
  let driveFileId: string | undefined = undefined;

  if (type === TutorialType.FILE) {
    const file = formData.get('file') as File | null;
    if (!file) throw new Error('Arquivo é obrigatório para tutoriais do tipo FILE.');

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileStream = Readable.from(fileBuffer);
    
    // Upload to a specific "Tutoriais" folder in Drive
    const driveFile = await uploadFileToDrive(`[TUTORIAL] ${file.name}`, file.type, fileStream, 'Tutoriais');

    if (!driveFile?.id) {
      throw new Error('Falha ao fazer upload do tutorial para o Google Drive.');
    }
    driveFileId = driveFile.id;
    fileUrl = `/api/download/${driveFile.id}`;
  }

  if (!fileUrl) {
    throw new Error('URL ou arquivo são necessários.');
  }

  await prisma.tutorial.create({
    data: {
      title,
      description,
      type,
      url: fileUrl,
      driveFileId,
      authorId: session.creator.id,
    },
  });

  revalidatePath('/dashboard/tutorial');
}

export async function getTutorials() {
  const session = await auth();
  if (!session?.creator?.id) {
    throw new Error('Usuário não autenticado.');
  }
  return prisma.tutorial.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function deleteTutorial(id: string) {
    const session = await auth();
    if (session?.creator?.role !== Role.OWNER) {
        throw new Error('Acesso não autorizado.');
    }

    // Opcional: deletar arquivo do Google Drive aqui se necessário
    // const tutorial = await prisma.tutorial.findUnique({ where: { id }});
    // if (tutorial?.driveFileId) { ... delete from drive ... }

    await prisma.tutorial.delete({
        where: { id },
    });

    revalidatePath('/dashboard/tutorial');
}
